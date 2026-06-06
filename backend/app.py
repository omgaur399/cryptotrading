"""Local Flask server for the trading dashboard."""
from __future__ import annotations

import json
import logging
import os
import queue
from datetime import datetime
from threading import Lock

from flask import Flask, Response, jsonify, request, send_from_directory, stream_with_context
from flask_cors import CORS

from data_source import (
    get_available_instruments,
    get_available_sources,
    get_available_symbols,
    get_available_timeframes,
    get_historical_data,
    validate_symbol,
    validate_timeframe,
)
from hyperliquid_handler import subscribe_symbol, stop_live_stream

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

APP_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(APP_DIR)
FRONTEND_DIR = os.path.join(PROJECT_DIR, "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path="")
CORS(app)

live_clients: set[queue.Queue] = set()
live_clients_lock = Lock()
hyperliquid_symbols: set[str] = set()


@app.route("/")
@app.route("/frontend/")
@app.route("/frontend/index.html")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/api/health")
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})


@app.route("/api/sources")
def sources():
    return jsonify(get_available_sources())


@app.route("/api/instruments")
def instruments():
    return jsonify(get_available_instruments())


@app.route("/api/symbols/<source>")
def symbols(source: str):
    return jsonify({"source": source, "symbols": get_available_symbols(source)})


@app.route("/api/timeframes/<source>")
def timeframes(source: str):
    return jsonify({"source": source, "timeframes": get_available_timeframes(source)})


@app.route("/api/data/<source>/<symbol>/<interval>")
def data(source: str, symbol: str, interval: str):
    if not validate_symbol(source, symbol):
        return jsonify({"error": f"Invalid symbol: {symbol}", "candles": []}), 400
    if not validate_timeframe(source, interval):
        return jsonify({"error": f"Invalid timeframe: {interval}", "candles": []}), 400
    return jsonify(get_historical_data(source, symbol, interval))


@app.route("/api/live")
def live_stream():
    """Server-Sent Events stream for live price ticks."""
    client_queue: queue.Queue = queue.Queue(maxsize=200)
    with live_clients_lock:
        live_clients.add(client_queue)

    def event_stream():
        try:
            yield "event: status\ndata: {\"connected\": true}\n\n"
            while True:
                try:
                    tick = client_queue.get(timeout=15)
                    yield f"data: {json.dumps(tick)}\n\n"
                except queue.Empty:
                    yield "event: ping\ndata: {}\n\n"
        finally:
            with live_clients_lock:
                live_clients.discard(client_queue)

    return Response(stream_with_context(event_stream()), mimetype="text/event-stream")


@app.route("/api/live/subscribe", methods=["POST"])
def live_subscribe():
    payload = request.get_json(silent=True) or {}
    source = payload.get("source")
    symbol = payload.get("symbol")

    if source != "hyperliquid":
        return jsonify({"status": "ignored", "reason": "Only Hyperliquid streams live ticks"})
    if not validate_symbol(source, symbol):
        return jsonify({"error": f"Invalid symbol: {symbol}"}), 400

    if symbol not in hyperliquid_symbols:
        hyperliquid_symbols.add(symbol)
        subscribe_symbol(symbol, broadcast_live_tick)

    return jsonify({"status": "subscribed", "source": source, "symbol": symbol})


@app.route("/frontend/<path:filename>")
def serve_frontend_assets(filename):
    return send_from_directory(FRONTEND_DIR, filename)

@app.route("/<path:filename>")
def serve_static(filename):
    return send_from_directory(FRONTEND_DIR, filename)


def broadcast_live_tick(tick):
    """Fan one provider tick out to every connected browser."""
    with live_clients_lock:
        clients = list(live_clients)

    for client in clients:
        try:
            client.put_nowait(tick)
        except queue.Full:
            logger.warning("Dropping slow live client")


if __name__ == "__main__":
    try:
        logger.info("Starting trading dashboard on http://localhost:5000")
        app.run(host="0.0.0.0", port=5000, debug=False, threaded=True, use_reloader=False)
    finally:
        stop_live_stream()

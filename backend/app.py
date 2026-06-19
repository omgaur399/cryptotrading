"""Local Flask server for the trading dashboard."""
from __future__ import annotations

import json
import logging
import os
import queue
from datetime import datetime
from threading import Lock

from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS

from data_source import (
    get_available_sources,
    get_available_instruments,
    get_available_symbols,
    get_available_timeframes,
    get_historical_data,
    validate_symbol,
    validate_timeframe,
)
from backtesting_engine import BacktestEngine
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


@app.route("/api/history")
def history_api():
    symbol = request.args.get("symbol")
    interval = request.args.get("timeframe")
    before_timestamp = request.args.get("before_timestamp", type=int)
    limit = request.args.get("limit", default=1000, type=int)

    if not validate_symbol("hyperliquid", symbol):
        return jsonify({"error": f"Invalid symbol: {symbol}", "candles": []}), 400
    if not validate_timeframe("hyperliquid", interval):
        return jsonify({"error": f"Invalid timeframe: {interval}", "candles": []}), 400
        
    return jsonify(get_historical_data("hyperliquid", symbol, interval, before_timestamp, limit))


@app.route("/api/data/<source>/<symbol>/<interval>")
def data(source: str, symbol: str, interval: str):
    if not validate_symbol(source, symbol):
        return jsonify({"error": f"Invalid symbol: {symbol}", "candles": []}), 400
    if not validate_timeframe(source, interval):
        return jsonify({"error": f"Invalid timeframe: {interval}", "candles": []}), 400
    return jsonify(get_historical_data(source, symbol, interval, limit=1000))


@app.route("/api/backtest", methods=["POST"])
def backtest_strategy():
    """
    Endpoint to run a backtest for a given strategy and parameters.
    """
    data = request.json
    strategy_name = data.get("strategy")
    symbol = data.get("symbol")
    interval = data.get("interval")
    start_time = data.get("startTime")  # Unix timestamp in seconds
    end_time = data.get("endTime")  # Unix timestamp in seconds
    parameters = data.get("parameters", {})

    if not all([strategy_name, symbol, interval, start_time, end_time]):
        return jsonify({"error": "Missing required backtest parameters"}), 400

    # Fetch historical data for the backtest period
    historical_data = get_historical_data(
        "hyperliquid",  # Hardcoded to Hyperliquid for now
        symbol,
        interval,
        limit=100000
    )

    if historical_data.get("error") or not historical_data.get("candles"):
        return jsonify({"error": f"Failed to fetch historical data: {historical_data.get('error', 'No data')}"}), 500

    # Filter candles based on start_time and end_time
    # We add 86400 (1 day in seconds) to end_time to ensure the whole end date is included
    candles = [c for c in historical_data["candles"] if start_time <= c["time"] <= (end_time + 86400)]

    engine = BacktestEngine()
    if strategy_name == "sma_crossover":
        results = engine.run_sma_crossover(candles, symbol=symbol, **parameters)
    elif strategy_name == "rsi_strategy":
        results = engine.run_rsi_strategy(candles, symbol=symbol, **parameters)
    elif strategy_name == "vwap_ema_trend_pullback":
        results = engine.run_vwap_ema_trend_pullback(candles, symbol=symbol)
    else:
        return jsonify({"error": f"Unknown strategy: {strategy_name}"}), 400

    return jsonify(results)


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

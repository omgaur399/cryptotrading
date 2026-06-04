"""Hyperliquid historical candles and websocket trade streaming."""
from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timedelta, timezone
from threading import Lock, Thread
from typing import Callable, Dict, List, Optional
from urllib import request

import websocket

logger = logging.getLogger(__name__)

HYPERLIQUID_INFO_URL = "https://api.hyperliquid.xyz/info"
HYPERLIQUID_WS_URL = "wss://api.hyperliquid.xyz/ws"

INTERVAL_SECONDS = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
}


def _lookback_days(interval: str) -> int:
    return {
        "1m": 2,
        "5m": 7,
        "15m": 14,
        "1h": 60,
        "4h": 180,
        "1d": 365,
    }.get(interval, 30)


def fetch_hyperliquid_candles(symbol: str, interval: str) -> Dict:
    """Fetch historical candles from Hyperliquid's public info endpoint."""
    end_ms = int(datetime.now(timezone.utc).timestamp() * 1000)
    start_ms = int((datetime.now(timezone.utc) - timedelta(days=_lookback_days(interval))).timestamp() * 1000)
    payload = {
        "type": "candleSnapshot",
        "req": {
            "coin": symbol,
            "interval": interval,
            "startTime": start_ms,
            "endTime": end_ms,
        },
    }

    try:
        body = json.dumps(payload).encode("utf-8")
        req = request.Request(
            HYPERLIQUID_INFO_URL,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=12) as response:
            raw_candles = json.loads(response.read().decode("utf-8"))

        candles = [
            {
                "time": int(item["t"] / 1000),
                "open": float(item["o"]),
                "high": float(item["h"]),
                "low": float(item["l"]),
                "close": float(item["c"]),
                "volume": float(item.get("v", 0)),
            }
            for item in raw_candles
        ]

        return {
            "symbol": symbol,
            "interval": interval,
            "source": "hyperliquid",
            "candles": candles,
            "last_updated": datetime.now().isoformat(),
            "data_points": len(candles),
        }
    except Exception as exc:
        logger.exception("Error fetching Hyperliquid candles for %s", symbol)
        return {
            "symbol": symbol,
            "interval": interval,
            "source": "hyperliquid",
            "candles": [],
            "last_updated": datetime.now().isoformat(),
            "data_points": 0,
            "error": str(exc),
        }


class HyperliquidLiveStream:
    """Single websocket connection that can stream trades for many coins."""

    def __init__(self, callback: Callable[[Dict], None]):
        self.callback = callback
        self.ws = None
        self.thread: Optional[Thread] = None
        self.running = False
        self.symbols: set[str] = set()
        self.lock = Lock()

    def start(self) -> None:
        if self.running:
            return
        self.running = True
        self.thread = Thread(target=self._connect, daemon=True)
        self.thread.start()

    def subscribe(self, symbol: str) -> None:
        with self.lock:
            if symbol in self.symbols:
                return
            self.symbols.add(symbol)
        if self._can_send():
            self._send_subscription(symbol)

    def unsubscribe(self, symbol: str) -> None:
        with self.lock:
            self.symbols.discard(symbol)
        if self._can_send():
            message = {"method": "unsubscribe", "subscription": {"type": "trades", "coin": symbol}}
            self.ws.send(json.dumps(message))

    def _connect(self) -> None:
        while self.running:
            self.ws = websocket.WebSocketApp(
                HYPERLIQUID_WS_URL,
                on_open=self._on_open,
                on_message=self._on_message,
                on_error=self._on_error,
                on_close=self._on_close,
            )
            self.ws.run_forever(ping_interval=30, ping_timeout=10)
            if self.running:
                time.sleep(3)

    def _on_open(self, ws) -> None:
        logger.info("Hyperliquid websocket connected")
        with self.lock:
            symbols = list(self.symbols)
        for symbol in symbols:
            self._send_subscription(symbol)

    def _send_subscription(self, symbol: str) -> None:
        message = {"method": "subscribe", "subscription": {"type": "trades", "coin": symbol}}
        try:
            self.ws.send(json.dumps(message))
            logger.info("Subscribed to Hyperliquid trades: %s", symbol)
        except Exception as exc:
            logger.warning("Could not send Hyperliquid subscription for %s yet: %s", symbol, exc)

    def _on_message(self, ws, message: str) -> None:
        try:
            data = json.loads(message)
            if data.get("channel") != "trades":
                return
            for trade in data.get("data", []):
                price = float(trade["px"])
                size = float(trade.get("sz", 0))
                timestamp = int(trade.get("time", time.time() * 1000) / 1000)
                self.callback(
                    {
                        "source": "hyperliquid",
                        "symbol": trade.get("coin"),
                        "price": price,
                        "size": size,
                        "time": timestamp,
                    }
                )
        except Exception as exc:
            logger.exception("Error processing Hyperliquid message: %s", exc)

    def _on_error(self, ws, error) -> None:
        logger.error("Hyperliquid websocket error: %s", error)

    def _on_close(self, ws, close_status_code, close_msg) -> None:
        logger.info("Hyperliquid websocket closed")

    def _can_send(self) -> bool:
        if not self.ws:
            return False
        sock = getattr(self.ws, "sock", None)
        return bool(sock and getattr(sock, "connected", False))

    def stop(self) -> None:
        self.running = False
        if self.ws:
            self.ws.close()
        if self.thread:
            self.thread.join(timeout=5)

    def is_running(self) -> bool:
        return self.running


_global_stream: Optional[HyperliquidLiveStream] = None


def start_live_stream(callback: Callable[[Dict], None]) -> HyperliquidLiveStream:
    global _global_stream
    if _global_stream and _global_stream.is_running():
        return _global_stream
    _global_stream = HyperliquidLiveStream(callback)
    _global_stream.start()
    return _global_stream


def subscribe_symbol(symbol: str, callback: Callable[[Dict], None]) -> HyperliquidLiveStream:
    stream = start_live_stream(callback)
    stream.subscribe(symbol)
    return stream


def stop_live_stream() -> None:
    global _global_stream
    if _global_stream:
        _global_stream.stop()
        _global_stream = None


def get_live_stream() -> Optional[HyperliquidLiveStream]:
    return _global_stream

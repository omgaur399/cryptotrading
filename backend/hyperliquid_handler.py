"""Hyperliquid historical candles and websocket trade streaming."""
from __future__ import annotations

import json
import logging
import os
import sqlite3
import time
from datetime import datetime, timedelta, timezone
from threading import Lock, Thread
from typing import Callable, Dict, List, Optional
from urllib import request
import concurrent.futures

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

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "market_data.db")
db_lock = Lock()

def _get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=15)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
    except Exception as e:
        logger.warning("Could not enable WAL mode: %s", e)
    conn.row_factory = sqlite3.Row
    
    with db_lock:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS candles (
                symbol TEXT, interval TEXT, time INTEGER, open REAL, high REAL, low REAL, close REAL, volume REAL,
                PRIMARY KEY (symbol, interval, time)
            )
        ''')
        conn.commit()
    return conn

db_conn = _get_db()

def fetch_hyperliquid_candles(symbol: str, interval: str, before_timestamp: Optional[int] = None, limit: int = 1000) -> Dict:
    """Paginated fetch from SQLite, intelligently syncing with Binance for new data."""
    interval_map = {"1m": "1m", "5m": "5m", "15m": "15m", "1h": "1h", "4h": "4h", "1d": "1d"}
    binance_interval = interval_map.get(interval, "1h")
    
    clean_symbol = symbol.upper()
    if clean_symbol == 'MATIC': clean_symbol = 'POL'
    if clean_symbol.startswith('1000'): clean_symbol = clean_symbol.replace('1000', '', 1)
    
    is_1000x = '1000' in symbol.upper()
    scale = 1000 if is_1000x else 1
    
    # data-api is the official fallback unblocked in most regions
    base_endpoints = [
        "https://data-api.binance.vision/api/v3/klines",
        "https://api.binance.com/api/v3/klines",
        "https://fapi.binance.com/fapi/v1/klines"
    ]
    
    working_url = None
    
    # 1. Find an unblocked endpoint quickly (3s timeout)
    for base_url in base_endpoints:
        test_url = f"{base_url}?symbol={clean_symbol}USDT&interval={binance_interval}&limit=5"
        try:
            req = request.Request(test_url, headers={'User-Agent': 'Mozilla/5.0'})
            with request.urlopen(req, timeout=3) as res:
                data = json.loads(res.read().decode("utf-8"))
                if isinstance(data, list) and len(data) > 0:
                    working_url = base_url
                    break
        except Exception:
            continue
            
    if not working_url:
        return {
            "symbol": symbol,
            "interval": interval,
            "source": "hyperliquid",
            "candles": [],
            "last_updated": datetime.now().isoformat(),
            "data_points": 0,
            "error": f"Binance data blocked or unavailable for {symbol}"
        }
    
    # 2. Only Sync Data if we are fetching the Latest Timeline
    if before_timestamp is None:
        cur = db_conn.execute("SELECT MAX(time) as max_t FROM candles WHERE symbol=? AND interval=?", (clean_symbol, binance_interval))
        row = cur.fetchone()
        max_time = row['max_t'] if row and row['max_t'] else None
        
        new_candles_raw = []
        now_ms = int(time.time() * 1000)
        
        if max_time is not None:
            # 3a. Incrementally fetch ONLY the missing candles safely via UPSERT
            current_start = max_time * 1000
        
            try:
                while current_start < now_ms:
                    url = f"{working_url}?symbol={clean_symbol}USDT&interval={binance_interval}&limit=1000&startTime={current_start}"
                    req = request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                    with request.urlopen(req, timeout=5) as response:
                        batch = json.loads(response.read().decode("utf-8"))
                        if not isinstance(batch, list) or len(batch) == 0:
                            break
                        new_candles_raw.extend(batch)
                        current_start = batch[-1][0] + 1
                        if len(batch) < 1000:
                            break
                        time.sleep(0.05)
            except Exception as e:
                logger.warning("Incremental fetch failed for %s: %s", symbol, e)
        else:
            # 3b. First time loading: Fetch a deep history (20,000 candles) concurrently
            interval_seconds = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400}.get(interval, 3600)
            interval_ms = interval_seconds * 1000
            limit_per_req = 1000
            batch_duration_ms = limit_per_req * interval_ms
            batches_needed = 20000 // limit_per_req
            
            def fetch_batch(i: int):
                end_time = now_ms - (i * batch_duration_ms)
                start_time = end_time - batch_duration_ms + 1
                url = f"{working_url}?symbol={clean_symbol}USDT&interval={binance_interval}&limit={limit_per_req}&endTime={end_time}&startTime={start_time}"
                try:
                    req = request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                    with request.urlopen(req, timeout=7) as response:
                        batch_data = json.loads(response.read().decode("utf-8"))
                        if isinstance(batch_data, list):
                            return batch_data
                except Exception:
                    pass
                return []
                
            try:
                results = {}
                with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
                    futures = {executor.submit(fetch_batch, i): i for i in range(batches_needed)}
                    for future in concurrent.futures.as_completed(futures):
                        results[futures[future]] = future.result()
                for i in sorted(results.keys(), reverse=True):
                    if results[i]:
                        new_candles_raw.extend(results[i])
            except Exception as exc:
                logger.warning("Error fetching data for %s: %s", symbol, exc)

        # 4. Process and UPSERT directly into SQLite Database
        if new_candles_raw:
            insert_data = []
            for c in new_candles_raw:
                if isinstance(c, list) and len(c) >= 6:
                    candle_time = int(c[0] / 1000)
                    insert_data.append((clean_symbol, binance_interval, candle_time, float(c[1])/scale, float(c[2])/scale, float(c[3])/scale, float(c[4])/scale, float(c[5])*scale))
            
            try:
                with db_lock:
                    db_conn.executemany('''
                        INSERT OR REPLACE INTO candles (symbol, interval, time, open, high, low, close, volume)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ''', insert_data)
                    db_conn.commit()
            except Exception as e:
                logger.warning("DB Insert failed for %s: %s", symbol, e)
    else:
        # We are paginating backwards. Check if DB has enough data.
        cur = db_conn.execute("SELECT COUNT(*) as c FROM candles WHERE symbol=? AND interval=? AND time < ?", (clean_symbol, binance_interval, before_timestamp))
        count = cur.fetchone()['c']
        
        if count < limit:
            # We hit the end of our local SQLite cache. Let's fetch older data from Binance dynamically!
            cur = db_conn.execute("SELECT MIN(time) as min_t FROM candles WHERE symbol=? AND interval=?", (clean_symbol, binance_interval))
            row = cur.fetchone()
            oldest_time_sec = row['min_t'] if row and row['min_t'] else before_timestamp
            
            interval_seconds = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400}.get(interval, 3600)
            interval_ms = interval_seconds * 1000
            limit_per_req = 1000
            batch_duration_ms = limit_per_req * interval_ms
            
            current_end_time = oldest_time_sec * 1000 - 1
            new_older_candles = []
            
            try:
                # Fetch up to 5000 older candles at a time (5 requests) using strict time windows
                for _ in range(5):
                    start_time = current_end_time - batch_duration_ms + 1
                    url = f"{working_url}?symbol={clean_symbol}USDT&interval={binance_interval}&limit={limit_per_req}&endTime={current_end_time}&startTime={start_time}"
                    req = request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                    with request.urlopen(req, timeout=5) as response:
                        batch = json.loads(response.read().decode("utf-8"))
                        if isinstance(batch, list) and len(batch) > 0:
                            new_older_candles.extend(batch)
                            
                    # Force window backward strictly
                    current_end_time = start_time - 1
                    time.sleep(0.05)
            except Exception as e:
                logger.warning("Failed to dynamically fetch older data: %s", e)
                
            if new_older_candles:
                insert_data = []
                for c in new_older_candles:
                    if isinstance(c, list) and len(c) >= 6:
                        candle_time = int(c[0] / 1000)
                        insert_data.append((clean_symbol, binance_interval, candle_time, float(c[1])/scale, float(c[2])/scale, float(c[3])/scale, float(c[4])/scale, float(c[5])*scale))
                try:
                    with db_lock:
                        db_conn.executemany('''
                            INSERT OR REPLACE INTO candles (symbol, interval, time, open, high, low, close, volume)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ''', insert_data)
                        db_conn.commit()
                except Exception as e:
                    logger.warning("DB Insert failed for older data: %s", e)
                
    # 5. Fast Paginated SQLite Query
    if before_timestamp:
        query = "SELECT * FROM candles WHERE symbol=? AND interval=? AND time < ? ORDER BY time DESC LIMIT ?"
        params = (clean_symbol, binance_interval, before_timestamp, limit)
    else:
        query = "SELECT * FROM candles WHERE symbol=? AND interval=? ORDER BY time DESC LIMIT ?"
        params = (clean_symbol, binance_interval, limit)
        
    cur = db_conn.execute(query, params)
    rows = cur.fetchall()
    
    cached_candles = []
    for r in reversed(rows): # Reverse back to chronological oldest -> newest
        cached_candles.append({
            "time": r['time'], "open": r['open'], "high": r['high'], "low": r['low'], "close": r['close'], "volume": r['volume']
        })

    return {
        "symbol": symbol,
        "interval": interval,
        "source": "hyperliquid",
        "candles": cached_candles,
        "last_updated": datetime.now().isoformat(),
        "data_points": len(cached_candles),
        "error": None if cached_candles else f"Could not fetch data for {symbol}"
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

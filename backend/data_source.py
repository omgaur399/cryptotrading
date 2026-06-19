"""
Pluggable data source module for the local trading dashboard.

To add a provider later, create one fetch function with this signature:
    fetch_my_provider(symbol: str, interval: str) -> dict

Then register it with register_data_source(...). The Flask app and frontend
consume the registry instead of provider-specific code.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Dict, List

logger = logging.getLogger(__name__)


FetchHandler = Callable[..., Dict]


@dataclass(frozen=True)
class Instrument:
    symbol: str
    mapped_symbol: str
    label: str
    source: str
    market: str


DATA_SOURCES: Dict[str, Dict] = {}


def _empty_payload(source: str, symbol: str, interval: str, error: str = "") -> Dict:
    payload = {
        "symbol": symbol,
        "interval": interval,
        "source": source,
        "candles": [],
        "last_updated": datetime.now().isoformat(),
        "data_points": 0,
    }
    if error:
        payload["error"] = error
    return payload


def fetch_hyperliquid(symbol: str, interval: str, before_timestamp: Optional[int] = None, limit: int = 1000) -> Dict:
    try:
        from hyperliquid_handler import fetch_hyperliquid_candles

        return fetch_hyperliquid_candles(symbol, interval, before_timestamp, limit)
    except Exception as exc:
        logger.exception("Error fetching Hyperliquid data")
        return _empty_payload("hyperliquid", symbol, interval, str(exc))


def register_data_source(
    name: str,
    handler: FetchHandler,
    instruments: List[Dict],
    timeframes: List[str],
    description: str = "",
) -> None:
    DATA_SOURCES[name] = {
        "id": name,
        "name": name,
        "description": description,
        "handler": handler,
        "instruments": {
            item["symbol"]: Instrument(
                symbol=item["symbol"],
                mapped_symbol=item.get("mapped_symbol", item["symbol"]),
                label=item.get("label", item["symbol"]),
                source=name,
                market=item.get("market", ""),
            )
            for item in instruments
        },
        "timeframes": timeframes,
    }
    logger.info("Registered data source: %s", name)


def get_historical_data(source: str, symbol: str, interval: str, before_timestamp: Optional[int] = None, limit: int = 1000) -> Dict:
    source_config = DATA_SOURCES.get(source)
    if not source_config:
        return _empty_payload(source, symbol, interval, f"Unknown source: {source}")

    instrument = source_config["instruments"].get(symbol)
    if not instrument:
        if source == "hyperliquid":
            instrument = Instrument(
                symbol=symbol,
                mapped_symbol=symbol,
                label=f"{symbol} Perp",
                source=source,
                market="Hyperliquid"
            )
        else:
            return _empty_payload(source, symbol, interval, f"Unknown symbol: {symbol}")

    if interval not in source_config["timeframes"]:
        return _empty_payload(source, symbol, interval, f"Unsupported timeframe: {interval}")

    payload = source_config["handler"](instrument.mapped_symbol, interval, before_timestamp, limit)
    payload["display_symbol"] = instrument.symbol
    payload["label"] = instrument.label
    return payload


def get_available_sources() -> List[Dict]:
    return [
        {
            "id": source["id"],
            "name": source["name"],
            "description": source["description"],
            "symbols": list(source["instruments"].keys()),
            "timeframes": source["timeframes"],
        }
        for source in DATA_SOURCES.values()
    ]


def get_available_instruments() -> List[Dict]:
    instruments = []
    for source in DATA_SOURCES.values():
        for instrument in source["instruments"].values():
            instruments.append(
                {
                    "id": f"{instrument.source}:{instrument.symbol}",
                    "symbol": instrument.symbol,
                    "label": instrument.label,
                    "source": instrument.source,
                    "market": instrument.market,
                    "timeframes": source["timeframes"],
                }
            )
    return instruments


def get_available_symbols(source: str) -> List[str]:
    return list(DATA_SOURCES.get(source, {}).get("instruments", {}).keys())


def get_available_timeframes(source: str) -> List[str]:
    return DATA_SOURCES.get(source, {}).get("timeframes", [])


def get_mapped_symbol(source: str, symbol: str) -> str:
    instrument = DATA_SOURCES.get(source, {}).get("instruments", {}).get(symbol)
    return instrument.mapped_symbol if instrument else symbol


def validate_symbol(source: str, symbol: str) -> bool:
    if source == "hyperliquid":
        return True
    return symbol in DATA_SOURCES.get(source, {}).get("instruments", {})


def validate_timeframe(source: str, timeframe: str) -> bool:
    return timeframe in get_available_timeframes(source)


_hyperliquid_symbols = [
    "BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT",
    "MATIC", "TON", "SHIB", "LTC", "TRX", "NEAR", "APT", "ARB", "OP", "SUI",
    "INJ", "TIA", "RNDR", "SEI", "DYDX", "FIL", "KAS", "STX", "LDO", "FET",
    "RUNE", "WLD", "IMX", "HYPE", "PEPE", "WIF", "JUP", "PYTH", "BONK", "ORDI",
    "BCH", "ETC", "XMR", "XLM", "HBAR", "VET", "ALGO", "GRT", "EGLD", "AAVE",
    "SNX", "THETA", "EOS", "XTZ", "MANA", "SAND", "AXS", "GALA", "CRV", "MKR",
    "STRK", "ENA", "W", "ZETA", "ONDO", "AERO", "JTO", "ETHFI", "BOME", "MEW",
    "SLERF", "POPCAT", "PENGU", "OM", "TAO", "AR", "TRB", "SATS", "RATS", "ZIG",
    "MYRO", "NFP", "ALT", "AI", "XAI", "MANTA", "MEME", "ACE", "NTRN", "BIGTIME",
    "BLUR", "SUPER", "ILV", "BEAM", "MAGIC", "GMX", "COMP", "1INCH", "YFI", "SUSHI",
    "UNI", "CAKE", "SSV", "EDU", "ID", "HOOK", "LQTY", "FXS", "GNS", "PENDLE",
    "RDNT", "GTC", "BAND", "CYBER", "ARKM", "PORTAL", "PIXEL", "MAVIA", "GMT",
    "LUNA", "DASH", "ZEC", "IOTA", "NEO", "CHZ", "BAT", "ENJ", "ZIL", "KAVA",
    "RVN", "WAVES", "ONT", "ICX", "QTUM", "NANO", "OMG", "ZRX", "CELO", "BAL"
]

register_data_source(
    "hyperliquid",
    fetch_hyperliquid,
    [{"symbol": sym, "label": f"{sym} Perp", "market": "Hyperliquid"} for sym in _hyperliquid_symbols],
    ["1m", "5m", "15m", "1h", "4h", "1d"],
    "Crypto perpetuals via Hyperliquid",
)

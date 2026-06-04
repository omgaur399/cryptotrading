"""
Mock data handler for testing without live API access.
Generates realistic OHLCV data for demonstration purposes.
"""
import random
from datetime import datetime, timedelta
from typing import Dict, Optional
import math

def generate_mock_candles(symbol: str, interval: str, count: int = 100) -> list:
    """
    Generate realistic mock OHLCV candles.
    
    Args:
        symbol: Stock symbol
        interval: Timeframe
        count: Number of candles to generate
    
    Returns:
        List of candle dictionaries
    """
    candles = []
    
    # Starting price varies by symbol
    prices = {
        'AAPL': 190,
        'GOOGL': 140,
        'MSFT': 380,
        'AMZN': 175,
        'TESLA': 245,
        'BTC': 42000,
        'ETH': 2200,
        'INFY': 1200,
        'TCS': 3200,
        'RELIANCE': 2800,
        'HDFC': 2500,
    }
    
    current_price = prices.get(symbol, 100)
    current_time = datetime.now() - timedelta(days=count)
    
    for i in range(count):
        # Random price movement (±2%)
        change = random.uniform(-0.02, 0.02)
        open_price = current_price
        close_price = current_price * (1 + change)
        high_price = max(open_price, close_price) * random.uniform(1.0, 1.015)
        low_price = min(open_price, close_price) * random.uniform(0.985, 1.0)
        volume = random.randint(1000000, 10000000)
        
        candles.append({
            'time': int(current_time.timestamp()),
            'open': round(open_price, 2),
            'high': round(high_price, 2),
            'low': round(low_price, 2),
            'close': round(close_price, 2),
            'volume': volume,
        })
        
        current_price = close_price
        current_time += timedelta(days=1)
    
    return candles


def mock_data_handler(symbol: str, interval: str) -> Optional[Dict]:
    """
    Generate mock OHLCV data for testing.
    
    Args:
        symbol: Trading symbol
        interval: Timeframe
    
    Returns:
        Mock data dictionary
    """
    try:
        # Generate mock candles
        candles = generate_mock_candles(symbol, interval, count=100)
        
        return {
            'symbol': symbol,
            'interval': interval,
            'source': 'mock',
            'candles': candles,
            'last_updated': datetime.now().isoformat(),
            'data_points': len(candles),
            'note': 'Mock data for testing - replace with real API when available',
        }
    
    except Exception as e:
        return {
            'symbol': symbol,
            'interval': interval,
            'source': 'mock',
            'candles': [],
            'error': str(e),
        }


# Available symbols for mock data
MOCK_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TESLA', 'BTC', 'ETH', 'INFY', 'TCS', 'RELIANCE', 'HDFC']
MOCK_TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '1d', '1wk', '1mo']

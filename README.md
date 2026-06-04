# Trading Dashboard

A web-based trading dashboard displaying multiple live crypto and equity charts in a flexible grid layout, powered by Lightweight Charts, Flask, and real-time data feeds.

## Features

✨ **Multi-Chart Display**
- Display 1, 2, 4, 6, or 8 charts simultaneously
- Auto-arranging responsive grid layout
- Remember your last selection on page refresh

📊 **Real-Time Data**
- Live crypto prices from **Hyperliquid** websocket
- Indian equities via **yfinance**
- Support for multiple timeframes
- Independent chart controls

🎨 **Clean UI**
- Split-screen view with dark theme
- Lightweight Charts candlestick rendering
- Ticker strips with color-coded price changes (green ↑ / red ↓)
- Zero external dependencies (no React/Vue)

🔌 **Pluggable Architecture**
- Modular `data_source.py` for easy integration
- Support for Alpaca, Binance, Zerodha, Polygon, etc.
- Just add a new handler function and register it

🏠 **Local Only**
- Runs entirely on your machine
- No cloud deployments needed
- No API keys required for default sources

## Project Structure

```
trading/
├── backend/
│   ├── app.py                    # Flask server
│   ├── data_source.py            # Pluggable data layer
│   ├── hyperliquid_handler.py    # Hyperliquid integration
│   └── requirements.txt           # Python dependencies
├── frontend/
│   ├── index.html                # Main page
│   ├── styles.css                # Grid layout & theming
│   ├── script.js                 # Chart management
│   └── run.sh / run.bat           # Quick start scripts
└── README.md                      # This file
```

## Installation

### Prerequisites
- Python 3.8+ 
- pip
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Setup

1. **Navigate to the project:**
   ```bash
   cd trading
   ```

2. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   cd ..
   ```

3. **Start the backend server:**
   ```bash
   # On Windows
   cd backend
   python app.py
   
   # On macOS/Linux
   cd backend
   python app.py
   ```
   
   The server will start on `http://localhost:5000`

4. **Open the frontend:**
   - Open your browser and navigate to: `http://localhost:5000/frontend/index.html`
   - Or if running from file system: Open `frontend/index.html` directly in your browser
   
   ⚠️ **Note:** For full functionality (API requests), serve files through the Flask backend:
   ```bash
   # In a new terminal, from the backend directory:
   cd frontend
   python -m http.server 8000
   # Then open http://localhost:8000
   ```

## Usage

### Selecting Charts to Display
1. Use the **"Display Charts"** dropdown at the top to select 1, 2, 4, 6, or 8 charts
2. Your selection is saved automatically (persists on page refresh)

### Chart Controls
Each chart pane has:
- **Symbol Selector** - Choose the trading pair (stocks or crypto)
- **Timeframe Selector** - Select the candlestick interval
- **Ticker Strip** - Shows real-time price changes with color feedback

### Grid Layouts
```
1 Chart:   [Full Screen]

2 Charts:  [Left] [Right]

4 Charts:  [TL] [TR]
           [BL] [BR]

6 Charts:  [1]  [2]  [3]
           [4]  [5]  [6]

8 Charts:  [1]  [2]  [3]  [4]
           [5]  [6]  [7]  [8]
```

## Available Symbols

### Yahoo Finance (yfinance)
**Indian Equities:**
- INFY (Infosys)
- TCS (Tata Consultancy Services)
- RELIANCE (Reliance Industries)
- HDFC (HDFC Bank)
- ICICI (ICICI Bank)
- SBIN (State Bank of India)
- WIPRO (Wipro)
- BAJAJ-AUTO (Bajaj Holdings)

**Cryptocurrencies:**
- BTC (Bitcoin)
- ETH (Ethereum)

### Hyperliquid
- BTC (Bitcoin)
- ETH (Ethereum)
- SOL (Solana)
- ARB (Arbitrum)
- DYDX (dYdX)

## Timeframes

### Yahoo Finance
- 1m, 5m, 15m, 30m, 1h, 1d, 1wk, 1mo

### Hyperliquid
- 1m, 5m, 15m, 1h, 4h, 1d

## Architecture

### Backend (Flask)

**`app.py`** - Main Flask application
- REST API endpoints for fetching OHLCV data
- WebSocket support for real-time updates (extensible)
- CORS enabled for frontend access
- Health check endpoint

**`data_source.py`** - Pluggable data layer
- `yfinance_handler()` - Fetch data from Yahoo Finance
- `get_historical_data()` - Generic function dispatcher
- `register_data_source()` - Register new brokers
- Symbol and timeframe validation
- Easy integration point for new providers

**`hyperliquid_handler.py`** - Hyperliquid integration
- `HyperliquidLiveStream` class for websocket connections
- `fetch_hyperliquid_candles()` for historical data
- Thread-safe streaming with callbacks

### Frontend (Plain HTML/CSS/JS)

**`index.html`** - Main page structure
- Header with chart count selector
- Responsive grid container
- Status bar with connection info

**`styles.css`** - Styling and layout
- CSS Grid for responsive layouts
- Dark theme (customizable)
- Responsive design
- Lightweight, no framework

**`script.js`** - Chart management
- `initializeApp()` - Bootstrap the dashboard
- `updateChartGrid()` - Create/manage panes
- `loadChartData()` - Fetch data from backend
- `updateChartWithData()` - Render with Lightweight Charts
- localStorage persistence

## Adding New Data Sources

### Step 1: Create Handler
Create a new file or add to `data_source.py`:

```python
def my_broker_handler(symbol: str, interval: str) -> Optional[Dict]:
    """Fetch data from My Broker."""
    # Your implementation
    return {
        'symbol': symbol,
        'interval': interval,
        'source': 'my_broker',
        'candles': [
            {'time': 1234567890, 'open': 100, 'high': 105, 'low': 99, 'close': 102, 'volume': 1000},
            # ... more candles
        ],
        'last_updated': datetime.now().isoformat(),
    }
```

### Step 2: Register the Source
In your handler file or in `app.py`:

```python
from data_source import register_data_source

register_data_source(
    name='my_broker',
    handler=my_broker_handler,
    symbols={
        'AAPL': 'AAPL',      # Map display name to API symbol
        'GOOGL': 'GOOGL',
    },
    timeframes=['1m', '5m', '15m', '1h', '1d']
)
```

### Step 3: Update Frontend (Optional)
The frontend will auto-detect the new source via the `/api/sources` endpoint.

## API Endpoints

### REST

**`GET /api/health`**
- Health check
- Returns: `{ "status": "healthy", "timestamp": "..." }`

**`GET /api/sources`**
- List all available data sources with their symbols and timeframes
- Returns: Array of source objects

**`GET /api/data/<source>/<symbol>/<interval>`**
- Fetch OHLCV data
- Returns: `{ "symbol": "...", "candles": [...], "last_updated": "...", ... }`

**`GET /api/symbols/<source>`**
- Get symbols for a source
- Returns: `{ "source": "...", "symbols": [...] }`

**`GET /api/timeframes/<source>`**
- Get timeframes for a source
- Returns: `{ "source": "...", "timeframes": [...] }`

### WebSocket (Optional)
- Event: `subscribe` - Subscribe to real-time updates
- Event: `unsubscribe` - Unsubscribe from updates
- Event: `price_update` - Broadcast price updates

## Troubleshooting

### 1. Blank charts / "Failed to fetch"
- Ensure Flask backend is running on `http://localhost:5000`
- Check browser console for errors (F12)
- Verify `data_source.py` has yfinance installed

### 2. Backend won't start
```bash
# Reinstall dependencies
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. CORS errors in browser console
- Ensure Flask-CORS is installed
- Check `app.py` has `CORS(app)` enabled

### 4. Charts don't resize
- Close and reopen the page
- Check browser console for JavaScript errors
- Ensure Lightweight Charts CDN is accessible

### 5. Hyperliquid stream not working
- Hyperliquid integration requires websocket-client
- Check network connectivity (may need VPN in some regions)
- Currently uses placeholder data - full integration in progress

## Performance Tips

- **Limit chart count**: Fewer charts = faster rendering. Start with 4.
- **Increase timeframe**: Higher intervals (1h, 1d) load faster than 1m
- **Clear browser cache**: Old data might be cached
- **Use Chrome/Edge**: Generally faster than Firefox for rendering

## Future Enhancements

- [ ] Real-time ticker updates via websocket
- [ ] Saving custom layouts
- [ ] Technical indicators (SMA, RSI, MACD)
- [ ] Drawing tools
- [ ] Alert system
- [ ] Portfolio tracking
- [ ] Multiple monitor support
- [ ] Dark/Light theme toggle

## License

MIT - Feel free to use and modify

## Support

For issues or feature requests, check the console (F12) for error messages and ensure:
1. Backend is running and accessible
2. Internet connection is active (for yfinance)
3. Browser has WebSocket support (for real-time features)

---

**Built with:** Flask, Lightweight Charts, yfinance, Python

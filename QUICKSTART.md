# 🚀 Quick Start Guide

## 30-Second Setup

### Windows
```bash
cd trading
run.bat
```

That's it! The dashboard will open automatically.

### macOS / Linux
```bash
cd trading
bash run.sh
```

---

## Manual Setup (If Scripts Don't Work)

### Terminal 1 - Backend Server
```bash
cd trading/backend
pip install -r requirements.txt
python app.py
```

You should see:
```
Starting trading dashboard server...
Server running on http://localhost:5000
```

### Terminal 2 - Open Frontend
Simply open your browser and go to:
```
http://localhost:5000/frontend/index.html
```

---

## First Steps After Opening

1. **Select number of charts** using the dropdown at top (try 4)
2. **Pick symbols** from the dropdowns in each pane (try INFY, TCS, BTC-USD)
3. **Change timeframes** to see different intervals (1m, 5m, 1h, 1d)
4. **Watch the ticker strip** at the top of each chart flash green/red

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Scroll charts | Mouse wheel or trackpad |
| Pan chart | Click + drag |
| Zoom | Double-click or pinch |
| Refresh page | F5 or Ctrl+R |
| Developer console | F12 |

---

## Troubleshooting

**Charts are blank?**
- Check that Flask backend is running (Terminal 1)
- Check browser console: F12 → Console tab
- Try refreshing the page (F5)

**Backend won't start?**
```bash
# Try this:
pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

**Port 5000 already in use?**
Edit `backend/app.py` line ~240:
```python
socketio.run(app, host='127.0.0.1', port=5001)  # Change 5000 to 5001
```

**No data showing?**
- Ensure internet connection (yfinance needs it)
- Check if symbols are available (try INFY or BTC)
- Look at browser console for errors

---

## Next Steps

1. **Customize symbols** in `backend/data_source.py`
2. **Add new brokers** by creating handlers
3. **Modify styling** in `frontend/styles.css`
4. **Adjust layouts** by editing grid in `frontend/styles.css`

---

## File Guide

| File | Purpose |
|------|---------|
| `backend/app.py` | Flask server - start here |
| `backend/data_source.py` | Data handlers (easy to extend) |
| `frontend/index.html` | Main page structure |
| `frontend/styles.css` | Styling & grid layouts |
| `frontend/script.js` | Chart logic & interactions |

---

## Architecture Overview

```
Browser
   ↓
[index.html + script.js]  ← Lightweight Charts
   ↓ (fetch/websocket)
[Flask Backend - app.py]  ← REST API
   ↓
[data_source.py]          ← Modular handlers
   ↓
   ├─→ yfinance (stocks/crypto)
   ├─→ Hyperliquid (crypto perpetuals)
   └─→ [Your custom broker]
```

---

## Key Features Recap

✅ 1-8 charts in grid  
✅ Symbol selectors per chart  
✅ Multiple timeframes  
✅ Real-time price changes (green/red)  
✅ Persistent layout selection  
✅ Fully local (no cloud needed)  
✅ No React/Vue/heavy frameworks  
✅ Pluggable architecture  

---

Enjoy! 📈

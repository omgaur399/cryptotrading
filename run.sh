#!/bin/bash

echo "Starting Trading Dashboard..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

# Install dependencies
echo "[1/3] Installing Python dependencies..."
cd backend
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

# Start Flask backend in background
echo "[2/3] Starting Flask backend on http://localhost:5000..."
echo ""
python app.py &
BACKEND_PID=$!

# Wait for server to start
sleep 3

# Open frontend in browser
echo "[3/3] Opening dashboard in browser..."
if command -v open &> /dev/null; then
    # macOS
    open "http://localhost:5000/frontend/index.html"
elif command -v xdg-open &> /dev/null; then
    # Linux
    xdg-open "http://localhost:5000/frontend/index.html"
else
    echo "Please open http://localhost:5000/frontend/index.html in your browser"
fi

echo ""
echo "========================================"
echo "Trading Dashboard is running!"
echo "========================================"
echo ""
echo "Frontend:  http://localhost:5000/frontend/index.html"
echo "Backend:   http://localhost:5000"
echo "API:       http://localhost:5000/api"
echo ""
echo "Press Ctrl+C to shut down the server"
echo ""

# Wait for interrupt
wait $BACKEND_PID

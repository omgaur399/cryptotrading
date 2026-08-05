#!/bin/bash

echo "Starting Trading Dashboard..."
echo ""

cd "$(dirname "$0")" || exit 1

if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    exit 1
fi

if [ ! -d ".venv" ]; then
    echo "[0/3] Creating Python virtual environment..."
    python3 -m venv .venv

    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to create virtual environment"
        echo "Run: sudo apt install python3-venv"
        exit 1
    fi
fi

echo "[1/3] Installing Python dependencies..."
.venv/bin/python -m pip install -r backend/requirements.txt

if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

echo "[2/3] Starting Flask backend on http://localhost:5000..."
echo ""

.venv/bin/python backend/app.py &
BACKEND_PID=$!

sleep 3

echo "[3/3] Opening dashboard in browser..."

if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:5000/frontend/index.html"
else
    echo "Please open http://localhost:5000/frontend/index.html"
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

wait $BACKEND_PID

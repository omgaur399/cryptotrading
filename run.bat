@echo off
echo Starting Trading Dashboard...
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

:: Install dependencies
echo [1/3] Installing Python dependencies...
cd backend
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

:: Start Flask backend
echo [2/3] Starting Flask backend on http://localhost:5000...
echo.
start python app.py

:: Wait a moment for server to start
timeout /t 3 /nobreak

:: Open frontend in browser
echo [3/3] Opening dashboard in browser...
start http://localhost:5000/frontend/index.html

echo.
echo ========================================
echo Trading Dashboard is running!
echo ========================================
echo.
echo Frontend:  http://localhost:5000/frontend/index.html
echo Backend:   http://localhost:5000
echo API:       http://localhost:5000/api
echo.
echo Close the backend terminal to stop the server.
echo Press Ctrl+C in the terminal to shut down.
echo.
pause

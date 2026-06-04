#!/usr/bin/env python3
"""
Test script to verify Trading Dashboard setup.
Run this before starting the full application.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_imports():
    """Test that all required modules can be imported."""
    print("[*] Testing imports...")
    
    try:
        import flask
        print("  [OK] Flask")
    except ImportError as e:
        print(f"  [FAIL] Flask: {e}")
        return False
    
    try:
        import flask_cors
        print("  [OK] Flask-CORS")
    except ImportError as e:
        print(f"  [FAIL] Flask-CORS: {e}")
        return False
    
    try:
        import yfinance
        print("  [OK] yfinance")
    except ImportError as e:
        print(f"  [FAIL] yfinance: {e}")
        return False
    
    try:
        import websocket
        print("  [OK] websocket-client")
    except ImportError as e:
        print(f"  [FAIL] websocket-client: {e}")
        return False
    
    try:
        import socketio
        print("  [OK] python-socketio")
    except ImportError as e:
        print(f"  [FAIL] python-socketio: {e}")
        return False
    
    return True

def test_data_source():
    """Test data_source module."""
    print("\n[*] Testing data_source module...")
    
    try:
        from data_source import (
            get_available_symbols,
            get_available_timeframes,
            validate_symbol,
            validate_timeframe,
        )
        
        # Test Hyperliquid
        symbols = get_available_symbols('hyperliquid')
        print(f"  [OK] Hyperliquid symbols: {len(symbols)} available")
        
        timeframes = get_available_timeframes('hyperliquid')
        print(f"  [OK] Hyperliquid timeframes: {timeframes}")
        
        # Test validation
        if validate_symbol('hyperliquid', 'BTC'):
            print("  [OK] Symbol validation works")
        
        if validate_timeframe('hyperliquid', '1d'):
            print("  [OK] Timeframe validation works")
        
        return True
    
    except Exception as e:
        print(f"  [FAIL] Error: {e}")
        return False

def test_hyperliquid():
    """Test hyperliquid module."""
    print("\n[*] Testing hyperliquid module...")
    
    try:
        from hyperliquid_handler import (
            fetch_hyperliquid_candles,
            HyperliquidLiveStream,
        )
        
        print("  [OK] Hyperliquid module imports successfully")
        print("  [NOTE] WebSocket test skipped (requires internet)")
        
        return True
    
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_flask_app():
    """Test Flask app can be created."""
    print("\n[*] Testing Flask app...")
    
    try:
        from app import app
        print("  [OK] Flask app created successfully")
        return True
    
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_frontend_files():
    """Test that frontend files exist."""
    print("\n[*] Testing frontend files...")
    
    files = [
        'frontend/index.html',
        'frontend/styles.css',
        'frontend/script.js',
    ]
    
    for file in files:
        path = os.path.join(os.path.dirname(__file__), file)
        if os.path.exists(path):
            size = os.path.getsize(path)
            print(f"  [OK] {file} ({size} bytes)")
        else:
            print(f"  [FAIL] {file} (not found)")
            return False
    
    return True

def main():
    """Run all tests."""
    print("=" * 60)
    print("[*] Trading Dashboard Setup Verification")
    print("=" * 60)
    
    results = []
    
    results.append(("Imports", test_imports()))
    results.append(("Data Source", test_data_source()))
    results.append(("Hyperliquid Handler", test_hyperliquid()))
    results.append(("Flask App", test_flask_app()))
    results.append(("Frontend Files", test_frontend_files()))
    
    print("\n" + "=" * 60)
    print("[*] Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"  [{status}]: {name}")
    
    print(f"\nResult: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n[SUCCESS] All tests passed! Ready to start.\n")
        print("Run: python backend/app.py")
        print("Then open: http://localhost:5000/frontend/index.html")
        return 0
    else:
        print("\n[WARNING] Some tests failed. Please review errors above.\n")
        return 1

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    sys.exit(main())

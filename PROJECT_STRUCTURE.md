# Project Structure

This document outlines the purpose of each major file in the Trading Dashboard project.

## Frontend

- **`frontend/index.html`**: The main HTML file that serves as the entry point for the entire application. It loads all necessary scripts and stylesheets.

- **`frontend/script.js`**: The core application controller. It manages the chart grid, state, data loading, real-time updates, and user interactions with the charts.

- **`frontend/styles.css`**: Contains all the CSS for the application, including the dark/light theme, responsive grid layouts, and styling for all UI components.

- **`frontend/drawing-primitives.js`**: The custom drawing engine built on top of the Lightweight Charts Primitive API. It defines the logic for drawing and interacting with tools like trendlines, rectangles, and position tools.

- **`frontend/paper-trading.js`**: Manages the entire paper trading module, including the paper account, positions, order history, and the UI for the trading panel.

- **`frontend/toolbar.js`**: Handles the logic for the left-side drawing toolbar, including tool selection and managing the state of dropdowns.

## Backend

- **`backend/app.py`**: The main Flask web server. It serves the frontend, provides all API endpoints for historical data, backtesting, and manages the real-time data stream.

- **`backend/data_source.py`**: A pluggable data layer responsible for fetching historical data. It contains handlers for different sources (like yfinance) and can be extended to support new brokers.

- **`backend/hyperliquid_handler.py`**: A specific data handler for connecting to the Hyperliquid API and WebSocket for real-time and historical crypto data.

- **`backend/backtesting_engine.py`**: Contains the logic for running trading strategies against historical data to evaluate their performance.

- **`backend/requirements.txt`**: Lists all the Python packages required for the backend to run.

## Root Directory

- **`README.md`**: Provides a general overview of the project, its features, and setup instructions.

- **`QUICKSTART.md`**: A simplified guide to get the project up and running quickly.

- **`run.bat` / `run.sh`**: Convenience scripts for Windows and macOS/Linux to automate the installation of dependencies and starting the application.
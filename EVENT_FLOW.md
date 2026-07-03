# Application Event Flow

This document details the complete execution flow for major user actions and asynchronous processes within the application. It identifies the modules involved, areas of high coupling, and critical performance paths.

---

## 1. User Action Flows

This section breaks down the sequence of events for each significant user interaction.

### Layout Changed (e.g., switching from 4 to 6 charts)

1.  **User Click**: User selects a new number from the "Display Charts" dropdown.
2.  **UI Event**: `change` event fires on the `#chart-count` element.
    -   **Module**: `script.js` (`initializeApp`)
3.  **Manager**: The event listener calls `setChartCount(newCount)`.
    -   **Module**: `script.js`
4.  **State Update**: `setChartCount` updates `state.chartCount` and saves the value to `localStorage`.
5.  **Orchestration**: `setChartCount` calls `renderGrid()`.
    -   **Module**: `script.js`
6.  **Chart Destruction**: `renderGrid` iterates through `state.charts`, calling `unsubscribeChart()` and `chart.remove()` for each existing chart. `state.charts` is cleared.
7.  **Chart Creation**: `renderGrid` loops from 1 to `state.chartCount`, calling `createChartPane()`, `initializeChart()`, and `loadChartData()` for each new chart pane. This repopulates the `state.charts` object.
8.  **Storage**: `saveLayoutState()` is called to persist the new default symbols/intervals.
    -   **Module**: `script.js`
9.  **Redraw**: The browser renders the new grid structure and the Lightweight Charts library renders the new chart instances.

### Symbol Changed

1.  **User Click**: User selects a new symbol from a chart's symbol search dropdown.
2.  **UI Event**: `click` event fires on a `.custom-select-option` element.
    -   **Module**: `script.js` (`populatePaneControls`)
3.  **Manager**: The event listener calls `switchChartSymbol(chartId, newSymbol)`.
    -   **Module**: `script.js`
4.  **Orchestration**: `switchChartSymbol` performs the following:
    -   Calls `unsubscribeChart()` for the old symbol.
    -   Updates properties on the `chartData` object (`chartData.symbol`, `chartData.instrumentId`, etc.).
    -   Calls `resetChart()` to clear all series data.
    -   Calls `loadChartData()` to fetch new historical data.
    -   Calls `saveLayoutState()` to persist the change.
5.  **API Request**: `loadChartData` sends a `fetch` request to the backend `/api/history` endpoint.
    -   **Module**: `script.js`
6.  **State Update**: The API response populates `chartData.cachedData`.
7.  **Redraw**: `syncChartWithCache()` is called, which uses `series.setData()` to render the new data on the chart and its indicators.

### Drawing Added (Trendline)

1.  **User Click**: User clicks the "Trendline" button in the toolbar.
2.  **UI Event**: `click` event fires on the toolbar button.
    -   **Module**: `toolbar.js`
3.  **Global Call**: The listener calls `window.setDrawingTool('trendline')`.
4.  **Manager**: The `setTool` method on the global `window.drawingManager` instance is called.
    -   **Module**: `script.js` (`DrawingManager` class)
5.  **State Update**: `drawingManager.activeTool` is set to `'trendline'`.
6.  **User Click**: User clicks on the chart to place the first point.
7.  **Chart Event**: The `chart.subscribeClick` handler fires.
    -   **Module**: `script.js`
8.  **Manager**: The handler calls `drawingManager.handleClick()`.
    -   A new `TrendlinePrimitive` is created and stored in `drawingManager.activeDrawing`.
    -   The primitive is attached to the chart via `candleSeries.attachPrimitive()`.
9.  **User Interaction**: User moves the mouse to position the second point.
10. **Chart Event**: `chart.subscribeCrosshairMove` fires continuously.
11. **Manager**: The handler calls `drawingManager.handleCrosshairMove()`, which updates the second point of the `activeDrawing` primitive, causing it to re-render on the canvas in real-time.
12. **User Click**: User clicks to place the second point.
13. **Manager**: `drawingManager.handleClick()` is called again.
    -   The drawing is marked as finished (`isFinished = true`).
    -   `savePrimitiveDrawing()` is called.
14. **Storage**: `savePrimitiveDrawing()` serializes the primitive's data and saves it to `state.drawings`, then persists the entire `state.drawings` object to `localStorage`.
    -   **Module**: `script.js`

### Paper Trade Opened (Market Order)

1.  **User Action**: User enters a quantity and clicks the "BUY / LONG" button.
2.  **UI Event**: `click` event fires on `#pt-buy-btn`.
    -   **Module**: `paper-trading.js`
3.  **Manager**: The listener calls `this.executeOrder('Long')`.
    -   **Module**: `paper-trading.js` (`PaperTrading` class)
4.  **State Update**:
    -   `executeOrder` validates the input and calls `this.positions.openPosition(...)`.
    -   `PaperPositions.openPosition()` creates a new position object and adds it to its internal `this.positions` array.
5.  **Storage**: `PaperPositions.save()` is called, serializing the positions array to `localStorage`.
    -   **Module**: `paper-positions.js`
6.  **Global Call**: `executeOrder` calls `window.refreshChartMarkers()`.
    -   **Module**: `paper-trading.js`
7.  **Chart Update**: `refreshChartMarkers` calls `updateMarkers()` on all charts. `updateMarkers()` gets the new marker data from `paperTrading.getChartMarkers()` and calls `candleSeries.setMarkers()` to render the new entry marker on the chart.
    -   **Module**: `script.js`
8.  **Redraw**: `executeOrder` calls `this.renderPositions()` to update the "Open Positions" table in the UI.
    -   **Module**: `paper-trading.js`

---

## 2. Asynchronous Flows

### WebSocket Tick

1.  **Connection**: `connectLiveStream()` establishes WebSocket connections to Binance and Hyperliquid.
    -   **Module**: `script.js`
2.  **Async Event**: The `onmessage` event for a WebSocket fires when a new trade tick arrives from the server.
3.  **Handler**: The `onmessage` callback parses the data and calls `handlePriceUpdate(tick)`.
4.  **Orchestration**: `handlePriceUpdate` finds all charts matching the tick's symbol and calls `applyPriceUpdate(chartData, tick)` for each.
5.  **State Update**: `applyPriceUpdate` updates the last candle in `chartData.cachedData` and calls `paperTrading.updatePrice()`.
6.  **Animation Frame**: `applyPriceUpdate` calls `requestAnimationFrame(flushChartUpdate)`. This is a critical performance optimization that batches UI updates.
7.  **Redraw (Hot Path)**: `flushChartUpdate` is executed by the browser just before the next repaint. It performs a series of high-frequency updates:
    -   `candleSeries.update()`: Updates the last candle on the main chart.
    -   `indicatorSeries.update()`: Updates the latest value for all visible indicators.
    -   `updateTicker()`: Updates the price/change text in the pane header.
    -   `flashTicker()`: Briefly adds a CSS class to flash the header background.
    -   `updateChartCountdown()`: Updates the timer on the price axis.
    -   `updateChartLegend()`: Updates the OHLC and indicator values in the top-left legend.

### Historical Data Loaded

1.  **Trigger**: `loadChartData(chartData)` is called (e.g., on chart creation or symbol change).
2.  **API Request**: An `async` `fetch` request is sent to the backend `/api/history` endpoint.
    -   **Module**: `script.js`
3.  **Backend**: The Flask server receives the request.
    -   **Module**: `backend/app.py`
    -   It queries its SQLite cache. If data is missing/stale, it fetches from the external Binance API, updates the cache, and returns the data.
    -   **Module**: `backend/data_source.py`
4.  **Async Response**: The `fetch` promise resolves in the frontend.
5.  **State Update**: The returned candle data is parsed and stored in `chartData.cachedData`.
6.  **Redraw**: `syncChartWithCache()` is called. This function performs a full data refresh:
    -   `candleSeries.setData(cachedData)`: Replaces all data in the main series.
    -   Indicator calculation functions (e.g., `calculateSMA`) are run on the entire `cachedData` array.
    -   `indicatorSeries.setData()`: Replaces all data for each indicator.
    -   `restoreDrawings()` and `updateMarkers()` are called to redraw all overlays on the new data.

---

## 3. Hot Paths & Coupling

### Top 10 Busiest Execution Paths

1.  **`flushChartUpdate`**: The absolute hot path. Called via `requestAnimationFrame` on every tick. Updates multiple chart series and UI elements.
2.  **`handleCrosshairMove`**: Fires on every pixel of mouse movement over a chart.
3.  **`updateChartLegend`**: Called by `handleCrosshairMove`. Can be slow as it reads data from multiple series and rebuilds HTML.
4.  **`drawingManager.handleCrosshairMove`**: Fires on every pixel of mouse movement when a drawing tool is active.
5.  **`applyPriceUpdate`**: The main orchestrator for a WebSocket tick.
6.  **`paperTrading.updatePrice`**: Called on every tick. Checks all pending orders and TP/SL levels.
7.  **`syncPositionLabels` (Paper Trading)**: Runs in a `requestAnimationFrame` loop to keep trade labels perfectly synced with the price axis during panning/zooming.
8.  **`drawingManager.bindDragHandles` (`onMouseMove`)**: Fires on every pixel of mouse movement over a chart to detect hovering over drawing handles.
9.  **`drawVolumeProfile` / `drawSessionBands`**: These canvas renderers are hooked into the chart's scale change events and re-render entirely on every pan or zoom.
10. **`handlePriceUpdate`**: The entry point for all live data processing.

### Highest Coupling Areas

1.  **`script.js` <-> `paper-trading.js`**: `script.js` directly calls `paperTrading.updatePrice()`. `paper-trading.js` directly calls `window.refreshChartMarkers()`. This is a tight, bidirectional coupling.
2.  **`script.js` <-> `toolbar.js`**: `toolbar.js` directly calls a method on the `drawingManager` instance, which is owned and defined within `script.js`.
3.  **The Global `state` Object**: Nearly every module (`script.js`, `toolbar.js`, `drawing-primitives.js`, `paper-trading.js`) directly reads from the global `state` object, creating a massive shared dependency. `state.charts` is the most dangerously coupled property.
4.  **Global Functions**: Functions like `saveDrawings`, `restoreDrawings`, and `clearAllDrawings` are defined globally in `script.js` and called from other modules, bypassing any clear interface.

### Recommended Future Event Bus Integration Points

To address the high coupling, an Event Bus should be used to invert dependencies:

-   **Price Updates**:
    -   **Emitter**: A new `WebSocketService` should `emit('price-update', { symbol, price, ... })`.
    -   **Receivers**: `Chart` instances and the `PaperTradingService` should listen `on('price-update', ...)`. This removes the direct call from `script.js` to `paperTrading.updatePrice`.

-   **Drawing Tool Selection**:
    -   **Emitter**: `toolbar.js` should `emit('tool-selected', { tool: 'trendline' })`.
    -   **Receiver**: The `DrawingManager` should listen `on('tool-selected', ...)`. This removes the `window.setDrawingTool` global call.

-   **Chart Marker Updates**:
    -   **Emitter**: The `PaperTradingService` should `emit('trade-executed')` or `emit('positions-changed')`.
    -   **Receiver**: `Chart` instances should listen `on('positions-changed', ...)` and call their own internal `updateMarkers` method. This removes the `window.refreshChartMarkers` global call.

-   **Historical Data**:
    -   **Emitter**: A new `APIService` should `emit('history-loaded', { chartId, data })` after a successful fetch.
    -   **Receiver**: The specific `Chart` instance that requested the data should listen `on('history-loaded', ...)` and update itself.


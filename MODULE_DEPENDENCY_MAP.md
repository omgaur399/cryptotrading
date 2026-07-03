# Frontend Module Dependency Map

This document provides a comprehensive analysis of each frontend JavaScript module, its responsibilities, dependencies, and a strategic plan for future modularization. This analysis was performed before any code refactoring.

---

## Module: `script.js`

-   **File Path**: `frontend/script.js`
-   **Primary Responsibility**: Acts as the monolithic core of the entire frontend application. It handles state management, application initialization, chart grid rendering, data fetching via API and WebSockets, and orchestrates all other subsystems (Drawing, Paper Trading, Indicators, etc.).
-   **Public Exports**:
    -   `window.drawingManager`: Global instance of the `DrawingManager` class.
    -   `window.paperTrading`: Global instance of the `PaperTrading` class.
    -   `window.clearAllDrawings()`: Deletes all drawings for all symbols.
    -   `window.refreshChartMarkers()`: Forces a redraw of all chart markers.
    -   `window.attachChartContextMenu()`: Binds the context menu to a chart.
    -   Implicitly exposes `state`, `CONFIG`, `TimeUtils`, and dozens of other functions to the global scope.
-   **Internal Helper Functions**: `initializeApp`, `renderGrid`, `loadChartData`, `applyPriceUpdate`, `handleCrosshairSync`, `openSettingsModal`, `toggleReplayMode`, and many more.
-   **Imported Modules**: `lightweight-charts.standalone.production.js`, `toolbar.js`, `drawing-primitives.js`. Dynamically loads `indicators.js` and the `paper-trading` suite.
-   **Global Variables Accessed**: Defines and mutates `state`, `CONFIG`, `TimeUtils`. Accesses `DrawingPrimitives` and `PaperTrading` classes from other scripts.
-   **Global Functions Called**: `window.setDrawingTool()` (defined in `toolbar.js`), `window.PaperTrading()`, `DrawingPrimitives.*`.
-   **LocalStorage Keys Used**: Reads and writes `trading-dashboard-chart-count`, `trading-dashboard-layout`, `trading-dashboard-theme`, `trading-dashboard-drawings`, `trading-dashboard-backtest`, `tdc-grid-sizes`, `trading-sidebar-collapsed`, `trading-sync-charts`.
-   **API Endpoints Used**: `/api/history`, `/api/live`, `/api/live/subscribe`, `/api/backtest`, and various external APIs (Binance, CoinGecko, Hyperliquid).
-   **WebSocket Usage**: Manages connections to `wss://stream.binance.com:9443/ws` and `wss://api.hyperliquid.xyz/ws` for live trade and L2 book data.
-   **DOM Elements Manipulated**: Nearly all elements, including `#charts-grid`, `#connection-status`, `#global-right-sidebar`, and all dynamically generated chart pane elements.
-   **Events Listened For**: `DOMContentLoaded`, `visibilitychange`, and numerous `click`, `change`, `mousedown`, `mousemove`, `mouseup`, `dblclick`, and `contextmenu` events on various elements.
-   **Events Triggered**: None explicitly (uses direct function calls).
-   **Modules Depending on This File**: `toolbar.js`, `paper-trading.js`, and `drawing-primitives.js` all rely on global functions and state defined within `script.js`.
-   **Modules This File Depends On**: `toolbar.js`, `drawing-primitives.js`, `paper-trading.js`, `indicators.js`.

### Risk Analysis

-   **Risk Level**: **CRITICAL**
-   **Reason**: This file is the application's central nervous system. Any change carries a high risk of causing cascading failures across unrelated features due to the tight coupling and shared global state. Its monolithic nature makes it impossible to reason about changes in isolation.

### Safe Extraction

-   **Can this module be extracted?**: **NO**
-   **Reason**: It cannot be extracted as a whole. Instead, it must be systematically dismantled by extracting smaller, independent pieces of logic (like `TimeUtils` or the API fetching logic) into new, self-contained modules.

### Future Owner

-   **Current**: `script.js`
-   **Future**: This file will eventually be replaced by a lean entry point (`main.js`) and a `GridManager.js` or `App.js` that orchestrates other independent modules.

---

## Module: `toolbar.js`

-   **File Path**: `frontend/toolbar.js`
-   **Primary Responsibility**: Manages the UI state and event handling for the left-side drawing toolbar, including tool selection and dropdown menus.
-   **Public Exports**: `window.setDrawingTool()`.
-   **Internal Helper Functions**: None (all logic is within a `DOMContentLoaded` listener).
-   **Imported Modules**: None directly.
-   **Global Variables Accessed**: `state`, `window.drawingManager`.
-   **Global Functions Called**: `window.clearAllDrawings()`.
-   **LocalStorage Keys Used**: None.
-   **API Endpoints Used**: None.
-   **WebSocket Usage**: None.
-   **DOM Elements Manipulated**: `#drawing-toolbar`, `.toolbar-btn`, `#shape-group`, `#shape-dropdown`, `#clear-drawings-btn`.
-   **Events Listened For**: `DOMContentLoaded`, `click`.
-   **Events Triggered**: None (calls `window.setDrawingTool` directly).
-   **Modules Depending on This File**: `script.js` depends on `window.setDrawingTool` being globally available.
-   **Modules This File Depends On**: `script.js` (for `state`, `drawingManager`, and `clearAllDrawings`).

### Risk Analysis

-   **Risk Level**: **LOW**
-   **Reason**: Its responsibilities are confined to the toolbar UI. Its only major dependency is the `window.setDrawingTool` function, which can be easily replaced with an event emission system.

### Safe Extraction

-   **Can this module be extracted?**: **YES**
-   **Reason**: This is a prime candidate for early extraction. It can be converted into a class or module that emits events (e.g., `tool-selected`) instead of calling a global function, completely decoupling it from `script.js`.

### Future Owner

-   **Current**: `toolbar.js`
-   **Future**: `features/toolbar/Toolbar.js`

---

## Module: `drawing-primitives.js`

-   **File Path**: `frontend/drawing-primitives.js`
-   **Primary Responsibility**: Defines the rendering logic for all custom drawing tools (Trendline, Rectangle, Position Tools, etc.) using the Lightweight Charts Primitive API.
-   **Public Exports**: `window.DrawingPrimitives` object containing all primitive classes (e.g., `TrendlinePrimitive`).
-   **Internal Helper Functions**: `intervalToSeconds`, `safePriceToCoordinate`.
-   **Imported Modules**: None directly.
-   **Global Variables Accessed**: `window.state` (to get chart data for coordinate calculations).
-   **Global Functions Called**: `DrawingManager.getTimeFromLogical`.
-   **LocalStorage Keys Used**: None.
-   **API Endpoints Used**: None.
-   **WebSocket Usage**: None.
-   **DOM Elements Manipulated**: None (renders directly to the chart canvas).
-   **Events Listened For**: None.
-   **Events Triggered**: None.
-   **Modules Depending on This File**: `script.js` (instantiates these primitive classes within the `DrawingManager`).
-   **Modules This File Depends On**: `script.js` (for `state` and `DrawingManager` helpers).

### Risk Analysis

-   **Risk Level**: **MEDIUM**
-   **Reason**: The rendering logic itself is self-contained, but the classes have implicit dependencies on the global `state` and `DrawingManager` to convert time/price to pixel coordinates. Refactoring requires careful dependency injection.

### Safe Extraction

-   **Can this module be extracted?**: **YES**
-   **Reason**: The file is already a module of sorts. The main task is to remove its reliance on global variables by passing necessary chart data and utility functions into the primitive's constructor or `attached` method.

### Future Owner

-   **Current**: `drawing-primitives.js`
-   **Future**: `features/drawing/primitives/` (with each primitive in its own file, e.g., `Trendline.js`).

---

## Module: `paper-trading.js` (and its dependencies)

-   **File Path**: `frontend/paper-trading.js` (also `paper-account.js`, `paper-positions.js`, `paper-history.js`).
-   **Primary Responsibility**: Manages the entire paper trading subsystem, including account balance, position management, order history, and the UI panel.
-   **Public Exports**: `window.PaperTrading` class.
-   **Internal Helper Functions**: `formatPrice`, `formatOHM`, `formatDate`, `updateLivePnL`, etc.
-   **Imported Modules**: `paper-account.js`, `paper-positions.js`, `paper-history.js`.
-   **Global Variables Accessed**: `state` (to get active chart symbol and data).
-   **Global Functions Called**: `window.refreshChartMarkers()`, `window.switchChartSymbol()`.
-   **LocalStorage Keys Used**: `paper-account`, `paper-positions`, `paper-history`.
-   **API Endpoints Used**: None.
-   **WebSocket Usage**: None directly (receives price updates from `script.js`).
-   **DOM Elements Manipulated**: `#paper-trade-panel` and all its child elements.
-   **Events Listened For**: `click` and `change` events on its own UI elements.
-   **Events Triggered**: None (calls global functions).
-   **Modules Depending on This File**: `script.js` (instantiates and calls methods on `window.paperTrading`).
-   **Modules This File Depends On**: `script.js` (for price updates and chart interactions).

### Risk Analysis

-   **Risk Level**: **MEDIUM**
-   **Reason**: The module is already well-encapsulated into its own set of classes. The main risk comes from its interaction points with `script.js`. It relies on `script.js` to feed it price updates and calls global functions to update chart markers.

### Safe Extraction

-   **Can this module be extracted?**: **YES**
-   **Reason**: This is a strong candidate for extraction. The refactoring work would involve replacing the direct method calls from `script.js` with an event-based system. The `PaperTrading` module would listen for `price-update` events and `emit` its own events like `trade-executed` or `position-updated`.

### Future Owner

-   **Current**: `paper-trading.js`
-   **Future**: `features/paper-trading/PaperTradingService.js`

---

## Circular Dependency Analysis

The current architecture's primary circular dependency risk is centered around `script.js`.

### `script.js` <-> `DrawingManager`

-   **Current Dependency**:
    1.  `script.js` creates an instance of `DrawingManager`.
    2.  The `DrawingManager` (defined in `script.js`) calls `window.setDrawingTool()` (defined in `toolbar.js`) to update the UI.
    3.  `toolbar.js` calls back into `window.setDrawingTool()`, which in turn modifies the `drawingManager` instance on `script.js`.

-   **Possible Modular Dependency**:
    1.  `Chart.js` would import and instantiate `DrawingManager.js`.
    2.  `DrawingManager.js` would need to access the chart instance from `Chart.js` to draw on it, creating a circular import (`Chart` -> `DrawingManager` -> `Chart`).

-   **Recommended Solution**: **Dependency Inversion via an Event Bus.**
    1.  Introduce a global `EventBus`.
    2.  The `Toolbar` module will `emit('tool-selected', toolName)`.
    3.  The `DrawingManager` will listen for the `tool-selected` event and update its internal state.
    4.  The `DrawingManager` will be instantiated with a reference to the chart instance, breaking the circular import. It will not need to know about the `Chart` module itself, only the chart object it's passed.

### `script.js` <-> `PaperTrading`

-   **Current Dependency**:
    1.  `script.js` instantiates `PaperTrading`.
    2.  `script.js` calls `paperTrading.updatePrice()` on every WebSocket tick.
    3.  `paperTrading` calls `window.refreshChartMarkers()` (defined in `script.js`) after a trade.

-   **Possible Modular Dependency**:
    1.  `App.js` would import and create a `PaperTradingService`.
    2.  `WebSocketService` would receive a price tick and need to inform the `PaperTradingService`.
    3.  `PaperTradingService` would execute a trade and need to inform the `Chart` module to re-render its markers. This creates a complex web of dependencies.

-   **Recommended Solution**: **Event Bus.**
    1.  `WebSocketService` emits a generic `price-update` event.
    2.  `PaperTradingService` listens for `price-update` and runs its logic.
    3.  If a trade is executed, `PaperTradingService` emits a `trade-history-updated` event.
    4.  The `Chart` module listens for `trade-history-updated` and calls its internal method to refresh its markers. This keeps all modules decoupled.

---

## Conclusion

### Recommended Extraction Order

1.  **Utilities & Config**: Create an `EventBus.js`, then extract `CONFIG` and `TimeUtils` into their own files. These are stateless and carry zero risk.
2.  **Toolbar**: Refactor `toolbar.js` to use the new `EventBus`. This is a low-risk change that proves the eventing model.
3.  **Services (API & WebSockets)**: Create dedicated service modules for API calls and WebSocket management. These modules will emit events with data instead of directly calling functions in `script.js`.
4.  **Paper Trading**: Decouple the `PaperTrading` module by making it listen to `price-update` events and emit its own events.
5.  **Drawing Engine**: Extract the `DrawingManager` class and refactor it to listen for events from the toolbar. This is a high-risk step.
6.  **Chart Class**: Create a `Chart.js` class that encapsulates a single chart's lifecycle, instantiating its own `DrawingManager` and `IndicatorEngine`.
7.  **Grid Manager**: Finally, refactor the remaining logic in `script.js` into a `GridManager.js` responsible only for managing the layout of `Chart` components.

### Files to Leave Untouched Initially

-   **`drawing-primitives.js`**: The low-level rendering logic is complex but has few external dependencies. It can be refactored last, after its parent `DrawingManager` is stable.
-   **`paper-account.js`, `paper-positions.js`, `paper-history.js`**: The internal logic of the paper trading system is already well-structured. The initial focus should be on refactoring the main `paper-trading.js` entry point's communication, not rewriting these underlying classes.

### Highest Risk Modules

1.  **`script.js` (as `DrawingManager`)**: The drawing logic is deeply intertwined with the chart instance, global state, and user input events.
2.  **`script.js` (as `IndicatorEngine`)**: The indicator logic depends on direct access to the chart's series objects and cached data.

### Lowest Risk Modules

1.  **`toolbar.js`**: UI-only logic that can be easily decoupled.
2.  **`CONFIG` and `TimeUtils` objects within `script.js`**: Stateless utilities.

### Top 10 Safest First Refactors

1.  Create `utils/EventBus.js`.
2.  Create `config.js` and move the `CONFIG` object into it.
3.  Create `utils/time.js` and move the `TimeUtils` object into it.
4.  Update `index.html` to load these new utility scripts.
5.  Refactor `toolbar.js` to `emit('tool-selected')` instead of calling `window.setDrawingTool`.
6.  Update `script.js` to listen for the `tool-selected` event.
7.  Create `services/api.js` and move the `loadInstruments` function into it.
8.  Move the `fetchMarketMovers` function into the `api.js` service.
9.  Create `services/websockets.js` and move the `connectLiveStream` logic into it.
10. Move the `COMMON_IDS` map from `script.js` into a new `constants.js` file.
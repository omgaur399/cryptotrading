# Global State Map

This document provides a comprehensive analysis of the application's global state, its dependencies, and a strategic plan for refactoring towards a more modular and maintainable architecture.

---

## 1. Global State Object Analysis

This section details each major global variable, its purpose, and its interactions across the application.

### Global Variable: `state`

-   **Owner Module**: `frontend/script.js`
-   **Initialization Location**: Defined as a global literal object at the top of `script.js`. Properties are populated throughout `initializeApp()`.
-   **Read By**:
    -   `script.js` (virtually all functions)
    -   `toolbar.js` (accesses `state.charts` and `state.activeChartId`)
    -   `drawing-primitives.js` (accesses `state.charts` for coordinate calculations)
    -   `paper-trading.js` (accesses `state.charts`, `state.activeChartId`, and `state.backtest`)
-   **Written By**: `script.js` is the primary writer, modifying properties on events like data loading, UI interaction, and WebSocket messages.
-   **Mutated By**: `script.js`, `paper-trading.js` (mutates `state.backtest`).
-   **Persistence Layer**: Parts of the state are persisted to `localStorage` through dedicated functions (`saveLayoutState`, `saveDrawings`).
-   **Lifecycle**: Created when `script.js` is loaded. Lives for the entire duration of the application session.
-   **Purpose**: Acts as the single source of truth for the entire application, holding chart data, UI state, network connections, and more.
-   **Risk Level**: **CRITICAL**. As the central, monolithic state object, any part of the application can read or write to any other part's state, creating extreme coupling and a high risk of unintended side effects.

### Global Variable: `window.drawingManager`

-   **Owner Module**: `frontend/script.js`
-   **Initialization Location**: Instantiated from the `DrawingManager` class within `script.js` and attached to the `window` object.
-   **Read By**:
    -   `script.js` (to handle drawing clicks and moves)
    -   `toolbar.js` (to set the active drawing tool)
-   **Written By**: `script.js` (initial assignment).
-   **Mutated By**: `toolbar.js` (calls `setTool()`), `script.js` (manages `activeDrawing` state).
-   **Persistence Layer**: None directly. The drawings it manages are persisted via the `state.drawings` object.
-   **Lifecycle**: Created once during `initializeApp()`.
-   **Purpose**: Manages the state of the active drawing tool and orchestrates the creation and interaction with `DrawingPrimitives` on the charts.
-   **Risk Level**: **HIGH**. It's a complex stateful object tightly coupled to both the UI (`toolbar.js`) and the core chart logic (`script.js`), creating a potential for circular dependencies.

### Global Variable: `window.paperTrading`

-   **Owner Module**: `frontend/paper-trading.js`
-   **Initialization Location**: Instantiated from the `PaperTrading` class in `script.js` during `initializeApp()` and attached to the `window` object.
-   **Read By**: `script.js` (to update prices and get chart markers).
-   **Written By**: `script.js` (initial assignment).
-   **Mutated By**: `script.js` (calls `updatePrice()`, `setActiveSymbol()`), `paper-trading.js` (manages its own internal state).
-   **Persistence Layer**: `localStorage` (keys: `pt_balance`, `pt_positions`, `pt_history`). The module manages its own persistence internally.
-   **Lifecycle**: Created once during `initializeApp()`.
-   **Purpose**: Encapsulates all logic and state for the paper trading subsystem.
-   **Risk Level**: **MEDIUM**. While it's a large stateful module, its concerns are well-encapsulated. The primary risk comes from its direct, method-call-based communication with `script.js`.

### Global Variable: `CONFIG`

-   **Owner Module**: `frontend/script.js`
-   **Initialization Location**: Defined as a global literal object at the top of `script.js`.
-   **Read By**: `script.js`, `paper-trading.js`.
-   **Written By**: `script.js` (initial definition).
-   **Mutated By**: None (treated as a constant).
-   **Persistence Layer**: None.
-   **Lifecycle**: Created when `script.js` is loaded.
-   **Purpose**: Stores static configuration values for the application.
-   **Risk Level**: **LOW**. It is a stateless, read-only object. The only risk is that it's globally accessible.

---

## 2. Global `state` Object Property Map

This table breaks down the properties of the main `state` object.

| Global Variable         | Owner       | Read By                                                              | Written By                                | Future Owner          | Risk   |
| ----------------------- | ----------- | -------------------------------------------------------------------- | ----------------------------------------- | --------------------- | ------ |
| `state.charts`          | `script.js` | `script.js`, `paper-trading.js`, `drawing-primitives.js`, `toolbar.js` | `script.js` (on init, symbol/interval change) | `GridManager.js`      | **CRITICAL** |
| `state.drawings`        | `script.js` | `script.js` (for rendering), `DrawingManager`                        | `DrawingManager` (via `savePrimitiveDrawing`) | `DrawingService.js`   | **HIGH**   |
| `state.backtest`        | `script.js` | `paper-trading.js` (for display)                                     | `script.js` (on API response)             | `BacktestService.js`  | Medium |
| `state.chartCount`      | `script.js` | `script.js` (for rendering grid)                                     | `script.js` (on UI interaction)           | `GridManager.js`      | Low    |
| `state.activeChartId`   | `script.js` | `script.js`, `paper-trading.js`, `toolbar.js`                        | `script.js` (on chart click)              | `GridManager.js`      | Medium |
| `state.syncCharts`      | `script.js` | `script.js` (in crosshair/scale sync logic)                          | `script.js` (on UI toggle)                | `GridManager.js`      | Low    |
| `state.theme`           | `script.js` | `script.js` (for chart options)                                      | `script.js` (on UI toggle)                | `ThemeService.js`     | Low    |
| `state.hlWs`            | `script.js` | `script.js` (for connection status)                                  | `script.js` (in `connectLiveStream`)      | `WebSocketService.js` | Medium |
| `state.binanceWs`       | `script.js` | `script.js` (for connection status)                                  | `script.js` (in `connectLiveStream`)      | `WebSocketService.js` | Medium |
| `state.connected`       | `script.js` | `script.js` (for UI status indicator)                                | `script.js` (in `updateConnectionStatus`) | `WebSocketService.js` | Low    |

---

## 3. State Classification

The properties of the global `state` object can be grouped into the following logical domains:

-   **Chart State**: `state.charts` (holds individual chart instances, series, cached data).
-   **Drawing State**: `state.drawings` (the serialized representation of all user drawings).
-   **Paper Trading State**: `window.paperTrading`'s internal state (`account`, `positions`, `history`).
-   **Backtest/Replay State**: `state.backtest`, `state.replay`.
-   **Layout State**: `state.chartCount`, `tdc-grid-sizes` (in `localStorage`).
-   **UI State**: `state.activeChartId`, `state.syncCharts`, `state.theme`, `trading-sidebar-collapsed` (in `localStorage`).
-   **Network State**: `state.hlWs`, `state.binanceWs`, `state.connected`.
-   **Storage State**: `state.instruments` (loaded from API).

---

## 4. Mutation Analysis

### `state.charts`

-   **Who changes it?** `script.js` is the exclusive mutator. It adds/removes chart objects when the grid layout changes and updates `cachedData` within each chart object when new data arrives.
-   **How often?** On initial load, on any layout change (infrequent), and the `cachedData` property is mutated on every single WebSocket tick for every active chart.
-   **Dependencies?** **All other modules** depend on this structure to get chart data, series instances for drawing, and symbol information.
-   **Immutable?** No, the `cachedData` array is highly mutable for performance. Making it immutable would require re-creating large arrays on every tick, causing significant performance degradation.
-   **Encapsulated?** **Yes, this is the highest priority for encapsulation.** Each chart instance should manage its own state internally. A `GridManager` would manage the collection of chart instances, but not their internal data.

### `state.drawings`

-   **Who changes it?** The `DrawingManager` (defined in `script.js`) is the sole mutator, calling `savePrimitiveDrawing` after a drawing is created or modified.
-   **How often?** Only on user interaction (creating, moving, or deleting a drawing).
-   **Dependencies?** `script.js` reads it on chart load to restore drawings.
-   **Immutable?** It could be, but the benefits are low given the infrequency of changes.
-   **Encapsulated?** **Yes.** This state should be owned entirely by a `DrawingService` or `DrawingState` manager, which would be responsible for both managing the in-memory state and handling persistence to `localStorage`.

---

## 5. Future State Ownership

| Current State Variable    | Current Owner | Recommended Future Owner         |
| ------------------------- | ------------- | -------------------------------- |
| `state.charts`            | `script.js`   | `GridManager.js` / `Chart.js`    |
| `state.drawings`          | `script.js`   | `DrawingService.js`              |
| `state.backtest`          | `script.js`   | `BacktestService.js`             |
| `state.replay`            | `script.js`   | `ReplayService.js`               |
| `state.chartCount`        | `script.js`   | `GridManager.js`                 |
| `state.activeChartId`     | `script.js`   | `GridManager.js`                 |
| `state.syncCharts`        | `script.js`   | `GridManager.js`                 |
| `state.theme`             | `script.js`   | `ThemeService.js` or `UIService.js` |
| `state.hlWs`, `state.binanceWs` | `script.js`   | `WebSocketService.js`            |
| `window.drawingManager`   | `script.js`   | `DrawingService.js`              |
| `window.paperTrading`     | `script.js`   | `PaperTradingService.js`         |
| `CONFIG`                  | `script.js`   | `config.js`                      |
| `TimeUtils`               | `script.js`   | `utils/time.js`                  |

---

## 6. Summary & Recommendations

### Most Dangerous Shared State

1.  **`state.charts`**: This is the most critical and dangerous piece of shared state. Its `cachedData` property is mutated on every tick, and its structure is directly accessed by almost every other module. Any change to its shape or data flow risks cascading failures across the entire application.
2.  **`window.drawingManager`**: As a complex, stateful class instance living on the global scope, its methods can be called by anyone. The tight loop between `toolbar.js` calling its methods and it calling global functions defined in `script.js` is a major source of coupling.

### Safest State to Extract First

1.  **`CONFIG` and `TimeUtils`**: These are stateless, read-only objects. Extracting them into their own utility modules (`config.js`, `utils/time.js`) is a zero-risk operation and a perfect first step.
2.  **`state.theme`**: This is a simple value that only affects styling. It can be easily encapsulated into a `ThemeService` that listens for a UI event and applies the theme class to `document.body`.

### Recommended State Extraction Order

The strategy should be to isolate state domain by domain, starting with the least coupled.

1.  **Stateless Utilities**: Extract `CONFIG` and `TimeUtils` into their own files.
2.  **Network State**: Encapsulate all WebSocket logic (`hlWs`, `binanceWs`, `connected`) into a `WebSocketService.js`. This service should not know about charts; it should only connect, receive messages, and emit generic events (e.g., `eventBus.emit('price-update', { symbol, price })`).
3.  **UI State**: Encapsulate simple UI state like `state.theme` and `state.syncCharts` into a `UIService.js` that manages UI controls and emits events.
4.  **Paper Trading State**: Decouple `paper-trading.js`. Instead of `script.js` calling `paperTrading.updatePrice()`, the `PaperTradingService` should listen for the `price-update` event from the `WebSocketService`. This breaks a major dependency on `script.js`.
5.  **Drawing State**: Encapsulate `state.drawings` and the `DrawingManager` into a `DrawingService.js`. This service will manage the state and persistence of drawings.
6.  **Chart State**: This is the final and most complex step. Create a `Chart.js` class that owns its own state (data, indicators, etc.). Refactor the remaining logic in `script.js` into a `GridManager.js` whose only job is to create, destroy, and manage the layout of these `Chart` instances.


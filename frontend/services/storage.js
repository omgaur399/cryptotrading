/**
 * =============================================================================
 * StorageService
 * =============================================================================
 * Purpose:
 * Centralizes all browser storage (localStorage) interactions into a single module.
 * 
 * Responsibilities:
 * - Safely read and write to localStorage without throwing unhandled exceptions.
 * - Handle JSON parsing and stringification.
 * - Provide backward-compatible defaults.
 * - Manage storage keys consistently.
 * 
 * Supported storage categories:
 * - Theme
 * - Chart Layouts
 * - Drawings
 * - Replay Settings
 * - Grid Sizes
 * - User Preferences (Timezone, Sidebar, Sync, Active Tab)
 * - Watchlist (Symbols, Open State)
 * - Paper Trading (Positions, Orders, History, Balance)
 * 
 * Public API:
 * - getTheme() / saveTheme(theme)
 * - getLayout() / saveLayout(layout)
 * - getDrawings() / saveDrawings(drawings)
 * - getBacktest() / saveBacktest(data) / clearBacktest()
 * - getGridSizes() / saveGridSizes(sizes)
 * - getTimeZone(defaultTz) / saveTimeZone(tz)
 * - getSidebarCollapsed() / saveSidebarCollapsed(collapsed)
 * - getSyncCharts() / saveSyncCharts(sync)
 * - getChartCount(defaultCount) / saveChartCount(count)
 * - getActiveTab() / saveActiveTab(tab)
 * - getWatchlistSymbols() / saveWatchlistSymbols(symbols)
 * - getWatchlistOpen() / saveWatchlistOpen(isOpen)
 * - getPaperTradingPositions() / savePaperTradingPositions(positions)
 * - getPaperTradingOrders() / savePaperTradingOrders(orders)
 * - getPaperTradingHistory() / savePaperTradingHistory(history)
 * - getPaperTradingBalance() / savePaperTradingBalance(balance)
 */

const StorageService = {
    // --- Core Wrapper Methods ---
    _getItem(key, defaultValue = null) {
        try {
            const val = localStorage.getItem(key);
            return val !== null ? val : defaultValue;
        } catch (e) {
            console.warn(`StorageService: Error reading key "${key}":`, e);
            return defaultValue;
        }
    },

    _setItem(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.warn(`StorageService: Error setting key "${key}":`, e);
            return false;
        }
    },

    _getJSON(key, defaultValue = null) {
        try {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : defaultValue;
        } catch (e) {
            console.warn(`StorageService: Error parsing JSON for key "${key}":`, e);
            return defaultValue;
        }
    },

    _setJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn(`StorageService: Error stringifying JSON for key "${key}":`, e);
            return false;
        }
    },

    _removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn(`StorageService: Error removing key "${key}":`, e);
            return false;
        }
    },

    // --- Specific API Methods ---

    // Theme
    getTheme() {
        return this._getItem(CONFIG.THEME_STORAGE_KEY, "dark");
    },
    saveTheme(theme) {
        this._setItem(CONFIG.THEME_STORAGE_KEY, theme);
    },

    // Layouts
    getLayout() {
        return this._getJSON(CONFIG.LAYOUT_STORAGE_KEY, null);
    },
    saveLayout(layout) {
        this._setJSON(CONFIG.LAYOUT_STORAGE_KEY, layout);
    },

    // Drawings
    getDrawings() {
        return this._getItem(CONFIG.DRAWINGS_STORAGE_KEY, null); // Return raw string for script.js compatibility
    },
    saveDrawings(drawings) {
        this._setJSON(CONFIG.DRAWINGS_STORAGE_KEY, drawings);
    },

    // Backtest / Replay
    getBacktest() {
        return this._getItem(CONFIG.BACKTEST_STORAGE_KEY, null); // Return raw string for script.js compatibility
    },
    saveBacktest(data) {
        this._setJSON(CONFIG.BACKTEST_STORAGE_KEY, data);
    },
    clearBacktest() {
        this._removeItem(CONFIG.BACKTEST_STORAGE_KEY);
    },

    // Grid Sizes
    getGridSizes() {
        return this._getItem(GRID_SIZES_KEY, null); // Return raw string for script.js compatibility
    },
    saveGridSizes(sizes) {
        this._setJSON(GRID_SIZES_KEY, sizes);
    },

    // Preferences
    getTimeZone(defaultTz) {
        return this._getItem("trading-dashboard-tz", defaultTz);
    },
    saveTimeZone(tz) {
        this._setItem("trading-dashboard-tz", tz);
    },

    getSidebarCollapsed() {
        return this._getItem("trading-sidebar-collapsed") === "true";
    },
    saveSidebarCollapsed(collapsed) {
        this._setItem("trading-sidebar-collapsed", String(collapsed));
    },

    getSyncCharts() {
        return this._getItem("trading-sync-charts") === "true";
    },
    saveSyncCharts(sync) {
        this._setItem("trading-sync-charts", String(sync));
    },

    getChartCount(defaultCount) {
        const val = this._getItem(CONFIG.STORAGE_KEY);
        return val ? Number(val) : defaultCount;
    },
    saveChartCount(count) {
        this._setItem(CONFIG.STORAGE_KEY, String(count));
    },

    getActiveTab() {
        return this._getItem('trading-dashboard-active-tab', '0');
    },
    saveActiveTab(tabIndex) {
        this._setItem('trading-dashboard-active-tab', String(tabIndex));
    },

    // Watchlist
    getWatchlistSymbols() {
        const raw = this._getItem('watchlist_symbols');
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            } catch(e) {
                // fall through
            }
        }
        return null;
    },
    saveWatchlistSymbols(symbols) {
        this._setJSON('watchlist_symbols', symbols);
    },

    getWatchlistOpen() {
        return this._getItem('watchlist_open') === 'true';
    },
    saveWatchlistOpen(isOpen) {
        this._setItem('watchlist_open', isOpen ? 'true' : 'false');
    },

    // Paper Trading
    getPaperTradingPositions() {
        return this._getJSON('pt_positions', []);
    },
    savePaperTradingPositions(positions) {
        this._setJSON('pt_positions', positions);
    },

    getPaperTradingOrders() {
        return this._getJSON('pt_orders', []);
    },
    savePaperTradingOrders(orders) {
        this._setJSON('pt_orders', orders);
    },

    getPaperTradingHistory() {
        return this._getJSON('pt_history', []);
    },
    savePaperTradingHistory(history) {
        this._setJSON('pt_history', history);
    },

    getPaperTradingBalance() {
        const saved = this._getItem('pt_balance');
        return saved !== null ? saved : null;
    },
    savePaperTradingBalance(balance) {
        this._setItem('pt_balance', typeof balance === 'number' ? balance.toFixed(4) : String(balance));
    }
};

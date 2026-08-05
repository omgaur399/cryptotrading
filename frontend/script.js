


const state = StateManager.createInitialState();

document.addEventListener("DOMContentLoaded", () => {
    DrawingManagerService.initialize({
        state,
        DrawingService,
        StorageService,
        ModalService: window.ModalService,
        TimeUtils,
        intervalToSeconds,
        paperTrading: window.paperTrading
    });

    SyncManagerService.initialize({
        state,
        TimeUtils,
        ChartLegendService,
        LayoutService,
        formatPrice,
        getIntervalSeconds
    });

    BacktestService.initialize({
        state,
        ApiService,
        StorageService,
        ModalService: window.ModalService,
        GridManagerService,
        DrawingManagerService,
        paperTrading: window.paperTrading
    });

    IndicatorUiService.initialize({
        state,
        ModalService: window.ModalService,
        LayoutService,
        OverlayService,
        IndicatorService,
        ChartLegendService,
        GridManagerService
    });

    GridManagerService.initialize({
        state,
        CONFIG: window.CONFIG,
        StorageService,
        LayoutService,
        ChartBuilderService,
        ChartDataService,
        ChartService,
        MarketWidgetService,
        WatchlistService,
        ReplayService,
        IndicatorService,
        OverlayService,
        DrawingManagerService,
        ChartLegendService,
        ApiService,
        TimeUtils,
        formatPrice,
        getAssetName: window.getAssetName,
        updateChartPriceFormat: (cd, p) => updateChartPriceFormat(cd, p),
        updateVpvrMarginAndScroll: IndicatorUiService.updateVpvrMarginAndScroll,
        syncTimeScales: SyncManagerService.syncTimeScales
    });

    ChartLegendService.initialize({
        state,
        TimeUtils,
        formatPrice,
        formatCountdown,
        getCountdownMs,
        calculateLatestSMA: typeof calculateLatestSMA !== 'undefined' ? calculateLatestSMA : null,
        calculateLatestEMA: typeof calculateLatestEMA !== 'undefined' ? calculateLatestEMA : null,
        calculateLatestRSI: typeof calculateLatestRSI !== 'undefined' ? calculateLatestRSI : null,
        calculateLatestVWAP: typeof calculateLatestVWAP !== 'undefined' ? calculateLatestVWAP : null,
        calculateLatestATR: typeof calculateLatestATR !== 'undefined' ? calculateLatestATR : null,
        calculateLatestBB: typeof calculateLatestBB !== 'undefined' ? calculateLatestBB : null,
        LayoutService,
        OverlayService,
        IndicatorService,
        StorageService,
        ChartDataService,
        openSettingsModal: IndicatorUiService.openSettingsModal,
        saveLayoutState: GridManagerService.saveLayoutState,
        updateVpvrMarginAndScroll: IndicatorUiService.updateVpvrMarginAndScroll
    });

    ChartDataService.initialize({
        state, ApiService, restoreDrawings: DrawingManagerService.restoreDrawings, updateMarkers: DrawingManagerService.updateMarkers, updateChartPriceFormat, 
        updateTicker: ChartLegendService.updateTicker, clearPaneMessage: ChartLegendService.clearPaneMessage, setDataStatus: ChartLegendService.setDataStatus, updateChartCountdown: ChartLegendService.updateChartCountdown, 
        renderBacktestResults: BacktestService.renderBacktestResults, setPaneMessage: ChartLegendService.setPaneMessage, getIntervalSeconds, 
        IndicatorService, OverlayService, LayoutService, updateChartLegend: ChartLegendService.updateLegend, 
        updateConnectionStatus: ChartLegendService.updateConnectionStatus, AlertService, bucketTime, CONFIG, normalizeCandle, restorePrimitiveDrawings: DrawingManagerService.restorePrimitiveDrawings, flashTicker: ChartLegendService.flashTicker
    });

    AppBootstrap.initialize({
        state,
        StorageService,
        ThemeService,
        readSavedChartCount: GridManagerService.readSavedChartCount,
        loadDependencies,
        setChartCount: GridManagerService.setChartCount,
        openBacktestModal: BacktestService.openBacktestModal,
        TimeUtils,
        toggleTheme: () => ThemeService.toggleTheme(state, StorageService, DrawingManagerService),
        connectLiveStream: ChartDataService.Live.connectStream,
        loadInstruments: GridManagerService.loadInstruments,
        renderGrid: GridManagerService.renderGrid,
        updateTimestamp: ChartLegendService.updateTimestamp,
        MarketWidgetService,
        fetchMarketMovers: MarketWidgetService.fetchMarketMovers,
        WatchlistService,
        switchChartSymbol: GridManagerService.switchChartSymbol,
        updateCountdowns: ChartLegendService.updateCountdowns,
        updateTicker: ChartLegendService.updateTicker,
        syncChartWithCache: ChartDataService.Render.syncCache,
        fetchAndRenderAssetInfo: MarketWidgetService.fetchAndRenderAssetInfo,
        ChartService,
        syncTimeScales: SyncManagerService.syncTimeScales
    });
    ChartBuilderService.initialize({
        state, ChartService, ThemeService, ChartLifecycleService, IndicatorService,
        LayoutService, ContextMenuService, AlertService, StorageService, DrawingService,
        syncTimeScales: SyncManagerService.syncTimeScales, loadOlderHistoricalData: ChartDataService.History.loadOlder, addHorizontalLine: DrawingManagerService.addHorizontalLine, updateMarkers: DrawingManagerService.updateMarkers,
        checkAndInteractWithLine: DrawingManagerService.checkAndInteractWithLine, handleCrosshairSync: SyncManagerService.handleCrosshairSync, updateChartLegend: ChartLegendService.updateLegend, TimeUtils
    });
    
    AppBootstrap.start();
});

async function loadDependencies() {
    const scripts = ['indicators.js', 'paper-account.js', 'paper-positions.js', 'paper-history.js', 'paper-trading.js'];
    for (const s of scripts) {
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = s;
            script.onload = resolve;
            script.onerror = () => { console.warn(`Failed to load ${s}`); resolve(); };
            document.head.appendChild(script);
        });
    }
}



















function updateChartPriceFormat(chartData, currentPrice) {
    if (!currentPrice) return;
    let precision = 2;
    let minMove = 0.01;
    
    const absPrice = Math.abs(currentPrice);
    if (absPrice < 0.0000001) { precision = 10; minMove = 0.0000000001; }
    else if (absPrice < 0.00001) { precision = 8; minMove = 0.00000001; }
    else if (absPrice < 0.001) { precision = 6; minMove = 0.000001; }
    else if (absPrice < 0.1) { precision = 4; minMove = 0.0001; }
    else if (absPrice < 10) { precision = 3; minMove = 0.001; }
    else { precision = 2; minMove = 0.01; }

    const priceFormat = { type: 'price', precision: precision, minMove: minMove };
    
    if (chartData.candleSeries) chartData.candleSeries.applyOptions({ priceFormat });
    if (chartData.smaSeries) chartData.smaSeries.applyOptions({ priceFormat });
    if (chartData.emaSeries) chartData.emaSeries.applyOptions({ priceFormat });
    if (chartData.bbUpperSeries) chartData.bbUpperSeries.applyOptions({ priceFormat });
    if (chartData.bbMiddleSeries) chartData.bbMiddleSeries.applyOptions({ priceFormat });
    if (chartData.bbLowerSeries) chartData.bbLowerSeries.applyOptions({ priceFormat });
    if (chartData.vwapSeries) chartData.vwapSeries.applyOptions({ priceFormat });
    if (chartData.atrSeries) chartData.atrSeries.applyOptions({ priceFormat });
}







































// --- Order Book Functions ---




// --- Backtesting System ---


// ═══════════════════════════════════════════════════════════════════════════
//  VOLUME PROFILE (VPVR)  —  Canvas overlay, TradingView style
// ═══════════════════════════════════════════════════════════════════════════









// ═══════════════════════════════════════════════════════════════════════════
//  SESSION HIGHLIGHTING  —  Canvas overlay, TradingView style
//  Asia: 00:00–09:00 UTC  |  London: 07:00–16:00 UTC  |  NY: 13:00–22:00 UTC
// ═══════════════════════════════════════════════════════════════════════════








/* ═══════════════════════════════════════════════════════════════
   NEW FEATURES
   1. Header Nav Tabs
   2. Watchlist Panel (collapsible right-side sidebar)
   3. Chart Right-Click Context Menu
   ═══════════════════════════════════════════════════════════════ */




// Update alert badge count

// ── 2. Watchlist Panel ───────────────────────────────────────────
const watchlistState = {
    open: false,
    symbols: {},        // symbol -> { price, change24h, el }
    flashTimers: {},
    symbolsList: [],    // persistent list of symbols in watchlist
};

function getCryptoIconHtml(symbol) {
    const sym = symbol.toUpperCase();
    let bg = 'linear-gradient(135deg, #f59e0b, #d97706)';
    let char = sym.charAt(0);
    
    if (sym === 'BTC') {
        bg = 'linear-gradient(135deg, #f7931a, #f7931a)';
        char = '₿';
    } else if (sym === 'ETH') {
        bg = 'linear-gradient(135deg, #627eea, #3c3c3d)';
        char = 'Ξ';
    } else if (sym === 'SOL') {
        bg = 'linear-gradient(135deg, #14f195, #9945ff)';
        char = '◎';
    } else if (sym === 'TURBO') {
        bg = 'linear-gradient(135deg, #eab308, #ca8a04)';
        char = 'T';
    } else if (sym === 'XRP') {
        bg = 'linear-gradient(135deg, #23292f, #00aae4)';
        char = '✕';
    } else if (sym === 'ADA') {
        bg = 'linear-gradient(135deg, #0033ad, #002280)';
        char = '₳';
    } else if (sym === 'DOT') {
        bg = 'linear-gradient(135deg, #e6007a, #a60058)';
        char = '●';
    } else if (sym === 'LINK') {
        bg = 'linear-gradient(135deg, #2a5ada, #1a3a9a)';
        char = '⬡';
    } else {
        let hash = 0;
        for (let i = 0; i < sym.length; i++) {
            hash = sym.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c1 = `hsl(${hash % 360}, 65%, 50%)`;
        const c2 = `hsl(${(hash + 120) % 360}, 65%, 40%)`;
        bg = `linear-gradient(135deg, ${c1}, ${c2})`;
    }
    
    return `<div class="wl-coin-icon" style="background: ${bg};">${char}</div>`;
}

// ── Bootstrap all new features once DOM is ready ────────────────
function initNewFeatures() {
    WatchlistService.initialize({
        watchlistState: watchlistState,
        StorageService: StorageService,
        getInstruments: () => state.instruments,
        getMarketCache: () => state.allMarketPrices,
        getChartStates: () => state.charts,
        getActiveChartId: () => state.activeChartId,
        onSelectSymbol: (chartId, symbol) => GridManagerService.switchChartSymbol(chartId, symbol),
        onOpenAlerts: () => { if (typeof AlertService.AlertHub.show === 'function') AlertService.AlertHub.show(); },
        getIconHtml: (symbol) => typeof getCryptoIconHtml === 'function' ? getCryptoIconHtml(symbol) : '',
        onPoll: () => { if (typeof AlertService.Notification.updateBadge === 'function') AlertService.Notification.updateBadge(); }
    });

    ContextMenuService.init();

    // Watch for charts being added/changed to refresh watchlist
    let wlRefreshTimer = null;
    const scheduleWLRefresh = () => {
        clearTimeout(wlRefreshTimer);
        wlRefreshTimer = setTimeout(WatchlistService.refreshWatchlistFromCharts, 1200);
    };



    // Periodic watchlist refresh (new symbols after layout change)
    setInterval(scheduleWLRefresh, 8000);
}

// Wait for the full app to initialize before bootstrapping new features
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initNewFeatures, 800));
} else {
    setTimeout(initNewFeatures, 800);
}

// Expose attachChartContextMenu globally so initializeChart can call it


MarketWidgetService.initialize({ formatCurrency, formatPercent, formatNumber, getPerfClass });
AlertService.initialize({ 
    state, 
    saveDrawings: () => StorageService.saveDrawings(state.drawings), 
    DrawingService, 
    ModalService 
});


ContextMenuService.initialize({
    state,
    saveDrawings: () => StorageService.saveDrawings(state.drawings),
    AlertService
});
ReplayService.initialize({
    state,
    LayoutService,
    IndicatorService,
    DrawingService,
    syncChartWithCache: ChartDataService.Render.syncCache,
    subscribeChart: ChartDataService.Live.subscribe,
    unsubscribeChart: ChartDataService.Live.unsubscribe,
    applyPriceUpdate: ChartDataService.Live.applyTick,
    updateMarkers: DrawingManagerService.updateMarkers,
    formatCurrency,
    formatPercent,
    formatNumber,
    setPaneMessage: ChartLegendService.setPaneMessage,
    clearPaneMessage: ChartLegendService.clearPaneMessage,
    TimeUtils: window.TimeUtils,
    ModalService: window.ModalService
});

const AppBootstrap = (() => {

    let deps = {};

    function initialize(injected) {
        deps = injected;
    }

    async function start() {
        const {
            state,
            StorageService,
            ThemeService,
            readSavedChartCount,
            loadDependencies,
            setChartCount,
            openBacktestModal,
            TimeUtils,
            toggleTheme,
            connectLiveStream,
            loadInstruments,
            renderGrid,
            updateTimestamp,
            MarketWidgetService,
            fetchMarketMovers,
            WatchlistService,
            switchChartSymbol,
            updateCountdowns,
            updateTicker,
            syncChartWithCache,
            fetchAndRenderAssetInfo,
            ChartService,
            syncTimeScales
        } = deps;

        // Inject a blank favicon to prevent 404 errors
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.href = 'data:,';
        document.head.appendChild(favicon);

        state.theme = StorageService.getTheme() || "dark";
        if (state.theme === "light") document.body.classList.add("light-theme");
        ThemeService.injectThemeStyles();

        const savedDrawings = StorageService.getDrawings();
        if (savedDrawings) {
            try {
                state.drawings = JSON.parse(savedDrawings);
            } catch (e) {
                state.drawings = {};
            }
        }

        const savedBacktest = StorageService.getBacktest();
        if (savedBacktest) {
            try {
                state.backtest = JSON.parse(savedBacktest);
            } catch (e) {
                state.backtest = null;
            }
        }

        state.chartCount = readSavedChartCount();
        
        await loadDependencies();
        if (window.PaperTrading) {
            window.paperTrading = new window.PaperTrading();
        }
        
        UIInitializer.initialize(deps);

        connectLiveStream();
        await loadInstruments();
        renderGrid();
        updateTimestamp();
        
        MarketWidgetService.MarketTicker.create();
        fetchMarketMovers();

        setInterval(updateCountdowns, 1000);
        setInterval(updateTimestamp, 1000);
        setInterval(fetchMarketMovers, 5000);

        if (window.paperTrading) {
            const tradePanel = document.getElementById('paper-trade-panel');
            if (tradePanel) {
                window.paperTrading.buildUI(tradePanel);
            }
        }
    }

    return {
        initialize,
        start
    };

})();

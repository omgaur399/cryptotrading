const StateManager = (() => {
    let _state = null;

    function createInitialState() {
        _state = {
            chartCount: typeof CONFIG !== 'undefined' ? CONFIG.DEFAULT_CHART_COUNT : 4,
            activeChartId: 'chart-1',
            instruments: [],
            charts: {},
            liveStream: null,
            drawings: {},
            hlWs: null,
            binanceWs: null,
            hlPingInterval: null,
            connected: false,
            theme: "dark",
            isSyncingCrosshair: false,
            backtest: null,
            syncCharts: false,
            isSyncingScales: false,
        };
        
        if (typeof window !== 'undefined') {
            window.state = _state;
        }
        return _state;
    }

    function createChartState(chartId, instrumentId, source, symbol, interval, targetChartType, targetIndicators) {
        return {
            id: chartId,
            instrumentId: instrumentId,
            source: source,
            symbol: symbol,
            interval: interval,
            chart: null,
            chartType: targetChartType,
            candleSeries: null,
            volumeSeries: null,
            smaSeries: null,
            smaSeries1: null,
            smaSeries2: null,
            smaSeries3: null,
            emaSeries: null,
            emaSeries1: null,
            emaSeries2: null,
            emaSeries3: null,
            bbUpperSeries: null,
            bbMiddleSeries: null,
            bbLowerSeries: null,
            rsiSeries: null,
            vwapSeries: null,
            atrSeries: null,
            cachedData: [],
            currentCandle: null,
            lastPrice: null,
            referencePrice: null,
            liveSubscribed: false,
            l2Subscribed: false,
            lastDirection: 'up',
            indicators: targetIndicators,
            pendingUpdate: false,
            flashDirection: 'up',
            lastUIUpdate: 0,
            customPriceOffset: 0,
            isVerticalPanning: false,
            panStartPrice: null,
        };
    }

    function getState() {
        return _state || (typeof window !== 'undefined' ? window.state : null);
    }

    function getChart(id) {
        const s = getState();
        return s ? s.charts[id] : null;
    }

    function getActiveChart() {
        const s = getState();
        return s ? s.charts[s.activeChartId] : null;
    }

    function removeChart(id) {
        const s = getState();
        if (s && s.charts[id]) {
            delete s.charts[id];
        }
    }

    return {
        createInitialState,
        createChartState,
        getChart,
        getActiveChart,
        removeChart
    };

})();

if (typeof window !== 'undefined') {
    window.StateManager = StateManager;
}

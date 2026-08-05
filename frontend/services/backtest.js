const BacktestService = (function() {
    let deps = {};

    function initialize(injectedDeps) {
        deps = injectedDeps;
    }

    function getState() {
        return deps.state || window.state;
    }

    function getApiService() {
        return deps.ApiService || window.ApiService;
    }

    function getStorageService() {
        return deps.StorageService || window.StorageService;
    }

    function getModalService() {
        return deps.ModalService || window.ModalService;
    }

    function getGridManagerService() {
        return deps.GridManagerService || window.GridManagerService;
    }

    function getDrawingManagerService() {
        return deps.DrawingManagerService || window.DrawingManagerService;
    }

    function openBacktestModal() {
        const st = getState();
        const modalSvc = getModalService();
        const apiSvc = getApiService();
        const storageSvc = getStorageService();
        const gridMgr = getGridManagerService();
        if (!st || !modalSvc) return;

        const activeChart = st.charts ? st.charts[st.activeChartId] : null;
        const defaultSymbol = activeChart ? activeChart.symbol : 'BTC';
        const defaultInterval = activeChart ? activeChart.interval : '1h';

        const instruments = st.instruments || [];
        const symbols = instruments.map(i => i.symbol).filter(Boolean);
        const activeInst = instruments.find(i => i.symbol === defaultSymbol) || instruments[0];
        const timeframes = activeInst && activeInst.timeframes ? activeInst.timeframes : ["1m", "5m", "15m", "1h", "4h", "1d"];

        modalSvc.openBacktestConfig({
            defaultSymbol: defaultSymbol,
            defaultInterval: defaultInterval,
            symbols: symbols.length > 0 ? symbols : ["BTC", "ETH", "SOL"],
            timeframes: timeframes,
            instruments: instruments
        }, {
            onRun: async (payload, ui) => {
                const loadingEl = document.getElementById('backtest-loading');
                const errorEl = document.getElementById('backtest-error');
                if (loadingEl) loadingEl.style.display = 'block';
                if (errorEl) errorEl.style.display = 'none';

                try {
                    const result = apiSvc ? await apiSvc.runBacktest(payload) : null;

                    st.backtest = { 
                        ...result, 
                        symbol: payload.symbol,
                        interval: payload.interval
                    };
                    if (storageSvc) storageSvc.saveBacktest(st.backtest);
                    
                    const chartData = st.charts ? st.charts[st.activeChartId] : null;
                    if (chartData) {
                        if (chartData.symbol !== st.backtest.symbol && gridMgr) {
                            await gridMgr.switchChartSymbol(st.activeChartId, st.backtest.symbol);
                        }
                        renderBacktestResults(st.charts[st.activeChartId], result);
                    }
                    if (window.paperTrading && result) window.paperTrading.renderBacktestSummary(result.summary_stats, result.trades, result.equity_curve);
                    modalSvc.closeModal("backtest-modal");
                } catch (error) {
                    if (errorEl) {
                        errorEl.textContent = `Error: ${error.message}`;
                        errorEl.style.display = 'block';
                    }
                } finally {
                    if (loadingEl) loadingEl.style.display = 'none';
                }
            },
            onCancel: () => {
                modalSvc.closeModal("backtest-modal");
            }
        });
    }

    function renderBacktestResults(chartData, results) {
        const drawingMgr = getDrawingManagerService();
        if (!chartData || !results || !chartData.chart) return;
        if (results.visible === false) return;

        // Clear previous backtest markers/lines
        if (chartData.backtestMarkers) chartData.backtestMarkers = [];
        if (chartData.backtestTradeLines) {
            chartData.backtestTradeLines.forEach(line => {
                try { chartData.chart.removeSeries(line); } catch(e){}
            });
        }
        chartData.backtestTradeLines = [];

        // Plot trade markers
        const markers = results.trades ? results.trades.flatMap(trade => [
            { time: trade.time, position: trade.direction === 'Long' ? 'belowBar' : 'aboveBar', color: trade.direction === 'Long' ? '#3b82f6' : '#f59e0b', shape: trade.direction === 'Long' ? 'arrowUp' : 'arrowDown', text: trade.direction.toUpperCase() },
            { time: trade.exitTime, position: trade.pnl >= 0 ? 'aboveBar' : 'belowBar', color: trade.pnl >= 0 ? '#10b981' : '#ef4444', shape: 'circle', text: trade.closeReason || 'CLOSE' }
        ]) : [];
        chartData.backtestMarkers = markers;
        if (drawingMgr) drawingMgr.updateMarkers(chartData);

        // Plot individual trade lines
        if (results.trades) {
            results.trades.forEach(trade => {
                const lineSeries = chartData.chart.addLineSeries({
                    color: trade.pnl >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)',
                    lineWidth: 2,
                    lineStyle: 0,
                    lastValueVisible: false,
                    priceLineVisible: false,
                });
                lineSeries.setData([
                    { time: trade.time, value: trade.entryPrice },
                    { time: trade.exitTime, value: trade.exitPrice }
                ]);
                chartData.backtestTradeLines.push(lineSeries);
                
                // SL Line Box
                if (trade.slPrice) {
                    const slSeries = chartData.chart.addLineSeries({
                        color: 'rgba(239, 68, 68, 0.5)',
                        lineWidth: 1,
                        lineStyle: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    });
                    slSeries.setData([
                        { time: trade.time, value: trade.slPrice },
                        { time: trade.exitTime, value: trade.slPrice }
                    ]);
                    chartData.backtestTradeLines.push(slSeries);
                }
                
                // TP Line Box
                if (trade.tpPrice) {
                    const tpSeries = chartData.chart.addLineSeries({
                        color: 'rgba(16, 185, 129, 0.5)',
                        lineWidth: 1,
                        lineStyle: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                    });
                    tpSeries.setData([
                        { time: trade.time, value: trade.tpPrice },
                        { time: trade.exitTime, value: trade.tpPrice }
                    ]);
                    chartData.backtestTradeLines.push(tpSeries);
                }
            });
        }

        // Zoom to fit the backtest period
        if (results.trades && results.trades.length > 0) {
            const from = results.trades[0].time;
            const to = results.trades[results.trades.length - 1].exitTime;
            chartData.chart.timeScale().setVisibleRange({ from, to });
        }
    }

    window.renderBacktestResults = renderBacktestResults;

    return {
        initialize,
        openBacktestModal,
        renderBacktestResults
    };
})();

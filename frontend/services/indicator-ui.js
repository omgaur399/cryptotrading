const IndicatorUiService = (function() {
    let deps = {};

    function initialize(injectedDeps) {
        deps = injectedDeps;
    }

    function getState() {
        return deps.state || window.state;
    }

    function getModalService() {
        return deps.ModalService || window.ModalService;
    }

    function getLayoutService() {
        return deps.LayoutService || window.LayoutService;
    }

    function getOverlayService() {
        return deps.OverlayService || window.OverlayService;
    }

    function getIndicatorService() {
        return deps.IndicatorService || window.IndicatorService;
    }

    function getChartLegendService() {
        return deps.ChartLegendService || window.ChartLegendService;
    }

    function getGridManagerService() {
        return deps.GridManagerService || window.GridManagerService;
    }

    function updateVpvrMarginAndScroll(chartData) {
        const st = getState();
        const layoutSvc = getLayoutService();
        const overlaySvc = getOverlayService();
        const legendSvc = getChartLegendService();

        if (!chartData || !chartData.chart) return;
        
        const count = st ? st.chartCount : 1;
        if (layoutSvc) {
            chartData.chart.timeScale().applyOptions({ rightOffset: layoutSvc.getRightOffset(chartData, count) });
        }
        
        setTimeout(() => {
            if (layoutSvc) {
                layoutSvc.scrollToNewestActualCandle(chartData, count);
            }
            
            const isVpvrActive = chartData.indicators && chartData.indicators.vpvr && chartData.indicators.vpvrVisible !== false;
            if (overlaySvc && overlaySvc.VolumeProfile) {
                const canvas = overlaySvc.VolumeProfile.ensureCanvas(chartData);
                if (canvas) {
                    canvas.style.display = isVpvrActive ? 'block' : 'none';
                }
                
                if (isVpvrActive) {
                    overlaySvc.VolumeProfile.draw(chartData);
                } else {
                    overlaySvc.VolumeProfile.clear(chartData);
                }
            }
            
            const pane = document.getElementById(chartData.id);
            const legendEl = pane ? pane.querySelector(".chart-legend") : null;
            if (legendEl) delete legendEl.dataset.structKey;
            if (legendSvc) {
                legendSvc.updateLegend(chartData);
            }
        }, 50);
    }

    function openSettingsModal(chartData, onlyIndicator = null) {
        const modalSvc = getModalService();
        const layoutSvc = getLayoutService();
        const gridMgrSvc = getGridManagerService();
        if (!modalSvc) return;

        modalSvc.openChartSettings({
            onlyIndicator: onlyIndicator,
            indicators: chartData.indicators
        }, {
            onSave: (data) => {
                const { bbPeriod, bbStdDev, rsiPeriod, atrPeriod, bbColor, rsiColor, vwapColor, atrColor, bbLineWidth, rsiLineWidth, vwapLineWidth, atrLineWidth, smaUpdates, emaUpdates } = data;
                
                if (bbPeriod !== undefined) chartData.indicators.bbPeriod = bbPeriod;
                if (bbStdDev !== undefined) chartData.indicators.bbStdDev = bbStdDev;
                if (rsiPeriod !== undefined) chartData.indicators.rsiPeriod = rsiPeriod;
                if (atrPeriod !== undefined) chartData.indicators.atrPeriod = atrPeriod;
                
                if (bbColor !== undefined) chartData.indicators.bbColor = bbColor;
                if (rsiColor !== undefined) chartData.indicators.rsiColor = rsiColor;
                if (vwapColor !== undefined) chartData.indicators.vwapColor = vwapColor;
                if (atrColor !== undefined) chartData.indicators.atrColor = atrColor;
                if (bbLineWidth !== undefined) chartData.indicators.bbLineWidth = bbLineWidth;
                if (rsiLineWidth !== undefined) chartData.indicators.rsiLineWidth = rsiLineWidth;
                if (vwapLineWidth !== undefined) chartData.indicators.vwapLineWidth = vwapLineWidth;
                if (atrLineWidth !== undefined) chartData.indicators.atrLineWidth = atrLineWidth;

                if (smaUpdates) {
                    if (onlyIndicator && onlyIndicator.startsWith('sma')) {
                        if (smaUpdates.period !== undefined) chartData.indicators[onlyIndicator + 'Period'] = smaUpdates.period;
                        if (smaUpdates.color !== undefined) chartData.indicators[onlyIndicator + 'Color'] = smaUpdates.color;
                        if (smaUpdates.lineWidth !== undefined) chartData.indicators[onlyIndicator + 'LineWidth'] = smaUpdates.lineWidth;
                        
                        if (onlyIndicator === 'sma1') {
                            chartData.indicators.smaPeriod = chartData.indicators.sma1Period;
                            chartData.indicators.smaColor = chartData.indicators.sma1Color;
                            chartData.indicators.smaLineWidth = chartData.indicators.sma1LineWidth;
                        }
                    } else {
                        if (smaUpdates.period !== undefined) chartData.indicators.smaPeriod = smaUpdates.period;
                        if (smaUpdates.color !== undefined) chartData.indicators.smaColor = smaUpdates.color;
                        if (smaUpdates.lineWidth !== undefined) chartData.indicators.smaLineWidth = smaUpdates.lineWidth;
                    }
                }

                if (emaUpdates) {
                    if (onlyIndicator && onlyIndicator.startsWith('ema')) {
                        if (emaUpdates.period !== undefined) chartData.indicators[onlyIndicator + 'Period'] = emaUpdates.period;
                        if (emaUpdates.color !== undefined) chartData.indicators[onlyIndicator + 'Color'] = emaUpdates.color;
                        if (emaUpdates.lineWidth !== undefined) chartData.indicators[onlyIndicator + 'LineWidth'] = emaUpdates.lineWidth;
                        
                        if (onlyIndicator === 'ema1') {
                            chartData.indicators.emaPeriod = chartData.indicators.ema1Period;
                            chartData.indicators.emaColor = chartData.indicators.ema1Color;
                            chartData.indicators.emaLineWidth = chartData.indicators.ema1LineWidth;
                        }
                    } else {
                        if (emaUpdates.period !== undefined) chartData.indicators.emaPeriod = emaUpdates.period;
                        if (emaUpdates.color !== undefined) chartData.indicators.emaColor = emaUpdates.color;
                        if (emaUpdates.lineWidth !== undefined) chartData.indicators.emaLineWidth = emaUpdates.lineWidth;
                    }
                }

                const calcSMA = typeof calculateSMA === 'function' ? calculateSMA : null;
                const calcEMA = typeof calculateEMA === 'function' ? calculateEMA : null;
                const calcBB = typeof calculateBB === 'function' ? calculateBB : null;
                const calcRSI = typeof calculateRSI === 'function' ? calculateRSI : null;
                const calcVWAP = typeof calculateVWAP === 'function' ? calculateVWAP : null;
                const calcATR = typeof calculateATR === 'function' ? calculateATR : null;

                if (chartData.smaSeries1) {
                    chartData.smaSeries1.applyOptions({ color: chartData.indicators.sma1Color, lineWidth: chartData.indicators.sma1LineWidth });
                    if (chartData.indicators.sma1 && calcSMA) chartData.smaSeries1.setData(calcSMA(chartData.cachedData, chartData.indicators.sma1Period));
                }
                if (chartData.smaSeries2) {
                    chartData.smaSeries2.applyOptions({ color: chartData.indicators.sma2Color, lineWidth: chartData.indicators.sma2LineWidth });
                    if (chartData.indicators.sma2 && calcSMA) chartData.smaSeries2.setData(calcSMA(chartData.cachedData, chartData.indicators.sma2Period));
                }
                if (chartData.smaSeries3) {
                    chartData.smaSeries3.applyOptions({ color: chartData.indicators.sma3Color, lineWidth: chartData.indicators.sma3LineWidth });
                    if (chartData.indicators.sma3 && calcSMA) chartData.smaSeries3.setData(calcSMA(chartData.cachedData, chartData.indicators.sma3Period));
                }
                if (chartData.emaSeries1) {
                    chartData.emaSeries1.applyOptions({ color: chartData.indicators.ema1Color, lineWidth: chartData.indicators.ema1LineWidth });
                    if (chartData.indicators.ema1 && calcEMA) chartData.emaSeries1.setData(calcEMA(chartData.cachedData, chartData.indicators.ema1Period));
                }
                if (chartData.emaSeries2) {
                    chartData.emaSeries2.applyOptions({ color: chartData.indicators.ema2Color, lineWidth: chartData.indicators.ema2LineWidth });
                    if (chartData.indicators.ema2 && calcEMA) chartData.emaSeries2.setData(calcEMA(chartData.cachedData, chartData.indicators.ema2Period));
                }
                if (chartData.emaSeries3) {
                    chartData.emaSeries3.applyOptions({ color: chartData.indicators.ema3Color, lineWidth: chartData.indicators.ema3LineWidth });
                    if (chartData.indicators.ema3 && calcEMA) chartData.emaSeries3.setData(calcEMA(chartData.cachedData, chartData.indicators.ema3Period));
                }

                if (chartData.bbUpperSeries) {
                    const bbOpts = { color: chartData.indicators.bbColor, lineWidth: chartData.indicators.bbLineWidth };
                    chartData.bbUpperSeries.applyOptions(bbOpts);
                    if (chartData.bbMiddleSeries) chartData.bbMiddleSeries.applyOptions(bbOpts);
                    if (chartData.bbLowerSeries) chartData.bbLowerSeries.applyOptions(bbOpts);
                    if (chartData.indicators.bb && calcBB) {
                        const bbData = calcBB(chartData.cachedData, chartData.indicators.bbPeriod, chartData.indicators.bbStdDev);
                        chartData.bbUpperSeries.setData(bbData.upper);
                        if (chartData.bbMiddleSeries) chartData.bbMiddleSeries.setData(bbData.middle);
                        if (chartData.bbLowerSeries) chartData.bbLowerSeries.setData(bbData.lower);
                    }
                }
                if (chartData.rsiSeries) {
                    chartData.rsiSeries.applyOptions({ color: chartData.indicators.rsiColor, lineWidth: chartData.indicators.rsiLineWidth });
                    if (chartData.indicators.rsi && calcRSI) {
                        chartData.rsiSeries.setData(calcRSI(chartData.cachedData, chartData.indicators.rsiPeriod));
                    }
                }
                if (chartData.vwapSeries) {
                    chartData.vwapSeries.applyOptions({ color: chartData.indicators.vwapColor, lineWidth: chartData.indicators.vwapLineWidth });
                    if (chartData.indicators.vwap && calcVWAP) chartData.vwapSeries.setData(calcVWAP(chartData.cachedData, chartData.interval));
                }
                if (chartData.atrSeries) {
                    chartData.atrSeries.applyOptions({ color: chartData.indicators.atrColor, lineWidth: chartData.indicators.atrLineWidth });
                    if (chartData.indicators.atr && calcATR) {
                        chartData.atrSeries.setData(calcATR(chartData.cachedData, chartData.indicators.atrPeriod));
                    }
                }

                if (layoutSvc) layoutSvc.updateSubchartMargins(chartData);

                const select = document.querySelector(`#${chartData.id} .indicator-select`);
                if (select) {
                    if (select.options[2]) select.options[2].text = `SMA 1 (${chartData.indicators.sma1Period}) (${chartData.indicators.sma1 ? 'On' : 'Off'})`;
                    if (select.options[3]) select.options[3].text = `SMA 2 (${chartData.indicators.sma2Period}) (${chartData.indicators.sma2 ? 'On' : 'Off'})`;
                    if (select.options[4]) select.options[4].text = `SMA 3 (${chartData.indicators.sma3Period}) (${chartData.indicators.sma3 ? 'On' : 'Off'})`;
                    if (select.options[5]) select.options[5].text = `EMA 1 (${chartData.indicators.ema1Period}) (${chartData.indicators.ema1 ? 'On' : 'Off'})`;
                    if (select.options[6]) select.options[6].text = `EMA 2 (${chartData.indicators.ema2Period}) (${chartData.indicators.ema2 ? 'On' : 'Off'})`;
                    if (select.options[7]) select.options[7].text = `EMA 3 (${chartData.indicators.ema3Period}) (${chartData.indicators.ema3 ? 'On' : 'Off'})`;
                    if (select.options[8]) select.options[8].text = `BB ${chartData.indicators.bbPeriod} (${chartData.indicators.bb ? 'On' : 'Off'})`;
                    if (select.options[9]) select.options[9].text = `RSI ${chartData.indicators.rsiPeriod} (${chartData.indicators.rsi ? 'On' : 'Off'})`;
                    if (select.options[10]) select.options[10].text = `VWAP (${chartData.indicators.vwap ? 'On' : 'Off'})`;
                    if (select.options[11]) select.options[11].text = `ATR ${chartData.indicators.atrPeriod} (${chartData.indicators.atr ? 'On' : 'Off'})`;
                    if (select.options[12]) select.options[12].text = `Vol Profile (${chartData.indicators.vpvr ? 'On' : 'Off'})`;
                    if (select.options[13]) select.options[13].text = `Sessions (${chartData.indicators.sessions ? 'On' : 'Off'})`;
                }
                if (gridMgrSvc) gridMgrSvc.saveLayoutState();
                modalSvc.closeModal("chart-settings-modal");
            },
            onCancel: () => {
                modalSvc.closeModal("chart-settings-modal");
            }
        });
    }

    window.updateVpvrMarginAndScroll = updateVpvrMarginAndScroll;
    window.openSettingsModal = openSettingsModal;

    return {
        initialize,
        openSettingsModal,
        updateVpvrMarginAndScroll
    };
})();

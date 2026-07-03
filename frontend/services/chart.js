const ChartService = {
    initialize(chartData, container, themeOptions, TimeUtils) {
        chartData.chart = LightweightCharts.createChart(container, {
            autoSize: true,
            layout: themeOptions.layout,
            localization: {
                timeFormatter: TimeUtils.formatTooltip,
            },
            grid: themeOptions.grid,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: themeOptions.timeScale.borderColor,
                tickMarkFormatter: TimeUtils.formatAxis,
                rightOffset: 1,
                barSpacing: 8,
                minBarSpacing: 1,
                shiftVisibleRangeOnNewBar: true,
            },
            rightPriceScale: {
                borderColor: themeOptions.rightPriceScale.borderColor,
                ticksVisible: false,
                autoScale: true,
                entireTextOnly: true,
                minimumWidth: 40,
                scaleMargins: {
                    top: 0.1,
                    bottom: 0.2, 
                },
            },
            crosshair: themeOptions.crosshair,
            handleScroll: {
                mouseWheel: false, 
                pressedMouseMove: true, 
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
            handleScale: {
                mouseWheel: true,
                pinch: true, 
                axisDoubleClickReset: false, 
            },
        });

        this._createSeries(chartData);
    },

    _createSeries(chartData) {
        const upColor = "#16a34a";
        const downColor = "#dc2626";
        
        if (chartData.chartType === 'line') {
            chartData.candleSeries = chartData.chart.addLineSeries({
                color: upColor, lineWidth: 2, crosshairMarkerVisible: true,
                lastValueVisible: false, priceLineVisible: true, priceLineColor: upColor,
                priceLineWidth: 1, priceLineStyle: 2,
            });
        } else if (chartData.chartType === 'bar') {
            chartData.candleSeries = chartData.chart.addBarSeries({
                upColor: upColor, downColor: downColor, lastValueVisible: false,
                priceLineVisible: true, priceLineColor: upColor, priceLineWidth: 1, priceLineStyle: 2,
            });
        } else {
            chartData.candleSeries = chartData.chart.addCandlestickSeries({
                upColor: upColor, downColor: downColor, wickUpColor: upColor, wickDownColor: downColor,
                borderVisible: false, priceLineVisible: true, priceLineColor: upColor,
                priceLineWidth: 1, priceLineStyle: 2, lastValueVisible: false,
            });
        }

        chartData.candleSeries.applyOptions({
            autoscaleInfoProvider: (baseImplementation) => {
                const res = baseImplementation();
                if (res !== null && res.priceRange !== null) {
                    const offset = chartData.customPriceOffset || 0;
                    if (offset === 0) return res;
                    const newRes = {
                        priceRange: {
                            minValue: res.priceRange.minValue + offset,
                            maxValue: res.priceRange.maxValue + offset,
                        }
                    };
                    if (res.margins) newRes.margins = res.margins;
                    return newRes;
                }
                return res;
            }
        });

        chartData.volumeSeries = chartData.chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: '', 
            visible: true, 
            lastValueVisible: false,
            priceLineVisible: false,
        });
        chartData.volumeSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });
        if (!chartData.indicators.volume) {
            chartData.volumeSeries.applyOptions({ visible: false });
        }

        // Indicators
        const smaOptions = (color, width, visible) => ({
            color, lineWidth: width, visible, lastValueVisible: false, priceLineVisible: false
        });
        chartData.smaSeries1 = chartData.chart.addLineSeries(smaOptions(chartData.indicators.sma1Color, chartData.indicators.sma1LineWidth, chartData.indicators.sma1));
        chartData.smaSeries2 = chartData.chart.addLineSeries(smaOptions(chartData.indicators.sma2Color, chartData.indicators.sma2LineWidth, chartData.indicators.sma2));
        chartData.smaSeries3 = chartData.chart.addLineSeries(smaOptions(chartData.indicators.sma3Color, chartData.indicators.sma3LineWidth, chartData.indicators.sma3));
        chartData.smaSeries = chartData.smaSeries1;
        
        const emaOptions = (color, width, visible) => ({
            color, lineWidth: width, visible, lastValueVisible: false, priceLineVisible: false
        });
        chartData.emaSeries1 = chartData.chart.addLineSeries(emaOptions(chartData.indicators.ema1Color, chartData.indicators.ema1LineWidth, chartData.indicators.ema1));
        chartData.emaSeries2 = chartData.chart.addLineSeries(emaOptions(chartData.indicators.ema2Color, chartData.indicators.ema2LineWidth, chartData.indicators.ema2));
        chartData.emaSeries3 = chartData.chart.addLineSeries(emaOptions(chartData.indicators.ema3Color, chartData.indicators.ema3LineWidth, chartData.indicators.ema3));
        chartData.emaSeries = chartData.emaSeries1;
        
        const bbOptions = {
            color: chartData.indicators.bbColor, lineWidth: chartData.indicators.bbLineWidth,
            visible: chartData.indicators.bb, lastValueVisible: false, priceLineVisible: false,
        };
        chartData.bbUpperSeries = chartData.chart.addLineSeries(bbOptions);
        chartData.bbMiddleSeries = chartData.chart.addLineSeries(bbOptions);
        chartData.bbLowerSeries = chartData.chart.addLineSeries(bbOptions);
        
        chartData.rsiSeries = chartData.chart.addLineSeries({
            color: chartData.indicators.rsiColor, lineWidth: chartData.indicators.rsiLineWidth,
            priceScaleId: 'rsi', visible: true, 
            lastValueVisible: false, priceLineVisible: false,
            autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
        });
        
        chartData.chart.priceScale('rsi').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
            entireTextOnly: true, 
            minimumWidth: 40, 
        });
        
        if (!chartData.indicators.rsi) {
            chartData.rsiSeries.applyOptions({ visible: false });
        }
        
        if (chartData.rsiSeries.createPriceLine) {
            chartData.rsiSeries.createPriceLine({ price: 70, color: '#ef4444', lineStyle: 2, axisLabelVisible: false, title: 'OB', lineWidth: 1 });
            chartData.rsiSeries.createPriceLine({ price: 30, color: '#10b981', lineStyle: 2, axisLabelVisible: false, title: 'OS', lineWidth: 1 });
        }
    },

    changeType(chartData) {
        if (!chartData.chart || !chartData.candleSeries) return;
        
        // Save history first
        let currentData = [];
        try {
            currentData = chartData.candleSeries.data();
        } catch(e) { console.warn(e); }
        
        chartData.chart.removeSeries(chartData.candleSeries);
        
        const upColor = "#16a34a";
        const downColor = "#dc2626";
        
        if (chartData.chartType === 'line') {
            chartData.candleSeries = chartData.chart.addLineSeries({
                color: upColor, lineWidth: 2, crosshairMarkerVisible: true,
                lastValueVisible: false, priceLineVisible: true, priceLineColor: upColor,
                priceLineWidth: 1, priceLineStyle: 2,
            });
        } else if (chartData.chartType === 'bar') {
            chartData.candleSeries = chartData.chart.addBarSeries({
                upColor: upColor, downColor: downColor, lastValueVisible: false,
                priceLineVisible: true, priceLineColor: upColor, priceLineWidth: 1, priceLineStyle: 2,
            });
        } else {
            chartData.candleSeries = chartData.chart.addCandlestickSeries({
                upColor: upColor, downColor: downColor, wickUpColor: upColor, wickDownColor: downColor,
                borderVisible: false, priceLineVisible: true, priceLineColor: upColor,
                priceLineWidth: 1, priceLineStyle: 2, lastValueVisible: false,
            });
        }

        chartData.candleSeries.applyOptions({
            autoscaleInfoProvider: (baseImplementation) => {
                const res = baseImplementation();
                if (res !== null && res.priceRange !== null) {
                    const offset = chartData.customPriceOffset || 0;
                    if (offset === 0) return res;
                    const newRes = {
                        priceRange: {
                            minValue: res.priceRange.minValue + offset,
                            maxValue: res.priceRange.maxValue + offset,
                        }
                    };
                    if (res.margins) newRes.margins = res.margins;
                    return newRes;
                }
                return res;
            }
        });
        
        if (currentData.length > 0) {
            chartData.candleSeries.setData(currentData);
        }
    },

    reset(chartData) {
        if (chartData.candleSeries) chartData.candleSeries.setData([]);
        if (chartData.volumeSeries) chartData.volumeSeries.setData([]);
        if (chartData.smaSeries1) chartData.smaSeries1.setData([]);
        if (chartData.smaSeries2) chartData.smaSeries2.setData([]);
        if (chartData.smaSeries3) chartData.smaSeries3.setData([]);
        if (chartData.emaSeries1) chartData.emaSeries1.setData([]);
        if (chartData.emaSeries2) chartData.emaSeries2.setData([]);
        if (chartData.emaSeries3) chartData.emaSeries3.setData([]);
        if (chartData.bbUpperSeries) chartData.bbUpperSeries.setData([]);
        if (chartData.bbMiddleSeries) chartData.bbMiddleSeries.setData([]);
        if (chartData.bbLowerSeries) chartData.bbLowerSeries.setData([]);
        if (chartData.rsiSeries) chartData.rsiSeries.setData([]);
    },

    applyTheme(chartData, themeOptions, isLight) {
        if (!chartData.chart) return;
        
        chartData.chart.applyOptions(themeOptions);
        
        if (chartData.renderedDrawings) {
            const lineColor = isLight ? '#3b82f6' : '#60a5fa';
            Object.values(chartData.renderedDrawings).forEach(pl => {
                if (pl && !(pl instanceof HTMLElement) && pl.applyOptions) {
                    pl.applyOptions({ color: lineColor });
                }
            });
        }
    }
};

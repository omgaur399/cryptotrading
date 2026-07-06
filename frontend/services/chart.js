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

    },

    changeType(chartData) {
        if (!chartData.chart || !chartData.candleSeries) return;
        
        

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
    },

    reset(chartData) {
        if (chartData.candleSeries) chartData.candleSeries.setData([]);
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

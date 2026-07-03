import os

with open('frontend/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

old_init_block = """    chartData.chart = LightweightCharts.createChart(container, {
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
            autoScale: true, // Auto-scale vertically to keep candles in view
            entireTextOnly: true, // Forces scale to wrap tightly around the longest visible label
            minimumWidth: 40, // Compress width as much as possible
            scaleMargins: {
                top: 0.1,
                bottom: 0.2, // Leave 20% empty at the bottom for layered Volume and RSI
            },
        },
        crosshair: themeOptions.crosshair,
        // Enable all native user interactions. These are defaults but are made explicit here.
        handleScroll: {
            mouseWheel: false, // Must be false! If true, it overrides zooming and pans instead.
            pressedMouseMove: true, // Allow panning
            horzTouchDrag: true,
            vertTouchDrag: true,
        },
        handleScale: {
            mouseWheel: true,
            pinch: true, // Pinch-to-zoom on touch devices
            axisDoubleClickReset: false, // Custom behavior: double click on price axis creates alert
        },
    });"""

new_init_block = """    ChartService.initialize(chartData, container, themeOptions, TimeUtils);"""

content = content.replace(old_init_block, new_init_block)

old_series_block = """    const isUp = true;
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
        priceScaleId: '', // Place it on a separate, hidden scale
        visible: true, // Force visible on init to apply scale margins
        lastValueVisible: false,
        priceLineVisible: false,
    });
    chartData.volumeSeries.priceScale().applyOptions({
        scaleMargins: {
            top: 0.8, // Layer Volume at the bottom 20% of the chart
            bottom: 0,
        },
    });
    if (!chartData.indicators.volume) {
        chartData.volumeSeries.applyOptions({ visible: false });
    }

    chartData.smaSeries1 = chartData.chart.addLineSeries({
        color: chartData.indicators.sma1Color,
        lineWidth: chartData.indicators.sma1LineWidth,
        visible: chartData.indicators.sma1,
        lastValueVisible: false,
        priceLineVisible: false,
    });
    chartData.smaSeries2 = chartData.chart.addLineSeries({
        color: chartData.indicators.sma2Color,
        lineWidth: chartData.indicators.sma2LineWidth,
        visible: chartData.indicators.sma2,
        lastValueVisible: false,
        priceLineVisible: false,
    });
    chartData.smaSeries3 = chartData.chart.addLineSeries({
        color: chartData.indicators.sma3Color,
        lineWidth: chartData.indicators.sma3LineWidth,
        visible: chartData.indicators.sma3,
        lastValueVisible: false,
        priceLineVisible: false,
    });
    chartData.smaSeries = chartData.smaSeries1; // alias for backward compatibility
    
    chartData.emaSeries1 = chartData.chart.addLineSeries({
        color: chartData.indicators.ema1Color,
        lineWidth: chartData.indicators.ema1LineWidth,
        visible: chartData.indicators.ema1,
        lastValueVisible: false,
        priceLineVisible: false,
    });
    chartData.emaSeries2 = chartData.chart.addLineSeries({
        color: chartData.indicators.ema2Color,
        lineWidth: chartData.indicators.ema2LineWidth,
        visible: chartData.indicators.ema2,
        lastValueVisible: false,
        priceLineVisible: false,
    });
    chartData.emaSeries3 = chartData.chart.addLineSeries({
        color: chartData.indicators.ema3Color,
        lineWidth: chartData.indicators.ema3LineWidth,
        visible: chartData.indicators.ema3,
        lastValueVisible: false,
        priceLineVisible: false,
    });
    chartData.emaSeries = chartData.emaSeries1; // alias for backward compatibility
    
    const bbOptions = {
        color: chartData.indicators.bbColor, lineWidth: chartData.indicators.bbLineWidth,
        visible: chartData.indicators.bb, lastValueVisible: false, priceLineVisible: false,
    };
    chartData.bbUpperSeries = chartData.chart.addLineSeries(bbOptions);
    chartData.bbMiddleSeries = chartData.chart.addLineSeries(bbOptions);
    chartData.bbLowerSeries = chartData.chart.addLineSeries(bbOptions);
    
    chartData.rsiSeries = chartData.chart.addLineSeries({
        color: chartData.indicators.rsiColor, lineWidth: chartData.indicators.rsiLineWidth,
        priceScaleId: 'rsi', visible: true, // Force visible on init to apply scale margins
        lastValueVisible: false, priceLineVisible: false,
        autoscaleInfoProvider: () => ({
            priceRange: {
                minValue: 0,
                maxValue: 100,
            },
        }),
    });
    
    chartData.chart.priceScale('rsi').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
        entireTextOnly: true, // Compress RSI scale width
        minimumWidth: 40, // Match main scale minimum width
    });
    
    if (!chartData.indicators.rsi) {
        chartData.rsiSeries.applyOptions({ visible: false });
    }
    
    // Add horizontal RSI bounds (70 Overbought / 30 Oversold)
    if (chartData.rsiSeries.createPriceLine) {
        chartData.rsiSeries.createPriceLine({ price: 70, color: '#ef4444', lineStyle: 2, axisLabelVisible: false, title: 'OB', lineWidth: 1 });
        chartData.rsiSeries.createPriceLine({ price: 30, color: '#10b981', lineStyle: 2, axisLabelVisible: false, title: 'OS', lineWidth: 1 });
    }"""

new_series_block = ""
content = content.replace(old_series_block, new_series_block)

with open('frontend/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Phase 2 done")

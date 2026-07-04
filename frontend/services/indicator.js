const IndicatorService = {
    createIndicators(chartData) {
        if (!chartData.chart) return;

        // Volume
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

        // SMAs
        const smaOptions = (color, width, visible) => ({
            color, lineWidth: width, visible, lastValueVisible: false, priceLineVisible: false
        });
        chartData.smaSeries1 = chartData.chart.addLineSeries(smaOptions(chartData.indicators.sma1Color, chartData.indicators.sma1LineWidth, chartData.indicators.sma1));
        chartData.smaSeries2 = chartData.chart.addLineSeries(smaOptions(chartData.indicators.sma2Color, chartData.indicators.sma2LineWidth, chartData.indicators.sma2));
        chartData.smaSeries3 = chartData.chart.addLineSeries(smaOptions(chartData.indicators.sma3Color, chartData.indicators.sma3LineWidth, chartData.indicators.sma3));
        chartData.smaSeries = chartData.smaSeries1; // Backward compatibility
        
        // EMAs
        const emaOptions = (color, width, visible) => ({
            color, lineWidth: width, visible, lastValueVisible: false, priceLineVisible: false
        });
        chartData.emaSeries1 = chartData.chart.addLineSeries(emaOptions(chartData.indicators.ema1Color, chartData.indicators.ema1LineWidth, chartData.indicators.ema1));
        chartData.emaSeries2 = chartData.chart.addLineSeries(emaOptions(chartData.indicators.ema2Color, chartData.indicators.ema2LineWidth, chartData.indicators.ema2));
        chartData.emaSeries3 = chartData.chart.addLineSeries(emaOptions(chartData.indicators.ema3Color, chartData.indicators.ema3LineWidth, chartData.indicators.ema3));
        chartData.emaSeries = chartData.emaSeries1; // Backward compatibility
        
        // Bollinger Bands
        const bbOptions = {
            color: chartData.indicators.bbColor, lineWidth: chartData.indicators.bbLineWidth,
            visible: chartData.indicators.bb, lastValueVisible: false, priceLineVisible: false,
        };
        chartData.bbUpperSeries = chartData.chart.addLineSeries(bbOptions);
        chartData.bbMiddleSeries = chartData.chart.addLineSeries(bbOptions);
        chartData.bbLowerSeries = chartData.chart.addLineSeries(bbOptions);
        
        // RSI
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

        // VWAP
        chartData.vwapSeries = chartData.chart.addLineSeries({
            color: chartData.indicators.vwapColor,
            lineWidth: chartData.indicators.vwapLineWidth,
            visible: chartData.indicators.vwap,
            lastValueVisible: false,
            priceLineVisible: false,
            lineStyle: 2, // Dashed
        });

        // ATR
        chartData.atrSeries = chartData.chart.addLineSeries({
            color: chartData.indicators.atrColor,
            lineWidth: chartData.indicators.atrLineWidth,
            priceScaleId: 'atr',
            visible: true, // Force visible on init, toggled later if needed
            lastValueVisible: false,
            priceLineVisible: false,
        });

        chartData.chart.priceScale('atr').applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
            entireTextOnly: true,
            minimumWidth: 40,
        });

        if (!chartData.indicators.atr) {
            chartData.atrSeries.applyOptions({ visible: false });
        }
    },

    updateAllIndicatorData(chartData) {
        if (!chartData.cachedData || chartData.cachedData.length === 0) return;

        if (chartData.indicators.volume && chartData.volumeSeries) {
            chartData.volumeSeries.setData(chartData.cachedData.map(c => ({
                time: c.time,
                value: c.volume,
                color: c.close >= c.open ? 'rgba(22, 163, 74, 0.4)' : 'rgba(220, 38, 38, 0.4)'
            })));
        }

        if (chartData.indicators.sma1 && chartData.smaSeries1) {
            chartData.smaSeries1.setData(calculateSMA(chartData.cachedData, chartData.indicators.sma1Period));
        }
        if (chartData.indicators.sma2 && chartData.smaSeries2) {
            chartData.smaSeries2.setData(calculateSMA(chartData.cachedData, chartData.indicators.sma2Period));
        }
        if (chartData.indicators.sma3 && chartData.smaSeries3) {
            chartData.smaSeries3.setData(calculateSMA(chartData.cachedData, chartData.indicators.sma3Period));
        }
        if (chartData.indicators.ema1 && chartData.emaSeries1) {
            chartData.emaSeries1.setData(calculateEMA(chartData.cachedData, chartData.indicators.ema1Period));
        }
        if (chartData.indicators.ema2 && chartData.emaSeries2) {
            chartData.emaSeries2.setData(calculateEMA(chartData.cachedData, chartData.indicators.ema2Period));
        }
        if (chartData.indicators.ema3 && chartData.emaSeries3) {
            chartData.emaSeries3.setData(calculateEMA(chartData.cachedData, chartData.indicators.ema3Period));
        }
        if (chartData.indicators.bb && chartData.bbUpperSeries) {
            const bbData = calculateBB(chartData.cachedData, chartData.indicators.bbPeriod, chartData.indicators.bbStdDev);
            chartData.bbUpperSeries.setData(bbData.upper);
            chartData.bbMiddleSeries.setData(bbData.middle);
            chartData.bbLowerSeries.setData(bbData.lower);
        }
        if (chartData.indicators.rsi && chartData.rsiSeries) {
            chartData.rsiSeries.setData(calculateRSI(chartData.cachedData, chartData.indicators.rsiPeriod));
        }
        if (chartData.indicators.vwap && chartData.vwapSeries) {
            chartData.vwapSeries.setData(calculateVWAP(chartData.cachedData, chartData.interval));
        }
        if (chartData.indicators.atr && chartData.atrSeries) {
            chartData.atrSeries.setData(calculateATR(chartData.cachedData, chartData.indicators.atrPeriod));
        }
    },

    updateLiveIndicators(chartData, candle) {
        if (!chartData.cachedData || chartData.cachedData.length === 0) return;

        if (chartData.indicators.volume && chartData.volumeSeries && candle) {
            chartData.volumeSeries.update({
                time: candle.time,
                value: candle.volume,
                color: candle.close >= candle.open ? 'rgba(22, 163, 74, 0.4)' : 'rgba(220, 38, 38, 0.4)'
            });
        }

        if (chartData.indicators.sma1 && chartData.smaSeries1) {
            const val = calculateLatestSMA(chartData.cachedData, chartData.indicators.sma1Period);
            if (val) chartData.smaSeries1.update(val);
        }
        if (chartData.indicators.sma2 && chartData.smaSeries2) {
            const val = calculateLatestSMA(chartData.cachedData, chartData.indicators.sma2Period);
            if (val) chartData.smaSeries2.update(val);
        }
        if (chartData.indicators.sma3 && chartData.smaSeries3) {
            const val = calculateLatestSMA(chartData.cachedData, chartData.indicators.sma3Period);
            if (val) chartData.smaSeries3.update(val);
        }
        if (chartData.indicators.ema1 && chartData.emaSeries1) {
            const val = calculateLatestEMA(chartData.cachedData, chartData.indicators.ema1Period);
            if (val) chartData.emaSeries1.update(val);
        }
        if (chartData.indicators.ema2 && chartData.emaSeries2) {
            const val = calculateLatestEMA(chartData.cachedData, chartData.indicators.ema2Period);
            if (val) chartData.emaSeries2.update(val);
        }
        if (chartData.indicators.ema3 && chartData.emaSeries3) {
            const val = calculateLatestEMA(chartData.cachedData, chartData.indicators.ema3Period);
            if (val) chartData.emaSeries3.update(val);
        }
        if (chartData.indicators.bb && chartData.bbUpperSeries) {
            const val = calculateLatestBB(chartData.cachedData, chartData.indicators.bbPeriod, chartData.indicators.bbStdDev);
            if (val) {
                chartData.bbUpperSeries.update(val.upper);
                chartData.bbMiddleSeries.update(val.middle);
                chartData.bbLowerSeries.update(val.lower);
            }
        }
        if (chartData.indicators.rsi && chartData.rsiSeries) {
            const val = calculateLatestRSI(chartData.cachedData, chartData.indicators.rsiPeriod);
            if (val) chartData.rsiSeries.update(val);
        }
        if (chartData.indicators.vwap && chartData.vwapSeries) {
            const val = calculateLatestVWAP(chartData.cachedData, chartData.interval);
            if (val) chartData.vwapSeries.update(val);
        }
        if (chartData.indicators.atr && chartData.atrSeries) {
            const val = calculateLatestATR(chartData.cachedData, chartData.indicators.atrPeriod);
            if (val) chartData.atrSeries.update(val);
        }
    },

    toggleIndicatorVisibility(chartData, indType) {
        if (indType === "volume" && chartData.volumeSeries) {
            const v = !chartData.volumeSeries.options().visible;
            chartData.volumeSeries.applyOptions({ visible: v });
            return v;
        } else if (indType === "sma1" && chartData.smaSeries1) {
            const v = !chartData.smaSeries1.options().visible;
            chartData.smaSeries1.applyOptions({ visible: v });
            return v;
        } else if (indType === "sma2" && chartData.smaSeries2) {
            const v = !chartData.smaSeries2.options().visible;
            chartData.smaSeries2.applyOptions({ visible: v });
            return v;
        } else if (indType === "sma3" && chartData.smaSeries3) {
            const v = !chartData.smaSeries3.options().visible;
            chartData.smaSeries3.applyOptions({ visible: v });
            return v;
        } else if (indType === "ema1" && chartData.emaSeries1) {
            const v = !chartData.emaSeries1.options().visible;
            chartData.emaSeries1.applyOptions({ visible: v });
            return v;
        } else if (indType === "ema2" && chartData.emaSeries2) {
            const v = !chartData.emaSeries2.options().visible;
            chartData.emaSeries2.applyOptions({ visible: v });
            return v;
        } else if (indType === "ema3" && chartData.emaSeries3) {
            const v = !chartData.emaSeries3.options().visible;
            chartData.emaSeries3.applyOptions({ visible: v });
            return v;
        } else if (indType === "bb" && chartData.bbUpperSeries) {
            const v = !chartData.bbUpperSeries.options().visible;
            chartData.bbUpperSeries.applyOptions({ visible: v });
            if (chartData.bbMiddleSeries) chartData.bbMiddleSeries.applyOptions({ visible: v });
            if (chartData.bbLowerSeries) chartData.bbLowerSeries.applyOptions({ visible: v });
            return v;
        } else if (indType === "rsi" && chartData.rsiSeries) {
            const v = !chartData.rsiSeries.options().visible;
            chartData.rsiSeries.applyOptions({ visible: v });
            return v;
        } else if (indType === "vwap" && chartData.vwapSeries) {
            const v = !chartData.vwapSeries.options().visible;
            chartData.vwapSeries.applyOptions({ visible: v });
            return v;
        } else if (indType === "atr" && chartData.atrSeries) {
            const v = !chartData.atrSeries.options().visible;
            chartData.atrSeries.applyOptions({ visible: v });
            return v;
        }
        return null;
    },

    resetIndicators(chartData) {
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
        if (chartData.vwapSeries) chartData.vwapSeries.setData([]);
        if (chartData.atrSeries) chartData.atrSeries.setData([]);
    }
};

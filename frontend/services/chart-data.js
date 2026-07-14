const ChartDataService = (() => {

    let state, ApiService, restoreDrawings, updateMarkers, updateChartPriceFormat, 
        updateTicker, clearPaneMessage, setDataStatus, updateChartCountdown, 
        renderBacktestResults, setPaneMessage, getIntervalSeconds, 
        IndicatorService, OverlayService, LayoutService, updateChartLegend, 
        updateConnectionStatus, AlertService, bucketTime, CONFIG, normalizeCandle, restorePrimitiveDrawings, flashTicker;

    function initialize(injected) {
        ({
            state, ApiService, restoreDrawings, updateMarkers, updateChartPriceFormat, 
            updateTicker, clearPaneMessage, setDataStatus, updateChartCountdown, 
            renderBacktestResults, setPaneMessage, getIntervalSeconds, 
            IndicatorService, OverlayService, LayoutService, updateChartLegend, 
            updateConnectionStatus, AlertService, bucketTime, CONFIG, normalizeCandle, restorePrimitiveDrawings, flashTicker
        } = injected);
    }


async function loadOlderHistoricalData(chartData) {
    if (chartData.isFetchingHistory || !chartData.cachedData || chartData.cachedData.length === 0) return;
    chartData.isFetchingHistory = true;
    
    const oldestCandle = chartData.cachedData[0];
    const beforeTimestamp = oldestCandle.time;
    
    try {
        const { response, payload } = await ApiService.getHistory(chartData.symbol, chartData.interval, 1000, beforeTimestamp);
        
        if (!response.ok || !payload.candles || payload.candles.length === 0) {
            chartData.hasReachedBeginning = true;
            chartData.isFetchingHistory = false;
            return;
        }
        
        let oldCandles = payload.candles.map(normalizeCandle).filter(Boolean);
        if (oldCandles.length === 0) {
            chartData.hasReachedBeginning = true;
            chartData.isFetchingHistory = false;
            return;
        }
        
        oldCandles.sort((a, b) => a.time - b.time);
        
        // Remove duplicates that overlap with existing data
        const firstTime = chartData.cachedData.length > 0 ? chartData.cachedData[0].time : Infinity;
        oldCandles = oldCandles.filter(c => c.time < firstTime);
        
        if (oldCandles.length === 0) {
            chartData.hasReachedBeginning = true;
            chartData.isFetchingHistory = false;
            return;
        }
        
        // Safely prepend the older data
        chartData.cachedData = [...oldCandles, ...chartData.cachedData];
        
        // Re-calculate indicators smoothly and push into existing series arrays
        syncChartWithCache(chartData);
        restoreDrawings(chartData);
    if (typeof restorePrimitiveDrawings === 'function') restorePrimitiveDrawings(chartData);
        if (typeof updateMarkers === 'function') updateMarkers(chartData);
        
        chartData.isFetchingHistory = false;
    } catch (err) {
        console.error("Failed to load older history", err);
        chartData.isFetchingHistory = false;
    }
}

async function loadChartData(chartData) {
    if (chartData.instrumentId === "none") {
        setPaneMessage(chartData.id, "No Chart Selected");
        return;
    }
    try {
        setDataStatus(`Loading ${chartData.symbol} ${chartData.interval}`);
        chartData.isFetchingHistory = true;
        
        const { response, payload } = await ApiService.getHistory(chartData.symbol, chartData.interval, 1000);
        if (!response.ok || !payload.candles || payload.candles.length === 0) {
            throw new Error(payload.error || "No candles available");
        }
        let candles = payload.candles.map(normalizeCandle).filter(Boolean);

        if (candles.length === 0) throw new Error("No valid candle data parsed");
        
        // Ensure strictly ascending time order and remove duplicates to prevent chart glitches
        candles.sort((a, b) => a.time - b.time);
        candles = candles.filter((c, i, arr) => i === 0 || c.time > arr[i - 1].time);
        
        chartData.cachedData = candles;
        syncChartWithCache(chartData);

        const forceReset = () => {
            if (!chartData.chart) return;
            try {
                chartData.chart.timeScale().applyOptions({ rightOffset: LayoutService.getRightOffset(chartData, state.chartCount), barSpacing: 8 });
                LayoutService.scrollToNewestActualCandle(chartData, state.chartCount);
                chartData.chart.priceScale('right').applyOptions({ autoScale: true });
            } catch(e) {}
        };
        forceReset();
        setTimeout(forceReset, 50);

        chartData.currentCandle = candles[candles.length - 1];
        chartData.referencePrice = candles.length > 1 ? candles[candles.length - 2].close : chartData.currentCandle.open;
        
        updateChartPriceFormat(chartData, chartData.currentCandle.close);

        const isUp = chartData.currentCandle.close >= chartData.currentCandle.open;
        chartData.lastDirection = isUp ? 'up' : 'down';
        const color = isUp ? "#16a34a" : "#dc2626";
        if (chartData.chartType === 'line') {
            chartData.candleSeries.applyOptions({ color: color, priceLineColor: color });
        } else {
            chartData.candleSeries.applyOptions({ priceLineColor: color });
        }

        restoreDrawings(chartData);
    if (typeof restorePrimitiveDrawings === 'function') restorePrimitiveDrawings(chartData);

        updateTicker(chartData, chartData.currentCandle.close, chartData.referencePrice);
        clearPaneMessage(chartData.id);
        subscribeChart(chartData);
        setDataStatus(`Loaded ${chartData.symbol} ${chartData.interval}`);
        updateChartCountdown(chartData); // Show timer instantly after load

        if (state.backtest && state.backtest.symbol === chartData.symbol && state.backtest.interval === chartData.interval) {
            renderBacktestResults(chartData, state.backtest);
        }
    } catch (error) {
        setPaneMessage(chartData.id, error.message);
        setDataStatus(error.message);
    } finally {
        chartData.isFetchingHistory = false;
    }
}

function connectLiveStream() {
    // Backend SSE for local Mock Data and YFinance
    if (window.EventSource && !state.liveStream) {
        state.liveStream = new EventSource(`${CONFIG.API_BASE}/live`);
        state.liveStream.onopen = () => updateConnectionStatus();
        state.liveStream.onerror = () => updateConnectionStatus();
        state.liveStream.onmessage = event => {
            if (!event.data) return;
            handlePriceUpdate(JSON.parse(event.data));
        };
        state.liveStream.addEventListener('status', () => updateConnectionStatus());
        state.liveStream.addEventListener('ping', () => updateConnectionStatus());
    }

    // Native Binance WebSocket for all Crypto pairs (Trade Streaming)
    if (!state.binanceWs) {
        state.binanceWs = new WebSocket('wss://stream.binance.com:9443/ws');
        state.binanceWs.onopen = () => {
            updateConnectionStatus();
            
            Object.values(state.charts).forEach(chartData => {
                chartData.liveSubscribed = false; // Force resubscribe
                if (chartData.source === 'hyperliquid' && chartData.symbol !== 'none') {
                    subscribeChart(chartData);
                }
            });
        };
        state.binanceWs.onclose = () => {
            state.binanceWs = null;
            updateConnectionStatus();
            setTimeout(connectLiveStream, 5000); // Reconnect loop
        };
        state.binanceWs.onmessage = event => {
            const data = JSON.parse(event.data);
            if (data.e === 'trade') {
                handlePriceUpdate({
                    source: 'hyperliquid',
                    symbol: data.s.replace(/USDT$/, ''),
                    price: parseFloat(data.p),
                    time: data.T / 1000,
                    volume: parseFloat(data.q)
                });
            }
        };
    }

    // Native Hyperliquid WebSocket for all Crypto pairs
    if (!state.hlWs) {
        state.hlWs = new WebSocket('wss://api.hyperliquid.xyz/ws');
        state.hlWs.onopen = () => {
            updateConnectionStatus();
            
            // Keep the connection alive by pinging every 40 seconds
            if (state.hlPingInterval) clearInterval(state.hlPingInterval);
            state.hlPingInterval = setInterval(() => {
                if (state.hlWs && state.hlWs.readyState === WebSocket.OPEN) {
                    state.hlWs.send(JSON.stringify({ method: "ping" }));
                }
            }, 40000);
            
            Object.values(state.charts).forEach(chartData => {
                chartData.liveSubscribed = false; // Force resubscribe
                chartData.l2Subscribed = false;
                if (chartData.source === 'hyperliquid' && chartData.symbol !== 'none') {
                    subscribeChart(chartData);
                }
            });
        };
        state.hlWs.onclose = () => {
            if (state.hlPingInterval) {
                clearInterval(state.hlPingInterval);
                state.hlPingInterval = null;
            }
            state.hlWs = null;
            updateConnectionStatus();
            Object.values(state.charts).forEach(chartData => {
                chartData.liveSubscribed = false; // Reset so they resubscribe later
            });
            setTimeout(connectLiveStream, 5000); // Reconnect loop
        };
        state.hlWs.onmessage = event => {
            const data = JSON.parse(event.data);
            if (data.channel === 'trades' && data.data) {
                data.data.forEach(trade => {
                    handlePriceUpdate({
                        source: 'hyperliquid',
                        symbol: trade.coin,
                        price: parseFloat(trade.px),
                        time: trade.time / 1000,
                        volume: parseFloat(trade.sz)
                    });
                });
            } else if (data.channel === 'l2Book' && data.data) {
                const activeChart = state.charts[state.activeChartId];
                if (activeChart && activeChart.symbol === data.data.coin) {
                    MarketWidgetService.OrderBook.render(data.data);
                }
            }
        };
    }
}

function subscribeChart(chartData) {
    if (chartData.liveSubscribed || chartData.symbol === "No Chart" || chartData.symbol === "none") return;
    
    if (chartData.source === "hyperliquid") {
        // Subscribe to Binance for Trades
        if (state.binanceWs && state.binanceWs.readyState === WebSocket.OPEN) {
            const streamName = `${chartData.symbol.toLowerCase()}usdt@trade`;
            state.binanceWs.send(JSON.stringify({
                method: "SUBSCRIBE",
                params: [streamName],
                id: Date.now()
            }));
            chartData.liveSubscribed = true;
        }
        
        // Subscribe to Hyperliquid for L2 Book (only active chart)
        if (chartData.id === state.activeChartId && state.hlWs && state.hlWs.readyState === WebSocket.OPEN) {
            state.hlWs.send(JSON.stringify({
                method: "subscribe",
                subscription: { type: "l2Book", coin: chartData.symbol }
            }));
            chartData.l2Subscribed = true;
        }
        chartData.liveSubscribed = true;
    } else if (chartData.source !== "hyperliquid") {
        chartData.liveSubscribed = true;
        ApiService.subscribeLive({ source: chartData.source, symbol: chartData.symbol })
            .catch(error => {
                chartData.liveSubscribed = false;
                console.warn("Live subscribe failed", error);
            });
    }
}

function unsubscribeChart(chartData) {
    if (chartData.rafId) {
        cancelAnimationFrame(chartData.rafId);
        chartData.rafId = null;
    }

    if (!chartData.liveSubscribed || chartData.symbol === "No Chart" || chartData.symbol === "none") return;
    
    if (chartData.source === "hyperliquid") {
        // Unsubscribe from Binance
        if (state.binanceWs && state.binanceWs.readyState === WebSocket.OPEN) {
            const streamName = `${chartData.symbol.toLowerCase()}usdt@trade`;
            state.binanceWs.send(JSON.stringify({
                method: "UNSUBSCRIBE",
                params: [streamName],
                id: Date.now()
            }));
        }
        // Unsubscribe from Hyperliquid L2
        if (chartData.l2Subscribed && state.hlWs && state.hlWs.readyState === WebSocket.OPEN) {
            state.hlWs.send(JSON.stringify({
                method: "unsubscribe",
                subscription: { type: "l2Book", coin: chartData.symbol }
            }));
            chartData.l2Subscribed = false;
        }
    }
    chartData.liveSubscribed = false;
}

function handlePriceUpdate(tick) {
    Object.values(state.charts).forEach(chartData => {
        if (chartData.source !== tick.source || chartData.symbol !== tick.symbol) return;
        if (chartData.replay && chartData.replay.active) return;
        applyPriceUpdate(chartData, tick);
    });
}

function applyPriceUpdate(chartData, tick) {
    const price = Number(tick.price);
    const time = Number(tick.time);
    const volume = Number(tick.volume) || 0;
    if (!Number.isFinite(price) || !Number.isFinite(time)) return;

    AlertService.AlertRenderer.check(chartData, price);

    const candle = buildRealtimeCandle(chartData, time, price, volume);
    
    // Cache maintenance
    if (chartData.cachedData.length > 0) {
        const last = chartData.cachedData[chartData.cachedData.length - 1];
        if (last.time === candle.time) {
            chartData.cachedData[chartData.cachedData.length - 1] = candle;
        } else if (candle.time > last.time) {
            chartData.cachedData.push(candle);
            chartData.isNewBar = true;
        } else {
            // Ignore out of order / older WS ticks to prevent breaking ascending sort
            return;
        }
    } else {
        chartData.cachedData.push(candle);
        chartData.isNewBar = true;
    }

    if (window.paperTrading) {
        window.paperTrading.updatePrice(chartData.symbol, price, time);
    }

    chartData.flashDirection = chartData.lastPrice === null || price >= chartData.lastPrice ? "up" : "down";
    chartData.lastPrice = price;
    chartData.lastDirection = candle.close >= candle.open ? 'up' : 'down';

    if (!chartData.pendingUpdate) {
        chartData.pendingUpdate = true;
        chartData.rafId = requestAnimationFrame(() => flushChartUpdate(chartData));
    }
}

function syncChartWithCache(chartData) {
    if (!chartData.candleSeries || !chartData.cachedData || chartData.cachedData.length === 0) return;
    
    let mainData = chartData.cachedData;
    if (chartData.chartType === 'heikinAshi') {
        chartData.haData = window.calculateHeikinAshi(chartData.cachedData);
        mainData = chartData.haData;
    } else if (chartData.chartType === 'line') {
        mainData = chartData.cachedData.map(c => ({ time: c.time, value: c.close }));
    }
    
    let finalData = mainData;
    
    chartData.candleSeries.setData(finalData);

    if (chartData.futureWhitespaceSeries && mainData.length > 0) {
        const lastCandle = mainData[mainData.length - 1];
        let lastTime;
        if (typeof lastCandle.time === 'object' && lastCandle.time !== null) {
            lastTime = Date.UTC(lastCandle.time.year, lastCandle.time.month - 1, lastCandle.time.day) / 1000;
        } else if (typeof lastCandle.time === 'string') {
            lastTime = new Date(lastCandle.time).getTime() / 1000;
        } else {
            lastTime = Number(lastCandle.time);
        }
        
        const intervalSec = getIntervalSeconds(chartData.interval);
        const futureWhitespace = [];
        const val = lastCandle.close !== undefined ? lastCandle.close : lastCandle.value;
        for (let i = 1; i <= 150; i++) {
            futureWhitespace.push({ time: lastTime + i * intervalSec, value: val });
        }
        chartData.futureWhitespaceSeries.setData(futureWhitespace);
    }
    
    IndicatorService.updateAllIndicatorData(chartData);
    
    // Redraw canvas-based overlays after data changes
    if (chartData.indicators.vpvr) OverlayService.VolumeProfile.draw(chartData);
    if (chartData.indicators.sessions) OverlayService.SessionBands.draw(chartData);
    
    updateChartLegend(chartData);
}

function flushChartUpdate(chartData) {
    chartData.pendingUpdate = false;
    
    const candle = chartData.cachedData[chartData.cachedData.length - 1];
    if (!candle) return;

    let shouldShift = false;
    const isNewBar = chartData.isNewBar;
    if (isNewBar && chartData.chart) {
        const timeScale = chartData.chart.timeScale();
        if (typeof timeScale.scrollPosition === 'function') {
            const pos = timeScale.scrollPosition();
            if (pos <= 5 && pos >= -15) shouldShift = true; // Snap if we are hovering near the live edge
        }
    }
    
    chartData.isNewBar = false;

    let seriesUpdate;
    if (chartData.chartType === 'heikinAshi') {
        if (!chartData.haData) chartData.haData = window.calculateHeikinAshi(chartData.cachedData);
        const c = candle;
        let haOpen;
        if (chartData.haData.length >= 2) {
            const prevHA = isNewBar ? chartData.haData[chartData.haData.length - 1] : chartData.haData[chartData.haData.length - 2];
            haOpen = (prevHA.open + prevHA.close) / 2;
        } else {
            haOpen = c.open;
        }
        const haClose = (c.open + c.high + c.low + c.close) / 4;
        const haHigh = Math.max(c.high, haOpen, haClose);
        const haLow = Math.min(c.low, haOpen, haClose);
        seriesUpdate = { time: c.time, open: haOpen, high: haHigh, low: haLow, close: haClose };
        if (isNewBar) chartData.haData.push(seriesUpdate);
        else chartData.haData[chartData.haData.length - 1] = seriesUpdate;
    } else if (chartData.chartType === 'line') {
        seriesUpdate = { time: candle.time, value: candle.close };
    } else {
        seriesUpdate = candle;
    }

    if (!seriesUpdate || seriesUpdate.time == null || Number.isNaN(seriesUpdate.time) || Number.isNaN(seriesUpdate.close)) {
        console.error("INVALID SERIES UPDATE:", seriesUpdate);
        return;
    }
    chartData.candleSeries.update(seriesUpdate);
    
    if (isNewBar && chartData.futureWhitespaceSeries) {
        const intervalSec = getIntervalSeconds(chartData.interval);
        let lastTime;
        if (typeof candle.time === 'object' && candle.time !== null) {
            lastTime = Date.UTC(candle.time.year, candle.time.month - 1, candle.time.day) / 1000;
        } else if (typeof candle.time === 'string') {
            lastTime = new Date(candle.time).getTime() / 1000;
        } else {
            lastTime = Number(candle.time);
        }
        const futureTime = lastTime + 150 * intervalSec;
        const val = candle.close !== undefined ? candle.close : candle.value;
        chartData.futureWhitespaceSeries.update({ time: futureTime, value: val });
    }
    
    IndicatorService.updateLiveIndicators(chartData, candle);

    const color = chartData.lastDirection === 'up' ? "#16a34a" : "#dc2626";
    if (chartData.chartType === 'line') {
        chartData.candleSeries.applyOptions({ color: color, priceLineColor: color });
    } else {
        chartData.candleSeries.applyOptions({ priceLineColor: color });
    }

    if (shouldShift) {
        LayoutService.scrollToNewestActualCandle(chartData, state.chartCount);
    }

    if (chartData._vLineHandlers) {
        chartData._vLineHandlers.forEach(fn => fn());
    }

    if (!document.hidden) {
        const now = Date.now();
        if (now - chartData.lastUIUpdate > 100) {
            updateTicker(chartData, chartData.lastPrice, chartData.referencePrice);
            flashTicker(chartData.id, chartData.flashDirection);
            updateChartCountdown(chartData, now);
            
            if (!chartData.hoverParam) {
                updateChartLegend(chartData);
            }
            
            chartData.lastUIUpdate = now;
            
            if (state.chartCount === 1 && chartData.id === 'chart-1') {
                MarketWidgetService.AssetInfo.updatePrice(chartData.lastPrice);
                MarketWidgetService.OrderBook.updatePrice(chartData.lastPrice);
            }
        }
    }
}

function buildRealtimeCandle(chartData, time, price, volume) {
    const bucket = bucketTime(time, chartData.interval);
    const current = chartData.currentCandle;
    if (!current || current.time !== bucket) {
        if (current) {
            chartData.referencePrice = current.close;
        }
        chartData.currentCandle = {
            time: bucket,
            open: price,
            high: price,
            low: price,
            close: price,
                volume: volume,
        };
        return chartData.currentCandle;
    }

    current.high = Math.max(current.high, price);
    current.low = Math.min(current.low, price);
    current.close = price;
        current.volume += volume;
    return current;
}

    const History = {
        loadInitial: loadChartData,
        loadOlder: loadOlderHistoricalData
    };

    const Live = {
        connectStream: connectLiveStream,
        subscribe: subscribeChart,
        unsubscribe: unsubscribeChart,
        handleTick: handlePriceUpdate,
        applyTick: applyPriceUpdate
    };

    const Render = {
        syncCache: syncChartWithCache,
        flushUpdate: flushChartUpdate
    };

    const Candle = {
        buildRealtime: buildRealtimeCandle
    };

    return {
        initialize,
        History,
        Live,
        Render,
        Candle
    };
})();

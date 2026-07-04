const ReplayService = {
    startSelection(chartData) {
        if (!chartData || !chartData.cachedData || chartData.cachedData.length === 0) {
            return false;
        }

        chartData.replay = {
            active: true,
            status: 'selecting',
            chartId: chartData.id,
            speed: 1, 
            isPlaying: false,
            timer: null,
            fullData: [...chartData.cachedData],
            currentIndex: -1,
            paper: {
                balance: 100000,
                initialBalance: 100000,
                positions: [],
                history: []
            }
        };

        return true;
    },

    startAt(chartData, timeMs) {
        if (!chartData || !chartData.replay) return;
        
        let idx = chartData.replay.fullData.findIndex(c => c.time === timeMs);
        if (idx === -1) {
            idx = chartData.replay.fullData.findIndex(c => c.time >= timeMs);
            if (idx === -1) idx = 0;
        }
        
        chartData.replay.currentIndex = idx;
        chartData.replay.status = 'active';
    },

    runLoop(chartData, onFrameRendered, onEnd) {
        if (!chartData || !chartData.replay || !chartData.replay.isPlaying) return;
        
        if (chartData.replay.currentIndex >= chartData.replay.fullData.length - 1) {
            chartData.replay.isPlaying = false;
            if (onEnd) onEnd();
            return;
        }
        
        this.step(chartData, 1, onFrameRendered);
        
        const interval = 1000 / chartData.replay.speed;
        chartData.replay.timer = setTimeout(() => this.runLoop(chartData, onFrameRendered, onEnd), interval);
    },

    step(chartData, steps, onFrameRendered) {
        if (!chartData || !chartData.replay) return;
        
        let newIndex = chartData.replay.currentIndex + steps;
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= chartData.replay.fullData.length) newIndex = chartData.replay.fullData.length - 1;
        
        chartData.replay.currentIndex = newIndex;
        this.renderFrame(chartData);
        if (onFrameRendered) onFrameRendered();
    },

    renderFrame(chartData) {
        if (!chartData || !chartData.replay) return;
        
        const visibleData = chartData.replay.fullData.slice(0, chartData.replay.currentIndex + 1);
        chartData.cachedData = visibleData;
        chartData.currentCandle = visibleData[visibleData.length - 1];
    },

    updateMarkers(chartData, drawings) {
        if (!chartData || !chartData.candleSeries || !chartData.replay) return;
        
        const markers = [];
        
        const activeDrawings = drawings || [];
        activeDrawings.forEach(d => {
            if (d.type === 'buyMarker') {
                markers.push({ time: d.time, position: 'belowBar', color: '#16a34a', shape: 'arrowUp', text: 'BUY', id: d.id });
            } else if (d.type === 'sellMarker') {
                markers.push({ time: d.time, position: 'aboveBar', color: '#dc2626', shape: 'arrowDown', text: 'SELL', id: d.id });
            }
        });
        
        chartData.replay.paper.positions.forEach(pos => {
            markers.push({
                time: pos.entryTime,
                position: pos.direction === 'Long' ? 'belowBar' : 'aboveBar',
                color: '#3b82f6',
                shape: pos.direction === 'Long' ? 'arrowUp' : 'arrowDown',
                text: `R-ENTRY (${pos.direction})`
            });
        });
        
        chartData.replay.paper.history.forEach(pos => {
            markers.push({
                time: pos.entryTime,
                position: pos.direction === 'Long' ? 'belowBar' : 'aboveBar',
                color: '#3b82f6',
                shape: pos.direction === 'Long' ? 'arrowUp' : 'arrowDown',
                text: `R-ENTRY`
            });
            markers.push({
                time: pos.exitTime,
                position: pos.pnl >= 0 ? 'aboveBar' : 'belowBar',
                color: pos.pnl >= 0 ? '#10b981' : '#ef4444',
                shape: pos.pnl >= 0 ? 'arrowUp' : 'arrowDown',
                text: `R-EXIT`
            });
        });
        
        chartData.candleSeries.setMarkers(markers.sort((a, b) => a.time - b.time));
    },

    exit(chartData) {
        if (!chartData || !chartData.replay) return;
        if (chartData.replay.timer) clearTimeout(chartData.replay.timer);
        
        if (chartData.replayLines) {
            chartData.replayLines.forEach(series => {
                if (chartData.chart) {
                    try { chartData.chart.removeSeries(series); } catch(e){}
                }
            });
            chartData.replayLines = [];
        }
        
        if (chartData.replay.status === 'active') {
            chartData.cachedData = chartData.replay.fullData;
        }
        
        delete chartData.replay;
    },

    PaperTrading: {
        executeTrade(chartData, direction) {
            if (!chartData || !chartData.replay) return;
            const currentCandle = chartData.replay.fullData[chartData.replay.currentIndex];
            if (!currentCandle) return;
            
            const price = currentCandle.close;
            const size = (chartData.replay.paper.balance * 0.1) / price; 
            
            const pos = {
                id: Date.now().toString(),
                direction: direction,
                entryPrice: price,
                size: size,
                entryTime: currentCandle.time
            };
            
            chartData.replay.paper.positions.push(pos);
        },

        closeAllTrades(chartData) {
            if (!chartData || !chartData.replay || chartData.replay.paper.positions.length === 0) return;
            
            const currentCandle = chartData.replay.fullData[chartData.replay.currentIndex];
            const price = currentCandle.close;
            
            chartData.replay.paper.positions.forEach(pos => {
                const isLong = pos.direction === 'Long';
                const pnl = isLong ? (price - pos.entryPrice) * pos.size : (pos.entryPrice - price) * pos.size;
                
                chartData.replay.paper.balance += pnl;
                
                pos.exitPrice = price;
                pos.exitTime = currentCandle.time;
                pos.pnl = pnl;
                
                chartData.replay.paper.history.push(pos);
                
                if (chartData.chart) {
                    const lineSeries = chartData.chart.addLineSeries({
                        color: pnl >= 0 ? '#10b981' : '#ef4444',
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                        crosshairMarkerVisible: false,
                        lineStyle: 2
                    });
                    lineSeries.setData([
                        { time: pos.entryTime, value: pos.entryPrice },
                        { time: pos.exitTime, value: pos.exitPrice }
                    ]);
                    if (!chartData.replayLines) chartData.replayLines = [];
                    chartData.replayLines.push(lineSeries);
                }
            });
            
            chartData.replay.paper.positions = [];
        }
    }
};

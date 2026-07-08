const ReplayService = (() => {
    let deps = {};
    
    function initialize(injected) {
        deps = injected;
    }

    const Engine = {
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

    function onReplayFrameRendered(chartData) {
        if (deps.syncChartWithCache) deps.syncChartWithCache(chartData);
        
        const key = chartData.symbol;
        const drawings = deps.state.drawings[key] || [];
        Engine.updateMarkers(chartData, drawings);
        
        UI.update(chartData.id);

        if (deps.LayoutService && deps.state) {
            deps.LayoutService.scrollToNewestActualCandle(chartData, deps.state.chartCount);
        }
    }

    const Controller = {
        toggle(chartId) {
            const chartData = deps.state.charts[chartId];
            if (chartData.replay && chartData.replay.active) {
                this.exit(chartId);
            } else {
                this.startSelection(chartId);
            }
        },

        startSelection(chartId) {
            const activeChart = deps.state.charts[chartId];
            if (!Engine.startSelection(activeChart)) {
                alert("Please load a chart first.");
                return;
            }
            
            const btn = document.getElementById(`${chartId}-replay-toggle`);
            if (btn) {
                btn.dataset.originalText = btn.textContent;
                btn.textContent = "Cancel Replay";
                btn.style.background = "rgba(59, 130, 246, 0.2)";
            }
            
            const container = document.getElementById(`${activeChart.id}-container`);
            if (container) container.style.cursor = "crosshair";
            
            if (deps.setPaneMessage) deps.setPaneMessage(activeChart.id, "Click on any historical candle to start replay from there. Press ESC to cancel.");
            
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    this.cancelSelection(chartId);
                }
            };
            document.addEventListener('keydown', escapeHandler);
            activeChart.replay._escapeHandler = escapeHandler;
        },

        cancelSelection(chartId) {
            this.exit(chartId);
        },

        start(chartId, time) {
            const chartData = deps.state.charts[chartId];
            if (!chartData || !chartData.replay) return;
            if (deps.clearPaneMessage) deps.clearPaneMessage(chartData.id);
            
            const container = document.getElementById(`${chartData.id}-container`);
            if (container) container.style.cursor = "default";
            
            if (chartData.replay._escapeHandler) {
                document.removeEventListener('keydown', chartData.replay._escapeHandler);
                delete chartData.replay._escapeHandler;
            }
            
            let msTime = typeof time === 'object' ? deps.TimeUtils._getMs(time) / 1000 : time;
            
            Engine.startAt(chartData, msTime);
            
            if (deps.unsubscribeChart) deps.unsubscribeChart(chartData);
            
            UI.build(chartId);
            Engine.renderFrame(chartData);
            if (deps.syncChartWithCache) deps.syncChartWithCache(chartData);
            Engine.updateMarkers(chartData, deps.state.drawings[chartData.symbol]);
            UI.update(chartId);
            
            const btn = document.getElementById(`${chartId}-replay-toggle`);
            if (btn) {
                btn.textContent = "⏹";
                btn.title = "Exit Replay";
                btn.style.background = "rgba(239, 68, 68, 0.2)";
            }
        },

        exit(chartId) {
            const chartData = deps.state.charts[chartId];
            if (!chartData || !chartData.replay) return;
            
            const wasSelecting = chartData.replay.status === 'selecting';
            const wasActive = chartData.replay.status === 'active';
            
            if (chartData.replay._escapeHandler) {
                document.removeEventListener('keydown', chartData.replay._escapeHandler);
            }
            
            Engine.exit(chartData);
            
            if (wasSelecting) {
                const container = document.getElementById(`${chartId}-container`);
                if (container) container.style.cursor = "default";
                if (deps.clearPaneMessage) deps.clearPaneMessage(chartId);
                
                const btn = document.getElementById(`${chartId}-replay-toggle`);
                if (btn && btn.dataset.originalText) {
                    btn.textContent = btn.dataset.originalText;
                    btn.style.background = "";
                    delete btn.dataset.originalText;
                }
            } else if (wasActive) {
                if (deps.syncChartWithCache) deps.syncChartWithCache(chartData);
                if (deps.subscribeChart) deps.subscribeChart(chartData);
                
                const btn = document.getElementById(`${chartId}-replay-toggle`);
                if (btn && btn.dataset.originalText) {
                    btn.textContent = btn.dataset.originalText;
                    btn.style.background = "";
                    delete btn.dataset.originalText;
                } else if (btn) {
                    btn.textContent = "⏪ Replay";
                    btn.title = "Market Replay";
                    btn.style.background = "";
                }
            }
            
            UI.destroy(chartId);
        }
    };

    const Playback = {
        play(chartId) {
            const chartData = deps.state.charts[chartId];
            if (chartData && chartData.replay) {
                chartData.replay.isPlaying = true;
                const playBtn = document.getElementById(`${chartId}-replay-play`);
                const pauseBtn = document.getElementById(`${chartId}-replay-pause`);
                if (playBtn) playBtn.style.display = "none";
                if (pauseBtn) pauseBtn.style.display = "inline-block";
                Engine.runLoop(chartData, 
                    () => onReplayFrameRendered(chartData),
                    () => {
                        if (pauseBtn) pauseBtn.click();
                        alert("End of historical data reached.");
                    }
                );
            }
        },

        pause(chartId) {
            const chartData = deps.state.charts[chartId];
            if (chartData && chartData.replay) {
                chartData.replay.isPlaying = false;
                const playBtn = document.getElementById(`${chartId}-replay-play`);
                const pauseBtn = document.getElementById(`${chartId}-replay-pause`);
                if (playBtn) playBtn.style.display = "inline-block";
                if (pauseBtn) pauseBtn.style.display = "none";
                if (chartData.replay.timer) clearTimeout(chartData.replay.timer);
            }
        },

        step(chartId, steps) {
            const chartData = deps.state.charts[chartId];
            Engine.step(chartData, steps, () => onReplayFrameRendered(chartData));
        }
    };

    const UI = {
        build(chartId) {
            let panel = document.getElementById(`replay-toolbar-${chartId}`);
            if (!panel) {
                panel = document.createElement("div");
                panel.id = `replay-toolbar-${chartId}`;
                panel.className = "replay-toolbar-embedded";
                panel.style.cssText = `
                    position: absolute;
                    bottom: 20px;
                    left: 50%;
                    top: auto !important;
                    height: fit-content !important;
                    min-height: unset !important;
                    width: max-content;
                    max-width: 95%;
                    transform: translateX(-50%) scale(0.75);
                    transform-origin: bottom center;
                    background: #1e293b;
                    border: 1px solid #3b82f6;
                    padding: 8px 12px;
                    border-radius: 8px;
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    justify-content: center;
                    flex-wrap: wrap;
                    z-index: 1000;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                    color: white;
                    font-family: inherit;
                `;
                const container = document.getElementById(`${chartId}-container`);
                if (container) {
                    container.appendChild(panel);
                } else {
                    document.body.appendChild(panel);
                }
            }
            
            panel.innerHTML = `
                <button id="${chartId}-replay-play" class="theme-btn" style="background: #10b981; border: none; padding: 6px 10px;">▶ Play</button>
                <button id="${chartId}-replay-pause" class="theme-btn" style="background: #f59e0b; border: none; padding: 6px 10px; display: none;">⏸ Pause</button>
                <button id="${chartId}-replay-step-back" class="theme-btn" title="Step Back">⏮</button>
                <button id="${chartId}-replay-step-fwd" class="theme-btn" title="Step Forward">⏭</button>
                <button id="${chartId}-replay-jump-back" class="theme-btn" title="Jump Back 10">-10</button>
                <button id="${chartId}-replay-jump-fwd" class="theme-btn" title="Jump Forward 10">+10</button>
                <select id="${chartId}-replay-speed" class="theme-btn" title="Replay Speed" style="padding: 4px;">
                    <option value="0.25">0.25x</option>
                    <option value="0.5">0.5x</option>
                    <option value="1" selected>1x</option>
                    <option value="2">2x</option>
                    <option value="5">5x</option>
                    <option value="10">10x</option>
                    <option value="25">25x</option>
                    <option value="50">50x</option>
                </select>
                <div style="border-left: 1px solid #394654; height: 24px; margin: 0 2px;"></div>
                <button id="${chartId}-replay-buy" class="theme-btn" style="background: #10b981; border: none; padding: 6px 10px;">Buy</button>
                <button id="${chartId}-replay-sell" class="theme-btn" style="background: #ef4444; border: none; padding: 6px 10px;">Sell</button>
                <button id="${chartId}-replay-close" class="theme-btn" style="background: #394654; border: none; padding: 6px 10px;">Close</button>
                <div style="border-left: 1px solid #394654; height: 24px; margin: 0 2px;"></div>
                <div style="display: flex; flex-direction: column; font-size: 11px; line-height: 1.2;">
                    <span style="color:#8b9bb0">OHM: <span id="${chartId}-replay-bal" style="color:white;font-weight:bold;">100,000</span></span>
                    <span style="color:#8b9bb0">PnL: <span id="${chartId}-replay-pnl" style="font-weight:bold;">0.00</span></span>
                </div>
                <div style="border-left: 1px solid #394654; height: 24px; margin: 0 2px;"></div>
                <button id="${chartId}-replay-stats-toggle" class="theme-btn" style="background: #3b82f6; border: none; padding: 6px 10px;">📊 Stats</button>
                <button id="${chartId}-replay-exit" class="theme-btn" style="background: #ef4444; border: none; padding: 6px 10px;">Exit</button>
            `;
            
            document.getElementById(`${chartId}-replay-play`).onclick = () => Playback.play(chartId);
            document.getElementById(`${chartId}-replay-pause`).onclick = () => Playback.pause(chartId);
            
            document.getElementById(`${chartId}-replay-step-back`).onclick = () => Playback.step(chartId, -1);
            document.getElementById(`${chartId}-replay-step-fwd`).onclick = () => Playback.step(chartId, 1);
            document.getElementById(`${chartId}-replay-jump-back`).onclick = () => Playback.step(chartId, -10);
            document.getElementById(`${chartId}-replay-jump-fwd`).onclick = () => Playback.step(chartId, 10);
            
            document.getElementById(`${chartId}-replay-speed`).onchange = (e) => {
                const chartData = deps.state.charts[chartId];
                if (chartData && chartData.replay) {
                    chartData.replay.speed = parseFloat(e.target.value);
                }
            };
            
            document.getElementById(`${chartId}-replay-buy`).onclick = () => { 
                Engine.PaperTrading.executeTrade(deps.state.charts[chartId], 'Long');
                onReplayFrameRendered(deps.state.charts[chartId]);
            };
            document.getElementById(`${chartId}-replay-sell`).onclick = () => { 
                Engine.PaperTrading.executeTrade(deps.state.charts[chartId], 'Short');
                onReplayFrameRendered(deps.state.charts[chartId]);
            };
            document.getElementById(`${chartId}-replay-close`).onclick = () => { 
                Engine.PaperTrading.closeAllTrades(deps.state.charts[chartId]);
                onReplayFrameRendered(deps.state.charts[chartId]);
            };
            
            document.getElementById(`${chartId}-replay-stats-toggle`).onclick = () => {
                const p = document.getElementById(`replay-analytics-panel-${chartId}`);
                if (p) p.style.display = p.style.display === "none" ? "block" : "none";
            };
            
            document.getElementById(`${chartId}-replay-exit`).onclick = () => Controller.exit(chartId);
            
            this.update(chartId);
        },

        destroy(chartId) {
            const panel = document.getElementById(`replay-toolbar-${chartId}`);
            if (panel) panel.remove();
            
            const analyticsPanel = document.getElementById(`replay-analytics-panel-${chartId}`);
            if (analyticsPanel) analyticsPanel.remove();
        },

        update(chartId) {
            const chartData = deps.state.charts[chartId];
            if (!chartData || !chartData.replay) return;
            
            let openPnl = 0;
            const currentCandle = chartData.replay.fullData[chartData.replay.currentIndex];
            if (currentCandle) {
                const price = currentCandle.close;
                chartData.replay.paper.positions.forEach(pos => {
                    const pnl = pos.direction === 'Long' ? (price - pos.entryPrice) * pos.size : (pos.entryPrice - price) * pos.size;
                    openPnl += pnl;
                });
            }
            
            const balEl = document.getElementById(`${chartId}-replay-bal`);
            const pnlEl = document.getElementById(`${chartId}-replay-pnl`);
            
            if (balEl && pnlEl) {
                balEl.textContent = `${chartData.replay.paper.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
                pnlEl.textContent = `${openPnl >= 0 ? '+' : ''}${openPnl.toFixed(2)}`;
                pnlEl.style.color = openPnl >= 0 ? '#10b981' : '#ef4444';
            }
            
            const history = chartData.replay.paper.history;
            const wins = history.filter(t => t.pnl > 0);
            const losses = history.filter(t => t.pnl <= 0);
            
            const winRate = history.length > 0 ? ((wins.length / history.length) * 100).toFixed(1) : '0.0';
            
            let grossWin = 0;
            let grossLoss = 0;
            let largestWin = 0;
            let largestLoss = 0;
            
            wins.forEach(w => { grossWin += w.pnl; if (w.pnl > largestWin) largestWin = w.pnl; });
            losses.forEach(l => { grossLoss += Math.abs(l.pnl); if (l.pnl < largestLoss) largestLoss = l.pnl; });
            
            const avgWin = wins.length > 0 ? (grossWin / wins.length) : 0;
            const avgLoss = losses.length > 0 ? (grossLoss / losses.length) : 0;
            const profitFactor = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : (grossWin > 0 ? '∞' : '0.00');
            
            const netPnl = (chartData.replay.paper.balance - chartData.replay.paper.initialBalance) + openPnl;
            const currentEquity = chartData.replay.paper.balance + openPnl;
            
            if (deps.ModalService && deps.ModalService.renderReplayAnalyticsPanel) {
                deps.ModalService.renderReplayAnalyticsPanel(
                    document.getElementById(`${chartId}-container`),
                    {
                        panelId: `replay-analytics-panel-${chartId}`,
                        initialBalance: chartData.replay.paper.initialBalance,
                        currentEquity: currentEquity,
                        netPnl: netPnl,
                        winRate: winRate,
                        totalTrades: history.length,
                        avgWin: avgWin,
                        avgLoss: avgLoss,
                        largestWin: largestWin,
                        largestLoss: largestLoss,
                        profitFactor: profitFactor
                    }
                );
            }
        }
    };

    return {
        initialize,
        Controller,
        Playback,
        UI
    };
})();

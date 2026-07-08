
function savePrimitiveDrawing(symbol, prim) {
    if (!state.drawings[symbol]) state.drawings[symbol] = [];
    const drawings = state.drawings[symbol];
    
    // Find index of drawing with same id
    const idx = drawings.findIndex(d => d.id === prim.id);
    const serialized = DrawingService.serializePrimitive(prim);
    if (!serialized) return;
    
    serialized.symbol = symbol;
    
    if (idx !== -1) {
        drawings[idx] = serialized;
    } else {
        drawings.push(serialized);
    }
    
    saveDrawings();
}

function restorePrimitiveDrawings(chartData) {
    if (window.drawingManager) {
        window.drawingManager.clearDrawings(chartData);
        window.drawingManager.chartDrawings[chartData.id] = [];
        const drawings = state.drawings[chartData.symbol] || [];
        
        const restored = DrawingService.restorePrimitiveDrawings(chartData, drawings);
        if (restored && restored.length > 0) {
            window.drawingManager.chartDrawings[chartData.id] = restored;
        }
    }
}

window.clearAllDrawings = function() {
    if (!state.charts) return;
    
    // Clear from localStorage state
    Object.keys(state.drawings).forEach(symbol => {
        state.drawings[symbol] = [];
    });
    saveDrawings();
    
    // Clear from UI
    Object.values(state.charts).forEach(chartData => {
        if (window.drawingManager) {
            window.drawingManager.clearDrawings(chartData);
        }
        if (chartData.renderedDrawings) {
            Object.values(chartData.renderedDrawings).forEach(priceLine => {
                try { chartData.candleSeries.removePriceLine(priceLine); } catch(e) {}
            });
            chartData.renderedDrawings = {};
        }
        if (chartData.candleSeries) {
            try { chartData.candleSeries.setMarkers([]); } catch(e) {}
        }
    });
};

class DrawingManager {
    constructor() {
        this.activeTool = null;
        this.activeDrawing = null;
        this.chartDrawings = {};
    }
    
    setTool(tool) {
        const primitiveTools = ['trendline', 'rectangle', 'fibonacci', 'text', 'longPosition', 'shortPosition', 'priceRange'];
        if (primitiveTools.includes(tool)) {
            this.activeTool = tool;
        } else {
            this.activeTool = null;
        }
        
        if (this.activeDrawing && (!tool || tool !== this.activeDrawing.type)) {
            this.activeDrawing = null;
        }
        
        const disableInteractions = !!tool && tool !== 'cursor';
        if (typeof state !== 'undefined' && state.charts) {
            Object.values(state.charts).forEach(chartData => {
                if (chartData && chartData.chart) {
                    chartData.chart.applyOptions({ 
                        handleScroll: !disableInteractions, 
                        handleScale: !disableInteractions 
                    });
                }
            });
        }
    }
    
    _getEventTimePrice(chartData, param) {
        if (!param.point) return null;
        const price = chartData.candleSeries.coordinateToPrice(param.point.y);
        if (price === null) return null;
        
        let time = param.time;
        if (!time) {
            const logical = param.logical ?? chartData.chart.timeScale().coordinateToLogical(param.point.x);
            if (logical !== null) {
                const bars = chartData.cachedData;
                if (bars && bars.length > 0) {
                    if (logical >= 0 && logical < bars.length) {
                        time = bars[Math.round(logical)]?.time;
                    } else {
                        const lastBar = bars[bars.length - 1];
                        const lastTime = lastBar.time;
                        const lastLogical = bars.length - 1;
                        const intervalSec = typeof intervalToSeconds === "function" ? intervalToSeconds(chartData.interval) : 60;
                        const logicalDiff = logical - lastLogical;
                        const lastTimeSec = typeof lastTime === 'object' ? Date.UTC(lastTime.year, lastTime.month - 1, lastTime.day) / 1000 : lastTime;
                        time = lastTimeSec + (logicalDiff * intervalSec);
                    }
                }
            }
        }
        return { time, price };
    }

    handleClick(chartData, param) {
        if (!param.point) return;
        const coords = this._getEventTimePrice(chartData, param);
        if (!coords) return;
        const { time, price } = coords;

        if (this.activeTool) {
            if (!this.activeDrawing) {
                const primitive = DrawingService.createPrimitive(this.activeTool, chartData.id, time, price);
                if (primitive) {
                    this.activeDrawing = primitive;
                    DrawingService.attachPrimitive(chartData, primitive);
                    
                    if (!this.chartDrawings[chartData.id]) this.chartDrawings[chartData.id] = [];
                    this.chartDrawings[chartData.id].push(primitive);
                    
                    if (this.activeTool === 'longPosition' || this.activeTool === 'shortPosition') {
                        DrawingService.finishPositionPrimitive(primitive, chartData, time, price, TimeUtils, intervalToSeconds);
                        savePrimitiveDrawing(chartData.symbol, primitive);
                        this.activeDrawing = null;
                        if (window.setDrawingTool) window.setDrawingTool('cursor');
                    } else if (this.activeTool === 'text') {
                        const txt = prompt("Enter text:", "Text");
                        if (txt) {
                            primitive.text = txt;
                            primitive.isFinished = true;
                            savePrimitiveDrawing(chartData.symbol, primitive);
                        } else {
                            DrawingService.detachPrimitive(chartData, primitive);
                            this.chartDrawings[chartData.id].pop();
                        }
                        this.activeDrawing = null;
                        if (window.setDrawingTool) window.setDrawingTool('cursor');
                    }
                }
            } else {
                this.activeDrawing.setP2(time, price);
                this.activeDrawing.isFinished = true;
                savePrimitiveDrawing(chartData.symbol, this.activeDrawing);
                this.activeDrawing = null;
                if (window.setDrawingTool) window.setDrawingTool('cursor');
            }
        }
    }
    
    handleCrosshairMove(chartData, param) {
        if (!this.activeDrawing) return;
        const coords = this._getEventTimePrice(chartData, param);
        if (!coords) return;
        this.activeDrawing.setP2(coords.time, coords.price);
    }
    
    bindDragHandles(chartData) {
        const container = document.getElementById(`${chartData.id}-container`);
        if (!container) return;

        let dragging = null;

        const projectPointOnSegment = (px, py, x1, y1, x2, y2) => {
            const dx = x2 - x1;
            const dy = y2 - y1;
            const lenSq = dx * dx + dy * dy;
            if (lenSq === 0) return { x: x1, y: y1 };
            let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
            return { x: x1 + t * dx, y: y1 + t * dy };
        };

        const onMouseMove = (e) => {
            if (dragging || (window.drawingManager && window.drawingManager.activeTool)) return;
            const rect = container.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            
            const h = DrawingService.findHandle(chartData, this.chartDrawings, px, py);
            
            const drawings = this.chartDrawings[chartData.id] || [];
            let foundHover = false;
            
            for (const prim of drawings) {
                if (h && h.primitive === prim) {
                    if (!prim.isHovered) {
                        prim.isHovered = true;
                        if (prim._unhoverTimeout) { clearTimeout(prim._unhoverTimeout); prim._unhoverTimeout = null; }
                    }
                    
                    const coords = prim._getCoords ? prim._getCoords() : null;
                    if (coords && coords.x1 !== undefined && coords.x2 !== undefined) {
                        const proj = projectPointOnSegment(px, py, coords.x1, coords.y1, coords.x2, coords.y2);
                        const dist = Math.sqrt((px - proj.x) * (px - proj.x) + (py - proj.y) * (py - proj.y));
                        if (dist <= 15) {
                            let movedDist = 999;
                            if (prim._hoverX !== undefined && prim._hoverY !== undefined) {
                                const dx = proj.x - prim._hoverX;
                                const dy = proj.y - prim._hoverY;
                                movedDist = Math.sqrt(dx * dx + dy * dy);
                            }
                            if (prim._hoverX === undefined || prim._hoverY === undefined || movedDist > 50) {
                                prim._hoverX = proj.x;
                                prim._hoverY = proj.y;
                            }
                        }
                    } else {
                        let movedDist = 999;
                        if (prim._hoverX !== undefined && prim._hoverY !== undefined) {
                            const dx = px - prim._hoverX;
                            const dy = py - prim._hoverY;
                            movedDist = Math.sqrt(dx * dx + dy * dy);
                        }
                        if (prim._hoverX === undefined || prim._hoverY === undefined || movedDist > 50) {
                            prim._hoverX = px;
                            prim._hoverY = py;
                        }
                    }
                    
                    prim.updateAllViews();
                    foundHover = true;
                } else if (prim.isHovered) {
                    prim.isHovered = false;
                    prim._unhoverTimeout = setTimeout(() => {
                        prim._hoverX = undefined;
                        prim._hoverY = undefined;
                        prim._unhoverTimeout = null;
                        prim.updateAllViews();
                    }, 400);
                }
            }
            
            if (h && h.handleName === 'delete') {
                container.style.cursor = 'pointer';
            } else {
                container.style.cursor = h ? 'grab' : '';
            }
        };

        const onPointerDown = (e) => {
            const rect = container.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            const h = DrawingService.findHandle(chartData, this.chartDrawings, px, py);
            if (h) {
                if (h.handleName === 'delete') {
                    this.removeDrawing(chartData, h.primitive);
                    return;
                }
                dragging = h;
                container.style.cursor = 'grabbing';
                e.stopPropagation();
                e.preventDefault();
                chartData.chart.applyOptions({ handleScroll: false, handleScale: false });

                const onUp = () => {
                    if (dragging) {
                        savePrimitiveDrawing(chartData.symbol, dragging.primitive);
                    }
                    dragging = null;
                    container.style.cursor = '';
                    chartData.chart.applyOptions({ handleScroll: true, handleScale: true });
                    window.removeEventListener('pointerup', onUp);
                    window.removeEventListener('pointermove', onGlobalMove);
                };
                const onGlobalMove = (ev) => {
                    if (!dragging) return;
                    const coords = DrawingService.screenToChart(chartData, container, ev.clientX, ev.clientY);
                    if (coords) {
                        if (dragging.handleName === 'body') {
                            if (dragging.lastCoords) {
                                const cx = ev.clientX - container.getBoundingClientRect().left;
                                const logical = chartData.chart.timeScale().coordinateToLogical(cx);
                                const lastLogical = chartData.chart.timeScale().coordinateToLogical(dragging.lastX);
                                if (logical !== null && lastLogical !== null) {
                                    const dLogical = logical - lastLogical;
                                    const dPrice = coords.price - dragging.lastCoords.price;
                                    if (dragging.primitive.shift) dragging.primitive.shift(dLogical, dPrice);
                                }
                            }
                            dragging.lastCoords = coords;
                            dragging.lastX = ev.clientX - container.getBoundingClientRect().left;
                        } else {
                            dragging.primitive.setHandle(dragging.handleName, coords.time, coords.price);
                        }
                    }
                };
                window.addEventListener('pointerup', onUp);
                window.addEventListener('pointermove', onGlobalMove);
            }
        };

        container.addEventListener('pointermove', onMouseMove);
        container.addEventListener('pointerdown', onPointerDown, { capture: true });
    }

    removeDrawing(chartData, primitive) {
        DrawingService.detachPrimitive(chartData, primitive);
        if (this.chartDrawings[chartData.id]) {
            this.chartDrawings[chartData.id] = this.chartDrawings[chartData.id].filter(p => p.id !== primitive.id);
        }
        if (state.drawings[chartData.symbol]) {
            state.drawings[chartData.symbol] = state.drawings[chartData.symbol].filter(d => d.id !== primitive.id);
            saveDrawings();
        }
    }

    clearDrawings(chartData) {
        if (this.chartDrawings[chartData.id]) {
            this.chartDrawings[chartData.id].forEach(prim => {
                DrawingService.detachPrimitive(chartData, prim);
            });
            this.chartDrawings[chartData.id] = [];
        }
    }
}
window.drawingManager = new DrawingManager();

const TimeUtils = {
    timeZone: StorageService.getTimeZone(null) || Intl.DateTimeFormat().resolvedOptions().timeZone,

    _getMs: (time) => {
        // Lightweight Charts may pass a BusinessDay object for 1d+ timeframes or Unix timestamps (seconds)
        if (typeof time === "object" && time.year) {
            return Date.UTC(time.year, time.month - 1, time.day);
        }
        return time * 1000;
    },

    formatTooltip: (time) => {
        const date = new Date(TimeUtils._getMs(time));
        const tzName = TimeUtils.timeZone === "UTC" ? "UTC" : (TimeUtils.timeZone === "America/New_York" ? "EST" : (TimeUtils.timeZone === "Asia/Kolkata" ? "IST" : "Local"));
        return date.toLocaleString("en-IN", {
            timeZone: TimeUtils.timeZone,
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }) + " (" + tzName + ")";
    },

    formatAxis: (time, tickMarkType) => {
        const date = new Date(TimeUtils._getMs(time));
        // tickMarkType maps to zoom level: 0: Year, 1: Month, 2: DayOfMonth, 3: Time, 4: TimeWithSeconds
        switch (tickMarkType) {
            case 0: return date.toLocaleString("en-IN", { timeZone: TimeUtils.timeZone, year: "numeric" });
            case 1: return date.toLocaleString("en-IN", { timeZone: TimeUtils.timeZone, month: "short", year: "numeric" });
            case 2: return date.toLocaleString("en-IN", { timeZone: TimeUtils.timeZone, day: "numeric", month: "short" });
            case 3:
            case 4: return date.toLocaleString("en-IN", { timeZone: TimeUtils.timeZone, hour: "2-digit", minute: "2-digit", hour12: false });
            default: return date.toLocaleString("en-IN", { timeZone: TimeUtils.timeZone, month: "short", day: "numeric" });
        }
    },

    getCurrentTime: () => {
        const tzName = TimeUtils.timeZone === "UTC" ? "UTC" : (TimeUtils.timeZone === "America/New_York" ? "EST" : (TimeUtils.timeZone === "Asia/Kolkata" ? "IST" : "LCL"));
        return new Date().toLocaleTimeString("en-IN", { timeZone: TimeUtils.timeZone, hour12: true }) + " (" + tzName + ")";
    }
};

const state = {
    chartCount: CONFIG.DEFAULT_CHART_COUNT,
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
    backtest: null, // New state for backtesting
    replay: null,
    syncCharts: false,
    isSyncingScales: false,
};

document.addEventListener("DOMContentLoaded", initializeApp);

async function loadDependencies() {
    const scripts = ['indicators.js', 'paper-account.js', 'paper-positions.js', 'paper-history.js', 'paper-trading.js'];
    for (const s of scripts) {
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = s;
            script.onload = resolve;
            script.onerror = () => { console.warn(`Failed to load ${s}`); resolve(); };
            document.head.appendChild(script);
        });
    }
}

async function initializeApp() {
    // Inject a blank favicon to prevent 404 errors
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = 'data:,';
    document.head.appendChild(favicon);

    state.theme = StorageService.getTheme() || "dark";
    if (state.theme === "light") document.body.classList.add("light-theme");
    ThemeService.injectThemeStyles();

    const savedDrawings = StorageService.getDrawings();
    if (savedDrawings) {
        try {
            state.drawings = JSON.parse(savedDrawings);
        } catch (e) {
            state.drawings = {};
        }
    }

    const savedBacktest = StorageService.getBacktest();
    if (savedBacktest) {
        try {
            state.backtest = JSON.parse(savedBacktest);
        } catch (e) {
            state.backtest = null;
        }
    }

    state.chartCount = readSavedChartCount();
    
    await loadDependencies();
    if (window.PaperTrading) {
        window.paperTrading = new window.PaperTrading();
    }
    
    document.getElementById("chart-count").value = String(state.chartCount);
    document.getElementById("chart-count").addEventListener("change", event => {
        setChartCount(Number(event.target.value));
    });

    const chartCountEl = document.getElementById("chart-count");
    if (chartCountEl && chartCountEl.parentNode) {
        const backtestBtn = document.createElement("button");
        backtestBtn.id = "global-backtest-btn";
        backtestBtn.className = "theme-btn";
        backtestBtn.textContent = "📊 Backtest";
        backtestBtn.style.marginLeft = "12px";
        backtestBtn.onclick = openBacktestModal;
        chartCountEl.parentNode.appendChild(backtestBtn);

        const tzSelect = document.getElementById("global-tz-select");
        if (tzSelect) {
            const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            tzSelect.innerHTML = `
                <option value="${localTz}">LCL</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">EST</option>
                <option value="Asia/Kolkata">IST</option>
            `;
            tzSelect.value = TimeUtils.timeZone;
            if (!tzSelect.value) tzSelect.value = localTz;
            
            const tzDisplay = document.getElementById("global-tz-display");
            if (tzDisplay) tzDisplay.textContent = tzSelect.options[tzSelect.selectedIndex].text;
            
            tzSelect.addEventListener("change", (e) => {
                TimeUtils.timeZone = e.target.value;
                if (tzDisplay) tzDisplay.textContent = tzSelect.options[tzSelect.selectedIndex].text;
                StorageService.saveTimeZone(e.target.value);
                Object.values(state.charts).forEach(chartData => {
                    if (chartData.chart) chartData.chart.applyOptions({ localization: { timeFormatter: TimeUtils.formatTooltip } });
                });
                updateTimestamp();
            });
        }

        const themeBtn = document.createElement("button");
        themeBtn.id = "theme-toggle";
        themeBtn.className = "toolbar-btn";
        themeBtn.title = "Toggle Light/Dark Mode";
        themeBtn.textContent = state.theme === "dark" ? "☀️" : "🌙";
        themeBtn.style.marginTop = "auto";
        themeBtn.style.marginBottom = "4px";
        themeBtn.onclick = toggleTheme;
        const drawingToolbar = document.getElementById("drawing-toolbar");
        if (drawingToolbar) {
            drawingToolbar.appendChild(themeBtn);
        } else {
            chartCountEl.parentNode.appendChild(themeBtn);
        }

        const resetGridBtn = document.createElement("button");
        resetGridBtn.id = "reset-grid-btn";
        resetGridBtn.className = "theme-btn";
        resetGridBtn.title = "Reset chart grid to default equal sizes";
        resetGridBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>Reset Grid`;
        resetGridBtn.style.marginLeft = "8px";
        resetGridBtn.onclick = () => {
            // Clear saved sizes for the current chart count
            try {
                const raw = StorageService.getGridSizes();
                if (raw) {
                    const all = JSON.parse(raw);
                    delete all[state.chartCount];
                    StorageService.saveGridSizes(all);
                }
            } catch(e) {}
            // Re-render grid without saved sizes (CSS defaults kick in)
            renderGrid();
            // Brief visual feedback
            resetGridBtn.textContent = '✓ Reset';
            resetGridBtn.style.color = 'var(--green)';
            setTimeout(() => {
                resetGridBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>Reset Grid`;
                resetGridBtn.style.color = '';
            }, 1200);
        };
        chartCountEl.parentNode.appendChild(resetGridBtn);

    }

    connectLiveStream();
    await loadInstruments();
    renderGrid();
    updateTimestamp();
    
    MarketWidgetService.MarketTicker.create();
    fetchMarketMovers();
    
    const marketTicker = document.getElementById('market-ticker-container');
    if (marketTicker) {
        marketTicker.addEventListener('click', (e) => {
            const wlBtn = e.target.closest('.ticker-watchlist-btn');
            if (wlBtn) {
                e.preventDefault();
                e.stopPropagation();
                const symbol = wlBtn.getAttribute('data-symbol');
                if (symbol) WatchlistService.toggleWatchlistSymbol(symbol);
                return;
            }

            const moverItem = e.target.closest('.market-ticker-item');
            if (moverItem && moverItem.dataset.symbol) {
                const symbol = moverItem.dataset.symbol;
                const activeChartId = state.activeChartId || 'chart-1';
                switchChartSymbol(activeChartId, symbol);
            }
        });
    }

    setInterval(updateCountdowns, 1000);
    setInterval(updateTimestamp, 1000);
    setInterval(fetchMarketMovers, 5000);

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            Object.values(state.charts).forEach(chartData => {
                if (chartData.lastPrice !== null) {
                    updateTicker(chartData, chartData.lastPrice, chartData.referencePrice);
                }
                syncChartWithCache(chartData);
            });
            updateCountdowns();
            fetchMarketMovers();
        }
    });

    // --- GLOBAL COLLAPSIBLE RIGHT SIDEBAR INIT & TOGGLE ---
    const sidebarToggleBtn = document.getElementById("sidebar-toggle-divider");
    const globalSidebar = document.getElementById("global-right-sidebar");
    
    if (sidebarToggleBtn && globalSidebar) {
        // Load persistent collapse state (default to active/not collapsed)
        const isCollapsed = StorageService.getSidebarCollapsed();
        const arrowEl = sidebarToggleBtn.querySelector(".sidebar-toggle-arrow");
        if (isCollapsed) {
            globalSidebar.classList.add("collapsed");
            if (arrowEl) arrowEl.textContent = "◀";
        } else {
            globalSidebar.classList.remove("collapsed");
            if (arrowEl) arrowEl.textContent = "▶";
        }
        
        sidebarToggleBtn.addEventListener("click", () => {
            const willCollapse = !globalSidebar.classList.contains("collapsed");
            if (willCollapse) {
                globalSidebar.classList.add("collapsed");
                if (arrowEl) arrowEl.textContent = "◀";
            } else {
                globalSidebar.classList.remove("collapsed");
                if (arrowEl) arrowEl.textContent = "▶";
                // Refresh active chart data in sidebar on open
                const activeChart = state.charts[state.activeChartId] || state.charts['chart-1'];
                if (activeChart && activeChart.symbol !== 'none' && activeChart.symbol !== 'No Chart') {
                    fetchAndRenderAssetInfo(activeChart.symbol);
                    MarketWidgetService.OrderBook.updateHeader(activeChart.symbol);
                    if (window.paperTrading) {
                        window.paperTrading.setActiveSymbol(activeChart.symbol);
                    }
                }
            }
            StorageService.saveSidebarCollapsed(willCollapse);
            
            // Trigger resize on all charts to adapt to new width
            setTimeout(() => {
                Object.values(state.charts).forEach(cd => {
                    if (cd.chart) {
                        const el = document.getElementById(`${cd.id}-container`);
                        if (el) {
                            ChartService.resize(cd);
                        }
                    }
                });
            }, 250);
        });
    }

    // Persistent sidebar tabs switcher
    const sidebarTabs = document.querySelectorAll(".global-right-sidebar .sidebar-tab");
    const sidebarSlider = document.getElementById("sidebar-slider");
    if (sidebarTabs && sidebarSlider) {
        sidebarTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                sidebarTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const idx = tab.dataset.index;
                sidebarSlider.style.transform = `translateX(-${(idx * 100) / 3}%)`;
            });
        });
    }

    // Build the Paper Trading UI inside the static panel on start
    if (window.paperTrading) {
        const tradePanel = document.getElementById('paper-trade-panel');
        if (tradePanel) {
            window.paperTrading.buildUI(tradePanel);
        }
    }

    // Chart Sync Toggle Setup
    const syncChartsBtn = document.getElementById("sync-charts-btn");
    state.syncCharts = StorageService.getSyncCharts();
    if (syncChartsBtn) {
        if (state.syncCharts) {
            syncChartsBtn.classList.add("active");
        } else {
            syncChartsBtn.classList.remove("active");
        }
        
        syncChartsBtn.addEventListener("click", () => {
            state.syncCharts = !state.syncCharts;
            if (state.syncCharts) {
                syncChartsBtn.classList.add("active");
                // Sync all charts immediately to the active one
                const activeChart = state.charts[state.activeChartId] || state.charts['chart-1'];
                if (activeChart && activeChart.chart) {
                    const range = activeChart.chart.timeScale().getVisibleLogicalRange();
                    if (range) {
                        syncTimeScales(activeChart.id, range);
                    }
                }
            } else {
                syncChartsBtn.classList.remove("active");
            }
            StorageService.saveSyncCharts(state.syncCharts);
        });
    }

    // Show sync btn only when >1 chart is active
    const updateSyncBtnVisibility = () => {
        const btn = document.getElementById("sync-charts-btn");
        if (btn) btn.style.display = state.chartCount === 1 ? "none" : "";
    };
    updateSyncBtnVisibility();
    // Expose so setChartCount can call it
    window._updateSyncBtnVisibility = updateSyncBtnVisibility;
}

function syncTimeScales(sourceChartId, logicalRange) {
    if (state.isSyncingScales || !state.syncCharts) return;
    state.isSyncingScales = true;
    
    const sourceChart = state.charts[sourceChartId];
    const sourceOffset = sourceChart ? getMarginOffset(sourceChart) : 8;
    
    Object.values(state.charts).forEach(cd => {
        if (cd.id !== sourceChartId && cd.chart) {
            try {
                const targetOffset = getMarginOffset(cd);
                const offsetDiff = targetOffset - sourceOffset;
                const adjustedRange = {
                    from: logicalRange.from + offsetDiff,
                    to: logicalRange.to + offsetDiff
                };
                cd.chart.timeScale().setVisibleLogicalRange(adjustedRange);
            } catch(e) {
                console.warn("Failed to sync timescale range", e);
            }
        }
    });
    
    setTimeout(() => {
        state.isSyncingScales = false;
    }, 100);
}

function readSavedChartCount() {
    const saved = StorageService.getChartCount(0);
    return CONFIG.ALLOWED_COUNTS.includes(saved) ? saved : CONFIG.DEFAULT_CHART_COUNT;
}

function getSavedLayoutState() {
    return StorageService.getLayout() || {};
}

function saveLayoutState() {
    const layout = {};
    Object.values(state.charts).forEach(chartData => {
        layout[chartData.id] = {
            symbol: chartData.symbol,
            interval: chartData.interval,
            chartType: chartData.chartType,
            indicators: chartData.indicators
        };
    });
    StorageService.saveLayout(layout);
}

async function loadInstruments() {
    let cryptoPairs = [];
    
    try {
        // Fetch the full active coin universe directly from Binance
        const data = await ApiService.getExchangeInfo();
        cryptoPairs = data.symbols
            .filter(coin => coin.quoteAsset === 'USDT' && coin.status === 'TRADING')
            .map(coin => coin.baseAsset);
        // Remove duplicates and sort alphabetically
        cryptoPairs = [...new Set(cryptoPairs)].sort();
    } catch (error) {
        console.warn("Could not fetch live coin universe from Binance, using 130+ fallback list.", error);
        cryptoPairs = [
            "BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT",
            "POL", "TON", "SHIB", "LTC", "TRX", "NEAR", "APT", "ARB", "OP", "SUI",
            "INJ", "TIA", "RNDR", "SEI", "DYDX", "FIL", "KAS", "STX", "LDO", "FET",
            "RUNE", "WLD", "IMX", "HYPE", "PEPE", "WIF", "JUP", "PYTH", "BONK", "ORDI",
            "BCH", "ETC", "XMR", "XLM", "HBAR", "VET", "ALGO", "GRT", "EGLD", "AAVE",
            "SNX", "THETA", "EOS", "XTZ", "MANA", "SAND", "AXS", "GALA", "CRV", "MKR",
            "STRK", "ENA", "W", "ZETA", "ONDO", "AERO", "JTO", "ETHFI", "BOME", "MEW",
            "SLERF", "POPCAT", "PENGU", "OM", "TAO", "AR", "TRB", "SATS", "RATS", "ZIG",
            "MYRO", "NFP", "ALT", "AI", "XAI", "MANTA", "MEME", "ACE", "NTRN", "BIGTIME",
            "BLUR", "SUPER", "ILV", "BEAM", "MAGIC", "GMX", "COMP", "1INCH", "YFI", "SUSHI",
            "UNI", "CAKE", "SSV", "EDU", "ID", "HOOK", "LQTY", "FXS", "GNS", "PENDLE",
            "RDNT", "GTC", "BAND", "CYBER", "ARKM", "PORTAL", "PIXEL", "MAVIA", "GMT",
            "LUNA", "DASH", "ZEC", "IOTA", "NEO", "CHZ", "BAT", "ENJ", "ZIL", "KAVA",
            "RVN", "WAVES", "ONT", "ICX", "QTUM", "NANO", "OMG", "ZRX", "CELO", "BAL"
        ];
    }

    state.instruments = cryptoPairs.map(sym => ({
        id: sym,
        source: "hyperliquid",
        symbol: sym,
        name: getAssetName(sym),
        timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"]
    }));
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

function setChartCount(count) {
    const safeCount = CONFIG.ALLOWED_COUNTS.includes(count) ? count : CONFIG.DEFAULT_CHART_COUNT;
    state.chartCount = safeCount;
    StorageService.saveChartCount(safeCount);
    renderGrid();
    // Hide sync button in single-chart mode
    if (window._updateSyncBtnVisibility) window._updateSyncBtnVisibility();
}

function renderGrid() {
    const grid = document.getElementById("charts-grid");
    grid.className = `charts-grid layout-${state.chartCount}`;
    grid.innerHTML = "";

    Object.values(state.charts).forEach(chartData => {
        unsubscribeChart(chartData);
        if (chartData.chart) chartData.chart.remove();
    });
    state.charts = {};
    state.activeChartId = null;

    const savedLayout = getSavedLayoutState();

    for (let index = 1; index <= state.chartCount; index += 1) {
        const chartId = `chart-${index}`;
        
        const defaultConfigs = [
            { symbol: "BTC", interval: "1m" },
            { symbol: "BTC", interval: "5m" },
            { symbol: "BTC", interval: "15m" },
            { symbol: "BTC", interval: "1h" },
            { symbol: "BTC", interval: "4h" },
            { symbol: "BTC", interval: "1d" },
            { symbol: "none", interval: "1d" },
            { symbol: "none", interval: "1d" }
        ];
        const defaultConfig = defaultConfigs[(index - 1) % 8];
        const savedConfig = savedLayout[chartId] || {};
        
        let instrumentId = "none";
        let source = "none";
        let symbol = "No Chart";
        let interval = "1d";
        let targetSymbol = savedConfig.symbol || defaultConfig.symbol;
        let targetInterval = savedConfig.interval || defaultConfig.interval;
        let targetIndicators = savedConfig.indicators || {
            volume: true,
            sma1: false, sma2: false, sma3: false,
            ema1: false, ema2: false, ema3: false
        };

        if (targetIndicators.sma !== undefined && targetIndicators.sma1 === undefined) {
            targetIndicators.sma1 = targetIndicators.sma;
        }
        if (targetIndicators.ema !== undefined && targetIndicators.ema1 === undefined) {
            targetIndicators.ema1 = targetIndicators.ema;
        }

        // SMA 1 Defaults
        targetIndicators.sma1 = targetIndicators.sma1 || false;
        targetIndicators.sma1Period = targetIndicators.sma1Period || targetIndicators.smaPeriod || 20;
        targetIndicators.sma1Color = targetIndicators.sma1Color || targetIndicators.smaColor || '#f59e0b';
        targetIndicators.sma1LineWidth = targetIndicators.sma1LineWidth || targetIndicators.smaLineWidth || 1;

        // SMA 2 Defaults
        targetIndicators.sma2 = targetIndicators.sma2 || false;
        targetIndicators.sma2Period = targetIndicators.sma2Period || 50;
        targetIndicators.sma2Color = targetIndicators.sma2Color || '#10b981';
        targetIndicators.sma2LineWidth = targetIndicators.sma2LineWidth || 1;

        // SMA 3 Defaults
        targetIndicators.sma3 = targetIndicators.sma3 || false;
        targetIndicators.sma3Period = targetIndicators.sma3Period || 200;
        targetIndicators.sma3Color = targetIndicators.sma3Color || '#ef4444';
        targetIndicators.sma3LineWidth = targetIndicators.sma3LineWidth || 1;

        // EMA 1 Defaults
        targetIndicators.ema1 = targetIndicators.ema1 || false;
        targetIndicators.ema1Period = targetIndicators.ema1Period || targetIndicators.emaPeriod || 9;
        targetIndicators.ema1Color = targetIndicators.ema1Color || targetIndicators.emaColor || '#3b82f6';
        targetIndicators.ema1LineWidth = targetIndicators.ema1LineWidth || targetIndicators.emaLineWidth || 1;

        // EMA 2 Defaults
        targetIndicators.ema2 = targetIndicators.ema2 || false;
        targetIndicators.ema2Period = targetIndicators.ema2Period || 21;
        targetIndicators.ema2Color = targetIndicators.ema2Color || '#a855f7';
        targetIndicators.ema2LineWidth = targetIndicators.ema2LineWidth || 1;

        // EMA 3 Defaults
        targetIndicators.ema3 = targetIndicators.ema3 || false;
        targetIndicators.ema3Period = targetIndicators.ema3Period || 50;
        targetIndicators.ema3Color = targetIndicators.ema3Color || '#ec4899';
        targetIndicators.ema3LineWidth = targetIndicators.ema3LineWidth || 1;

        // Keep aliases for backward compatibility
        targetIndicators.sma = targetIndicators.sma1;
        targetIndicators.smaPeriod = targetIndicators.sma1Period;
        targetIndicators.smaColor = targetIndicators.sma1Color;
        targetIndicators.smaLineWidth = targetIndicators.sma1LineWidth;
        targetIndicators.ema = targetIndicators.ema1;
        targetIndicators.emaPeriod = targetIndicators.ema1Period;
        targetIndicators.emaColor = targetIndicators.ema1Color;
        targetIndicators.emaLineWidth = targetIndicators.ema1LineWidth;
        targetIndicators.bb = targetIndicators.bb || false;
        targetIndicators.bbPeriod = targetIndicators.bbPeriod || 20;
        targetIndicators.bbStdDev = targetIndicators.bbStdDev || 2;
        targetIndicators.bbColor = targetIndicators.bbColor || '#ec4899';
        targetIndicators.bbLineWidth = targetIndicators.bbLineWidth || 1;
        targetIndicators.rsi = targetIndicators.rsi || false;
        targetIndicators.rsiPeriod = targetIndicators.rsiPeriod || 14;
        targetIndicators.rsiColor = targetIndicators.rsiColor || '#8b5cf6';
        targetIndicators.rsiLineWidth = targetIndicators.rsiLineWidth || 2;
        targetIndicators.vwap = targetIndicators.vwap || false;
        targetIndicators.vwapColor = targetIndicators.vwapColor || '#ff6d00';
        targetIndicators.vwapLineWidth = targetIndicators.vwapLineWidth || 1;
        targetIndicators.atr = targetIndicators.atr || false;
        targetIndicators.atrPeriod = targetIndicators.atrPeriod || 14;
        targetIndicators.atrColor = targetIndicators.atrColor || '#2962ff';
        targetIndicators.atrLineWidth = targetIndicators.atrLineWidth || 2;
        
        if (targetSymbol !== "none" && targetSymbol !== "No Chart") {
            const instrument = state.instruments.find(i => i.symbol === targetSymbol) || state.instruments.find(i => i.symbol === defaultConfig.symbol) || state.instruments[0];
            if (instrument) {
                instrumentId = instrument.id;
                source = instrument.source;
                symbol = instrument.symbol;
                interval = instrument.timeframes.includes(targetInterval) ? targetInterval : instrument.timeframes[0];
            }
        }

        let targetChartType = savedConfig.chartType || "candles";
        const chartData = {
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

        state.charts[chartId] = chartData;
        const pane = LayoutService.createChartPane(chartData, index);
        pane.addEventListener('click', () => setActiveChart(chartData.id));
        grid.appendChild(pane);
        initializeChart(chartData);
        populatePaneControls(chartData);
        loadChartData(chartData);
    }

    const nextActive = state.charts[state.activeChartId] ? state.activeChartId : 'chart-1';
    setActiveChart(nextActive);

    // Reset inline styles before applying new layout to prevent bleed-over
    grid.style.gridTemplateColumns = '';
    grid.style.gridTemplateRows = '';

    // Restore saved grid sizes then attach drag handles
    const savedSizes = getSavedGridSizes(state.chartCount);
    if (savedSizes) {
        grid.style.gridTemplateColumns = savedSizes.cols;
        grid.style.gridTemplateRows    = savedSizes.rows;
    }
    if (state.chartCount > 1) {
        LayoutService.initGridResizeHandles(grid, state.chartCount, (cols, rows) => {
            saveGridSizes(state.chartCount, cols, rows);
            Object.values(state.charts).forEach(cd => {
                if (cd.chart) try { cd.chart.applyOptions({}); } catch(err) {}
            });
        });
    }

    setActiveChart('chart-1');
}

function getSavedGridSizes(count) {
    try {
        const raw = StorageService.getGridSizes();
        if (!raw) return null;
        const all = JSON.parse(raw);
        return all[count] || null;
    } catch(e) { return null; }
}

function saveGridSizes(count, cols, rows) {
    try {
        const raw = StorageService.getGridSizes();
        const all = raw ? JSON.parse(raw) : {};
        all[count] = { cols, rows };
        StorageService.saveGridSizes(all);
    } catch(e) {}
}








function populatePaneControls(chartData) {
    const pane = document.getElementById(chartData.id);
    const input = pane.querySelector(".symbol-select-input");
    const dropdown = pane.querySelector(".custom-select-dropdown");
    const symbolContainer = pane.querySelector(".symbol-select-container");
    const intervalSelect = pane.querySelector(".interval-select");
    const indicatorSelect = pane.querySelector(".indicator-select");
    const goLiveBtn = pane.querySelector(`#${chartData.id}-go-live`);
    const replayToggleBtn = pane.querySelector(`#${chartData.id}-replay-toggle`);

    input.value = chartData.symbol;

    let highlightedIndex = -1;

    const renderOptions = (filter = "") => {
        const lowerFilter = filter.toLowerCase();
        const filtered = state.instruments.filter(item => 
            item.symbol.toLowerCase().includes(lowerFilter) || 
            (item.name && item.name.toLowerCase().includes(lowerFilter))
        );
        let html = "";
        if ("no chart".includes(lowerFilter) || "none".includes(lowerFilter)) {
            html += `<div class="custom-select-option" data-id="none">
                <span class="option-symbol">No Chart</span>
            </div>`;
        }
        const wlList = (watchlistState && watchlistState.symbolsList) || [];
        html += filtered.map(item => {
            const inWl = wlList.includes(item.symbol);
            return `<div class="custom-select-option" data-id="${item.id}">
                <span class="option-symbol">${item.symbol}</span>
                <button class="option-watchlist-btn${inWl ? ' wl-active' : ''}" title="${inWl ? 'Remove from Watchlist' : 'Add to Watchlist'}" data-symbol="${item.symbol}">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
            </div>`;
        }).join("");
        dropdown.innerHTML = html;
        highlightedIndex = -1;
    };

    const updateHighlight = () => {
        const options = dropdown.querySelectorAll(".custom-select-option");
        options.forEach((opt, idx) => {
            if (idx === highlightedIndex) {
                opt.classList.add("highlighted");
                opt.scrollIntoView({ block: "nearest" });
            } else {
                opt.classList.remove("highlighted");
            }
        });
    };

    const openDropdown = () => {
        if (!dropdown.classList.contains("show")) {
            renderOptions("");
            dropdown.classList.add("show");
            input.select();
        }
    };

    const closeDropdown = () => {
        dropdown.classList.remove("show");
        input.value = chartData.symbol;
        input.blur();
    };

    input.addEventListener("focus", openDropdown);
    input.addEventListener("click", () => {
        if (dropdown.classList.contains("show")) {
            input.select();
        }
    });

    const chartTypeSelect = pane.querySelector(".chart-type-select");
    if (chartTypeSelect) {
        chartTypeSelect.value = chartData.chartType || "candles";
        chartTypeSelect.addEventListener("change", (e) => {
            chartData.chartType = e.target.value;
            changeChartType(chartData);
            saveLayoutState();
        });
    }

    const screenshotBtn = pane.querySelector(`#${chartData.id}-screenshot`);
    if (screenshotBtn) {
        screenshotBtn.addEventListener("click", () => {
            if (chartData.chart) {
                const canvas = chartData.chart.takeScreenshot();
                const link = document.createElement('a');
                link.download = `${chartData.symbol !== 'none' ? chartData.symbol : 'chart'}-${chartData.interval}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        });
    }

    const paneWatchlistBtn = pane.querySelector(".pane-watchlist-btn");
    if (paneWatchlistBtn) {
        // Set initial active state
        const sym0 = chartData.symbol;
        if (sym0 && sym0 !== 'none' && watchlistState && watchlistState.symbolsList && watchlistState.symbolsList.includes(sym0)) {
            paneWatchlistBtn.classList.add('wl-active');
            paneWatchlistBtn.title = 'Remove from Watchlist';
        }

        paneWatchlistBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const symbol = chartData.symbol;
            if (symbol && symbol !== "No Chart" && symbol !== "none") {
                WatchlistService.toggleWatchlistSymbol(symbol);
            }
        });
    }

    goLiveBtn.addEventListener("click", () => {
        if (chartData.chart) {
            chartData.customPriceOffset = 0;
            // Reset zoom (barSpacing) and right margin
            chartData.chart.timeScale().applyOptions({ rightOffset: LayoutService.getRightOffset(chartData, state.chartCount), barSpacing: 8 });
            LayoutService.scrollToNewestActualCandle(chartData, state.chartCount);
            chartData.chart.priceScale('right').applyOptions({ autoScale: true });
        }
    });

    if (replayToggleBtn) {
        replayToggleBtn.addEventListener("click", () => {
            toggleReplayMode(chartData.id);
        });
    }

    input.addEventListener("input", (e) => {
        dropdown.classList.add("show");
        renderOptions(e.target.value);
    });

    const clickOutsideHandler = (e) => {
        if (!symbolContainer.isConnected) {
            document.removeEventListener("mousedown", clickOutsideHandler);
            document.removeEventListener("touchstart", clickOutsideHandler);
            return;
        }
        if (dropdown.classList.contains("show") && !symbolContainer.contains(e.target)) {
            closeDropdown();
        }
    };
    document.addEventListener("mousedown", clickOutsideHandler);
    document.addEventListener("touchstart", clickOutsideHandler, { passive: true });

    input.addEventListener("keydown", (e) => {
        const options = dropdown.querySelectorAll(".custom-select-option");
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!dropdown.classList.contains("show")) {
                openDropdown();
            } else {
                highlightedIndex = (highlightedIndex + 1) % options.length;
                updateHighlight();
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!dropdown.classList.contains("show")) {
                openDropdown();
            } else {
                highlightedIndex = (highlightedIndex - 1 + options.length) % options.length;
                updateHighlight();
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (dropdown.classList.contains("show")) {
                let selectedOption = null;
                if (highlightedIndex >= 0 && highlightedIndex < options.length) {
                    selectedOption = options[highlightedIndex];
                } else if (options.length > 0) {
                    selectedOption = options[0];
                }
                
                if (selectedOption) {
                    const selectedId = selectedOption.getAttribute("data-id");
                    if (selectedId === "none") {
                        switchChartSymbol(chartData.id, 'none');
                    } else {
                        const instrument = state.instruments.find(item => item.id === selectedId);
                        if (instrument) switchChartSymbol(chartData.id, instrument.symbol);
                    }
                    closeDropdown();
                }
            }
        } else if (e.key === "Escape") {
            closeDropdown();
        }
    });

    dropdown.addEventListener("click", (e) => {
        const wlBtn = e.target.closest(".option-watchlist-btn");
        if (wlBtn) {
            e.preventDefault();
            e.stopPropagation();
            const symbol = wlBtn.getAttribute("data-symbol");
            if (symbol) WatchlistService.toggleWatchlistSymbol(symbol);
            // syncAllWatchlistBtns() (called inside toggleWatchlistSymbol) already
            // updates the wl-active class in-place — no need to re-render the dropdown
            return;
        }

        const option = e.target.closest(".custom-select-option");
        if (option) {
            e.preventDefault();
            e.stopPropagation();
            const selectedId = option.getAttribute("data-id");
            
            if (selectedId === "none") {
                switchChartSymbol(chartData.id, 'none');
            } else {
                const instrument = state.instruments.find(item => item.id === selectedId);
                
                if (instrument) {
                    switchChartSymbol(chartData.id, instrument.symbol);
                }
            }
            closeDropdown();
        }
    });

    updateIntervalOptions(chartData, intervalSelect);

    intervalSelect.addEventListener("change", async () => {
        const wasReplaying = chartData.replay && chartData.replay.active && chartData.replay.status === 'active';
        let replayTime = null;
        if (wasReplaying) {
            const currentCandle = chartData.replay.fullData[chartData.replay.currentIndex];
            if (currentCandle) replayTime = currentCandle.time;
            if (chartData.replay.timer) clearTimeout(chartData.replay.timer);
        }

        unsubscribeChart(chartData);
        chartData.interval = intervalSelect.value;
        resetChart(chartData);
        await loadChartData(chartData);
        
        if (wasReplaying) {
            chartData.replay.fullData = [...chartData.cachedData];
            startReplayAt(chartData.id, replayTime);
        }

        saveLayoutState();
    });

    indicatorSelect.addEventListener("change", (e) => {
        const indicator = e.target.value;
        if (indicator === "vpvr") {
            chartData.indicators.vpvr = !chartData.indicators.vpvr;
            updateVpvrMarginAndScroll(chartData);
            e.target.options[12].text = `Vol Profile (${chartData.indicators.vpvr ? 'On' : 'Off'})`;
        } else if (indicator === "sessions") {
            chartData.indicators.sessions = !chartData.indicators.sessions;
            if (chartData.indicators.sessions) {
                OverlayService.SessionBands.draw(chartData);
            } else {
                OverlayService.SessionBands.clear(chartData);
            }
            e.target.options[13].text = `Sessions (${chartData.indicators.sessions ? 'On' : 'Off'})`;
        } else {
            // Update the state
            if (indicator === "volume") chartData.indicators.volume = !chartData.indicators.volume;
            else if (indicator === "sma1") { chartData.indicators.sma1 = !chartData.indicators.sma1; chartData.indicators.sma = chartData.indicators.sma1; }
            else if (indicator === "sma2") chartData.indicators.sma2 = !chartData.indicators.sma2;
            else if (indicator === "sma3") chartData.indicators.sma3 = !chartData.indicators.sma3;
            else if (indicator === "ema1") { chartData.indicators.ema1 = !chartData.indicators.ema1; chartData.indicators.ema = chartData.indicators.ema1; }
            else if (indicator === "ema2") chartData.indicators.ema2 = !chartData.indicators.ema2;
            else if (indicator === "ema3") chartData.indicators.ema3 = !chartData.indicators.ema3;
            else if (indicator === "bb") chartData.indicators.bb = !chartData.indicators.bb;
            else if (indicator === "rsi") chartData.indicators.rsi = !chartData.indicators.rsi;
            else if (indicator === "vwap") chartData.indicators.vwap = !chartData.indicators.vwap;
            else if (indicator === "atr") chartData.indicators.atr = !chartData.indicators.atr;
            
            IndicatorService.toggleIndicatorVisibility(chartData, indicator);
            
            // If turning on, we might need to populate data
            const isOn = chartData.indicators[indicator] || (indicator === 'sma1' && chartData.indicators.sma) || (indicator === 'ema1' && chartData.indicators.ema);
            if (isOn) {
                IndicatorService.updateAllIndicatorData(chartData);
            }
            
            if (indicator === "volume" || indicator === "rsi" || indicator === "atr") {
                LayoutService.updateSubchartMargins(chartData);
            }

            // Update text
            const textMap = {
                "volume": `Volume (${chartData.indicators.volume ? 'On' : 'Off'})`,
                "sma1": `SMA 1 (${chartData.indicators.sma1Period}) (${chartData.indicators.sma1 ? 'On' : 'Off'})`,
                "sma2": `SMA 2 (${chartData.indicators.sma2Period}) (${chartData.indicators.sma2 ? 'On' : 'Off'})`,
                "sma3": `SMA 3 (${chartData.indicators.sma3Period}) (${chartData.indicators.sma3 ? 'On' : 'Off'})`,
                "ema1": `EMA 1 (${chartData.indicators.ema1Period}) (${chartData.indicators.ema1 ? 'On' : 'Off'})`,
                "ema2": `EMA 2 (${chartData.indicators.ema2Period}) (${chartData.indicators.ema2 ? 'On' : 'Off'})`,
                "ema3": `EMA 3 (${chartData.indicators.ema3Period}) (${chartData.indicators.ema3 ? 'On' : 'Off'})`,
                "bb": `BB ${chartData.indicators.bbPeriod} (${chartData.indicators.bb ? 'On' : 'Off'})`,
                "rsi": `RSI ${chartData.indicators.rsiPeriod} (${chartData.indicators.rsi ? 'On' : 'Off'})`,
                "vwap": `VWAP (${chartData.indicators.vwap ? 'On' : 'Off'})`,
                "atr": `ATR ${chartData.indicators.atrPeriod} (${chartData.indicators.atr ? 'On' : 'Off'})`
            };
            
            const indexMap = { "volume": 1, "sma1": 2, "sma2": 3, "sma3": 4, "ema1": 5, "ema2": 6, "ema3": 7, "bb": 8, "rsi": 9, "vwap": 10, "atr": 11 };
            if (indexMap[indicator]) {
                e.target.options[indexMap[indicator]].text = textMap[indicator];
            }
        }
        e.target.value = ""; // Reset the dropdown back to the "ƒx" placeholder
        saveLayoutState();
    });
}

function updateIntervalOptions(chartData, intervalSelect) {
    const instrument = state.instruments.find(item => item.id === chartData.instrumentId);
    const intervals = instrument ? instrument.timeframes : ["1d"];
    intervalSelect.innerHTML = intervals.map(interval => `<option value="${interval}">${interval}</option>`).join("");
    intervalSelect.value = chartData.interval;
}

function changeChartType(chartData) {
    ChartService.changeType(chartData);
    
    if (chartData.lastPrice) updateChartPriceFormat(chartData, chartData.lastPrice);



    syncChartWithCache(chartData);
    restoreDrawings(chartData);
    if (typeof restorePrimitiveDrawings === 'function') restorePrimitiveDrawings(chartData);
    if (window.paperTrading && window.paperTrading.updatePositionLines) window.paperTrading.updatePositionLines(chartData);
}

function initializeChart(chartData) {
    const container = document.getElementById(`${chartData.id}-container`);
    container.style.position = 'relative'; // Ensure absolute positioning works for overlays
    const isLight = state.theme === "light";
    const themeOptions = ThemeService.getChartThemeOptions(isLight);

    ChartService.initialize(chartData, container, themeOptions, TimeUtils);

    // --- Custom Drag & Hover Overlay Logic ---
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'hover-delete-btn';
    deleteBtn.innerHTML = '✖';
    deleteBtn.style.display = 'none';
    deleteBtn.title = 'Delete Line';
    container.appendChild(deleteBtn);
    chartData.hoverDeleteBtn = deleteBtn;

    const addAlertBtn = document.createElement('div');
    addAlertBtn.className = 'hover-add-alert-btn';
    addAlertBtn.innerHTML = '＋';
    addAlertBtn.style.display = 'none';
    addAlertBtn.title = 'Add Alert';
    container.appendChild(addAlertBtn);
    chartData.hoverAddAlertBtn = addAlertBtn;

    let isDragging = false;
    let draggingLineInfo = null;
    
    // --- INFINITE SCROLL PAGINATION & SYNC ---
    if (typeof chartData.chart.timeScale().subscribeVisibleLogicalRangeChange === "function") {
        chartData.chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
            if (!logicalRange) return;
            
            if (state.syncCharts) {
                syncTimeScales(chartData.id, logicalRange);
            }
            
            if (chartData.isFetchingHistory || chartData.hasReachedBeginning) return;
            
            // If user scrolls within 100 bars of the oldest loaded candle, fetch more
            if (logicalRange.from < 100) {
                loadOlderHistoricalData(chartData);
            }
        });
    }

    container.addEventListener('mousedown', (e) => {
        if (chartData.drawingMode === 'hline' || chartData.drawingMode === 'vline') return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (!chartData.candleSeries) return;
        const clickedPrice = chartData.candleSeries.coordinateToPrice(y);

        const key = chartData.symbol;
        const lines = state.drawings[key] || [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.type === 'horizontalLine') {
                if (clickedPrice === null) continue;
                const lineY = chartData.candleSeries.priceToCoordinate(line.price);
                if (lineY !== null && Math.abs(y - lineY) < 15) {
                    isDragging = true;
                    draggingLineInfo = { line, index: i, key, startY: y };
                    // Temporarily disable panning
                    chartData.chart.applyOptions({ handleScroll: { pressedMouseMove: false } });
                    break;
                }
            } else if (line.type === 'alert') {
                if (clickedPrice === null) continue;
                const lineY = chartData.candleSeries.priceToCoordinate(line.price);
                let rightScaleWidth = 55;
                try { const w = chartData.chart.priceScale('right').width(); if (w > 10 && w < 150) rightScaleWidth = w; } catch(e) {}
                if (lineY !== null && Math.abs(y - lineY) < 15 && x >= rect.width - rightScaleWidth - 30) {
                    isDragging = true;
                    draggingLineInfo = { line, index: i, key, startY: y };
                    chartData.chart.applyOptions({ handleScroll: { pressedMouseMove: false } });
                    break;
                }
            } else if (line.type === 'verticalLine') {
                const timeScale = chartData.chart.timeScale();
                let lineX = null;
                if (line.logical !== undefined && line.logical !== null && timeScale.logicalToCoordinate) {
                    lineX = timeScale.logicalToCoordinate(line.logical);
                } else if (line.time !== undefined && timeScale.timeToCoordinate) {
                    lineX = timeScale.timeToCoordinate(line.time);
                }
                if (lineX !== null && Math.abs(x - lineX) < 15) {
                    isDragging = true;
                    draggingLineInfo = { line, index: i, key, startX: x };
                    chartData.chart.applyOptions({ handleScroll: { pressedMouseMove: false } });
                    break;
                }
            }
        }

        if (!isDragging && window.paperTrading) {
            const checkItem = (item, isOrder) => {
                if (item.symbol !== chartData.symbol) return false;
                
                if (isOrder && item.price !== null && item.price !== undefined) {
                    const lineY = chartData.candleSeries.priceToCoordinate(item.price);
                    if (lineY !== null && Math.abs(y - lineY) < 15) {
                        isDragging = true;
                        draggingLineInfo = { isPT: true, id: item.id, type: 'price', isOrder: isOrder, startY: y };
                        chartData.chart.applyOptions({ handleScroll: { pressedMouseMove: false } });
                        return true;
                    }
                }
                
                if (window.paperTrading.activeTPSLIds && !window.paperTrading.activeTPSLIds.has(item.id)) return false;
                if (item.tp !== null && item.tp !== undefined) {
                    const lineY = chartData.candleSeries.priceToCoordinate(item.tp);
                    if (lineY !== null && Math.abs(y - lineY) < 15) {
                        isDragging = true;
                        draggingLineInfo = { isPT: true, id: item.id, type: 'tp', isOrder: isOrder, startY: y };
                        chartData.chart.applyOptions({ handleScroll: { pressedMouseMove: false } });
                        return true;
                    }
                }
                if (item.sl !== null && item.sl !== undefined) {
                    const lineY = chartData.candleSeries.priceToCoordinate(item.sl);
                    if (lineY !== null && Math.abs(y - lineY) < 15) {
                        isDragging = true;
                        draggingLineInfo = { isPT: true, id: item.id, type: 'sl', isOrder: isOrder, startY: y };
                        chartData.chart.applyOptions({ handleScroll: { pressedMouseMove: false } });
                        return true;
                    }
                }
                return false;
            };
            for (let pos of window.paperTrading.positions.positions) if (checkItem(pos, false)) break;
            if (!isDragging) for (let order of window.paperTrading.positions.orders) if (checkItem(order, true)) break;
        }
        
        if (!isDragging) {
            let rightScaleWidth = 55;
            try { const w = chartData.chart.priceScale('right').width(); if (w > 10 && w < 150) rightScaleWidth = w; } catch(err) {}
            if (x < rect.width - rightScaleWidth) {
                chartData.verticalPanArmed = true;
                chartData.panStartX = x;
                chartData.panStartY = y;
                chartData.isVerticalPanning = false;
            }
        }
        

    }, { capture: true });

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (chartData.verticalPanArmed) {
            const dx = Math.abs(x - chartData.panStartX);
            const dy = Math.abs(y - chartData.panStartY);
            if (dy > 5 && dy > dx) {
                chartData.isVerticalPanning = true;
                chartData.verticalPanArmed = false;
                chartData.lastPanY = y;
            } else if (dx > 5) {
                chartData.verticalPanArmed = false;
            }
        }

        if (chartData.isVerticalPanning) {
            const p1 = chartData.candleSeries.coordinateToPrice(0);
            const p2 = chartData.candleSeries.coordinateToPrice(100);
            if (p1 !== null && p2 !== null) {
                const pricePerPixel = (p1 - p2) / 100;
                const dy = y - chartData.lastPanY;
                const deltaPrice = dy * pricePerPixel;
                chartData.customPriceOffset = (chartData.customPriceOffset || 0) + deltaPrice;
                chartData.chart.priceScale('right').applyOptions({ autoScale: true });
            }
            chartData.lastPanY = y;
        }

        // Handle dragging updates
        if (isDragging && draggingLineInfo) {
            if (draggingLineInfo.isPT) {
                if (Math.abs(y - draggingLineInfo.startY) > 3) chartData.justDragged = true;
                const newPrice = chartData.candleSeries.coordinateToPrice(y);
                if (newPrice !== null && window.paperTrading) {
                    const collection = draggingLineInfo.isOrder ? window.paperTrading.positions.orders : window.paperTrading.positions.positions;
                    const item = collection.find(i => i.id === draggingLineInfo.id);
                    if (item) {
                        if (draggingLineInfo.type === 'tp') item.tp = newPrice;
                        if (draggingLineInfo.type === 'sl') item.sl = newPrice;
                        if (draggingLineInfo.type === 'price') item.price = newPrice;
                        
                        Object.values(state.charts).forEach(cd => {
                            if (cd.symbol === chartData.symbol && cd.ptLineObjects) {
                                const pl = cd.ptLineObjects[`${item.id}_${draggingLineInfo.type}`];
                                if (pl && pl.applyOptions) pl.applyOptions({ price: newPrice });
                            }
                        });
                        
                        const tpInput = document.getElementById(`pt-edit-tp-${item.id}`);
                        const slInput = document.getElementById(`pt-edit-sl-${item.id}`);
                        const fmt = (p) => p < 1 ? p.toFixed(4) : p.toFixed(2);
                        if (draggingLineInfo.type === 'tp' && tpInput) tpInput.value = fmt(newPrice);
                        if (draggingLineInfo.type === 'sl' && slInput) slInput.value = fmt(newPrice);
                    }
                }
                chartData.hoverDeleteBtn.style.display = 'none';
                return;
            }
            if (draggingLineInfo.line.type === 'horizontalLine' || draggingLineInfo.line.type === 'alert') {
                if (Math.abs(y - draggingLineInfo.startY) > 3) {
                    chartData.justDragged = true;
                }
                const newPrice = chartData.candleSeries.coordinateToPrice(y);
                if (newPrice !== null) {
                    draggingLineInfo.line.price = newPrice;
                    Object.values(state.charts).forEach(cd => {
                        if (cd.symbol === chartData.symbol) {
                            const pl = cd.renderedDrawings[draggingLineInfo.line.id];
                            if (pl) {
                                if (pl instanceof HTMLElement) {
                                    if (draggingLineInfo.line.type === 'alert') draggingLineInfo.line.active = true;
                                    if (pl._updatePosition) pl._updatePosition();
                                } else if (pl.applyOptions) {
                                    if (draggingLineInfo.line.type === 'alert') {
                                        draggingLineInfo.line.active = true;
                                        pl.applyOptions({ price: newPrice, color: 'rgba(0, 0, 0, 0)', title: '🔔' });
                                    } else {
                                        pl.applyOptions({ price: newPrice });
                                    }
                                }
                            }
                        }
                    });
                }
            } else if (draggingLineInfo.line.type === 'verticalLine') {
                if (Math.abs(x - draggingLineInfo.startX) > 3) {
                    chartData.justDragged = true;
                }
                const timeScale = chartData.chart.timeScale();
                if (timeScale.coordinateToLogical) {
                    const newLogical = timeScale.coordinateToLogical(x);
                    if (newLogical !== null) {
                        draggingLineInfo.line.logical = newLogical;
                        if (timeScale.coordinateToTime) {
                            const newTime = timeScale.coordinateToTime(x);
                            if (newTime !== null) draggingLineInfo.line.time = newTime;
                        }
                        Object.values(state.charts).forEach(cd => {
                            if (cd.symbol === chartData.symbol) renderVerticalLine(cd, draggingLineInfo.line);
                        });
                    }
                }
            }
            if (chartData.hoverAddAlertBtn) chartData.hoverAddAlertBtn.style.display = 'none';
            chartData.hoverDeleteBtn.style.display = 'none';
            return;
        }

        // Handle hover displays
        if (!chartData.candleSeries || chartData.drawingMode === 'hline' || chartData.drawingMode === 'vline') {
            chartData.hoverDeleteBtn.style.display = 'none';
            if (chartData.hoverAddAlertBtn) chartData.hoverAddAlertBtn.style.display = 'none';
            container.classList.remove('hovering-hline');
            container.classList.remove('hovering-vline');
            return;
        }

        const hoverPrice = chartData.candleSeries.coordinateToPrice(y);
        let hoveredLine = null;
        let hoveredLineY = null;
        let hoveredLineX = null;
        let hoveredIsPT = false;

        const key = chartData.symbol;
        const lines = state.drawings[key];
        if (lines) {
            for (let line of lines) {
                if (line.type === 'horizontalLine') {
                    if (hoverPrice !== null) {
                        const lineY = chartData.candleSeries.priceToCoordinate(line.price);
                        if (lineY !== null && Math.abs(y - lineY) < 15) {
                            hoveredLine = line;
                            hoveredLineY = lineY;
                            break;
                        }
                    }
                } else if (line.type === 'alert') {
                    if (hoverPrice !== null) {
                        const lineY = chartData.candleSeries.priceToCoordinate(line.price);
                        let rightScaleWidth = 55;
                        try { const w = chartData.chart.priceScale('right').width(); if (w > 10 && w < 150) rightScaleWidth = w; } catch(e) {}
                        if (lineY !== null && Math.abs(y - lineY) < 15 && x >= rect.width - rightScaleWidth - 30) {
                            hoveredLine = line;
                            hoveredLineY = lineY;
                            break;
                        }
                    }
                } else if (line.type === 'verticalLine') {
                    const timeScale = chartData.chart.timeScale();
                    let lineX = null;
                    if (line.logical !== undefined && line.logical !== null && timeScale.logicalToCoordinate) {
                        lineX = timeScale.logicalToCoordinate(line.logical);
                    } else if (line.time !== undefined && timeScale.timeToCoordinate) {
                        lineX = timeScale.timeToCoordinate(line.time);
                    }
                    if (lineX !== null && Math.abs(x - lineX) < 15) {
                        hoveredLine = line;
                        hoveredLineX = lineX;
                        hoveredLineY = y;
                        break;
                    }
                }
            }
        }

        if (!hoveredLine && window.paperTrading && hoverPrice !== null) {
            const checkPTHover = (item, isOrder) => {
                if (item.symbol !== chartData.symbol) return false;
                
                if (isOrder && item.price !== null && item.price !== undefined) {
                    const lineY = chartData.candleSeries.priceToCoordinate(item.price);
                    if (lineY !== null && Math.abs(y - lineY) < 15) {
                        hoveredLine = { id: item.id, type: 'price' };
                        hoveredLineY = lineY;
                        hoveredIsPT = true;
                        return true;
                    }
                }
                
                if (window.paperTrading.activeTPSLIds && !window.paperTrading.activeTPSLIds.has(item.id)) return false;
                if (item.tp !== null && item.tp !== undefined) {
                    const lineY = chartData.candleSeries.priceToCoordinate(item.tp);
                    if (lineY !== null && Math.abs(y - lineY) < 15) {
                        hoveredLine = { id: item.id, type: 'tp' };
                        hoveredLineY = lineY;
                        hoveredIsPT = true;
                        return true;
                    }
                }
                if (item.sl !== null && item.sl !== undefined) {
                    const lineY = chartData.candleSeries.priceToCoordinate(item.sl);
                    if (lineY !== null && Math.abs(y - lineY) < 15) {
                        hoveredLine = { id: item.id, type: 'sl' };
                        hoveredLineY = lineY;
                        hoveredIsPT = true;
                        return true;
                    }
                }
                return false;
            };
            for (let pos of window.paperTrading.positions.positions) if (checkPTHover(pos, false)) break;
            if (!hoveredLine) for (let order of window.paperTrading.positions.orders) if (checkPTHover(order, true)) break;
        }

        if (hoveredLine) {
            if (hoveredIsPT) {
                container.classList.add('hovering-hline');
                container.classList.remove('hovering-vline');
                chartData.hoverDeleteBtn.style.display = 'none';
                chartData.hoveredLineId = null;
            } else if (hoveredLine.type === 'horizontalLine') {
                let currentLeft = parseFloat(chartData.hoverDeleteBtn.style.left) || 0;
                if (chartData.hoveredLineId !== hoveredLine.id || Math.abs(x - currentLeft) > 50) {
                    const safeX = Math.min(x + 15, rect.width - 50); // Keep it away from the right-side price scale
                    chartData.hoverDeleteBtn.style.left = `${safeX}px`;
                }
                chartData.hoverDeleteBtn.style.top = `${hoveredLineY - 9}px`;
                container.classList.add('hovering-hline');
                container.classList.remove('hovering-vline');
            } else if (hoveredLine.type === 'alert') {
                let rightScaleWidth = 55;
                try { const w = chartData.chart.priceScale('right').width(); if (w > 10 && w < 150) rightScaleWidth = w; } catch(e) {}
                chartData.hoverDeleteBtn.style.left = `${rect.width - rightScaleWidth - 25}px`;
                chartData.hoverDeleteBtn.style.top = `${hoveredLineY - 9}px`;
                container.classList.add('hovering-hline');
                container.classList.remove('hovering-vline');
            } else if (hoveredLine.type === 'verticalLine') {
                let currentTop = parseFloat(chartData.hoverDeleteBtn.style.top) || 0;
                if (chartData.hoveredLineId !== hoveredLine.id || Math.abs(y - currentTop) > 50) {
                    const safeY = Math.min(y + 15, rect.height - 30);
                    chartData.hoverDeleteBtn.style.top = `${safeY}px`;
                }
                chartData.hoverDeleteBtn.style.left = `${hoveredLineX - 9}px`;
                container.classList.add('hovering-vline');
                container.classList.remove('hovering-hline');
            }

            chartData.hoverDeleteBtn.style.display = 'flex';
            chartData.hoveredLineId = hoveredLine.id;
            if (chartData.hoverAddAlertBtn) chartData.hoverAddAlertBtn.style.display = 'none';
        } else {
            chartData.hoverDeleteBtn.style.display = 'none';
            chartData.hoveredLineId = null;
            container.classList.remove('hovering-hline');
            container.classList.remove('hovering-vline');
            
            if (hoverPrice !== null && !isDragging) {
                chartData.lastHoveredPrice = hoverPrice;
                let rightScaleWidth = 55;
                try { const w = chartData.chart.priceScale('right').width(); if (w > 10 && w < 150) rightScaleWidth = w; } catch(e) {}
                // Position it perfectly to the left of the right price scale
                const safeX = rect.width - rightScaleWidth - 22; 
                if (chartData.hoverAddAlertBtn) {
                    chartData.hoverAddAlertBtn.style.left = `${safeX}px`;
                    chartData.hoverAddAlertBtn.style.top = `${y - 9}px`;
                    chartData.hoverAddAlertBtn.style.display = 'flex';
                }
            } else {
                if (chartData.hoverAddAlertBtn) chartData.hoverAddAlertBtn.style.display = 'none';
            }
        }

        let overBtn = false;
        if (chartData.hoverAddAlertBtn && chartData.hoverAddAlertBtn.style.display !== 'none') {
            const bLeft = parseFloat(chartData.hoverAddAlertBtn.style.left);
            const bTop = parseFloat(chartData.hoverAddAlertBtn.style.top);
            if (x >= bLeft && x <= bLeft + 18 && y >= bTop && y <= bTop + 18) {
                chartData.hoverAddAlertBtn.classList.add('hovered');
                overBtn = true;
            } else {
                chartData.hoverAddAlertBtn.classList.remove('hovered');
            }
        }
        if (chartData.hoverDeleteBtn && chartData.hoverDeleteBtn.style.display !== 'none') {
            const bLeft = parseFloat(chartData.hoverDeleteBtn.style.left);
            const bTop = parseFloat(chartData.hoverDeleteBtn.style.top);
            if (x >= bLeft && x <= bLeft + 18 && y >= bTop && y <= bTop + 18) {
                chartData.hoverDeleteBtn.classList.add('hovered');
                overBtn = true;
            } else {
                chartData.hoverDeleteBtn.classList.remove('hovered');
            }
        }
        
        if (overBtn) container.classList.add('hovering-btn');
        else container.classList.remove('hovering-btn');
    });

    const finishDrag = (e) => {
        chartData.verticalPanArmed = false;
        if (chartData.isVerticalPanning) {
            chartData.isVerticalPanning = false;
            chartData.panStartPrice = null;
        }

        if (isDragging) {
            isDragging = false;
            if (draggingLineInfo && draggingLineInfo.isPT && window.paperTrading) {
                window.paperTrading.positions.save();
                window.paperTrading.renderPositions();
            } else {
                saveDrawings();
            }
            // Re-enable panning
            chartData.chart.applyOptions({ handleScroll: { pressedMouseMove: true } });
            if (chartData.justDragged) {
                setTimeout(() => chartData.justDragged = false, 50);
            }
        } else if (e && e.clientX !== undefined) {
            // Handle clicks strictly on the right side price scale (e.g., for Alerts)
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            let rightScaleWidth = 55;
            try { const w = chartData.chart.priceScale('right').width(); if (w > 10 && w < 150) rightScaleWidth = w; } catch(err) {}
            
            if (x >= rect.width - rightScaleWidth - 30) {
                if (chartData.candleSeries) {
                    const clickedPrice = chartData.candleSeries.coordinateToPrice(y);
                    if (clickedPrice !== null) {
                        const key = chartData.symbol;
                        const lines = state.drawings[key];
                        if (lines) {
                            for (let line of lines) {
                                if (line.type === 'alert') {
                                    const lineY = chartData.candleSeries.priceToCoordinate(line.price);
                                    if (lineY !== null && Math.abs(y - lineY) < 15) {
                                        openAlertSettingsModal(chartData, line, key);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    container.addEventListener('mouseup', finishDrag);
    container.addEventListener('mouseleave', () => {
        finishDrag();
        chartData.hoverDeleteBtn.style.display = 'none';
        if (chartData.hoverAddAlertBtn) chartData.hoverAddAlertBtn.style.display = 'none';
        container.classList.remove('hovering-hline');
        container.classList.remove('hovering-vline');
        container.classList.remove('hovering-btn');
    });

    container.addEventListener('click', (e) => {
        if (!chartData.candleSeries || !chartData.chart) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
            
            if (chartData.hoverAddAlertBtn && chartData.hoverAddAlertBtn.style.display !== 'none') {
                const bLeft = parseFloat(chartData.hoverAddAlertBtn.style.left);
                const bTop = parseFloat(chartData.hoverAddAlertBtn.style.top);
                if (x >= bLeft && x <= bLeft + 18 && y >= bTop && y <= bTop + 18) {
                    if (chartData.lastHoveredPrice !== null) {
                        openPriceAlertModal(chartData, chartData.lastHoveredPrice);
                    }
                    chartData.hoverAddAlertBtn.style.display = 'none';
                    e.stopPropagation();
                    return;
                }
            }
            
            if (chartData.hoverDeleteBtn && chartData.hoverDeleteBtn.style.display !== 'none') {
                const bLeft = parseFloat(chartData.hoverDeleteBtn.style.left);
                const bTop = parseFloat(chartData.hoverDeleteBtn.style.top);
                if (x >= bLeft && x <= bLeft + 18 && y >= bTop && y <= bTop + 18) {
                    const id = chartData.hoveredLineId;
                    if (id) {
                        const key = chartData.symbol;
                        const lines = state.drawings[key];
                        if (lines) {
                            const idx = lines.findIndex(l => l.id === id);
                            if (idx !== -1) {
                                const lineType = lines[idx].type;
                                Object.values(state.charts).forEach(cd => {
                                    if (cd.symbol === chartData.symbol) {
                                        if (lineType === 'verticalLine') {
                                            const el = document.getElementById(`vline-${cd.id}-${id}`);
                                            if (el) el.remove();
                                        } else {
                                            const pl = cd.renderedDrawings[id];
                                            if (pl) {
                                                if (pl instanceof HTMLElement) { pl.remove(); }
                                                else { try { cd.candleSeries.removePriceLine(pl); } catch(err){} }
                                                delete cd.renderedDrawings[id];
                                            }
                                        }
                                        updateMarkers(cd);
                                    }
                                });
                                lines.splice(idx, 1);
                                saveDrawings();
                            }
                        }
                    }
                    chartData.hoverDeleteBtn.style.display = 'none';
                    container.classList.remove('hovering-hline');
                    container.classList.remove('hovering-vline');
                    container.classList.remove('hovering-btn');
                    e.stopPropagation();
                    return;
                }
            }
    }, { capture: true });

    container.addEventListener('dblclick', (e) => {
        if (!chartData.candleSeries || !chartData.chart) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let rightScaleWidth = 55;
        try { const w = chartData.chart.priceScale('right').width(); if (w > 10 && w < 150) rightScaleWidth = w; } catch(err) {}

        if (x >= rect.width - rightScaleWidth) {
            const price = chartData.candleSeries.coordinateToPrice(y);
            if (price !== null) {
                openPriceAlertModal(chartData, price);
            }
        } else {
            chartData.customPriceOffset = 0;
            chartData.chart.timeScale().applyOptions({ rightOffset: LayoutService.getRightOffset(chartData, state.chartCount), barSpacing: 8 });
            LayoutService.resetDefaultViewport(chartData, state.chartCount);
            chartData.chart.priceScale('right').applyOptions({ autoScale: true });
        }
    });

    chartData.chart.subscribeClick((param) => {
        if (chartData.justDragged) return; // Ignore native clicks resolving immediately after a drag
        
        if (chartData.replay && chartData.replay.status === 'selecting') {
            if (param.time) {
                startReplayAt(chartData.id, param.time);
            }
            return;
        }

        if (!param.point || !chartData.candleSeries) return;
        
        if (window.drawingManager && (window.drawingManager.activeTool || window.drawingManager.activeDrawing)) {
            window.drawingManager.handleClick(chartData, param);
            return;
        }

        if (chartData.drawingMode) {
            const price = chartData.candleSeries.coordinateToPrice(param.point.y);
            const time = param.time;
            const logical = chartData.chart.timeScale().coordinateToLogical ? chartData.chart.timeScale().coordinateToLogical(param.point.x) : null;
            const id = Date.now().toString() + Math.random().toString().slice(2, 6);
            const key = chartData.symbol;
            if (!state.drawings[key]) state.drawings[key] = [];

            if (chartData.drawingMode === "hline") {
                if (price !== null) addHorizontalLine(chartData, price);
            } else if (chartData.drawingMode === "vline") {
                if (logical !== null || time !== undefined) {
                    const lineObj = { type: 'verticalLine', symbol: chartData.symbol, time: time, logical: logical, id: id, color: state.theme === 'light' ? '#3b82f6' : '#60a5fa', lineWidth: 2 };
                    state.drawings[key].push(lineObj);
                    saveDrawings();
                    Object.values(state.charts).forEach(cd => {
                        if (cd.symbol === chartData.symbol) renderVerticalLine(cd, lineObj);
                    });
                }
            } else if (chartData.drawingMode === "buyMarker" || chartData.drawingMode === "sellMarker") {
                if (time) {
                    state.drawings[key].push({
                        type: chartData.drawingMode, symbol: chartData.symbol, time: time, price: price, id: id
                    });
                    saveDrawings();
                    Object.values(state.charts).forEach(cd => {
                        if (cd.symbol === chartData.symbol) updateMarkers(cd);
                    });
                }
            } else if (chartData.drawingMode === "priceAlert") {
                if (price !== null) {
                    openPriceAlertModal(chartData, price);
                }
            }
            
            if (window.setDrawingTool) {
                window.setDrawingTool('cursor');
            } else {
                Object.values(state.charts).forEach(cd => {
                    cd.drawingMode = null;
                    const container = document.getElementById(`${cd.id}-container`);
                    if (container) container.style.cursor = "default";
                });
            }
            return;
        }

        let clickedPrice = null;
        if (chartData.candleSeries) {
            clickedPrice = chartData.candleSeries.coordinateToPrice(param.point.y);
        }
        checkAndInteractWithLine(chartData, clickedPrice, param.time, param.point);
    });

    if (typeof chartData.chart.subscribeCrosshairMove === "function") {
        chartData.chart.subscribeCrosshairMove((param) => {
            if (window.drawingManager && window.drawingManager.activeDrawing) {
                window.drawingManager.handleCrosshairMove(chartData, param);
            }
            
            // Track if crosshair is hovering inside chart
            if (param && param.point) {
                chartData.hoverParam = param;
            } else {
                chartData.hoverParam = null;
            }
            
            updateChartLegend(chartData, param);
            
            if (state.isSyncingCrosshair) return;
            
            state.isSyncingCrosshair = true;
            try {
                handleCrosshairSync(chartData, param);
            } catch (err) {
                console.warn("Crosshair sync error:", err);
            } finally {
                state.isSyncingCrosshair = false;
            }
        });
    }



    IndicatorService.createIndicators(chartData);

    chartData.futureWhitespaceSeries = chartData.chart.addLineSeries({
        visible: false,
        lastValueVisible: false,
        priceLineVisible: false
    });

    LayoutService.updateSubchartMargins(chartData);

    // Bind drawing handle drag events for the drawing manager
    if (window.drawingManager) {
        window.drawingManager.bindDragHandles(chartData);
    }

    // Add diagnostics requested for wheel event investigation
    setTimeout(() => runWheelDiagnostics(chartData.id), 1000);

    // Attach right-click context menu to this chart
    if (typeof window.attachChartContextMenu === 'function') {
        window.attachChartContextMenu(chartData);
    }
}


function resetChart(chartData) {
    chartData.isFetchingHistory = false;
    chartData.hasReachedBeginning = false;
    chartData.customPriceOffset = 0;
    chartData.currentCandle = null;
    chartData.lastPrice = null;
    chartData.referencePrice = null;
    chartData.liveSubscribed = false;
    chartData.cachedData = [];
    chartData.isSyncedCrosshairActive = false;
    if (chartData.candleSeries) chartData.candleSeries.setData([]);
    if (chartData.volumeSeries) chartData.volumeSeries.setData([]);
    if (chartData.smaSeries) chartData.smaSeries.setData([]);
    if (chartData.emaSeries) chartData.emaSeries.setData([]);
    if (chartData.bbUpperSeries) chartData.bbUpperSeries.setData([]);
    if (chartData.bbMiddleSeries) chartData.bbMiddleSeries.setData([]);
    if (chartData.bbLowerSeries) chartData.bbLowerSeries.setData([]);
    if (chartData.rsiSeries) chartData.rsiSeries.setData([]);
    if (chartData.vwapSeries) chartData.vwapSeries.setData([]);
    if (chartData.atrSeries) chartData.atrSeries.setData([]);
    if (chartData.futureWhitespaceSeries) chartData.futureWhitespaceSeries.setData([]);
    
    chartData.drawingMode = null;
    const container = document.getElementById(`${chartData.id}-container`);
    if (container) container.style.cursor = "default";

    if (chartData.renderedDrawings && chartData.candleSeries) {
        Object.values(chartData.renderedDrawings).forEach(pl => {
            if (pl instanceof HTMLElement) {
                pl.remove();
            } else {
                try {
                    chartData.candleSeries.removePriceLine(pl);
                } catch(e) {}
            }
        });
        chartData.renderedDrawings = {};
    }
    cleanupVerticalLines(chartData);

    setPaneMessage(chartData.id, chartData.instrumentId === "none" ? "No Chart Selected" : "Loading");
    updateTicker(chartData, null, null);
}

function saveDrawings() {
    StorageService.saveDrawings(state.drawings);
}

function addHorizontalLine(chartData, price) {
    const key = chartData.symbol;
    if (!state.drawings[key]) state.drawings[key] = [];
    
    const isLight = state.theme === 'light';
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    const lineObj = {
        type: "horizontalLine",
        symbol: chartData.symbol,
        price: price,
        id: id,
        color: isLight ? '#3b82f6' : '#60a5fa',
        lineWidth: 2
    };
    state.drawings[key].push(lineObj);
    saveDrawings();
    Object.values(state.charts).forEach(cd => {
        if (cd.symbol === chartData.symbol) renderHorizontalLine(cd, lineObj);
    });
}

function renderHorizontalLine(chartData, lineObj) {
    DrawingService.renderHorizontalLine(chartData, lineObj);
}

function checkAndInteractWithLine(chartData, clickedPrice, clickedTime, point) {
    const key = chartData.symbol;
    if (!state.drawings[key]) return;
    
    const lines = state.drawings[key];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.type === "horizontalLine") {
            if (chartData.candleSeries && clickedPrice !== null) {
                const clickedY = chartData.candleSeries.priceToCoordinate(clickedPrice);
                const lineY = chartData.candleSeries.priceToCoordinate(line.price);
                    if (clickedY !== null && lineY !== null && Math.abs(clickedY - lineY) < 15) {
                    openLineSettingsModal(chartData, line, key);
                    return;
                }
            }
        } else if (line.type === "alert") {
            // Alerts are now exclusively handled by mouseup directly on the right scale
        } else if ((line.type === "buyMarker" || line.type === "sellMarker") && clickedTime === line.time) {
            openMarkerSettingsModal(chartData, line, key);
            return;
        } else if (line.type === "verticalLine" && point) {
            if (chartData.chart) {
                const timeScale = chartData.chart.timeScale();
                let lineX = null;
                if (line.logical !== undefined && line.logical !== null && timeScale.logicalToCoordinate) {
                    lineX = timeScale.logicalToCoordinate(line.logical);
                } else if (line.time !== undefined && timeScale.timeToCoordinate) {
                    lineX = timeScale.timeToCoordinate(line.time);
                }
                    if (lineX !== null && Math.abs(point.x - lineX) < 15) {
                    openVLineSettingsModal(chartData, line);
                    return;
                }
            }
        }
    }
}

function openLineSettingsModal(chartData, lineObj, key) {
    const isLight = state.theme === 'light';
    const defaultColor = isLight ? '#3b82f6' : '#60a5fa';
    
    window.ModalService.openLineSettings({
        price: lineObj.price,
        color: lineObj.color || defaultColor,
        lineWidth: lineObj.lineWidth || 2
    }, {
        onSave: (data) => {
            lineObj.price = isNaN(data.price) ? lineObj.price : data.price;
            lineObj.color = data.color;
            lineObj.lineWidth = data.lineWidth;
            
            Object.values(state.charts).forEach(cd => {
                if (cd.symbol === chartData.symbol) {
                    const priceLine = cd.renderedDrawings?.[lineObj.id];
                    if (priceLine && priceLine.applyOptions) {
                        priceLine.applyOptions({
                            price: lineObj.price,
                            color: lineObj.color,
                            lineWidth: lineObj.lineWidth
                        });
                    }
                }
            });
            
            saveDrawings();
            window.ModalService.closeModal("line-settings-modal");
        },
        onDelete: () => {
            Object.values(state.charts).forEach(cd => {
                if (cd.symbol === chartData.symbol) {
                    const priceLine = cd.renderedDrawings?.[lineObj.id];
                    if (priceLine) {
                        if (priceLine instanceof HTMLElement) {
                            priceLine.remove();
                        } else {
                            try { cd.candleSeries.removePriceLine(priceLine); } catch (e) {}
                        }
                        delete cd.renderedDrawings[lineObj.id];
                    }
                }
            });
            const idx = state.drawings[key].findIndex(l => l.id === lineObj.id);
            if (idx !== -1) state.drawings[key].splice(idx, 1);
            saveDrawings();
            window.ModalService.closeModal("line-settings-modal");
        },
        onCancel: () => {
            window.ModalService.closeModal("line-settings-modal");
        }
    });
}

function restoreDrawings(chartData) {
    const lines = state.drawings[chartData.symbol];
    DrawingService.restoreNativeDrawings(chartData, lines);
}

function cleanupVerticalLines(chartData) {
    DrawingService.cleanupVerticalLines(chartData);
}

function renderVerticalLine(chartData, lineObj) {
    DrawingService.renderVerticalLine(chartData, lineObj);
}

function openVLineSettingsModal(chartData, lineObj) {
    const key = chartData.symbol;
    const isLight = state.theme === 'light';
    const defaultColor = isLight ? '#3b82f6' : '#60a5fa';
    
    window.ModalService.openVLineSettings({
        color: lineObj.color || defaultColor,
        lineWidth: lineObj.lineWidth || 2
    }, {
        onSave: (data) => {
            lineObj.color = data.color;
            lineObj.lineWidth = data.lineWidth;
            
            Object.values(state.charts).forEach(cd => {
                if (cd.symbol === chartData.symbol) renderVerticalLine(cd, lineObj);
            });
            
            saveDrawings();
            window.ModalService.closeModal("vline-settings-modal");
        },
        onDelete: () => {
            Object.values(state.charts).forEach(cd => {
                if (cd.symbol === chartData.symbol) {
                    const el = document.getElementById(`vline-${cd.id}-${lineObj.id}`);
                    if (el) el.remove();
                }
            });
            if (state.drawings[key]) {
                state.drawings[key] = state.drawings[key].filter(d => d.id !== lineObj.id);
                saveDrawings();
            }
            window.ModalService.closeModal("vline-settings-modal");
        },
        onCancel: () => {
            window.ModalService.closeModal("vline-settings-modal");
        }
    });
}

function openMarkerSettingsModal(chartData, markerObj, key) {
    const typeLabel = markerObj.type === 'buyMarker' ? 'Buy Marker' : 'Sell Marker';
    
    window.ModalService.openMarkerSettings({
        typeLabel: typeLabel
    }, {
        onDelete: () => {
            const lines = state.drawings[key];
            if (lines) {
                const idx = lines.findIndex(d => d.id === markerObj.id);
                if (idx !== -1) lines.splice(idx, 1);
                saveDrawings();
                Object.values(state.charts).forEach(cd => {
                    if (cd.symbol === chartData.symbol) updateMarkers(cd);
                });
            }
            window.ModalService.closeModal("marker-settings-modal");
        },
        onCancel: () => {
            window.ModalService.closeModal("marker-settings-modal");
        }
    });
}

window.refreshChartMarkers = () => {
    Object.values(state.charts).forEach(cd => updateMarkers(cd));
};

function updateMarkers(chartData) {
    const drawings = state.drawings[chartData.symbol];
    DrawingService.updateMarkers(chartData, drawings);
    if (window.paperTrading && window.paperTrading.updatePositionLines) {
        window.paperTrading.updatePositionLines(chartData);
    }
}



function renderAlertLine(chartData, alertObj) {
    DrawingService.renderAlertLine(chartData, alertObj);
}

function openPriceAlertModal(chartData, defaultPrice) {
    const formattedPrice = defaultPrice < 1 ? defaultPrice.toPrecision(4) : defaultPrice.toFixed(2);
    
    window.ModalService.openPriceAlert({
        price: formattedPrice
    }, {
        onSave: (data) => {
            const price = parseFloat(data.price);
            if (!isNaN(price)) {
                const id = Date.now().toString() + Math.random().toString().slice(2, 6);
                const alertObj = {
                    type: 'alert',
                    symbol: chartData.symbol,
                    price: price,
                    id: id,
                    active: true
                };
                const key = chartData.symbol;
                if (!state.drawings[key]) state.drawings[key] = [];
                state.drawings[key].push(alertObj);
                saveDrawings();
                Object.values(state.charts).forEach(cd => {
                    if (cd.symbol === chartData.symbol) renderAlertLine(cd, alertObj);
                });
                
                if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
                    Notification.requestPermission();
                }
            }
            window.ModalService.closeModal("alert-settings-modal");
        },
        onCancel: () => {
            window.ModalService.closeModal("alert-settings-modal");
        }
    });
}

function openAlertSettingsModal(chartData, alertObj, key) {
    window.ModalService.openAlertSettings({
        price: alertObj.price
    }, {
        onSave: (data) => {
            const newPrice = parseFloat(data.price);
            alertObj.price = isNaN(newPrice) ? alertObj.price : newPrice;
            alertObj.active = true;
            
            Object.values(state.charts).forEach(cd => {
                if (cd.symbol === chartData.symbol) {
                    const priceLine = cd.renderedDrawings?.[alertObj.id];
                    if (priceLine) {
                        if (priceLine instanceof HTMLElement) {
                            if (priceLine._updatePosition) priceLine._updatePosition();
                        } else if (priceLine.applyOptions) {
                            priceLine.applyOptions({
                                price: alertObj.price,
                                title: '🔔',
                                color: 'rgba(0, 0, 0, 0)'
                            });
                        }
                    }
                }
            });
            saveDrawings();
            window.ModalService.closeModal("alert-edit-modal");
        },
        onDelete: () => {
            Object.values(state.charts).forEach(cd => {
                if (cd.symbol === chartData.symbol) {
                    const priceLine = cd.renderedDrawings?.[alertObj.id];
                    if (priceLine) {
                        if (priceLine instanceof HTMLElement) {
                            priceLine.remove();
                        } else {
                            try { cd.candleSeries.removePriceLine(priceLine); } catch (e) {}
                        }
                        delete cd.renderedDrawings[alertObj.id];
                    }
                }
            });
            const idx = state.drawings[key].findIndex(l => l.id === alertObj.id);
            if (idx !== -1) state.drawings[key].splice(idx, 1);
            saveDrawings();
            window.ModalService.closeModal("alert-edit-modal");
        },
        onCancel: () => {
            window.ModalService.closeModal("alert-edit-modal");
        }
    });
}

function checkAlerts(chartData, currentPrice) {
    if (chartData.lastPrice === null) return;
    const prevPrice = chartData.lastPrice;
    
    const key = chartData.symbol;
    const lines = state.drawings[key];
    if (!lines) return;
    
    lines.forEach(line => {
        if (line.type === 'alert' && line.active !== false) {
            let triggered = false;
            if ((prevPrice <= line.price && currentPrice > line.price) || (prevPrice >= line.price && currentPrice < line.price)) {
                triggered = true;
            }
            
            if (triggered) {
                line.active = false;
                saveDrawings();
                showNotification(`Alert Triggered: ${chartData.symbol}`, `Price crossed ${line.price}. Current: ${currentPrice}`);
                
                Object.values(state.charts).forEach(cd => {
                    if (cd.symbol === chartData.symbol) {
                        const priceLine = cd.renderedDrawings?.[line.id];
                        if (priceLine) {
                            if (priceLine instanceof HTMLElement) {
                                if (priceLine._updatePosition) priceLine._updatePosition();
                            } else if (priceLine.applyOptions) {
                                    priceLine.applyOptions({ color: 'rgba(0, 0, 0, 0)', title: '🔕' });
                            }
                        }
                    }
                });
            }
        }
    });
}

function showNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: body });
    }
    
    const popup = document.createElement("div");
    popup.className = "alert-popup";
    popup.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
        <div>${body}</div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.style.opacity = "0";
        setTimeout(() => popup.remove(), 300);
    }, 5000);
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

function updateChartPriceFormat(chartData, currentPrice) {
    if (!currentPrice) return;
    let precision = 2;
    let minMove = 0.01;
    
    const absPrice = Math.abs(currentPrice);
    if (absPrice < 0.0000001) { precision = 10; minMove = 0.0000000001; }
    else if (absPrice < 0.00001) { precision = 8; minMove = 0.00000001; }
    else if (absPrice < 0.001) { precision = 6; minMove = 0.000001; }
    else if (absPrice < 0.1) { precision = 4; minMove = 0.0001; }
    else if (absPrice < 10) { precision = 3; minMove = 0.001; }
    else { precision = 2; minMove = 0.01; }

    const priceFormat = { type: 'price', precision: precision, minMove: minMove };
    
    if (chartData.candleSeries) chartData.candleSeries.applyOptions({ priceFormat });
    if (chartData.smaSeries) chartData.smaSeries.applyOptions({ priceFormat });
    if (chartData.emaSeries) chartData.emaSeries.applyOptions({ priceFormat });
    if (chartData.bbUpperSeries) chartData.bbUpperSeries.applyOptions({ priceFormat });
    if (chartData.bbMiddleSeries) chartData.bbMiddleSeries.applyOptions({ priceFormat });
    if (chartData.bbLowerSeries) chartData.bbLowerSeries.applyOptions({ priceFormat });
    if (chartData.vwapSeries) chartData.vwapSeries.applyOptions({ priceFormat });
    if (chartData.atrSeries) chartData.atrSeries.applyOptions({ priceFormat });
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

function syncChartWithCache(chartData) {
    if (!chartData.candleSeries || !chartData.cachedData || chartData.cachedData.length === 0) return;
    
    let mainData = chartData.cachedData;
    if (chartData.chartType === 'heikinAshi') {
        chartData.haData = calculateHeikinAshi(chartData.cachedData);
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

function updateVpvrMarginAndScroll(chartData) {
    if (!chartData || !chartData.chart) return;
    
    chartData.chart.timeScale().applyOptions({ rightOffset: LayoutService.getRightOffset(chartData, state.chartCount) });
    
    setTimeout(() => {
        LayoutService.scrollToNewestActualCandle(chartData, state.chartCount);
        
        const isVpvrActive = chartData.indicators && chartData.indicators.vpvr && chartData.indicators.vpvrVisible !== false;
        const canvas = OverlayService.VolumeProfile.ensureCanvas(chartData);
        if (canvas) {
            canvas.style.display = isVpvrActive ? 'block' : 'none';
        }
        
        if (isVpvrActive) {
            OverlayService.VolumeProfile.draw(chartData);
        } else {
            OverlayService.VolumeProfile.clear(chartData);
        }
        
        const pane = document.getElementById(chartData.id);
        const legendEl = pane ? pane.querySelector(".chart-legend") : null;
        if (legendEl) delete legendEl.dataset.structKey;
        updateChartLegend(chartData);
    }, 50);
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

    checkAlerts(chartData, price);

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
        requestAnimationFrame(() => flushChartUpdate(chartData));
    }
}

function handleCrosshairSync(sourceChartData, param) {
    if (sourceChartData.symbol === "No Chart" || sourceChartData.symbol === "none") return;

    const isLight = state.theme === "light";
    const syncColor = isLight ? "#0f172a" : "#ffffff";

    if (!param.point || !sourceChartData.candleSeries) {
        Object.values(state.charts).forEach(target => {
            const crosshairEl = document.getElementById(`${target.id}-sync-crosshair`);
            if (crosshairEl) crosshairEl.style.display = 'none';
            target.hoverParam = null;
            updateChartLegend(target);
        });
        return;
    }

    const hoveredPrice = sourceChartData.candleSeries.coordinateToPrice(param.point.y);
    const sourceTimeScale = sourceChartData.chart.timeScale();
    const logical = sourceTimeScale.coordinateToLogical(param.point.x);

        let sourceTimeSec = null;
        if (param.time !== undefined) {
            sourceTimeSec = typeof param.time === 'object' ? TimeUtils._getMs(param.time) / 1000 : param.time;
        } else if (logical !== null && sourceChartData.cachedData.length > 0) {
            const lastCandle = sourceChartData.cachedData[sourceChartData.cachedData.length - 1];
            const lastCoord = sourceTimeScale.timeToCoordinate(lastCandle.time);
            if (lastCoord !== null) {
                const lastLogical = sourceTimeScale.coordinateToLogical(lastCoord);
                if (lastLogical !== null) {
                    sourceTimeSec = lastCandle.time + (logical - lastLogical) * getIntervalSeconds(sourceChartData.interval);
                }
            }
        }

    Object.values(state.charts).forEach(target => {
        if (target.id === sourceChartData.id) {
            const crosshairEl = document.getElementById(`${target.id}-sync-crosshair`);
            if (crosshairEl) crosshairEl.style.display = 'none';
            return;
        }

        if (target.symbol === sourceChartData.symbol && target.chart && target.candleSeries) {
            let crosshairEl = document.getElementById(`${target.id}-sync-crosshair`);
            if (!crosshairEl) {
                const container = document.getElementById(`${target.id}-container`);
                if (!container) return;
                
                crosshairEl = document.createElement('div');
                crosshairEl.id = `${target.id}-sync-crosshair`;
                crosshairEl.style.position = 'absolute';
                crosshairEl.style.top = '0';
                crosshairEl.style.left = '0';
                crosshairEl.style.width = '100%';
                crosshairEl.style.height = '100%';
                crosshairEl.style.pointerEvents = 'none';
                crosshairEl.style.zIndex = '50';
                crosshairEl.style.overflow = 'visible';
                
                const vLine = document.createElement('div');
                vLine.id = `${target.id}-sync-vline`;
                vLine.style.position = 'absolute';
                vLine.style.top = '0';
                vLine.style.bottom = '0';
                vLine.style.width = '0px';
                vLine.style.borderLeft = '1px dashed';
                vLine.style.opacity = '0.5';
                
                const hLine = document.createElement('div');
                hLine.id = `${target.id}-sync-hline`;
                hLine.style.position = 'absolute';
                hLine.style.left = '0';
                hLine.style.height = '0px';
                hLine.style.borderTop = '1px dashed';
                hLine.style.opacity = '0.5';
                
                const vLabel = document.createElement('div');
                vLabel.id = `${target.id}-sync-vlabel`;
                vLabel.style.position = 'absolute';
                vLabel.style.bottom = '0';
                vLabel.style.transform = 'translateX(-50%)';
                vLabel.style.padding = '2px 6px';
                vLabel.style.fontSize = '11px';
                vLabel.style.fontFamily = 'inherit';
                vLabel.style.borderRadius = '4px';
                vLabel.style.zIndex = '51';
                vLabel.style.whiteSpace = 'nowrap';
                
                const hLabel = document.createElement('div');
                hLabel.id = `${target.id}-sync-hlabel`;
                hLabel.style.position = 'absolute';
                hLabel.style.right = '0';
                hLabel.style.transform = 'translateY(-50%)';
                hLabel.style.padding = '2px 6px';
                hLabel.style.fontSize = '11px';
                hLabel.style.fontFamily = 'inherit';
                hLabel.style.borderRadius = '4px';
                hLabel.style.zIndex = '51';
                hLabel.style.textAlign = 'center';
                
                crosshairEl.appendChild(vLine);
                crosshairEl.appendChild(hLine);
                crosshairEl.appendChild(vLabel);
                crosshairEl.appendChild(hLabel);
                container.appendChild(crosshairEl);
            }

            const vLine = document.getElementById(`${target.id}-sync-vline`);
            const hLine = document.getElementById(`${target.id}-sync-hline`);
            const vLabel = document.getElementById(`${target.id}-sync-vlabel`);
            const hLabel = document.getElementById(`${target.id}-sync-hlabel`);
            
            vLine.style.borderColor = syncColor;
            hLine.style.borderColor = syncColor;
            
            const labelBgC = syncColor;
            const labelTextC = isLight ? "#ffffff" : "#0f172a";
            vLabel.style.backgroundColor = labelBgC;
            vLabel.style.color = labelTextC;
            hLabel.style.backgroundColor = labelBgC;
            hLabel.style.color = labelTextC;

            let targetX = null;
            let targetY = null;
            const targetTimeScale = target.chart.timeScale();

            let targetIdx = -1;
            if (sourceTimeSec !== null && target.cachedData.length > 0) {
                let low = 0; let high = target.cachedData.length - 1;
                while (low <= high) {
                    const mid = Math.floor((low + high) / 2);
                    const current = target.cachedData[mid];
                    if (current.time <= sourceTimeSec) {
                        targetIdx = mid;
                        low = mid + 1;
                    } else {
                        high = mid - 1;
                    }
                }
                
                if (targetIdx !== -1) {
                    const targetCandle = target.cachedData[targetIdx];
                    const coord = targetTimeScale.timeToCoordinate(targetCandle.time);
                    if (coord !== null) {
                        const sourceIntSec = getIntervalSeconds(sourceChartData.interval);
                        const targetIntSec = getIntervalSeconds(target.interval);
                        const baseLogical = targetTimeScale.coordinateToLogical(coord);
                        
                        if (baseLogical !== null) {
                            const diffLogical = (sourceTimeSec - targetCandle.time) / targetIntSec;
                            if (sourceIntSec < targetIntSec) {
                                // Snap to the larger timeframe block, projecting seamlessly into future blank space
                                targetX = targetTimeScale.logicalToCoordinate(baseLogical + Math.floor(diffLogical));
                            } else {
                                // Glide smoothly if source is a larger or equal timeframe
                                targetX = targetTimeScale.logicalToCoordinate(baseLogical + diffLogical);
                            }
                        }
                    }
                }
            }

            if (targetIdx !== -1) {
                target.hoverParam = { time: target.cachedData[targetIdx].time };
                updateChartLegend(target, targetIdx);
            } else {
                target.hoverParam = null;
                updateChartLegend(target);
            }

            if (hoveredPrice !== null) {
                targetY = target.candleSeries.priceToCoordinate(hoveredPrice);
            }

            let rightScaleWidth = 0;
            try { rightScaleWidth = target.chart.priceScale('right').width(); } catch(e) {}
            const containerWidth = document.getElementById(`${target.id}-container`).clientWidth;

                crosshairEl.style.display = 'block';

            // Ensures the vertical line completely hides if dragged over the right price scale
            if (targetX !== null && targetX <= (containerWidth - rightScaleWidth)) {
                    vLine.style.display = 'block';
                    vLine.style.left = `${targetX}px`;
                    
                    vLabel.style.display = 'block';
                    vLabel.style.left = `${targetX}px`;
                    const date = new Date(sourceTimeSec * 1000);
                    const day = date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit" });
                    const mon = date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "short" });
                    const yy = date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", year: "2-digit" });
                    const timeStr = date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
                    vLabel.textContent = `${day} ${mon} '${yy} ${timeStr}`;
                } else {
                    vLine.style.display = 'none';
                    vLabel.style.display = 'none';
                }

                if (targetY !== null && hoveredPrice !== null) {
                    hLine.style.display = 'block';
                    hLine.style.top = `${targetY}px`;
                    hLine.style.width = `${containerWidth - rightScaleWidth}px`;
                    
                    hLabel.style.display = 'block';
                    hLabel.style.top = `${targetY}px`;
                    hLabel.style.width = `${rightScaleWidth}px`;
                    hLabel.textContent = formatPrice(hoveredPrice);
                } else {
                    hLine.style.display = 'none';
                    hLabel.style.display = 'none';
                }

                if (targetX === null && targetY === null) {
                    crosshairEl.style.display = 'none';
                }
        } else {
            const crosshairEl = document.getElementById(`${target.id}-sync-crosshair`);
            if (crosshairEl) crosshairEl.style.display = 'none';
            target.hoverParam = null;
            updateChartLegend(target);
        }
    });
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
        if (!chartData.haData) chartData.haData = calculateHeikinAshi(chartData.cachedData);
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

const eyeSvg   = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const eyeOffSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
const gearSvg  = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
const trashSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

function updateChartLegend(chartData, indexOrParam = null) {
    const container = document.getElementById(`${chartData.id}-container`);
    if (!container) return;

    let legendEl = container.querySelector(".chart-legend");
    if (!legendEl) {
        legendEl = document.createElement("div");
        legendEl.className = "chart-legend";
        container.appendChild(legendEl);
        
        legendEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.legend-ind-btn');
            if (!btn) return;
            const action = btn.dataset.action;
            const indType = btn.dataset.ind;
            
            if (action === 'toggle') {
                toggleIndicatorVisibility(chartData, indType);
            } else if (action === 'settings') {
                openSettingsModal(chartData, indType);
            } else if (action === 'delete') {
                chartData.indicators[indType] = false;
                if (indType === 'volume' && chartData.volumeSeries) {
                    chartData.candleSeries.priceScale().applyOptions({ autoScale: true });
                    chartData.volumeSeries.applyOptions({ visible: false });
                } else if (indType === 'sma1' && chartData.smaSeries1) {
                    chartData.smaSeries1.applyOptions({ visible: false });
                    chartData.indicators.sma = false;
                } else if (indType === 'sma2' && chartData.smaSeries2) {
                    chartData.smaSeries2.applyOptions({ visible: false });
                } else if (indType === 'sma3' && chartData.smaSeries3) {
                    chartData.smaSeries3.applyOptions({ visible: false });
                } else if (indType === 'ema1' && chartData.emaSeries1) {
                    chartData.emaSeries1.applyOptions({ visible: false });
                    chartData.indicators.ema = false;
                } else if (indType === 'ema2' && chartData.emaSeries2) {
                    chartData.emaSeries2.applyOptions({ visible: false });
                } else if (indType === 'ema3' && chartData.emaSeries3) {
                    chartData.emaSeries3.applyOptions({ visible: false });
                } else if (indType === 'bb') {
                    if (chartData.bbUpperSeries) chartData.bbUpperSeries.applyOptions({ visible: false });
                    if (chartData.bbMiddleSeries) chartData.bbMiddleSeries.applyOptions({ visible: false });
                    if (chartData.bbLowerSeries) chartData.bbLowerSeries.applyOptions({ visible: false });
                } else if (indType === 'rsi' && chartData.rsiSeries) {
                    chartData.rsiSeries.applyOptions({ visible: false });
                } else if (indType === 'vwap' && chartData.vwapSeries) {
                    chartData.vwapSeries.applyOptions({ visible: false });
                } else if (indType === 'atr' && chartData.atrSeries) {
                    chartData.atrSeries.applyOptions({ visible: false });
                } else if (indType === 'vpvr') {
                    updateVpvrMarginAndScroll(chartData);
                } else if (indType === 'sessions') {
                    OverlayService.SessionBands.clear(chartData);
                }
                
                const pane = document.getElementById(chartData.id);
                const select = pane ? pane.querySelector('.indicator-select') : null;
                if (select) {
                    if (indType === 'volume') select.options[1].text = `Volume (Off)`;
                    else if (indType === 'sma1') select.options[2].text = `SMA 1 (${chartData.indicators.sma1Period}) (Off)`;
                    else if (indType === 'sma2') select.options[3].text = `SMA 2 (${chartData.indicators.sma2Period}) (Off)`;
                    else if (indType === 'sma3') select.options[4].text = `SMA 3 (${chartData.indicators.sma3Period}) (Off)`;
                    else if (indType === 'ema1') select.options[5].text = `EMA 1 (${chartData.indicators.ema1Period}) (Off)`;
                    else if (indType === 'ema2') select.options[6].text = `EMA 2 (${chartData.indicators.ema2Period}) (Off)`;
                    else if (indType === 'ema3') select.options[7].text = `EMA 3 (${chartData.indicators.ema3Period}) (Off)`;
                    else if (indType === 'bb') select.options[8].text = `BB ${chartData.indicators.bbPeriod} (Off)`;
                    else if (indType === 'rsi') select.options[9].text = `RSI ${chartData.indicators.rsiPeriod} (Off)`;
                    else if (indType === 'vwap') select.options[10].text = `VWAP (Off)`;
                    else if (indType === 'atr') select.options[11].text = `ATR ${chartData.indicators.atrPeriod} (Off)`;
                    else if (indType === 'vpvr') select.options[12].text = `Vol Profile (Off)`;
                    else if (indType === 'sessions') select.options[13].text = `Sessions (Off)`;
                }
 
                LayoutService.updateSubchartMargins(chartData);
                saveLayoutState();
                
                delete legendEl.dataset.structKey;
                updateChartLegend(chartData);
            }
        });
    }

    let ohlc = null;
    let volume = null;
    let timeVal = null;

    const cached = chartData.cachedData || [];
    let idx = cached.length - 1;

    let paramHasData = false;
    let seriesDataMap = null;

    if (indexOrParam !== null) {
        if (typeof indexOrParam === "number") {
            idx = indexOrParam;
        } else if (indexOrParam.time) {
            const hoveredTime = indexOrParam.time;
            idx = cached.findIndex(c => c.time === hoveredTime);
            if (idx === -1) idx = cached.length - 1;
            if (indexOrParam.seriesData) {
                paramHasData = true;
                seriesDataMap = indexOrParam.seriesData;
            }
        }
    }

    if (idx >= 0 && idx < cached.length) {
        const bar = cached[idx];
        ohlc = {
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close
        };
        volume = bar.volume;
        timeVal = bar.time;
    }

    let sma1Val = null, sma2Val = null, sma3Val = null;
    let ema1Val = null, ema2Val = null, ema3Val = null;
    let bbUpper = null, bbMiddle = null, bbLower = null;
    let rsiVal = null;
    let vwapVal = null;
    let atrVal = null;

    if (paramHasData) {
        if (chartData.smaSeries1) { const d = seriesDataMap.get(chartData.smaSeries1); sma1Val = d ? (d.value !== undefined ? d.value : d) : null; }
        if (chartData.smaSeries2) { const d = seriesDataMap.get(chartData.smaSeries2); sma2Val = d ? (d.value !== undefined ? d.value : d) : null; }
        if (chartData.smaSeries3) { const d = seriesDataMap.get(chartData.smaSeries3); sma3Val = d ? (d.value !== undefined ? d.value : d) : null; }
        if (chartData.emaSeries1) { const d = seriesDataMap.get(chartData.emaSeries1); ema1Val = d ? (d.value !== undefined ? d.value : d) : null; }
        if (chartData.emaSeries2) { const d = seriesDataMap.get(chartData.emaSeries2); ema2Val = d ? (d.value !== undefined ? d.value : d) : null; }
        if (chartData.emaSeries3) { const d = seriesDataMap.get(chartData.emaSeries3); ema3Val = d ? (d.value !== undefined ? d.value : d) : null; }
        if (chartData.rsiSeries) { const d = seriesDataMap.get(chartData.rsiSeries); rsiVal = d ? (d.value !== undefined ? d.value : d) : null; }
        if (chartData.vwapSeries) { const d = seriesDataMap.get(chartData.vwapSeries); vwapVal = d ? (d.value !== undefined ? d.value : d) : null; }
        if (chartData.atrSeries) { const d = seriesDataMap.get(chartData.atrSeries); atrVal = d ? (d.value !== undefined ? d.value : d) : null; }
        if (chartData.bbUpperSeries && chartData.bbMiddleSeries && chartData.bbLowerSeries) {
            const u = seriesDataMap.get(chartData.bbUpperSeries); bbUpper = u ? (u.value !== undefined ? u.value : u) : null;
            const m = seriesDataMap.get(chartData.bbMiddleSeries); bbMiddle = m ? (m.value !== undefined ? m.value : m) : null;
            const l = seriesDataMap.get(chartData.bbLowerSeries); bbLower = l ? (l.value !== undefined ? l.value : l) : null;
        }
    } else {
        if (chartData.indicators.sma1) sma1Val = calculateLatestSMA(chartData.cachedData, chartData.indicators.sma1Period)?.value;
        if (chartData.indicators.sma2) sma2Val = calculateLatestSMA(chartData.cachedData, chartData.indicators.sma2Period)?.value;
        if (chartData.indicators.sma3) sma3Val = calculateLatestSMA(chartData.cachedData, chartData.indicators.sma3Period)?.value;
        if (chartData.indicators.ema1) ema1Val = calculateLatestEMA(chartData.cachedData, chartData.indicators.ema1Period)?.value;
        if (chartData.indicators.ema2) ema2Val = calculateLatestEMA(chartData.cachedData, chartData.indicators.ema2Period)?.value;
        if (chartData.indicators.ema3) ema3Val = calculateLatestEMA(chartData.cachedData, chartData.indicators.ema3Period)?.value;
        if (chartData.indicators.rsi) rsiVal = calculateLatestRSI(chartData.cachedData, chartData.indicators.rsiPeriod)?.value;
        if (chartData.indicators.vwap) vwapVal = calculateLatestVWAP(chartData.cachedData, chartData.interval)?.value;
        if (chartData.indicators.atr) atrVal = calculateLatestATR(chartData.cachedData, chartData.indicators.atrPeriod)?.value;
        if (chartData.indicators.bb) {
            const bb = calculateLatestBB(chartData.cachedData, chartData.indicators.bbPeriod, chartData.indicators.bbStdDev);
            if (bb) { bbUpper = bb.upper?.value; bbMiddle = bb.middle?.value; bbLower = bb.lower?.value; }
        }
    }

    let ohlcHtml = "";
    let diff = 0, pct = 0, colorClass = "", sign = "", formattedTime = "";
    if (ohlc) {
        diff = ohlc.close - ohlc.open;
        pct = ohlc.open ? (diff / ohlc.open) * 100 : 0;
        colorClass = diff >= 0 ? "legend-up" : "legend-down";
        sign = diff >= 0 ? "+" : "";
        formattedTime = TimeUtils.formatTooltip(timeVal);

        ohlcHtml = `
            <span class="legend-symbol-name">${chartData.symbol}</span>
            <span class="legend-interval">${chartData.interval}</span>
            <span class="legend-ohlc-label">O</span><span class="legend-ohlc-val ${colorClass}">${formatPrice(ohlc.open)}</span>
            <span class="legend-ohlc-label">H</span><span class="legend-ohlc-val ${colorClass}">${formatPrice(ohlc.high)}</span>
            <span class="legend-ohlc-label">L</span><span class="legend-ohlc-val ${colorClass}">${formatPrice(ohlc.low)}</span>
            <span class="legend-ohlc-label">C</span><span class="legend-ohlc-val ${colorClass}">${formatPrice(ohlc.close)}</span>
            <span class="legend-ohlc-val ${colorClass}">${sign}${formatPrice(diff)} (${sign}${pct.toFixed(2)}%)</span>
            <span class="legend-ohlc-val" style="color: var(--muted); margin-left: 8px;">${formattedTime}</span>
        `;
    } else {
        ohlcHtml = `<span class="legend-symbol-name">${chartData.symbol === 'none' ? 'No Chart' : chartData.symbol}</span>`;
    }

    let indRows = [];
    const ind = chartData.indicators;
    
    if (ind && ind.volume) {
        indRows.push({ type: 'volume', label: 'Vol', value: volume != null ? formatPrice(volume) : '—', color: '#8b9bb0', noSettings: true, visible: chartData.volumeSeries ? chartData.volumeSeries.options().visible !== false : true });
    }
    if (ind && ind.sma1) {
        indRows.push({ type: 'sma1', label: `SMA 1 (${ind.sma1Period})`, value: sma1Val != null ? formatPrice(sma1Val) : '—', color: ind.sma1Color, visible: chartData.smaSeries1 ? chartData.smaSeries1.options().visible !== false : true });
    }
    if (ind && ind.sma2) {
        indRows.push({ type: 'sma2', label: `SMA 2 (${ind.sma2Period})`, value: sma2Val != null ? formatPrice(sma2Val) : '—', color: ind.sma2Color, visible: chartData.smaSeries2 ? chartData.smaSeries2.options().visible !== false : true });
    }
    if (ind && ind.sma3) {
        indRows.push({ type: 'sma3', label: `SMA 3 (${ind.sma3Period})`, value: sma3Val != null ? formatPrice(sma3Val) : '—', color: ind.sma3Color, visible: chartData.smaSeries3 ? chartData.smaSeries3.options().visible !== false : true });
    }
    if (ind && ind.ema1) {
        indRows.push({ type: 'ema1', label: `EMA 1 (${ind.ema1Period})`, value: ema1Val != null ? formatPrice(ema1Val) : '—', color: ind.ema1Color, visible: chartData.emaSeries1 ? chartData.emaSeries1.options().visible !== false : true });
    }
    if (ind && ind.ema2) {
        indRows.push({ type: 'ema2', label: `EMA 2 (${ind.ema2Period})`, value: ema2Val != null ? formatPrice(ema2Val) : '—', color: ind.ema2Color, visible: chartData.emaSeries2 ? chartData.emaSeries2.options().visible !== false : true });
    }
    if (ind && ind.ema3) {
        indRows.push({ type: 'ema3', label: `EMA 3 (${ind.ema3Period})`, value: ema3Val != null ? formatPrice(ema3Val) : '—', color: ind.ema3Color, visible: chartData.emaSeries3 ? chartData.emaSeries3.options().visible !== false : true });
    }
    if (ind && ind.bb) {
        const bbStr = bbMiddle != null ? `${formatPrice(bbUpper)}, ${formatPrice(bbMiddle)}, ${formatPrice(bbLower)}` : '—';
        indRows.push({ type: 'bb', label: `BB ${ind.bbPeriod}`, value: bbStr, color: ind.bbColor, visible: chartData.bbUpperSeries ? chartData.bbUpperSeries.options().visible !== false : true });
    }
    if (ind && ind.rsi) {
        indRows.push({ type: 'rsi', label: `RSI ${ind.rsiPeriod}`, value: rsiVal != null ? rsiVal.toFixed(2) : '—', color: ind.rsiColor, visible: chartData.rsiSeries ? chartData.rsiSeries.options().visible !== false : true });
    }
    if (ind && ind.vwap) {
        indRows.push({ type: 'vwap', label: 'VWAP', value: vwapVal != null ? formatPrice(vwapVal) : '—', color: ind.vwapColor, visible: chartData.vwapSeries ? chartData.vwapSeries.options().visible !== false : true });
    }
    if (ind && ind.atr) {
        indRows.push({ type: 'atr', label: `ATR ${ind.atrPeriod}`, value: atrVal != null ? formatPrice(atrVal) : '—', color: ind.atrColor, visible: chartData.atrSeries ? chartData.atrSeries.options().visible !== false : true });
    }
    if (ind && ind.vpvr) {
        const pocVal = chartData.vpvrPocPrice != null ? formatPrice(chartData.vpvrPocPrice) : '—';
        indRows.push({ type: 'vpvr', label: 'VPVR', value: `POC: ${pocVal}`, color: '#facc15', noSettings: true, visible: chartData.indicators.vpvrVisible !== false });
    }
    if (ind && ind.sessions) {
        let sessionsVal = '—';
        if (timeVal) {
            const d = new Date(timeVal * 1000);
            const y = d.getUTCFullYear();
            const m = d.getUTCMonth();
            const dateNum = d.getUTCDate();
            
            const active = [];
            if (typeof SESSIONS !== 'undefined') {
                for (const session of SESSIONS) {
                    const startUtc = Date.UTC(y, m, dateNum, session.startH, 0, 0) / 1000;
                    const endUtc   = Date.UTC(y, m, dateNum, session.endH,   0, 0) / 1000;
                    if (timeVal >= startUtc && timeVal <= endUtc) {
                        active.push(session.name);
                    }
                }
            }
            sessionsVal = active.length > 0 ? active.join(', ') : 'None';
        }
        indRows.push({ type: 'sessions', label: 'Sessions', value: sessionsVal, color: '#60a5fa', noSettings: true, visible: chartData.indicators.sessionsVisible !== false });
    }

    const structKey = chartData.symbol + '_' + chartData.interval + '_' + (ohlc !== null) + '_' + JSON.stringify(indRows.map(r => r.type + r.visible + r.color + r.label));
    
    if (legendEl.dataset.structKey === structKey) {
        if (ohlc) {
            const ohlcVals = legendEl.querySelectorAll('.legend-ohlc-val');
            if (ohlcVals.length === 6) {
                ohlcVals[0].textContent = formatPrice(ohlc.open);
                ohlcVals[1].textContent = formatPrice(ohlc.high);
                ohlcVals[2].textContent = formatPrice(ohlc.low);
                ohlcVals[3].textContent = formatPrice(ohlc.close);
                ohlcVals[4].textContent = `${sign}${formatPrice(diff)} (${sign}${pct.toFixed(2)}%)`;
                ohlcVals[5].textContent = formattedTime;
                for(let i=0; i<5; i++) {
                    ohlcVals[i].className = `legend-ohlc-val ${colorClass}`;
                }
            }
        }
        
        indRows.forEach(row => {
            if (row.value !== '—' || indexOrParam !== null) {
                const valEl = legendEl.querySelector(`.legend-ind-row[data-ind="${row.type}"] .legend-ind-val`);
                if (valEl) valEl.textContent = row.value;
            }
        });
        return;
    }
    
    legendEl.dataset.structKey = structKey;

    let indicatorsHtml = "";
    if (indRows.length > 0) {
        indicatorsHtml = `<div class="indicators-list">` + indRows.map(row => `
            <div class="legend-ind-row" data-ind="${row.type}" style="${row.visible === false ? 'opacity: 0.5;' : ''}">
                <span class="legend-ind-dot" style="background:${row.color};"></span>
                <span class="legend-ind-title" style="color:${row.color};">${row.label}</span>
                <span class="legend-ind-val">${row.value}</span>
                <span class="legend-ind-actions">
                    <button class="legend-ind-btn" data-action="toggle" data-ind="${row.type}" title="Hide/Show">${row.visible !== false ? eyeSvg : eyeOffSvg}</button>
                    ${!row.noSettings ? `<button class="legend-ind-btn" data-action="settings" data-ind="${row.type}" title="Settings">${gearSvg}</button>` : ''}
                    <button class="legend-ind-btn trash-btn" data-action="delete" data-ind="${row.type}" title="Delete">${trashSvg}</button>
                </span>
            </div>
        `).join('') + `</div>`;
    }

    legendEl.innerHTML = `
        <div class="legend-row main-ohlc">${ohlcHtml}</div>
        ${indicatorsHtml}
    `;
}

function toggleIndicatorVisibility(chartData, indType) {
    if (indType === "vpvr") {
        chartData.indicators.vpvrVisible = (chartData.indicators.vpvrVisible !== false) ? false : true;
        updateVpvrMarginAndScroll(chartData);
    } else if (indType === "sessions") {
        chartData.indicators.sessionsVisible = (chartData.indicators.sessionsVisible !== false) ? false : true;
        const canvas = OverlayService.SessionBands.ensureCanvas(chartData);
        if (canvas) canvas.style.display = chartData.indicators.sessionsVisible ? 'block' : 'none';
        if (chartData.indicators.sessionsVisible) {
            OverlayService.SessionBands.draw(chartData);
        } else {
            OverlayService.SessionBands.clear(chartData);
        }
    } else {
        IndicatorService.toggleIndicatorVisibility(chartData, indType);
        if (indType === "volume" || indType === "rsi" || indType === "atr") {
            LayoutService.updateSubchartMargins(chartData);
        }
    }
    updateChartLegend(chartData);
}

function updateTicker(chartData, price, reference) {
    const pane = document.getElementById(chartData.id);
    
    if (price === null) {
        pane.querySelector(".ticker-symbol").textContent = chartData.symbol === "No Chart" ? "No Chart" : `${chartData.symbol} ${chartData.interval}`;
        pane.querySelector(".ticker-price").textContent = "--";
        pane.querySelector(".ticker-price").className = "ticker-price";
        pane.querySelector(".ticker-change").textContent = "--";
        pane.querySelector(".ticker-change").className = "ticker-change";
        return;
    }

    const direction = reference === null || price >= reference ? "up" : "down";
    const change = reference ? ((price - reference) / reference) * 100 : 0;

    pane.querySelector(".ticker-symbol").textContent = `${chartData.symbol} ${chartData.interval}`;
    pane.querySelector(".ticker-price").textContent = formatPrice(price);
    pane.querySelector(".ticker-price").className = `ticker-price ${direction}`;
    pane.querySelector(".ticker-change").textContent = `${change >= 0 ? "+" : ""}${change.toFixed(2)}% (${chartData.interval})`;
    pane.querySelector(".ticker-change").className = `ticker-change ${direction}`;
}

function flashTicker(chartId, direction) {
    if (document.hidden) return; // Prevent layout thrashing when tab is hidden
    const ticker = document.getElementById(`${chartId}-ticker`);
    if (!ticker) return;
    const flashClass = direction === "up" ? "flash-up" : "flash-down";
    
    ticker.classList.remove("flash-up", "flash-down");
    
    setTimeout(() => {
        ticker.classList.add(flashClass);
    }, 10);
}

function setPaneMessage(chartId, message) {
    const container = document.getElementById(`${chartId}-container`);
    let messageEl = container.querySelector(".chart-message");
    if (!messageEl) {
        messageEl = document.createElement("div");
        messageEl.className = "chart-message";
        messageEl.style.pointerEvents = "none";
        container.appendChild(messageEl);
    }
    messageEl.textContent = message;
}

function clearPaneMessage(chartId) {
    const messageEl = document.querySelector(`#${chartId}-container .chart-message`);
    if (messageEl) messageEl.remove();
}

function updateCountdowns() {
    if (document.hidden) return; // Skip updating visually when inactive
    const now = Date.now();
    Object.values(state.charts).forEach(chartData => {
        updateChartCountdown(chartData, now);
    });
}

function updateChartCountdown(chartData, now = Date.now()) {
    let timerEl = document.getElementById(`${chartData.id}-timer`);
    
    if (!timerEl) {
        const container = document.getElementById(`${chartData.id}-container`);
        if (!container) return;
        timerEl = document.createElement("div");
        timerEl.id = `${chartData.id}-timer`;
        timerEl.className = "countdown-timer";
        container.appendChild(timerEl);
    }

    if (!chartData.candleSeries || chartData.lastPrice === null) {
        timerEl.classList.remove("show");
        return;
    }

    const remaining = getCountdownMs(chartData.interval, now);
    if (remaining === null) {
        timerEl.classList.remove("show");
        return;
    }

    const y = chartData.candleSeries.priceToCoordinate(chartData.lastPrice);
    if (y === null || y < 0) {
        timerEl.classList.remove("show");
        return;
    }

        // Dynamically match the timer box width to the exact width of the price axis
        const scaleWidth = chartData.chart.priceScale('right').width();
        if (scaleWidth > 0) {
            timerEl.style.width = `${scaleWidth}px`;
        }

    const timerHeight = 22; 
    timerEl.style.top = `${y - (timerHeight / 2)}px`;
    
    const priceStr = formatPrice(chartData.lastPrice);
    const timerStr = formatCountdown(remaining);
    
    timerEl.innerHTML = `<span>${priceStr}</span><span class="timer-val">${timerStr}</span>`;

    timerEl.classList.remove('up', 'down');
    timerEl.classList.add(chartData.lastDirection);
    timerEl.classList.add("show");
}

function updateConnectionStatus() {
    const isSSEConnected = state.liveStream && state.liveStream.readyState === 1; // 1 is OPEN
    const isWSConnected = state.hlWs && state.hlWs.readyState === 1;
    const isBinanceConnected = state.binanceWs && state.binanceWs.readyState === 1;
    const isConnected = isSSEConnected || isWSConnected || isBinanceConnected;
    const wasConnected = state.connected;
    state.connected = isConnected;
    
    const status = document.getElementById("connection-status");
    if (status) {
        if (isSSEConnected && (isWSConnected || isBinanceConnected)) {
            status.textContent = "Live connected (All)";
        } else if (isSSEConnected) {
            status.textContent = "Live connected (Stocks)";
        } else if (isWSConnected || isBinanceConnected) {
            status.textContent = "Live connected (Crypto)";
        } else {
            status.textContent = "Live disconnected";
        }
        status.className = `status-indicator ${isConnected ? "connected" : "disconnected"}`;
    }
    
    if (isConnected && !wasConnected) {
        Object.values(state.charts).forEach(subscribeChart);
    }
}

function setDataStatus(message) {
    document.getElementById("data-status").textContent = message;
}

function updateTimestamp() {
    const timeEl = document.getElementById("timestamp-time");
    if (timeEl) {
        timeEl.textContent = new Date().toLocaleTimeString("en-IN", { timeZone: TimeUtils.timeZone, hour12: true }).toLowerCase();
    }
}

function setActiveChart(chartId) {
    if (state.activeChartId === chartId || !state.charts[chartId]) return;

    const oldActiveId = state.activeChartId;
    if (oldActiveId) {
        const oldPane = document.getElementById(oldActiveId);
        if (oldPane) oldPane.classList.remove('active-chart');
        
        // Unsubscribe from previous L2 Book
        const oldChartData = state.charts[oldActiveId];
        if (oldChartData && oldChartData.l2Subscribed && state.hlWs && state.hlWs.readyState === WebSocket.OPEN) {
            state.hlWs.send(JSON.stringify({
                method: "unsubscribe",
                subscription: { type: "l2Book", coin: oldChartData.symbol }
            }));
            oldChartData.l2Subscribed = false;
        }
    }

    state.activeChartId = chartId;
    const newPane = document.getElementById(chartId);
    if (newPane) newPane.classList.add('active-chart');

    updateMarketMoverHighlights();
    
    const chartData = state.charts[chartId];
    if (chartData && chartData.symbol !== 'none' && chartData.symbol !== 'No Chart') {
        fetchAndRenderAssetInfo(chartData.symbol);
        MarketWidgetService.OrderBook.updateHeader(chartData.symbol);
        
        // Subscribe to new active chart L2 Book
        if (state.hlWs && state.hlWs.readyState === WebSocket.OPEN) {
            state.hlWs.send(JSON.stringify({
                method: "subscribe",
                subscription: { type: "l2Book", coin: chartData.symbol }
            }));
            chartData.l2Subscribed = true;
        }
    }
    
    if (window.paperTrading && chartData) {
        window.paperTrading.setActiveSymbol(chartData.symbol);
    }
}

function updateMarketMoverHighlights() {
    const activeChart = state.charts[state.activeChartId];
    const activeSymbol = activeChart ? activeChart.symbol : null;

    document.querySelectorAll('.market-ticker-item').forEach(item => {
        item.classList.toggle('active-mover', item.dataset.symbol === activeSymbol);
    });
}

function switchChartSymbol(chartId, newSymbol) {
    const chartData = state.charts[chartId];
    if (!chartData || chartData.symbol === newSymbol) return;

    if (chartData.replay && chartData.replay.active) {
        exitReplayMode(chartId);
    }

    if (newSymbol === 'none') {
        if (chartData.instrumentId === 'none') return;
        unsubscribeChart(chartData);
        chartData.instrumentId = "none";
        chartData.source = "none";
        chartData.symbol = "No Chart";

        const pane = document.getElementById(chartId);
        if (pane) {
            const input = pane.querySelector(".symbol-select-input");
            if (input) input.value = chartData.symbol;
        }

        resetChart(chartData);
        saveLayoutState();
        
        if (state.activeChartId === chartId) {
            MarketWidgetService.AssetInfo.clear();
            MarketWidgetService.OrderBook.clear();
            MarketWidgetService.OrderBook.updateHeader('none');
        }
        updateMarketMoverHighlights();
        return;
    }

    const instrument = state.instruments.find(item => item.symbol === newSymbol);
    if (!instrument) {
        console.warn(`Instrument not found for symbol: ${newSymbol}`);
        return;
    }

    unsubscribeChart(chartData);
    chartData.instrumentId = instrument.id;
    chartData.source = instrument.source;
    chartData.symbol = instrument.symbol;
    chartData.interval = instrument.timeframes.includes(chartData.interval)
        ? chartData.interval
        : instrument.timeframes[0];

    const pane = document.getElementById(chartId);
    if (pane) {
        const input = pane.querySelector(".symbol-select-input");
        if (input) input.value = chartData.symbol;

        const intervalSelect = pane.querySelector(".interval-select");
        if (intervalSelect) updateIntervalOptions(chartData, intervalSelect);
    }

    resetChart(chartData);
    loadChartData(chartData);
    saveLayoutState();



    if (state.activeChartId === chartId) {
        MarketWidgetService.OrderBook.clear();
        fetchAndRenderAssetInfo(chartData.symbol);
    }

    updateMarketMoverHighlights();

    if (window.paperTrading && state.activeChartId === chartId) {
        window.paperTrading.setActiveSymbol(newSymbol);
    }
}

function openSettingsModal(chartData, onlyIndicator = null) {
    window.ModalService.openChartSettings({
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

            if (chartData.smaSeries1) {
                chartData.smaSeries1.applyOptions({ color: chartData.indicators.sma1Color, lineWidth: chartData.indicators.sma1LineWidth });
                if (chartData.indicators.sma1) chartData.smaSeries1.setData(calculateSMA(chartData.cachedData, chartData.indicators.sma1Period));
            }
            if (chartData.smaSeries2) {
                chartData.smaSeries2.applyOptions({ color: chartData.indicators.sma2Color, lineWidth: chartData.indicators.sma2LineWidth });
                if (chartData.indicators.sma2) chartData.smaSeries2.setData(calculateSMA(chartData.cachedData, chartData.indicators.sma2Period));
            }
            if (chartData.smaSeries3) {
                chartData.smaSeries3.applyOptions({ color: chartData.indicators.sma3Color, lineWidth: chartData.indicators.sma3LineWidth });
                if (chartData.indicators.sma3) chartData.smaSeries3.setData(calculateSMA(chartData.cachedData, chartData.indicators.sma3Period));
            }
            if (chartData.emaSeries1) {
                chartData.emaSeries1.applyOptions({ color: chartData.indicators.ema1Color, lineWidth: chartData.indicators.ema1LineWidth });
                if (chartData.indicators.ema1) chartData.emaSeries1.setData(calculateEMA(chartData.cachedData, chartData.indicators.ema1Period));
            }
            if (chartData.emaSeries2) {
                chartData.emaSeries2.applyOptions({ color: chartData.indicators.ema2Color, lineWidth: chartData.indicators.ema2LineWidth });
                if (chartData.indicators.ema2) chartData.emaSeries2.setData(calculateEMA(chartData.cachedData, chartData.indicators.ema2Period));
            }
            if (chartData.emaSeries3) {
                chartData.emaSeries3.applyOptions({ color: chartData.indicators.ema3Color, lineWidth: chartData.indicators.ema3LineWidth });
                if (chartData.indicators.ema3) chartData.emaSeries3.setData(calculateEMA(chartData.cachedData, chartData.indicators.ema3Period));
            }

            if (chartData.bbUpperSeries) {
                const bbOpts = { color: chartData.indicators.bbColor, lineWidth: chartData.indicators.bbLineWidth };
                chartData.bbUpperSeries.applyOptions(bbOpts);
                chartData.bbMiddleSeries.applyOptions(bbOpts);
                chartData.bbLowerSeries.applyOptions(bbOpts);
                if (chartData.indicators.bb) {
                    const bbData = calculateBB(chartData.cachedData, chartData.indicators.bbPeriod, chartData.indicators.bbStdDev);
                    chartData.bbUpperSeries.setData(bbData.upper);
                    chartData.bbMiddleSeries.setData(bbData.middle);
                    chartData.bbLowerSeries.setData(bbData.lower);
                }
            }
            if (chartData.rsiSeries) {
                chartData.rsiSeries.applyOptions({ color: chartData.indicators.rsiColor, lineWidth: chartData.indicators.rsiLineWidth });
                if (chartData.indicators.rsi) {
                    chartData.rsiSeries.setData(calculateRSI(chartData.cachedData, chartData.indicators.rsiPeriod));
                }
            }
            if (chartData.vwapSeries) {
                chartData.vwapSeries.applyOptions({ color: chartData.indicators.vwapColor, lineWidth: chartData.indicators.vwapLineWidth });
                if (chartData.indicators.vwap) chartData.vwapSeries.setData(calculateVWAP(chartData.cachedData, chartData.interval));
            }
            if (chartData.atrSeries) {
                chartData.atrSeries.applyOptions({ color: chartData.indicators.atrColor, lineWidth: chartData.indicators.atrLineWidth });
                if (chartData.indicators.atr) {
                    chartData.atrSeries.setData(calculateATR(chartData.cachedData, chartData.indicators.atrPeriod));
                }
            }

            LayoutService.updateSubchartMargins(chartData);

            const select = document.querySelector(`#${chartData.id} .indicator-select`);
            if (select) {
                select.options[2].text = `SMA 1 (${chartData.indicators.sma1Period}) (${chartData.indicators.sma1 ? 'On' : 'Off'})`;
                select.options[3].text = `SMA 2 (${chartData.indicators.sma2Period}) (${chartData.indicators.sma2 ? 'On' : 'Off'})`;
                select.options[4].text = `SMA 3 (${chartData.indicators.sma3Period}) (${chartData.indicators.sma3 ? 'On' : 'Off'})`;
                select.options[5].text = `EMA 1 (${chartData.indicators.ema1Period}) (${chartData.indicators.ema1 ? 'On' : 'Off'})`;
                select.options[6].text = `EMA 2 (${chartData.indicators.ema2Period}) (${chartData.indicators.ema2 ? 'On' : 'Off'})`;
                select.options[7].text = `EMA 3 (${chartData.indicators.ema3Period}) (${chartData.indicators.ema3 ? 'On' : 'Off'})`;
                select.options[8].text = `BB ${chartData.indicators.bbPeriod} (${chartData.indicators.bb ? 'On' : 'Off'})`;
                select.options[9].text = `RSI ${chartData.indicators.rsiPeriod} (${chartData.indicators.rsi ? 'On' : 'Off'})`;
                select.options[10].text = `VWAP (${chartData.indicators.vwap ? 'On' : 'Off'})`;
                select.options[11].text = `ATR ${chartData.indicators.atrPeriod} (${chartData.indicators.atr ? 'On' : 'Off'})`;
                select.options[12].text = `Vol Profile (${chartData.indicators.vpvr ? 'On' : 'Off'})`;
                select.options[13].text = `Sessions (${chartData.indicators.sessions ? 'On' : 'Off'})`;
            }
            saveLayoutState();
            window.ModalService.closeModal("chart-settings-modal");
        },
        onCancel: () => {
            window.ModalService.closeModal("chart-settings-modal");
        }
    });
}



function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    StorageService.saveTheme(state.theme);
    
    const isLight = state.theme === "light";
    document.body.classList.toggle("light-theme", isLight);
    
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = isLight ? "🌙" : "☀️";
    
    const themeOptions = ThemeService.getChartThemeOptions(isLight);
    Object.values(state.charts).forEach(chartData => {
        if (chartData.chart) chartData.chart.applyOptions(themeOptions);
        if (chartData.renderedDrawings) {
            const lineColor = isLight ? '#3b82f6' : '#60a5fa';
            Object.values(chartData.renderedDrawings).forEach(pl => {
            if (pl && !(pl instanceof HTMLElement) && pl.applyOptions) {
                    pl.applyOptions({ color: lineColor });
                }
            });
        }
        restoreDrawings(chartData);
    if (typeof restorePrimitiveDrawings === 'function') restorePrimitiveDrawings(chartData);
        chartData.isSyncedCrosshairActive = false;
    });
}



const assetInfoCache = {};

function createInfoPanel() {
    const wrapper = document.createElement('div');
    wrapper.id = 'right-sidebar-wrapper';
    wrapper.className = 'right-sidebar-wrapper sidebar-tabbed';

    const tabsHeader = document.createElement('div');
    tabsHeader.className = 'sidebar-tabs-header';
    tabsHeader.innerHTML = `
        <div class="sidebar-tab active" data-index="0">INFO</div>
        <div class="sidebar-tab" data-index="1">BOOK</div>
        <div class="sidebar-tab" data-index="2">TRADE</div>
    `;

    const viewport = document.createElement('div');
    viewport.className = 'sidebar-viewport';

    const slider = document.createElement('div');
    slider.id = 'sidebar-slider';
    slider.className = 'sidebar-slider-tabs';

    const panel = document.createElement('aside');
    panel.id = 'asset-info-panel';
    panel.className = 'sidebar-panel asset-info-panel';
    panel.innerHTML = `
        <div class="info-panel-content">
            <div id="info-panel-loading" class="info-panel-message">Loading Asset Info...</div>
            <div id="info-panel-data" style="display: none;"></div>
        </div>
    `;

    const obPanel = document.createElement('aside');
    obPanel.id = 'order-book-panel';
    obPanel.className = 'sidebar-panel order-book-panel';
    obPanel.innerHTML = `
        <div class="ob-header">
            <div id="ob-symbol-name" class="ob-symbol-name">--</div>
            <div class="ob-price-row">
                <span id="ob-current-price" class="ob-current-price">--</span>
                <span id="ob-24h-change" class="ob-24h-change">--</span>
            </div>
        </div>
        <div class="ob-col-headers">
            <span>Price</span>
            <span>Size</span>
        </div>
        <div class="ob-scroll-container">
            <div id="ob-asks" class="ob-asks"></div>
            <div id="ob-spread" class="ob-spread">--</div>
            <div id="ob-bids" class="ob-bids"></div>
        </div>
    `;

    const tradePanel = document.createElement('aside');
    tradePanel.id = 'paper-trade-panel';
    tradePanel.className = 'sidebar-panel paper-trade-panel';

    slider.appendChild(panel);
    slider.appendChild(obPanel);
    slider.appendChild(tradePanel);
    viewport.appendChild(slider);
    
    wrapper.appendChild(tabsHeader);
    wrapper.appendChild(viewport);

    const tabs = tabsHeader.querySelectorAll('.sidebar-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const index = parseInt(tab.getAttribute('data-index'));
            slider.style.transform = `translateX(-${index * 33.333}%)`;
            StorageService.saveActiveTab(index);
            state.obCentered = false;
        });
    });

    const savedTab = StorageService.getActiveTab() || '0';
    const targetTab = tabs[parseInt(savedTab)];
    if (targetTab) {
        targetTab.click();
    }

    tradePanel.innerHTML = '<div class="pt-container"><div class="info-panel-message">Loading Paper Trading...</div></div>';

    return wrapper;
}

function MarketWidgetService.AssetInfo.clear() {
    const dataContainer = document.getElementById('info-panel-data');
    const loadingContainer = document.getElementById('info-panel-loading');
    if (dataContainer && loadingContainer) {
        dataContainer.style.display = 'none';
        loadingContainer.style.display = 'block';
        loadingContainer.textContent = 'No Chart Selected';
    }
}

// --- Market Ticker Functions ---

function MarketWidgetService.MarketTicker.create() {
    if (document.getElementById('market-ticker-container')) return;

    const tickerContainer = document.createElement('div');
    tickerContainer.id = 'market-ticker-container';
    tickerContainer.className = 'market-ticker-container';
    
    tickerContainer.innerHTML = `
        <div class="ticker-row gainers-row">
            <div class="ticker-label gainers-label">▲ GAINERS</div>
            <div class="ticker-scroll-wrapper">
                <div class="ticker-scroll" id="ticker-gainers"></div>
            </div>
        </div>
        <div class="ticker-row losers-row">
            <div class="ticker-label losers-label">▼ LOSERS</div>
            <div class="ticker-scroll-wrapper">
                <div class="ticker-scroll" id="ticker-losers"></div>
            </div>
        </div>
    `;

    const grid = document.getElementById('charts-grid');
    const wrapper = document.querySelector('.main-charts-wrapper') || grid;
    if (wrapper && wrapper.parentNode) {
        wrapper.parentNode.insertBefore(tickerContainer, wrapper);
    } else {
        document.body.prepend(tickerContainer);
    }
}

async function fetchMarketMovers() {
    if (document.hidden) return; // Save resources when tab is inactive

    try {
        const data = await ApiService.getHyperliquidFunding();
        if (!Array.isArray(data) || data.length < 2) return;
        
        const meta = data[0];
        const assetCtxs = data[1];
        
        if (!meta.universe || !Array.isArray(assetCtxs)) return;
        
        const changes = meta.universe.map((coin, index) => {
            const ctx = assetCtxs[index];
            if (!ctx) return null;
            const prev = parseFloat(ctx.prevDayPx);
            const mark = parseFloat(ctx.markPx);
            let change = 0;
            if (!isNaN(prev) && !isNaN(mark) && prev !== 0) {
                change = ((mark - prev) / prev) * 100;
            }
            return {
                symbol: coin.name,
                price: mark,
                change: change
            };
        }).filter(item => item !== null && !isNaN(item.change));
        
        changes.sort((a, b) => b.change - a.change);
        
        // Cache all prices and changes globally
        state.allMarketPrices = {};
        changes.forEach(item => {
            if (item) {
                state.allMarketPrices[item.symbol] = {
                    price: item.price,
                    change: item.change
                };
            }
        });
        if (typeof WatchlistService !== 'undefined' && WatchlistService.updateWatchlistFromMarketCache) {
            WatchlistService.updateWatchlistFromMarketCache();
        }

        const topGainers = changes.slice(0, 10);
        const topLosers = changes.slice().reverse().slice(0, 10);
        
        MarketWidgetService.MarketTicker.render('ticker-gainers', topGainers);
        MarketWidgetService.MarketTicker.render('ticker-losers', topLosers);
    } catch (e) {
        console.warn("Could not fetch market movers:", e);
    }
}

function MarketWidgetService.MarketTicker.render(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const activeChart = state.charts[state.activeChartId];
    const activeSymbol = activeChart ? activeChart.symbol : null;

    let html = '';
    const wlList = (watchlistState && watchlistState.symbolsList) || [];
    data.forEach(item => {
        const sign = item.change > 0 ? '+' : '';
        const colorClass = item.change >= 0 ? 'up' : 'down';
        const isActive = item.symbol === activeSymbol;
        const activeClass = isActive ? 'active-mover' : '';
        const inWl = wlList.includes(item.symbol);
        html += `
            <div class="market-ticker-item ${activeClass}" data-symbol="${item.symbol}" title="Click to load ${item.symbol} chart">
                <span class="market-ticker-symbol">${item.symbol}</span>
                <span class="market-ticker-percent ${colorClass}">${sign}${item.change.toFixed(2)}%</span>
                <button class="ticker-watchlist-btn${inWl ? ' wl-active' : ''}" title="${inWl ? 'Remove from Watchlist' : 'Add to Watchlist'}" data-symbol="${item.symbol}">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
            </div>
        `;
    });
    
    if (container.children.length === 2 && container.dataset.initialized === 'true') {
        // Update inner text without recreating nodes to prevent animation resetting
        const contents = container.querySelectorAll('.ticker-content');
        contents.forEach(content => {
            content.innerHTML = html;
        });
    } else {
        // Two identical blocks ensure perfectly smooth loop animation
        container.innerHTML = `
            <div class="ticker-content">${html}</div>
            <div class="ticker-content">${html}</div>
        `;
        container.dataset.initialized = 'true';
    }
}

async function fetchAndRenderAssetInfo(symbol, forceRefresh = false) {
    const dataContainer = document.getElementById('info-panel-data');
    const loadingContainer = document.getElementById('info-panel-loading');
    if (!dataContainer || !loadingContainer) return;

    loadingContainer.style.display = 'block';
    loadingContainer.textContent = 'Loading Asset Info...';
    dataContainer.style.display = 'none';

    if (forceRefresh || !assetInfoCache[symbol] || assetInfoCache[symbol].isPartial) {
        try {
            // Clean up the symbol for searching (e.g., BTC-USD -> btc, BTCUSDT -> btc)
            let cleanSymbol = symbol.split('-')[0].replace(/USDT$/, '').replace(/USD$/, '');
            if (cleanSymbol.startsWith('1000')) cleanSymbol = cleanSymbol.replace(/^1000/, ''); // Fix meme coins
            if (cleanSymbol.toUpperCase() === 'MATIC') cleanSymbol = 'POL';
            
            // 1. Resolve Coin ID
            let coinId = null;
            
            const upperClean = cleanSymbol.toUpperCase();
            if (COMMON_IDS[upperClean]) {
                coinId = COMMON_IDS[upperClean];
            } else {
                const searchData = await ApiService.searchCoinGecko(cleanSymbol);
                
                if (searchData.coins && searchData.coins.length > 0) {
                    const exactMatches = searchData.coins.filter(c => c.symbol.toLowerCase() === cleanSymbol.toLowerCase());
                    if (exactMatches.length > 0) {
                        exactMatches.sort((a, b) => (a.market_cap_rank || Infinity) - (b.market_cap_rank || Infinity));
                        coinId = exactMatches[0].id;
                    } else {
                        coinId = searchData.coins[0].id;
                    }
                } else {
                    throw new Error('Coin not found');
                }
            }

            // 2. Fetch the detailed market data
            const data = await ApiService.getCoinGeckoInfo(coinId);
            
            const md = data.market_data || {};
            
            assetInfoCache[symbol] = {
                symbol: data.symbol.toUpperCase(),
                name: data.name,
                price: md.current_price?.usd ?? null,
                change24: md.price_change_percentage_24h ?? null,
                marketCap: md.market_cap?.usd ?? null,
                vol24: md.total_volume?.usd ?? null,
                circSupply: md.circulating_supply ?? null,
                totalSupply: md.total_supply ?? md.max_supply ?? null,
                fdv: md.fully_diluted_valuation?.usd ?? null,
                performance: {
                    '1H': md.price_change_percentage_1h_in_currency?.usd ?? null,
                    '24H': md.price_change_percentage_24h ?? null,
                    '7D': md.price_change_percentage_7d ?? null,
                    '30D': md.price_change_percentage_30d ?? null,
                    '60D': md.price_change_percentage_60d ?? null,
                    '200D': md.price_change_percentage_200d ?? null,
                    '1Y': md.price_change_percentage_1y ?? null,
                },
                rank: data.market_cap_rank ?? '-',
                category: data.categories && data.categories.length > 0 ? data.categories[0] : 'Crypto',
                exchanges: '-', 
                pairs: '-',
                high24: md.high_24h?.usd ?? null,
                low24: md.low_24h?.usd ?? null,
                ath: md.ath?.usd ?? null,
                atl: md.atl?.usd ?? null,
                image: data.image?.small || null,
                isPartial: false
            };
        } catch (error) {
            console.warn(`Failed to fetch full data for ${symbol}. Trying Binance fallback... Error:`, error);
            try {
                let cleanSymbol = symbol.split('-')[0].replace(/USDT$/, '').replace(/USD$/, '').toUpperCase();
                if (cleanSymbol.startsWith('1000')) cleanSymbol = cleanSymbol.replace(/^1000/, '');
                if (cleanSymbol === 'MATIC') cleanSymbol = 'POL';
                
                const { data: bData, is1000x } = await ApiService.get24hTicker(cleanSymbol);
                
                if (!bData) throw new Error('All fallbacks failed');

                const scale = is1000x ? 1000 : 1;

                assetInfoCache[symbol] = {
                    symbol: cleanSymbol,
                    name: cleanSymbol,
                    price: parseFloat(bData.lastPrice) / scale,
                    change24: parseFloat(bData.priceChangePercent),
                    marketCap: null,
                    vol24: parseFloat(bData.quoteVolume),
                    circSupply: null,
                    totalSupply: null,
                    fdv: null,
                    performance: {
                        '1H': null,
                        '24H': parseFloat(bData.priceChangePercent),
                        '7D': null, '30D': null, '60D': null, '200D': null, '1Y': null,
                    },
                    rank: '-', category: 'Crypto', exchanges: '-', pairs: '-',
                    high24: parseFloat(bData.highPrice) / scale,
                    low24: parseFloat(bData.lowPrice) / scale,
                    ath: null, atl: null, image: null,
                    isPartial: true
                };
            } catch (bError) {
                console.warn(`Binance fallback failed. Using empty fallback.`, bError);
                assetInfoCache[symbol] = MarketWidgetService.AssetInfo.getEmpty(symbol);
            }
        }
    }

    const info = assetInfoCache[symbol];
    MarketWidgetService.AssetInfo.render(info);
    MarketWidgetService.OrderBook.updateHeader(symbol);

    loadingContainer.style.display = 'none';
    dataContainer.style.display = 'block';
}

function MarketWidgetService.AssetInfo.getEmpty(symbol) {
    return {
        symbol: symbol,
        name: symbol,
        price: null,
        change24: null,
        marketCap: null,
        vol24: null,
        circSupply: null,
        totalSupply: null,
        fdv: null,
        performance: {
            '1H': null,
            '24H': null,
            '7D': null,
            '30D': null,
            '60D': null,
            '200D': null,
            '1Y': null,
        },
        rank: '-',
        category: '-',
        exchanges: '-',
        pairs: '-',
        high24: null,
        low24: null,
        ath: null,
        atl: null,
        image: null,
        isPartial: true
    };
}

function MarketWidgetService.AssetInfo.render(info) {
    const container = document.getElementById('info-panel-data');
    if (!container) return;

    const logoColor = `hsl(${Math.abs(info.symbol.charCodeAt(0) * 30 % 360)}, 70%, 50%)`;

    container.innerHTML = `
        <div class="info-header" style="justify-content: space-between; width: 100%;">
            <div style="display: flex; align-items: center; gap: 12px;">
                ${info.image ? `<img src="${info.image}" class="info-logo" style="background-color: transparent;">` : `<div class="info-logo" style="background-color: ${logoColor}">${info.symbol.charAt(0)}</div>`}
                <div class="info-title">
                    <h2>${info.name}</h2>
                    <span class="info-symbol">${info.symbol}</span>
                </div>
            </div>
            <button onclick="fetchAndRenderAssetInfo('${info.symbol}', true)" class="settings-btn" title="Refresh Data" style="font-size: 14px; padding: 6px; margin: 0;">🔄</button>
        </div>
        <div class="info-price-section">
            <div class="info-price" id="info-panel-price">${formatCurrency(info.price)}</div>
            <div class="info-change ${getPerfClass(info.change24)}">${formatPercent(info.change24)}</div>
        </div>

        <div class="info-section">
            <h3>Market Statistics</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Market Cap</span>
                    <span class="info-value">${formatCurrency(info.marketCap)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">24h Volume</span>
                    <span class="info-value">${formatCurrency(info.vol24)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Circulating Supply</span>
                    <span class="info-value">${formatNumber(info.circSupply)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Total Supply</span>
                    <span class="info-value">${formatNumber(info.totalSupply)}</span>
                </div>
            </div>
        </div>

        <div class="info-section">
            <h3>Performance</h3>
            <div class="perf-grid">
                ${Object.entries(info.performance).map(([period, val]) => `
                    <div class="perf-card ${getPerfClass(val)}">
                        <div class="perf-period">${period}</div>
                        <div class="perf-val">${formatPercent(val)}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="info-section">
            <h3>Market Information</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Rank</span>
                    <span class="info-value">#${info.rank}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Category</span>
                    <span class="info-value">${info.category}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Exchanges</span>
                    <span class="info-value">${info.exchanges}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Trading Pairs</span>
                    <span class="info-value">${info.pairs}</span>
                </div>
            </div>
        </div>

        <div class="info-section">
            <h3>Quick Metrics</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">24h High</span>
                    <span class="info-value">${formatCurrency(info.high24)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">24h Low</span>
                    <span class="info-value">${formatCurrency(info.low24)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">All Time High</span>
                    <span class="info-value">${formatCurrency(info.ath)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">All Time Low</span>
                    <span class="info-value">${formatCurrency(info.atl)}</span>
                </div>
            </div>
        </div>
    `;
}

function MarketWidgetService.AssetInfo.updatePrice(price) {
    const priceEl = document.getElementById('info-panel-price');
    if (priceEl && price !== null) {
        priceEl.textContent = formatCurrency(price);
    }
}

// --- Diagnostics for Wheel Events ---
function runWheelDiagnostics(chartId) {
    const container = document.getElementById(`${chartId}-container`);
    if (!container) return;
    
    console.group(`🔍 Wheel Event Investigation: ${chartId}`);
    console.log("1. Exact DOM element acting as container:", container);
    
    const canvas = container.querySelector('canvas');
    if (canvas) {
        const containerRect = container.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        console.log(`2. Canvas fills area? Container: ${containerRect.width}x${containerRect.height}, Canvas: ${canvasRect.width}x${canvasRect.height}`);
        console.log("7. Canvas Z-Index:", window.getComputedStyle(canvas).zIndex || 'auto');
        
        const getPath = (el) => {
            const path = [];
            while (el && el !== document.body && el !== document.documentElement) {
                let name = el.tagName.toLowerCase();
                if (el.id) name += `#${el.id}`;
                if (el.className && typeof el.className === 'string') name += `.${el.className.split(' ').join('.')}`;
                path.unshift(name);
                el = el.parentNode;
            }
            return path.join(' > ');
        };
        console.log("8. DOM Path to Canvas:", getPath(canvas));
    }

    let node = container;
    while (node && node !== document) {
        const style = window.getComputedStyle(node);
        if (['auto', 'scroll'].includes(style.overflow) || ['auto', 'scroll'].includes(style.overflowY)) {
            console.warn(`4. Scrollable parent found:`, node, `overflow: ${style.overflow}`);
        }
        node = node.parentNode;
    }

    const tracker = (source) => (e) => console.log(`[Wheel Event] Captured by ${source} | Target:`, e.target);
    window.addEventListener('wheel', tracker('Window'), { capture: true, passive: true });
    document.addEventListener('wheel', tracker('Document'), { capture: true, passive: true });
    container.addEventListener('wheel', tracker('Chart Container'), { capture: true, passive: true });
    if (canvas) canvas.addEventListener('wheel', tracker('Chart Canvas'), { capture: true, passive: true });
    console.groupEnd();
}

// --- Order Book Functions ---
function MarketWidgetService.OrderBook.updateHeader(symbol) {
    const info = assetInfoCache[symbol];
    if (info) {
        const symbolEl = document.getElementById('ob-symbol-name');
        const priceEl = document.getElementById('ob-current-price');
        const changeEl = document.getElementById('ob-24h-change');

        if (symbolEl) symbolEl.textContent = info.symbol || symbol;
        if (priceEl && info.price !== null) priceEl.textContent = formatCurrency(info.price);
        if (changeEl && info.change24 !== null) {
            changeEl.textContent = formatPercent(info.change24);
            changeEl.className = `ob-24h-change ${getPerfClass(info.change24)}`;
        }
    } else if (symbol === 'none') {
        const symbolEl = document.getElementById('ob-symbol-name');
        const priceEl = document.getElementById('ob-current-price');
        const changeEl = document.getElementById('ob-24h-change');

        if (symbolEl) symbolEl.textContent = '--';
        if (priceEl) priceEl.textContent = '--';
        if (changeEl) {
            changeEl.textContent = '--';
            changeEl.className = 'ob-24h-change';
        }
    }
}

function MarketWidgetService.OrderBook.updatePrice(price) {
    const priceEl = document.getElementById('ob-current-price');
    if (priceEl && price !== null) {
        priceEl.textContent = formatCurrency(price);
    }
}

function MarketWidgetService.OrderBook.clear() {
    state.obCentered = false;
    const asksContainer = document.getElementById('ob-asks');
    const bidsContainer = document.getElementById('ob-bids');
    const spreadContainer = document.getElementById('ob-spread');
    if (asksContainer) asksContainer.innerHTML = '';
    if (bidsContainer) bidsContainer.innerHTML = '';
    if (spreadContainer) spreadContainer.innerHTML = '--';
}

function MarketWidgetService.OrderBook.render(data) {
    const activeTab = document.querySelector(".global-right-sidebar .sidebar-tab.active");
    if (!activeTab || activeTab.dataset.index !== '1') return;

    const bids = data.levels[0];
    const asks = data.levels[1];

    const asksContainer = document.getElementById('ob-asks');
    const bidsContainer = document.getElementById('ob-bids');
    const spreadContainer = document.getElementById('ob-spread');

    if (!asksContainer || !bidsContainer || !spreadContainer) return;

    const displayAsks = asks.slice(0, 20).reverse();
    const displayBids = bids.slice(0, 20);

    let maxAskSize = 0;
    displayAsks.forEach(a => maxAskSize = Math.max(maxAskSize, parseFloat(a.sz)));
    let maxBidSize = 0;
    displayBids.forEach(b => maxBidSize = Math.max(maxBidSize, parseFloat(b.sz)));

    const formatObPrice = (px) => {
        const p = parseFloat(px);
        if (p >= 1) return p.toFixed(2);
        if (p >= 0.01) return p.toFixed(4);
        if (p >= 0.0001) return p.toFixed(6);
        if (p >= 0.000001) return p.toFixed(8);
        return p.toPrecision(4);
    };

    let asksHtml = '';
    displayAsks.forEach(a => {
        const size = parseFloat(a.sz);
        const width = maxAskSize > 0 ? (size / maxAskSize) * 100 : 0;
        asksHtml += `
            <div class="ob-row">
                <div class="ob-bg ob-ask-bg" style="width: ${width}%"></div>
                <span class="ob-ask-price">${formatObPrice(a.px)}</span>
                <span class="ob-size">${size.toFixed(4)}</span>
            </div>
        `;
    });
    asksContainer.innerHTML = asksHtml;

    let bidsHtml = '';
    displayBids.forEach(b => {
        const size = parseFloat(b.sz);
        const width = maxBidSize > 0 ? (size / maxBidSize) * 100 : 0;
        bidsHtml += `
            <div class="ob-row">
                <div class="ob-bg ob-bid-bg" style="width: ${width}%"></div>
                <span class="ob-bid-price">${formatObPrice(b.px)}</span>
                <span class="ob-size">${size.toFixed(4)}</span>
            </div>
        `;
    });
    bidsContainer.innerHTML = bidsHtml;

    if (bids.length > 0 && asks.length > 0) {
        const bestBid = parseFloat(bids[0].px);
        const bestAsk = parseFloat(asks[0].px);
        const spread = bestAsk - bestBid;
        const spreadPercent = (spread / bestAsk) * 100;
        spreadContainer.innerHTML = `${formatObPrice(spread)} (${spreadPercent.toFixed(3)}%)`;
    }

    if (!state.obCentered) {
        const scrollContainer = document.querySelector('.ob-scroll-container');
        if (scrollContainer && spreadContainer && spreadContainer.offsetTop > 0) {
            scrollContainer.scrollTop = spreadContainer.offsetTop - (scrollContainer.clientHeight / 2) + (spreadContainer.clientHeight / 2);
            state.obCentered = true;
        }
    }
}

// --- Market Replay Engine ---

function toggleReplayMode(chartId) {
    const chartData = state.charts[chartId];
    if (chartData.replay && chartData.replay.active) {
        exitReplayMode(chartId);
    } else {
        startReplaySelection(chartId);
    }
}

function startReplaySelection(chartId) {
    const activeChart = state.charts[chartId];
    if (!ReplayService.startSelection(activeChart)) {
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
    container.style.cursor = "crosshair";
    
    setPaneMessage(activeChart.id, "Click on any historical candle to start replay from there. Press ESC to cancel.");
    
    const escapeHandler = (e) => {
        if (e.key === 'Escape') {
            exitReplayMode(chartId);
        }
    };
    document.addEventListener('keydown', escapeHandler);
    activeChart.replay._escapeHandler = escapeHandler;
}

function startReplayAt(chartId, time) {
    const chartData = state.charts[chartId];
    if (!chartData || !chartData.replay) return;
    clearPaneMessage(chartData.id);
    
    const container = document.getElementById(`${chartData.id}-container`);
    container.style.cursor = "default";
    
    if (chartData.replay._escapeHandler) {
        document.removeEventListener('keydown', chartData.replay._escapeHandler);
        delete chartData.replay._escapeHandler;
    }
    
    let msTime = typeof time === 'object' ? TimeUtils._getMs(time) / 1000 : time;
    
    ReplayService.startAt(chartData, msTime);
    
    unsubscribeChart(chartData);
    
    buildReplayUI(chartId);
    ReplayService.renderFrame(chartData);
    syncChartWithCache(chartData);
    ReplayService.updateMarkers(chartData, state.drawings[chartData.symbol]);
    updateReplayStatsUI(chartId);
    
    const btn = document.getElementById(`${chartId}-replay-toggle`);
    if (btn) {
        btn.textContent = "⏹";
        btn.title = "Exit Replay";
        btn.style.background = "rgba(239, 68, 68, 0.2)";
    }
}

function buildReplayUI(chartId) {
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
    
    document.getElementById(`${chartId}-replay-play`).onclick = () => {
        const chartData = state.charts[chartId];
        if (chartData && chartData.replay) {
            chartData.replay.isPlaying = true;
            document.getElementById(`${chartId}-replay-play`).style.display = "none";
            document.getElementById(`${chartId}-replay-pause`).style.display = "inline-block";
            ReplayService.runLoop(chartData, 
                () => onReplayFrameRendered(chartData),
                () => {
                    document.getElementById(`${chartId}-replay-pause`).click();
                    alert("End of historical data reached.");
                }
            );
        }
    };
    
    document.getElementById(`${chartId}-replay-pause`).onclick = () => {
        const chartData = state.charts[chartId];
        if (chartData && chartData.replay) {
            chartData.replay.isPlaying = false;
            document.getElementById(`${chartId}-replay-play`).style.display = "inline-block";
            document.getElementById(`${chartId}-replay-pause`).style.display = "none";
            if (chartData.replay.timer) clearTimeout(chartData.replay.timer);
        }
    };
    
    document.getElementById(`${chartId}-replay-step-back`).onclick = () => { 
        const chartData = state.charts[chartId];
        ReplayService.step(chartData, -1, () => onReplayFrameRendered(chartData)); 
    };
    document.getElementById(`${chartId}-replay-step-fwd`).onclick = () => { 
        const chartData = state.charts[chartId];
        ReplayService.step(chartData, 1, () => onReplayFrameRendered(chartData)); 
    };
    document.getElementById(`${chartId}-replay-jump-back`).onclick = () => { 
        const chartData = state.charts[chartId];
        ReplayService.step(chartData, -10, () => onReplayFrameRendered(chartData)); 
    };
    document.getElementById(`${chartId}-replay-jump-fwd`).onclick = () => { 
        const chartData = state.charts[chartId];
        ReplayService.step(chartData, 10, () => onReplayFrameRendered(chartData)); 
    };
    
    document.getElementById(`${chartId}-replay-speed`).onchange = (e) => {
        const chartData = state.charts[chartId];
        if (chartData && chartData.replay) {
            chartData.replay.speed = parseFloat(e.target.value);
        }
    };
    
    document.getElementById(`${chartId}-replay-buy`).onclick = () => { 
        ReplayService.PaperTrading.executeTrade(state.charts[chartId], 'Long');
        onReplayFrameRendered(state.charts[chartId]);
    };
    document.getElementById(`${chartId}-replay-sell`).onclick = () => { 
        ReplayService.PaperTrading.executeTrade(state.charts[chartId], 'Short');
        onReplayFrameRendered(state.charts[chartId]);
    };
    document.getElementById(`${chartId}-replay-close`).onclick = () => { 
        ReplayService.PaperTrading.closeAllTrades(state.charts[chartId]);
        onReplayFrameRendered(state.charts[chartId]);
    };
    
    document.getElementById(`${chartId}-replay-stats-toggle`).onclick = () => {
        const p = document.getElementById(`replay-analytics-panel-${chartId}`);
        if (p) p.style.display = p.style.display === "none" ? "block" : "none";
    };
    
    document.getElementById(`${chartId}-replay-exit`).onclick = () => exitReplayMode(chartId);
    
    updateReplayAnalyticsPanel(chartId);
}

function onReplayFrameRendered(chartData) {
    syncChartWithCache(chartData);
    
    const key = chartData.symbol;
    const drawings = state.drawings[key] || [];
    ReplayService.updateMarkers(chartData, drawings);
    
    updateReplayStatsUI(chartData.id);
}



function updateReplayStatsUI(chartId) {
    const chartData = state.charts[chartId];
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
    
    updateReplayAnalyticsPanel(chartId, openPnl);
}

function updateReplayAnalyticsPanel(chartId, openPnl = 0) {
    const chartData = state.charts[chartId];
    if (!chartData || !chartData.replay) return;
    
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
    
    window.ModalService.renderReplayAnalyticsPanel(
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

function exitReplayMode(chartId) {
    const chartData = state.charts[chartId];
    if (!chartData || !chartData.replay) return;
    
    const wasSelecting = chartData.replay.status === 'selecting';
    const wasActive = chartData.replay.status === 'active';
    
    if (chartData.replay._escapeHandler) {
        document.removeEventListener('keydown', chartData.replay._escapeHandler);
    }
    
    ReplayService.exit(chartData);
    
    if (wasSelecting) {
        const container = document.getElementById(`${chartId}-container`);
        if (container) container.style.cursor = "default";
        clearPaneMessage(chartId);
    } else if (wasActive) {
        syncChartWithCache(chartData);
        subscribeChart(chartData);
    }
    
    const panel = document.getElementById(`replay-toolbar-${chartId}`);
    if (panel) panel.remove();
    
    const analyticsPanel = document.getElementById(`replay-analytics-panel-${chartId}`);
    if (analyticsPanel) analyticsPanel.remove();
    
    const btn = document.getElementById(`${chartId}-replay-toggle`);
    if (btn) {
        btn.textContent = btn.dataset.originalText || "⏪";
        btn.title = "Market Replay";
        btn.style.background = "";
    }
    
    if (chartData && chartData.chart) {
        updateMarkers(chartData);
        LayoutService.scrollToNewestActualCandle(chartData, state.chartCount);
    }
}

// --- Backtesting System ---
function openBacktestModal() {
    const activeChart = state.charts[state.activeChartId];
    const defaultSymbol = activeChart ? activeChart.symbol : 'BTC';
    const defaultInterval = activeChart ? activeChart.interval : '1h';

    window.ModalService.openBacktestConfig({
        defaultSymbol: defaultSymbol,
        defaultInterval: defaultInterval,
        instruments: state.instruments
    }, {
        onRun: async (payload, ui) => {
            const loadingEl = document.getElementById('backtest-loading');
            const errorEl = document.getElementById('backtest-error');
            loadingEl.style.display = 'block';
            errorEl.style.display = 'none';

            try {
                const result = await ApiService.runBacktest(payload);

                state.backtest = { 
                    ...result, 
                    symbol: payload.symbol,
                    interval: payload.interval
                };
                StorageService.saveBacktest(state.backtest);
                
                const chartData = state.charts[state.activeChartId];
                if (chartData) {
                    if (chartData.symbol !== state.backtest.symbol) {
                        await switchChartSymbol(state.activeChartId, state.backtest.symbol);
                    }
                    renderBacktestResults(state.charts[state.activeChartId], result);
                }
                if (window.paperTrading) window.paperTrading.renderBacktestSummary(result.summary_stats, result.trades, result.equity_curve);
                window.ModalService.closeModal("backtest-modal");
            } catch (error) {
                errorEl.textContent = `Error: ${error.message}`;
                errorEl.style.display = 'block';
            } finally {
                loadingEl.style.display = 'none';
            }
        },
        onCancel: () => {
            window.ModalService.closeModal("backtest-modal");
        }
    });
}

function renderBacktestResults(chartData, results) {
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
    const markers = results.trades.flatMap(trade => [
        { time: trade.time, position: trade.direction === 'Long' ? 'belowBar' : 'aboveBar', color: trade.direction === 'Long' ? '#3b82f6' : '#f59e0b', shape: trade.direction === 'Long' ? 'arrowUp' : 'arrowDown', text: trade.direction.toUpperCase() },
        { time: trade.exitTime, position: trade.pnl >= 0 ? 'aboveBar' : 'belowBar', color: trade.pnl >= 0 ? '#10b981' : '#ef4444', shape: 'circle', text: trade.closeReason || 'CLOSE' }
    ]);
    chartData.backtestMarkers = markers;
    updateMarkers(chartData); // Use unified marker update

    // Plot individual trade lines
    results.trades.forEach(trade => {
        const lineSeries = chartData.chart.addLineSeries({
            color: trade.pnl >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)',
            lineWidth: 2,
            lineStyle: 0, // Solid
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
                lineStyle: 2, // Dashed
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
                lineStyle: 2, // Dashed
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

    // Zoom to fit the backtest period
    if (results.trades.length > 0) {
        const from = results.trades[0].time;
        const to = results.trades[results.trades.length - 1].exitTime;
        chartData.chart.timeScale().setVisibleRange({ from, to });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  VOLUME PROFILE (VPVR)  —  Canvas overlay, TradingView style
// ═══════════════════════════════════════════════════════════════════════════









// ═══════════════════════════════════════════════════════════════════════════
//  SESSION HIGHLIGHTING  —  Canvas overlay, TradingView style
//  Asia: 00:00–09:00 UTC  |  London: 07:00–16:00 UTC  |  NY: 13:00–22:00 UTC
// ═══════════════════════════════════════════════════════════════════════════








/* ═══════════════════════════════════════════════════════════════
   NEW FEATURES
   1. Header Nav Tabs
   2. Watchlist Panel (collapsible right-side sidebar)
   3. Chart Right-Click Context Menu
   ═══════════════════════════════════════════════════════════════ */



function showAlertsHub() {
    // Collect all active alerts from drawings
    const allAlerts = [];
    if (state && state.drawings) {
        Object.entries(state.drawings).forEach(([symbol, lines]) => {
            if (!Array.isArray(lines)) return;
            lines.forEach(line => {
                if (line.type === 'alert') {
                    allAlerts.push({ symbol, price: line.price, id: line.id, active: line.active });
                }
            });
        });
    }

    // Remove existing
    const existing = document.getElementById('alerts-hub-modal');
    if (existing) { existing.remove(); return; }

    const modal = document.createElement('div');
    modal.id = 'alerts-hub-modal';
    modal.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        width: 380px; max-height: 75vh;
        background: var(--glass-bg); backdrop-filter: blur(20px) saturate(1.5);
        border: 1px solid var(--glass-border);
        border-radius: 14px;
        box-shadow: var(--glass-shadow);
        z-index: 8000;
        display: flex; flex-direction: column;
        font-family: inherit; color: var(--text);
        overflow: hidden;
        animation: alertsHubIn 180ms var(--ease-out) both;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid var(--border);
        font-size: 13px; font-weight: 700; letter-spacing: 0.04em;
        text-transform: uppercase; color: var(--blue);
    `;
    header.innerHTML = `
        <span style="display:flex;align-items:center;gap:8px">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            Price Alerts (${allAlerts.length})
        </span>
        <button onclick="this.closest('#alerts-hub-modal').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;line-height:1;padding:0">×</button>
    `;

    const body = document.createElement('div');
    body.style.cssText = 'flex:1; overflow-y:auto; padding:8px;';

    if (allAlerts.length === 0) {
        body.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:160px;gap:12px;color:var(--muted)">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                <p style="margin:0;font-size:13px">No active alerts</p>
                <p style="margin:0;font-size:11px;opacity:0.6">Right-click on a chart to add an alert</p>
            </div>`;
    } else {
        allAlerts.forEach(alert => {
            const row = document.createElement('div');
            row.style.cssText = `
                display:flex; align-items:center; justify-content:space-between;
                padding:9px 12px; border-radius:8px; margin-bottom:4px;
                background: var(--panel-2); border: 1px solid var(--border);
                font-size:12px;
            `;
            const priceStr = alert.price < 1 ? alert.price.toFixed(4) : alert.price.toFixed(2);
            row.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:2px">
                    <span style="font-weight:700;color:var(--text)">${alert.symbol}</span>
                    <span style="color:var(--muted);font-size:11px">Alert @ ${priceStr}</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px">
                    <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${alert.active ? 'rgba(16,185,129,0.18)' : 'rgba(107,114,128,0.2)'};color:${alert.active ? 'var(--green)' : 'var(--muted)'}">${alert.active ? 'ACTIVE' : 'PENDING'}</span>
                </div>
            `;
            body.appendChild(row);
        });
    }

    modal.appendChild(header);
    modal.appendChild(body);
    document.body.appendChild(modal);

    // Dismiss on click outside
    setTimeout(() => {
        const dismiss = (e) => {
            if (!modal.contains(e.target)) {
                modal.remove();
                document.removeEventListener('mousedown', dismiss);
            }
        };
        document.addEventListener('mousedown', dismiss);
    }, 10);
}

// Update alert badge count
function updateNotifBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    let count = 0;
    if (state && state.drawings) {
        Object.values(state.drawings).forEach(lines => {
            if (Array.isArray(lines)) {
                count += lines.filter(l => l.type === 'alert').length;
            }
        });
    }
    if (count > 0) {
        badge.textContent = count > 9 ? '9+' : String(count);
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// ── 2. Watchlist Panel ───────────────────────────────────────────
const watchlistState = {
    open: false,
    symbols: {},        // symbol -> { price, change24h, el }
    flashTimers: {},
    symbolsList: [],    // persistent list of symbols in watchlist
};

function getCryptoIconHtml(symbol) {
    const sym = symbol.toUpperCase();
    let bg = 'linear-gradient(135deg, #f59e0b, #d97706)';
    let char = sym.charAt(0);
    
    if (sym === 'BTC') {
        bg = 'linear-gradient(135deg, #f7931a, #f7931a)';
        char = '₿';
    } else if (sym === 'ETH') {
        bg = 'linear-gradient(135deg, #627eea, #3c3c3d)';
        char = 'Ξ';
    } else if (sym === 'SOL') {
        bg = 'linear-gradient(135deg, #14f195, #9945ff)';
        char = '◎';
    } else if (sym === 'TURBO') {
        bg = 'linear-gradient(135deg, #eab308, #ca8a04)';
        char = 'T';
    } else if (sym === 'XRP') {
        bg = 'linear-gradient(135deg, #23292f, #00aae4)';
        char = '✕';
    } else if (sym === 'ADA') {
        bg = 'linear-gradient(135deg, #0033ad, #002280)';
        char = '₳';
    } else if (sym === 'DOT') {
        bg = 'linear-gradient(135deg, #e6007a, #a60058)';
        char = '●';
    } else if (sym === 'LINK') {
        bg = 'linear-gradient(135deg, #2a5ada, #1a3a9a)';
        char = '⬡';
    } else {
        let hash = 0;
        for (let i = 0; i < sym.length; i++) {
            hash = sym.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c1 = `hsl(${hash % 360}, 65%, 50%)`;
        const c2 = `hsl(${(hash + 120) % 360}, 65%, 40%)`;
        bg = `linear-gradient(135deg, ${c1}, ${c2})`;
    }
    
    return `<div class="wl-coin-icon" style="background: ${bg};">${char}</div>`;
}

// ── 3. Chart Right-Click Context Menu ────────────────────────────
const ctxMenu = {
    el: null,
    chartData: null,
    price: null,
    visible: false,
};

function initContextMenu() {
    ctxMenu.el = document.getElementById('chart-context-menu');
    if (!ctxMenu.el) return;

    // Wire buttons
    document.getElementById('ctx-add-alert').addEventListener('click', () => {
        hideCtxMenu();
        if (ctxMenu.chartData && ctxMenu.price !== null) {
            if (typeof openPriceAlertModal === 'function') {
                openPriceAlertModal(ctxMenu.chartData, ctxMenu.price);
            }
        }
    });

    document.getElementById('ctx-draw-hline').addEventListener('click', () => {
        hideCtxMenu();
        if (ctxMenu.chartData && ctxMenu.price !== null) {
            addHLineFromCtxMenu(ctxMenu.chartData, ctxMenu.price);
        }
    });

    document.getElementById('ctx-copy-price').addEventListener('click', () => {
        hideCtxMenu();
        if (ctxMenu.price !== null) {
            const str = ctxMenu.price < 1 ? ctxMenu.price.toFixed(4) : ctxMenu.price.toFixed(2);
            navigator.clipboard.writeText(str).catch(() => {});
        }
    });

    document.getElementById('ctx-copy-symbol').addEventListener('click', () => {
        hideCtxMenu();
        if (ctxMenu.chartData) {
            navigator.clipboard.writeText(ctxMenu.chartData.symbol).catch(() => {});
        }
    });

    // Dismiss on outside click
    document.addEventListener('mousedown', (e) => {
        if (ctxMenu.visible && ctxMenu.el && !ctxMenu.el.contains(e.target)) {
            hideCtxMenu();
        }
    });

    // Dismiss on scroll
    document.addEventListener('scroll', hideCtxMenu, true);

    // Dismiss on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && ctxMenu.visible) hideCtxMenu();
    });
}

function showCtxMenu(x, y, chartData, price) {
    if (!ctxMenu.el) return;

    ctxMenu.chartData = chartData;
    ctxMenu.price = price;

    // Update header
    const header = document.getElementById('ctx-menu-header');
    if (header) {
        const sym = chartData ? chartData.symbol : '—';
        const priceStr = price !== null ? (price < 1 ? price.toFixed(4) : price.toFixed(2)) : '—';
        header.textContent = `${sym}  ·  ${priceStr}`;
    }

    // Position — keep within viewport
    ctxMenu.el.style.display = 'flex';
    ctxMenu.el.style.opacity = '0';
    ctxMenu.el.style.transform = 'scale(0.95) translateY(-4px)';
    ctxMenu.el.style.pointerEvents = 'none';

    const rect = ctxMenu.el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mx = Math.min(x, vw - rect.width - 8);
    const my = Math.min(y, vh - rect.height - 8);

    ctxMenu.el.style.left = `${mx}px`;
    ctxMenu.el.style.top  = `${my}px`;
    ctxMenu.el.style.transformOrigin = 'top left';

    // Animate in via rAF
    requestAnimationFrame(() => {
        ctxMenu.el.classList.add('visible');
        ctxMenu.visible = true;
    });
}

function hideCtxMenu() {
    if (!ctxMenu.el) return;
    ctxMenu.el.classList.remove('visible');
    ctxMenu.visible = false;

    // After transition, set display:none
    setTimeout(() => {
        if (!ctxMenu.visible && ctxMenu.el) {
            ctxMenu.el.style.display = 'none';
        }
    }, 150);
}

// Add a horizontal line from context menu
function addHLineFromCtxMenu(chartData, price) {
    if (!chartData || price === null || !chartData.candleSeries) return;

    const key = chartData.symbol;
    if (!state) return;
    if (!state.drawings[key]) state.drawings[key] = [];

    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    const isLight = state.theme === 'light';
    const color = isLight ? '#3b82f6' : '#60a5fa';
    const lineObj = {
        type: 'horizontalLine',
        symbol: chartData.symbol,
        price: price,
        id: id,
        color: color,
        lineWidth: 1,
        lineStyle: 2, // dashed
    };
    state.drawings[key].push(lineObj);

    // Render on all charts showing this symbol
    Object.values(state.charts).forEach(cd => {
        if (cd.symbol === chartData.symbol && cd.candleSeries) {
            if (!cd.renderedDrawings) cd.renderedDrawings = {};
            try {
                const pl = cd.candleSeries.createPriceLine({
                    price: lineObj.price,
                    color: lineObj.color,
                    lineWidth: lineObj.lineWidth,
                    lineStyle: lineObj.lineStyle,
                    axisLabelVisible: true,
                    title: '',
                });
                cd.renderedDrawings[id] = pl;
            } catch(e) {
                console.warn('Could not create price line:', e);
            }
        }
    });

    if (typeof saveDrawings === 'function') saveDrawings();
}

// Attach contextmenu listener to each chart container — called from initializeChart
function attachChartContextMenu(chartData) {
    const container = document.getElementById(`${chartData.id}-container`);
    if (!container) return;

    container.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!chartData.candleSeries) return;

        const rect = container.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const price = chartData.candleSeries.coordinateToPrice(y);

        showCtxMenu(e.clientX, e.clientY, chartData, price);
    });
}

// ── Bootstrap all new features once DOM is ready ────────────────
function initNewFeatures() {
    WatchlistService.initialize({
        watchlistState: watchlistState,
        StorageService: StorageService,
        getInstruments: () => state.instruments,
        getMarketCache: () => state.allMarketPrices,
        getChartStates: () => state.charts,
        getActiveChartId: () => state.activeChartId,
        onSelectSymbol: (chartId, symbol) => switchChartSymbol(chartId, symbol),
        onOpenAlerts: () => { if (typeof showAlertsHub === 'function') showAlertsHub(); },
        getIconHtml: (symbol) => typeof getCryptoIconHtml === 'function' ? getCryptoIconHtml(symbol) : '',
        onPoll: () => { if (typeof updateNotifBadge === 'function') updateNotifBadge(); }
    });

    initContextMenu();

    // Watch for charts being added/changed to refresh watchlist
    let wlRefreshTimer = null;
    const scheduleWLRefresh = () => {
        clearTimeout(wlRefreshTimer);
        wlRefreshTimer = setTimeout(WatchlistService.refreshWatchlistFromCharts, 1200);
    };

    if (state) {
        const origSaveLayout = typeof saveLayoutState === 'function' ? saveLayoutState : null;
        if (origSaveLayout) {
            const _orig = window.saveLayoutState;
        }
    }

    // Periodic watchlist refresh (new symbols after layout change)
    setInterval(scheduleWLRefresh, 8000);
}

// Wait for the full app to initialize before bootstrapping new features
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(initNewFeatures, 800));
} else {
    setTimeout(initNewFeatures, 800);
}

// Expose attachChartContextMenu globally so initializeChart can call it
window.attachChartContextMenu = attachChartContextMenu;


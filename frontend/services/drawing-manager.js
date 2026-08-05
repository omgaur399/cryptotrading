const DrawingManagerService = (function() {
    let deps = {};

    function initialize(injectedDeps) {
        deps = injectedDeps;
    }

    function getState() {
        return deps.state || window.state;
    }

    function getDrawingService() {
        return deps.DrawingService || window.DrawingService;
    }

    function getStorageService() {
        return deps.StorageService || window.StorageService;
    }

    function getModalService() {
        return deps.ModalService || window.ModalService;
    }

    function getTimeUtils() {
        return deps.TimeUtils || window.TimeUtils;
    }

    function getIntervalToSeconds() {
        return deps.intervalToSeconds || window.intervalToSeconds;
    }

    function savePrimitiveDrawing(symbol, prim) {
        const st = getState();
        const drawingSvc = getDrawingService();
        const storageSvc = getStorageService();
        if (!st || !drawingSvc || !storageSvc) return;

        if (!st.drawings[symbol]) st.drawings[symbol] = [];
        const drawings = st.drawings[symbol];
        
        // Find index of drawing with same id
        const idx = drawings.findIndex(d => d.id === prim.id);
        const serialized = drawingSvc.serializePrimitive(prim);
        if (!serialized) return;
        
        serialized.symbol = symbol;
        
        if (idx !== -1) {
            drawings[idx] = serialized;
        } else {
            drawings.push(serialized);
        }
        
        storageSvc.saveDrawings(st.drawings);
    }

    function restorePrimitiveDrawings(chartData) {
        const st = getState();
        const drawingSvc = getDrawingService();
        if (manager && st && drawingSvc) {
            manager.clearDrawings(chartData);
            manager.chartDrawings[chartData.id] = [];
            const drawings = st.drawings[chartData.symbol] || [];
            
            const restored = drawingSvc.restorePrimitiveDrawings(chartData, drawings);
            if (restored && restored.length > 0) {
                manager.chartDrawings[chartData.id] = restored;
            }
        }
    }

    function clearAllDrawings() {
        const st = getState();
        const storageSvc = getStorageService();
        if (!st || !st.charts) return;
        
        // Clear from localStorage state
        if (st.drawings) {
            Object.keys(st.drawings).forEach(symbol => {
                st.drawings[symbol] = [];
            });
            if (storageSvc) storageSvc.saveDrawings(st.drawings);
        }
        
        // Clear from UI
        Object.values(st.charts).forEach(chartData => {
            if (manager) {
                manager.clearDrawings(chartData);
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
    }

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
            const st = getState();
            if (st && st.charts) {
                Object.values(st.charts).forEach(chartData => {
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
                            const int2sec = getIntervalToSeconds();
                            const intervalSec = typeof int2sec === "function" ? int2sec(chartData.interval) : 60;
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
            const drawingSvc = getDrawingService();
            const timeUtils = getTimeUtils();
            const int2sec = getIntervalToSeconds();

            if (this.activeTool && drawingSvc) {
                if (!this.activeDrawing) {
                    const primitive = drawingSvc.createPrimitive(this.activeTool, chartData.id, time, price);
                    if (primitive) {
                        this.activeDrawing = primitive;
                        drawingSvc.attachPrimitive(chartData, primitive);
                        
                        if (!this.chartDrawings[chartData.id]) this.chartDrawings[chartData.id] = [];
                        this.chartDrawings[chartData.id].push(primitive);
                        
                        if (this.activeTool === 'longPosition' || this.activeTool === 'shortPosition') {
                            drawingSvc.finishPositionPrimitive(primitive, chartData, time, price, timeUtils, int2sec);
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
                                drawingSvc.detachPrimitive(chartData, primitive);
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
                const drawingSvc = getDrawingService();
                if (!drawingSvc) return;
                if (dragging || (manager && manager.activeTool)) return;
                const rect = container.getBoundingClientRect();
                const px = e.clientX - rect.left;
                const py = e.clientY - rect.top;
                
                const h = drawingSvc.findHandle(chartData, this.chartDrawings, px, py);
                
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
                const drawingSvc = getDrawingService();
                if (!drawingSvc) return;
                const rect = container.getBoundingClientRect();
                const px = e.clientX - rect.left;
                const py = e.clientY - rect.top;
                const h = drawingSvc.findHandle(chartData, this.chartDrawings, px, py);
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
                        const coords = drawingSvc.screenToChart(chartData, container, ev.clientX, ev.clientY);
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
            const st = getState();
            const drawingSvc = getDrawingService();
            const storageSvc = getStorageService();
            if (drawingSvc) drawingSvc.detachPrimitive(chartData, primitive);
            if (this.chartDrawings[chartData.id]) {
                this.chartDrawings[chartData.id] = this.chartDrawings[chartData.id].filter(p => p.id !== primitive.id);
            }
            if (st && st.drawings[chartData.symbol]) {
                st.drawings[chartData.symbol] = st.drawings[chartData.symbol].filter(d => d.id !== primitive.id);
                if (storageSvc) storageSvc.saveDrawings(st.drawings);
            }
        }

        clearDrawings(chartData) {
            const drawingSvc = getDrawingService();
            if (this.chartDrawings[chartData.id]) {
                this.chartDrawings[chartData.id].forEach(prim => {
                    if (drawingSvc) drawingSvc.detachPrimitive(chartData, prim);
                });
                this.chartDrawings[chartData.id] = [];
            }
        }
    }

    const manager = new DrawingManager();

    function addHorizontalLine(chartData, price) {
        const st = getState();
        const drawingSvc = getDrawingService();
        const storageSvc = getStorageService();
        if (!st || !drawingSvc) return;

        const key = chartData.symbol;
        if (!st.drawings[key]) st.drawings[key] = [];
        
        const isLight = st.theme === 'light';
        const id = Date.now().toString() + Math.random().toString().slice(2, 6);
        const lineObj = {
            type: "horizontalLine",
            symbol: chartData.symbol,
            price: price,
            id: id,
            color: isLight ? '#3b82f6' : '#60a5fa',
            lineWidth: 2
        };
        st.drawings[key].push(lineObj);
        if (storageSvc) storageSvc.saveDrawings(st.drawings);
        Object.values(st.charts).forEach(cd => {
            if (cd.symbol === chartData.symbol) drawingSvc.renderHorizontalLine(cd, lineObj);
        });
    }

    function checkAndInteractWithLine(chartData, clickedPrice, clickedTime, point) {
        const st = getState();
        if (!st) return;

        const key = chartData.symbol;
        if (!st.drawings[key]) return;
        
        const lines = st.drawings[key];
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
                // Alerts are handled on the right scale
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
        const st = getState();
        const modalSvc = getModalService();
        const storageSvc = getStorageService();
        if (!modalSvc) return;

        const isLight = st ? st.theme === 'light' : true;
        const defaultColor = isLight ? '#3b82f6' : '#60a5fa';
        
        modalSvc.openLineSettings({
            price: lineObj.price,
            color: lineObj.color || defaultColor,
            lineWidth: lineObj.lineWidth || 2
        }, {
            onSave: (data) => {
                lineObj.price = isNaN(data.price) ? lineObj.price : data.price;
                lineObj.color = data.color;
                lineObj.lineWidth = data.lineWidth;
                
                if (st && st.charts) {
                    Object.values(st.charts).forEach(cd => {
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
                }
                
                if (st && storageSvc) storageSvc.saveDrawings(st.drawings);
                modalSvc.closeModal("line-settings-modal");
            },
            onDelete: () => {
                if (st && st.charts) {
                    Object.values(st.charts).forEach(cd => {
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
                }
                if (st && st.drawings[key]) {
                    const idx = st.drawings[key].findIndex(l => l.id === lineObj.id);
                    if (idx !== -1) st.drawings[key].splice(idx, 1);
                    if (storageSvc) storageSvc.saveDrawings(st.drawings);
                }
                modalSvc.closeModal("line-settings-modal");
            },
            onCancel: () => {
                modalSvc.closeModal("line-settings-modal");
            }
        });
    }

    function restoreDrawings(chartData) {
        const st = getState();
        const drawingSvc = getDrawingService();
        if (st && drawingSvc) {
            const lines = st.drawings[chartData.symbol];
            drawingSvc.restoreNativeDrawings(chartData, lines);
        }
    }

    function openVLineSettingsModal(chartData, lineObj) {
        const st = getState();
        const modalSvc = getModalService();
        const storageSvc = getStorageService();
        const drawingSvc = getDrawingService();
        if (!modalSvc) return;

        const key = chartData.symbol;
        const isLight = st ? st.theme === 'light' : true;
        const defaultColor = isLight ? '#3b82f6' : '#60a5fa';
        
        modalSvc.openVLineSettings({
            color: lineObj.color || defaultColor,
            lineWidth: lineObj.lineWidth || 2
        }, {
            onSave: (data) => {
                lineObj.color = data.color;
                lineObj.lineWidth = data.lineWidth;
                
                if (st && st.charts && drawingSvc) {
                    Object.values(st.charts).forEach(cd => {
                        if (cd.symbol === chartData.symbol) drawingSvc.renderVerticalLine(cd, lineObj);
                    });
                }
                
                if (st && storageSvc) storageSvc.saveDrawings(st.drawings);
                modalSvc.closeModal("vline-settings-modal");
            },
            onDelete: () => {
                if (st && st.charts) {
                    Object.values(st.charts).forEach(cd => {
                        if (cd.symbol === chartData.symbol) {
                            const el = document.getElementById(`vline-${cd.id}-${lineObj.id}`);
                            if (el) el.remove();
                        }
                    });
                }
                if (st && st.drawings[key]) {
                    st.drawings[key] = st.drawings[key].filter(d => d.id !== lineObj.id);
                    if (storageSvc) storageSvc.saveDrawings(st.drawings);
                }
                modalSvc.closeModal("vline-settings-modal");
            },
            onCancel: () => {
                modalSvc.closeModal("vline-settings-modal");
            }
        });
    }

    function openMarkerSettingsModal(chartData, markerObj, key) {
        const modalSvc = getModalService();
        const storageSvc = getStorageService();
        const st = getState();
        if (!modalSvc) return;

        const typeLabel = markerObj.type === 'buyMarker' ? 'Buy Marker' : 'Sell Marker';
        
        modalSvc.openMarkerSettings({
            typeLabel: typeLabel
        }, {
            onDelete: () => {
                if (st && st.drawings) {
                    const lines = st.drawings[key];
                    if (lines) {
                        const idx = lines.findIndex(d => d.id === markerObj.id);
                        if (idx !== -1) lines.splice(idx, 1);
                        if (storageSvc) storageSvc.saveDrawings(st.drawings);
                        if (st.charts) {
                            Object.values(st.charts).forEach(cd => {
                                if (cd.symbol === chartData.symbol) updateMarkers(cd);
                            });
                        }
                    }
                }
                modalSvc.closeModal("marker-settings-modal");
            },
            onCancel: () => {
                modalSvc.closeModal("marker-settings-modal");
            }
        });
    }

    function refreshChartMarkers() {
        const st = getState();
        if (st && st.charts) {
            Object.values(st.charts).forEach(cd => updateMarkers(cd));
        }
    }

    function updateMarkers(chartData) {
        const st = getState();
        const drawingSvc = getDrawingService();
        if (st && drawingSvc) {
            const drawings = st.drawings[chartData.symbol];
            drawingSvc.updateMarkers(chartData, drawings);
            const paperTrading = deps.paperTrading || window.paperTrading;
            if (paperTrading && paperTrading.updatePositionLines) {
                paperTrading.updatePositionLines(chartData);
            }
        }
    }

    // Explicitly preserve required backwards-compatible window aliases
    window.drawingManager = manager;
    window.clearAllDrawings = clearAllDrawings;
    window.refreshChartMarkers = refreshChartMarkers;

    return {
        initialize,
        setTool: (tool) => manager.setTool(tool),
        handleClick: (chartData, param) => manager.handleClick(chartData, param),
        handleCrosshairMove: (chartData, param) => manager.handleCrosshairMove(chartData, param),
        bindDragHandles: (chartData) => manager.bindDragHandles(chartData),
        removeDrawing: (chartData, primitive) => manager.removeDrawing(chartData, primitive),
        clearDrawings: (chartData) => manager.clearDrawings(chartData),
        savePrimitiveDrawing,
        restorePrimitiveDrawings,
        clearAllDrawings,
        addHorizontalLine,
        checkAndInteractWithLine,
        openLineSettingsModal,
        openVLineSettingsModal,
        openMarkerSettingsModal,
        restoreDrawings,
        updateMarkers,
        refreshChartMarkers,
        get manager() { return manager; }
    };
})();

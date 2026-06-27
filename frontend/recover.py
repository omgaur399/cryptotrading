import sys

with open('script.js', 'r', encoding='utf-8') as f:
    content = f.read()

drawing_fns = """
function savePrimitiveDrawing(symbol, prim) {
    if (!state.drawings[symbol]) state.drawings[symbol] = [];
    const drawings = state.drawings[symbol];
    
    // Find index of drawing with same id
    const idx = drawings.findIndex(d => d.id === prim.id);
    const serialized = {
        type: prim.type,
        id: prim.id,
        symbol: symbol,
        p1: prim._p1 ? { time: prim._p1.time, price: prim._p1.price } : null,
        p2: prim._p2 ? { time: prim._p2.time, price: prim._p2.price } : null,
        color: prim.color
    };
    if (prim._p3) {
        serialized.p3 = { time: prim._p3.time, price: prim._p3.price };
    }
    if (prim.type === 'text') {
        serialized.text = prim.text || "Text";
    }
    
    if (idx !== -1) {
        drawings[idx] = serialized;
    } else {
        drawings.push(serialized);
    }
    saveDrawings();
}

function restoreDrawings(chartData) {
    if (window.drawingManager) {
        window.drawingManager.clearDrawings(chartData);
        window.drawingManager.chartDrawings[chartData.id] = [];
        const drawings = state.drawings[chartData.symbol] || [];
        drawings.forEach(d => {
            let prim;
            if (d.type === 'trendline') prim = new DrawingPrimitives.TrendlinePrimitive(d.id);
            else if (d.type === 'rectangle') prim = new DrawingPrimitives.RectanglePrimitive(d.id);
            else if (d.type === 'fibonacci') prim = new DrawingPrimitives.FibonacciPrimitive(d.id);
            else if (d.type === 'text') { prim = new DrawingPrimitives.TextPrimitive(d.id); prim.text = d.text; }
            else if (d.type === 'longPosition') prim = new DrawingPrimitives.LongPositionPrimitive(d.id);
            else if (d.type === 'shortPosition') prim = new DrawingPrimitives.ShortPositionPrimitive(d.id);
            
            if (prim) {
                if (d.p1) prim.setP1(d.p1.time, d.p1.price);
                if (d.p2) prim.setP2(d.p2.time, d.p2.price);
                if (d.p3 && prim.setP3) prim.setP3(d.p3.time, d.p3.price);
                if (d.color) prim.color = d.color;
                prim.isFinished = true;
                chartData.candleSeries.attachPrimitive(prim);
                window.drawingManager.chartDrawings[chartData.id].push(prim);
            }
        });
    }
}
"""

if 'function savePrimitiveDrawing' not in content:
    content = content.replace('class DrawingManager {', drawing_fns + '\\nclass DrawingManager {')

dm_methods = """
    _findHandle(chartData, px, py, radius = 9) {
        const drawings = this.chartDrawings[chartData.id] || [];
        for (const prim of drawings) {
            if (!prim.isFinished) continue;
            for (const h of prim.getHandles()) {
                const dx = h.x - px, dy = h.y - py;
                if (dx * dx + dy * dy <= radius * radius) {
                    return { primitive: prim, handleName: h.name, chartData };
                }
            }
            if (prim.hitTest && prim.hitTest(px, py)) {
                return { primitive: prim, handleName: 'body', chartData };
            }
        }
        return null;
    }

    _screenToChart(chartData, container, clientX, clientY) {
        const rect = container.getBoundingClientRect();
        const cx = clientX - rect.left;
        const cy = clientY - rect.top;
        const logical = chartData.chart.timeScale().coordinateToLogical(cx);
        if (logical === null) return null;
        
        const price = chartData.candleSeries.coordinateToPrice(cy);
        if (price === null) return null;
        
        const bars = chartData.cachedData;
        if (!bars || bars.length === 0) return null;
        
        let time;
        if (logical >= 0 && logical < bars.length) {
            const idx = Math.round(logical);
            if (bars[idx]) {
                time = bars[idx].time;
            } else {
                time = bars[bars.length - 1].time; // Fallback
            }
        } else {
            // Future or before data start. Let's infer time
            const lastBar = bars[bars.length - 1];
            const lastTime = lastBar.time;
            const timeScale = chartData.chart.timeScale();
            const lastX = timeScale.timeToCoordinate(lastTime);
            if (lastX !== null) {
                const lastLogical = timeScale.coordinateToLogical(lastX);
                if (lastLogical !== null) {
                    const intervalSec = typeof intervalToSeconds === "function" ? intervalToSeconds(chartData.interval) : 60;
                    const diff = logical - lastLogical;
                    time = lastTime + Math.round(diff) * intervalSec;
                }
            }
            if (!time) {
                time = lastTime; // fallback
            }
        }
        
        return { time, price };
    }

    bindDragHandles(chartData) {
        const container = document.getElementById(`${chartData.id}-container`);
        if (!container || container.dataset.dragHandlesBound) return;
        container.dataset.dragHandlesBound = "true";

        let dragging = null; // { primitive, handleName, chartData }

        const onMouseMove = (e) => {
            const rect = container.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;

            if (dragging) {
                const coords = this._screenToChart(chartData, container, e.clientX, e.clientY);
                if (coords) {
                    if (dragging.handleName === 'body') {
                        if (dragging.lastCoords) {
                            const cx = e.clientX - rect.left;
                            const logical = chartData.chart.timeScale().coordinateToLogical(cx);
                            const lastLogical = chartData.chart.timeScale().coordinateToLogical(dragging.lastX);
                            if (logical !== null && lastLogical !== null) {
                                const dLogical = logical - lastLogical;
                                const dPrice = coords.price - dragging.lastCoords.price;
                                if (dragging.primitive.shift) dragging.primitive.shift(dLogical, dPrice);
                            }
                        }
                        dragging.lastCoords = coords;
                        dragging.lastX = e.clientX - rect.left;
                    } else {
                        dragging.primitive.setHandle(dragging.handleName, coords.time, coords.price);
                    }
                }
                return;
            }

            // Hover: change cursor when over a handle
            if (!this.activeTool) {
                const h = this._findHandle(chartData, px, py);
                container.style.cursor = h ? 'grab' : '';
            }
        };

        const onMouseDown = (e) => {
            const rect = container.getBoundingClientRect();
            const px = e.clientX - rect.left;
            const py = e.clientY - rect.top;
            const h = this._findHandle(chartData, px, py);
            if (h) {
                dragging = h;
                container.style.cursor = 'grabbing';
                // Prevent chart panning
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
                    window.removeEventListener('mouseup', onUp);
                    window.removeEventListener('mousemove', onGlobalMove);
                };
                const onGlobalMove = (ev) => {
                    if (!dragging) return;
                    const coords = this._screenToChart(chartData, container, ev.clientX, ev.clientY);
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
                window.addEventListener('mouseup', onUp);
                window.addEventListener('mousemove', onGlobalMove);
            }
        };

        container.addEventListener('mousemove', onMouseMove);
        // Use capture=true so we intercept before the chart library does
        container.addEventListener('mousedown', onMouseDown, { capture: true });
    }
"""

if '_findHandle' not in content:
    content = content.replace('    clearDrawings(chartData) {', dm_methods + '\\n    clearDrawings(chartData) {')

old_init = '''    if (chartData.lastPrice) updateChartPriceFormat(chartData, chartData.lastPrice);
    syncChartWithCache(chartData);'''
new_init = '''    if (chartData.lastPrice) updateChartPriceFormat(chartData, chartData.lastPrice);
    syncChartWithCache(chartData);
    restoreDrawings(chartData);
    if (window.drawingManager) window.drawingManager.bindDragHandles(chartData);'''

if 'restoreDrawings(chartData);' not in content:
    content = content.replace(old_init, new_init)

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('Fully restored')

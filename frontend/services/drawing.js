const DrawingService = {
    // -------------------------------------------------------------
    // Native Drawings (Horizontal, Vertical, Marker, Alert)
    // -------------------------------------------------------------

    renderHorizontalLine(chartData, lineObj) {
        if (!chartData.candleSeries || !chartData.candleSeries.createPriceLine) return;
        
        const price = parseFloat(lineObj.price);
        if (isNaN(price)) return;
        
        try {
            const pl = chartData.candleSeries.createPriceLine({
                price: price,
                color: lineObj.color || (window.state && window.state.theme === 'light' ? '#3b82f6' : '#60a5fa'),
                lineWidth: lineObj.lineWidth || 2,
                lineStyle: lineObj.lineStyle || 0,
                axisLabelVisible: true,
                title: lineObj.title || '',
            });
            
            if (!chartData.renderedDrawings) chartData.renderedDrawings = {};
            chartData.renderedDrawings[lineObj.id] = pl;
        } catch (e) {
            console.warn("Failed to render horizontal line:", e);
        }
    },

    renderVerticalLine(chartData, lineObj) {
        if (!chartData.chart || !chartData.candleSeries) return;
        const container = document.getElementById(`${chartData.id}-container`);
        if (!container) return;

        let elId = `vline-${chartData.id}-${lineObj.id}`;
        let el = document.getElementById(elId);
        
        if (!el) {
            el = document.createElement('div');
            el.id = elId;
            el.className = 'custom-vertical-line';
            el.style.position = 'absolute';
            el.style.top = '0';
            el.style.bottom = '30px';
            el.style.width = `${lineObj.lineWidth || 2}px`;
            el.style.backgroundColor = lineObj.color || (window.state && window.state.theme === 'light' ? '#3b82f6' : '#60a5fa');
            el.style.zIndex = '20';
            el.style.pointerEvents = 'none';
            container.appendChild(el);
            
            if (!chartData.renderedDrawings) chartData.renderedDrawings = {};
            chartData.renderedDrawings[lineObj.id] = el;
        } else {
            el.style.backgroundColor = lineObj.color || (window.state && window.state.theme === 'light' ? '#3b82f6' : '#60a5fa');
            el.style.width = `${lineObj.lineWidth || 2}px`;
        }
        
        const timeScale = chartData.chart.timeScale();
        let x = null;
        
        if (lineObj.logical !== undefined && lineObj.logical !== null && timeScale.logicalToCoordinate) {
            x = timeScale.logicalToCoordinate(lineObj.logical);
        } else if (lineObj.time !== undefined && timeScale.timeToCoordinate) {
            x = timeScale.timeToCoordinate(lineObj.time);
        }
        
        if (x !== null && x > 0 && x < container.clientWidth - 50) {
            el.style.left = `${x}px`;
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    },

    cleanupVerticalLines(chartData) {
        if (!chartData.id) return;
        const container = document.getElementById(`${chartData.id}-container`);
        if (!container) return;
        const vlines = container.querySelectorAll('.custom-vertical-line');
        vlines.forEach(el => el.remove());
    },

    renderAlertLine(chartData, alertObj) {
        if (!chartData.candleSeries || !chartData.candleSeries.createPriceLine) return;
        
        const price = parseFloat(alertObj.price);
        if (isNaN(price)) return;
        
        try {
            const pl = chartData.candleSeries.createPriceLine({
                price: price,
                color: alertObj.active ? 'rgba(0, 0, 0, 0)' : '#9ca3af',
                lineWidth: 1,
                lineStyle: 0,
                axisLabelVisible: true,
                title: alertObj.active ? '🔔' : '🔕',
            });
            
            if (!chartData.renderedDrawings) chartData.renderedDrawings = {};
            chartData.renderedDrawings[alertObj.id] = pl;
        } catch (e) {
            console.warn("Failed to render alert line:", e);
        }
    },

    updateMarkers(chartData, drawings) {
        if (!chartData.candleSeries || !drawings) return;
        
        const markers = [];
        drawings.forEach(d => {
            if (d.type === 'buyMarker') {
                markers.push({
                    time: d.time,
                    position: 'belowBar',
                    color: '#22c55e',
                    shape: 'arrowUp',
                    text: 'BUY',
                    id: d.id,
                });
            } else if (d.type === 'sellMarker') {
                markers.push({
                    time: d.time,
                    position: 'aboveBar',
                    color: '#ef4444',
                    shape: 'arrowDown',
                    text: 'SELL',
                    id: d.id,
                });
            }
        });
        
        // Sort markers by time
        markers.sort((a, b) => {
            const tA = typeof a.time === 'object' ? Date.UTC(a.time.year, a.time.month - 1, a.time.day) : a.time;
            const tB = typeof b.time === 'object' ? Date.UTC(b.time.year, b.time.month - 1, b.time.day) : b.time;
            return tA - tB;
        });
        
        try {
            chartData.candleSeries.setMarkers(markers);
        } catch (e) {
            console.warn("Failed to update markers:", e);
        }
    },

    restoreNativeDrawings(chartData, drawings) {
        if (!chartData.candleSeries) return;

        // Clear existing native price lines
        if (chartData.renderedDrawings) {
            Object.values(chartData.renderedDrawings).forEach(pl => {
                if (pl instanceof HTMLElement) {
                    pl.remove();
                } else if (pl.applyOptions) {
                    try { chartData.candleSeries.removePriceLine(pl); } catch (e) { }
                }
            });
        }
        chartData.renderedDrawings = {};
        
        this.cleanupVerticalLines(chartData);

        if (!drawings || drawings.length === 0) {
            try { chartData.candleSeries.setMarkers([]); } catch(e){}
            return;
        }

        drawings.forEach(line => {
            if (line.type === 'horizontalLine') {
                this.renderHorizontalLine(chartData, line);
            } else if (line.type === 'verticalLine') {
                this.renderVerticalLine(chartData, line);
            } else if (line.type === 'alert') {
                this.renderAlertLine(chartData, line);
            }
        });

        this.updateMarkers(chartData, drawings);
    },

    // -------------------------------------------------------------
    // Custom Primitives Lifecycle (Trendline, Fibonacci, etc.)
    // -------------------------------------------------------------

    createPrimitive(tool, chartId, time, price) {
        if (!window.DrawingPrimitives) return null;
        
        let primitive = null;
        if (tool === 'trendline') primitive = new window.DrawingPrimitives.TrendlinePrimitive();
        else if (tool === 'rectangle') primitive = new window.DrawingPrimitives.RectanglePrimitive();
        else if (tool === 'fibonacci') primitive = new window.DrawingPrimitives.FibonacciPrimitive();
        else if (tool === 'text') primitive = new window.DrawingPrimitives.TextPrimitive();
        else if (tool === 'longPosition') primitive = new window.DrawingPrimitives.LongPositionPrimitive();
        else if (tool === 'shortPosition') primitive = new window.DrawingPrimitives.ShortPositionPrimitive();
        else if (tool === 'priceRange') primitive = new window.DrawingPrimitives.PriceRangePrimitive();
        
        if (primitive) {
            primitive.chartId = chartId;
            primitive.setP1(time, price);
        }
        return primitive;
    },

    finishPositionPrimitive(primitive, chartData, time, price, TimeUtils, intervalToSeconds) {
        const offset = price * 0.005; 
        const targetPrice = primitive instanceof window.DrawingPrimitives.ShortPositionPrimitive ? price - offset : price + offset;
        const stopPrice = primitive instanceof window.DrawingPrimitives.ShortPositionPrimitive ? price + offset : price - offset;
        
        const intervalSec = typeof intervalToSeconds === "function" ? intervalToSeconds(chartData.interval) : 60;
        const baseSec = typeof TimeUtils !== 'undefined' ? TimeUtils._getMs(time) / 1000 : (typeof time === 'object' ? Date.UTC(time.year, time.month - 1, time.day) / 1000 : time);
        const futureTime = baseSec + (intervalSec * 15);
        
        primitive.setP2(futureTime, targetPrice);
        if (primitive.setP3) primitive.setP3(futureTime, stopPrice);
        primitive.isFinished = true;
    },

    attachPrimitive(chartData, primitive) {
        if (!chartData || !chartData.candleSeries || !primitive) return;
        chartData.candleSeries.attachPrimitive(primitive);
    },

    detachPrimitive(chartData, primitive) {
        if (!chartData || !chartData.candleSeries || !primitive) return;
        chartData.candleSeries.detachPrimitive(primitive);
    },

    findHandle(chartData, chartDrawings, px, py, radius = 9) {
        const drawings = chartDrawings[chartData.id] || [];
        for (const prim of drawings) {
            if (!prim.isFinished) continue;
            
            for (const h of prim.getHandles()) {
                const dx = h.x - px, dy = h.y - py;
                if (dx * dx + dy * dy <= radius * radius) {
                    return { primitive: prim, handleName: h.name, chartData };
                }
            }
            
            if (prim.isHovered && prim.getDeleteHandle) {
                const dh = prim.getDeleteHandle();
                if (dh) {
                    const dx = dh.x - px, dy = dh.y - py;
                    if (dx * dx + dy * dy <= 20 * 20) {
                        return { primitive: prim, handleName: 'delete', chartData };
                    }
                }
            }
            if (prim.hitTest && prim.hitTest(px, py)) {
                return { primitive: prim, handleName: 'body', chartData };
            }
        }
        return null;
    },

    screenToChart(chartData, container, clientX, clientY) {
        const rect = container.getBoundingClientRect();
        const cx = clientX - rect.left;
        const cy = clientY - rect.top;
        const timeScale = chartData.chart.timeScale();
        
        const logical = timeScale.coordinateToLogical ? timeScale.coordinateToLogical(cx) : null;
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
                time = bars[bars.length - 1].time;
            }
        } else if (logical < 0) {
            time = bars[0].time;
        } else {
            // Extrapolate into the future
            const lastBar = bars[bars.length - 1];
            const logicalDiff = logical - (bars.length - 1);
            let lastTimeSec = lastBar.time;
            if (typeof lastTimeSec === 'object') {
                lastTimeSec = Date.UTC(lastTimeSec.year, lastTimeSec.month - 1, lastTimeSec.day) / 1000;
            }
            // Need interval info. For simplicity, just use coordinateToTime if available, else approximate
            if (timeScale.coordinateToTime) {
                const t = timeScale.coordinateToTime(cx);
                if (t) time = t;
            }
            if (!time) time = lastTimeSec + (logicalDiff * 60); 
        }
        
        return { time, price, cx, cy };
    },

    serializePrimitive(primitive) {
        if (!primitive) return null;
        if (typeof primitive.serialize === 'function') return primitive.serialize();
        
        const serialized = {
            type: primitive.type,
            id: primitive.id,
            p1: primitive._p1 ? { time: primitive._p1.time, price: primitive._p1.price } : null,
            p2: primitive._p2 ? { time: primitive._p2.time, price: primitive._p2.price } : null,
            color: primitive.color,
            isFinished: primitive.isFinished
        };
        if (primitive._p3) {
            serialized.p3 = { time: primitive._p3.time, price: primitive._p3.price };
        }
        if (primitive.type === 'text') {
            serialized.text = primitive.text || "Text";
        }
        return serialized;
    },

    deserializePrimitive(data) {
        if (!window.DrawingPrimitives) return null;
        
        const ToolClassMap = {
            'trendline': window.DrawingPrimitives.TrendlinePrimitive,
            'rectangle': window.DrawingPrimitives.RectanglePrimitive,
            'fibonacci': window.DrawingPrimitives.FibonacciPrimitive,
            'text': window.DrawingPrimitives.TextPrimitive,
            'longPosition': window.DrawingPrimitives.LongPositionPrimitive,
            'shortPosition': window.DrawingPrimitives.ShortPositionPrimitive,
            'priceRange': window.DrawingPrimitives.PriceRangePrimitive
        };
        
        const Klass = ToolClassMap[data.type];
        if (Klass) {
            const instance = new Klass(data.id);
            if (instance.deserialize) {
                instance.deserialize(data);
            } else {
                if (data.p1) instance.setP1(data.p1.time, data.p1.price);
                if (data.p2) instance.setP2(data.p2.time, data.p2.price);
                if (data.p3 && instance.setP3) instance.setP3(data.p3.time, data.p3.price);
                instance.isFinished = data.isFinished !== false;
                if (data.text && instance.type === 'text') instance.text = data.text;
                if (data.color) instance.color = data.color;
            }
            return instance;
        }
        return null;
    },

    restorePrimitiveDrawings(chartData, savedData) {
        if (!savedData || !Array.isArray(savedData)) return [];
        
        const restored = [];
        savedData.forEach(pData => {
            const instance = this.deserializePrimitive(pData);
            if (instance) {
                this.attachPrimitive(chartData, instance);
                restored.push(instance);
            }
        });
        return restored;
    }
};

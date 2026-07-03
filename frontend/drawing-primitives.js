// drawing-primitives.js
// Custom Drawing Tools using Lightweight Charts v4 Primitive API

function safePriceToCoordinate(series, price) {
    if (!series) return null;
    try {
        return series.priceToCoordinate(price);
    } catch (e) {
        return null;
    }
}
class DeleteCrossRenderer {
    constructor(source) { this._source = source; }
    draw(target) {
        target.useMediaCoordinateSpace((scope) => {
            if (!this._source.isHovered) return;
            const dh = this._source.getDeleteHandle ? this._source.getDeleteHandle() : null;
            if (!dh) return;
            const ctx = scope.context;
            ctx.fillStyle = '#ef4444'; // red bg
            ctx.beginPath();
            ctx.arc(dh.x, dh.y, 8, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(dh.x - 3, dh.y - 3); ctx.lineTo(dh.x + 3, dh.y + 3);
            ctx.moveTo(dh.x + 3, dh.y - 3); ctx.lineTo(dh.x - 3, dh.y + 3);
            ctx.stroke();
        });
    }
}
class DeleteCrossView {
    constructor(source) { this._source = source; }
    zOrder() { return 'top'; }
    renderer() { return new DeleteCrossRenderer(this._source); }
}
class DrawingBase {
    constructor(id) {
        this.id = id || Date.now().toString() + Math.random().toString().substr(2, 5);
        this._p1 = null;
        this._p2 = null;
        this.isFinished = false;
        this._chart = null;
        this._series = null;
        this._requestUpdate = null;
        this.color = '#3b82f6';
        this.paneView = null;
        this.isHovered = false;
        this.deleteView = new DeleteCrossView(this);
    }

    attached(param) {
        this._chart = param.chart;
        this._series = param.series;
        this._requestUpdate = param.requestUpdate;
    }

    detached() {
        this._chart = null;
        this._series = null;
        this._requestUpdate = null;
    }

    updateAllViews() {
        if (this._requestUpdate) this._requestUpdate();
    }

    paneViews() {
        return [this.paneView, this.deleteView].filter(Boolean);
    }

    getDeleteHandle() {
        if (!this._chart || !this._series || !this.isHovered) return null;
        if (this._hoverX !== undefined && this._hoverY !== undefined) {
            return { name: 'delete', x: this._hoverX + 25, y: this._hoverY - 25 };
        }
        if (!this._p1) return null;
        const x = this.timeToX(this._p1.time);
        const y = safePriceToCoordinate(this._series, this._p1.price);
        if (x !== null && y !== null) {
            return { name: 'delete', x: x - 15, y: y - 15 };
        }
        return null;
    }

    setP1(time, price) {
        this._p1 = { time, price };
        this.updateAllViews();
    }

    setP2(time, price) {
        this._p2 = { time, price };
        this.updateAllViews();
    }

    timeToX(time) {
        if (!this._chart) return null;
        const timeScale = this._chart.timeScale();
        
        let x = timeScale.timeToCoordinate(time);
        if (x !== null && x !== undefined) return x;
        
        if (typeof window.state === 'undefined' || !window.state.charts) return null;
        const chartData = this.chartId ? window.state.charts[this.chartId] : Object.values(window.state.charts)[0];
        if (!chartData || !chartData.cachedData || chartData.cachedData.length === 0) return null;
        
        const bars = chartData.cachedData;
        const lastBar = bars[bars.length - 1];
        const lastTime = lastBar.time;
        
        const lastLogical = bars.length - 1;
        const intervalSec = typeof intervalToSeconds === "function" ? intervalToSeconds(chartData.interval) : 60;
        
        let tMs = time;
        let lastTMs = lastTime;
        if (typeof TimeUtils !== 'undefined' && TimeUtils._getMs) {
            tMs = TimeUtils._getMs(time) / 1000;
            lastTMs = TimeUtils._getMs(lastTime) / 1000;
        } else {
            if (typeof tMs === 'object' && tMs !== null) tMs = Date.UTC(tMs.year, tMs.month - 1, tMs.day) / 1000;
            if (typeof lastTMs === 'object' && lastTMs !== null) lastTMs = Date.UTC(lastTMs.year, lastTMs.month - 1, lastTMs.day) / 1000;
        }
        if (typeof tMs === 'string') tMs = new Date(tMs).getTime() / 1000;
        if (typeof lastTMs === 'string') lastTMs = new Date(lastTMs).getTime() / 1000;
        
        const diff = tMs - lastTMs;
        const logical = lastLogical + diff / intervalSec;
        
        let mappedX = timeScale.logicalToCoordinate(logical);
        
        if (mappedX === null || mappedX === undefined) {
            const logicalRange = timeScale.getVisibleLogicalRange();
            if (logicalRange) {
                const w = timeScale.width();
                const barsVisible = logicalRange.to - logicalRange.from;
                const barSpacing = w / barsVisible;
                const refX = timeScale.logicalToCoordinate(logicalRange.to);
                if (refX !== null) {
                    mappedX = refX + (logical - logicalRange.to) * barSpacing;
                }
            }
        }
        
        return mappedX !== null ? mappedX : null;
    }

    _getCoords() {
        if (!this._chart || !this._series || !this._p1) return null;
        const x1 = this.timeToX(this._p1.time);
        let y1;
        try {
            y1 = safePriceToCoordinate(this._series, this._p1.price);
        } catch (e) {
            return null;
        }
        if (x1 === null || y1 === null) return null;

        let x2 = x1, y2 = y1;
        if (this._p2) {
            x2 = this.timeToX(this._p2.time);
            try {
                y2 = safePriceToCoordinate(this._series, this._p2.price);
            } catch (e) {
                // Ignore
            }
            if (x2 === null || y2 === null) { x2 = x1; y2 = y1; }
        }
        return { x1, y1, x2, y2 };
    }

    // Return all draggable handles as { name, x, y } in screen coords
    getHandles() {
        if (!this._chart || !this._series) return [];
        const handles = [];
        const toX = t => this.timeToX(t);
        const toY = p => safePriceToCoordinate(this._series, p);
        if (this._p1) {
            const x = toX(this._p1.time), y = toY(this._p1.price);
            if (x !== null && y !== null) handles.push({ name: 'p1', x, y });
        }
        if (this._p2) {
            const x = toX(this._p2.time), y = toY(this._p2.price);
            if (x !== null && y !== null) handles.push({ name: 'p2', x, y });
        }
        if (this._p3) {
            const x = toX(this._p3.time), y = toY(this._p3.price);
            if (x !== null && y !== null) handles.push({ name: 'p3', x, y });
        }
        return handles;
    }

    // Update a handle by name
    setHandle(name, time, price) {
        if (name === 'p1') this.setP1(time, price);
        else if (name === 'p2') this.setP2(time, price);
        else if (name === 'p3' && this.setP3) this.setP3(time, price);
    }

    hitTest(px, py) {
        const coords = this._getCoords();
        if (!coords) return false;
        
        let minX = Math.min(coords.x1, coords.x2);
        let maxX = Math.max(coords.x1, coords.x2);
        let minY = Math.min(coords.y1, coords.y2);
        let maxY = Math.max(coords.y1, coords.y2);

        if (this.type === 'longPosition' || this.type === 'shortPosition') {
            if (this._p2) {
                const y2 = safePriceToCoordinate(this._series, this._p2.price);
                if (y2 !== null) { minY = Math.min(minY, y2); maxY = Math.max(maxY, y2); }
            }
            if (this._p3) {
                const y3 = safePriceToCoordinate(this._series, this._p3.price);
                if (y3 !== null) { minY = Math.min(minY, y3); maxY = Math.max(maxY, y3); }
            }
        } else if (this.type === 'trendline' || this.type === 'ray') {
            minX -= 10; maxX += 10; minY -= 10; maxY += 10;
        }

        return px >= minX && px <= maxX && py >= minY && py <= maxY;
    }

    shift(dLogical, dPrice) {
        if (!this._chart || !this._series) return;
        const timeScale = this._chart.timeScale();
        
        const shiftPoint = (p) => {
            if (!p) return null;
            const x = this.timeToX(p.time);
            if (x === null) return p;
            const logical = timeScale.coordinateToLogical(x);
            if (logical === null) return p;
            
            const newLogical = logical + dLogical;
            let time;
            if (typeof window.state !== 'undefined' && window.state.charts && typeof DrawingManager !== 'undefined') {
                const chartData = Object.values(window.state.charts).find(cd => cd.chart === this._chart);
                if (chartData && chartData.cachedData) {
                    time = DrawingManager.getTimeFromLogical(chartData, newLogical);
                }
            }
            if (!time) return p; // fallback if couldn't resolve time
            
            return { time, price: p.price + dPrice };
        };

        if (this._p1) this._p1 = shiftPoint(this._p1);
        if (this._p2) this._p2 = shiftPoint(this._p2);
        if (this._p3) this._p3 = shiftPoint(this._p3);
        
        this.updateAllViews();
    }
}


// ── TRENDLINE ────────────────────────────────────────────────────────────────

class TrendlineRenderer {
    constructor(source) { this._source = source; }
    draw(target) {
        target.useMediaCoordinateSpace((scope) => {
            const coords = this._source._getCoords();
            if (!coords) return;
            const ctx = scope.context;
            ctx.beginPath();
            ctx.moveTo(coords.x1, coords.y1);
            ctx.lineTo(coords.x2, coords.y2);
            ctx.strokeStyle = this._source.color;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw anchor points
            ctx.fillStyle = this._source.color;
            ctx.beginPath(); ctx.arc(coords.x1, coords.y1, 4, 0, 2*Math.PI); ctx.fill();
            if (this._source._p2) {
                ctx.beginPath(); ctx.arc(coords.x2, coords.y2, 4, 0, 2*Math.PI); ctx.fill();
            }
        });
    }
}

class TrendlineView {
    constructor(source) { this._source = source; }
    zOrder() { return 'top'; }
    renderer() { return new TrendlineRenderer(this._source); }
}

class TrendlinePrimitive extends DrawingBase {
    constructor(id) {
        super(id);
        this.type = 'trendline';
        this.paneView = new TrendlineView(this);
    }
}

// ── RECTANGLE ────────────────────────────────────────────────────────────────

class RectangleRenderer {
    constructor(source) { this._source = source; }
    draw(target) {
        target.useMediaCoordinateSpace((scope) => {
            const coords = this._source._getCoords();
            if (!coords || !this._source._p2) return;
            const ctx = scope.context;
            
            const w = coords.x2 - coords.x1;
            const h = coords.y2 - coords.y1;

            ctx.fillStyle = this._source.color + '33'; // 20% opacity
            ctx.fillRect(coords.x1, coords.y1, w, h);

            ctx.strokeStyle = this._source.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(coords.x1, coords.y1, w, h);
        });
    }
}

class RectangleView {
    constructor(source) { this._source = source; }
    zOrder() { return 'normal'; }
    renderer() { return new RectangleRenderer(this._source); }
}

class RectanglePrimitive extends DrawingBase {
    constructor(id) {
        super(id);
        this.type = 'rectangle';
        this.paneView = new RectangleView(this);
    }
}

// ── FIBONACCI ────────────────────────────────────────────────────────────────

class FibRenderer {
    constructor(source) { this._source = source; }
    draw(target) {
        target.useMediaCoordinateSpace((scope) => {
            const coords = this._source._getCoords();
            if (!coords || !this._source._p2) return;
            const ctx = scope.context;

            const levels = [
                { ratio: 0, color: '#787b86' },
                { ratio: 0.236, color: '#f44336' },
                { ratio: 0.382, color: '#81c784' },
                { ratio: 0.5, color: '#4caf50' },
                { ratio: 0.618, color: '#009688' },
                { ratio: 0.786, color: '#64b5f6' },
                { ratio: 1, color: '#787b86' }
            ];

            const startX = Math.min(coords.x1, coords.x2) - 50;
            const endX = Math.max(coords.x1, coords.x2) + 50;
            const diffY = coords.y2 - coords.y1;

            ctx.font = '10px Arial';
            ctx.textBaseline = 'middle';
            
            levels.forEach(lvl => {
                const y = coords.y1 + (diffY * lvl.ratio);
                
                // Draw fill area to previous level
                if (lvl.ratio > 0) {
                    const prevLvl = levels[levels.indexOf(lvl)-1];
                    const prevY = coords.y1 + (diffY * prevLvl.ratio);
                    ctx.fillStyle = lvl.color + '1A'; // 10% opacity
                    ctx.fillRect(startX, Math.min(y, prevY), endX - startX, Math.abs(y - prevY));
                }

                ctx.beginPath();
                ctx.moveTo(startX, y);
                ctx.lineTo(endX, y);
                ctx.strokeStyle = lvl.color;
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.fillStyle = lvl.color;
                ctx.fillText(lvl.ratio.toString(), startX + 5, y - 8);
            });

            // Trendline connecting points
            ctx.beginPath();
            ctx.setLineDash([5, 5]);
            ctx.moveTo(coords.x1, coords.y1);
            ctx.lineTo(coords.x2, coords.y2);
            ctx.strokeStyle = '#787b86';
            ctx.stroke();
            ctx.setLineDash([]);
        });
    }
}

class FibView {
    constructor(source) { this._source = source; }
    zOrder() { return 'normal'; }
    renderer() { return new FibRenderer(this._source); }
}

class FibonacciPrimitive extends DrawingBase {
    constructor(id) {
        super(id);
        this.type = 'fibonacci';
        this.paneView = new FibView(this);
    }
}

// ── TEXT ─────────────────────────────────────────────────────────────────────

class TextRenderer {
    constructor(source) { this._source = source; }
    draw(target) {
        target.useMediaCoordinateSpace((scope) => {
            const coords = this._source._getCoords();
            if (!coords) return;
            const ctx = scope.context;

            ctx.font = '14px Arial';
            ctx.fillStyle = this._source.color;
            ctx.textBaseline = 'middle';
            
            // Background box
            const text = this._source.text || "Text";
            const textWidth = ctx.measureText(text).width;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
            ctx.fillRect(coords.x1 - 5, coords.y1 - 15, textWidth + 10, 30);
            
            ctx.strokeStyle = this._source.color;
            ctx.strokeRect(coords.x1 - 5, coords.y1 - 15, textWidth + 10, 30);

            ctx.fillStyle = this._source.color;
            ctx.fillText(text, coords.x1, coords.y1);
        });
    }
}

class TextView {
    constructor(source) { this._source = source; }
    zOrder() { return 'top'; }
    renderer() { return new TextRenderer(this._source); }
}

class TextPrimitive extends DrawingBase {
    constructor(id) {
        super(id);
        this.type = 'text';
        this.text = "Custom Text";
        this.paneView = new TextView(this);
    }
}

// ── LONG POSITION ─────────────────────────────────────────────────────────────
// 3-click: click1=entry, click2=target, click3=stop

class LongPositionRenderer {
    constructor(source) { this._source = source; }

    _drawLabel(ctx, text, x, y, w, bgColor, textColor) {
        const pad = 4;
        ctx.font = 'bold 10px -apple-system, Arial, sans-serif';
        const tw = ctx.measureText(text).width;
        const bx = x + pad;
        const bw = Math.min(tw + pad * 2, w - pad * 2);
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx, y - 9, bw, 18, 3);
        else ctx.rect(bx, y - 9, bw, 18);
        ctx.fill();
        ctx.fillStyle = textColor;
        ctx.textBaseline = 'middle';
        ctx.fillText(text, bx + pad, y);
    }

    draw(target) {
        target.useMediaCoordinateSpace((scope) => {
            const s = this._source;
            if (!s._chart || !s._series || !s._p1) return;
            const ctx = scope.context;

            const x1 = s.timeToX(s._p1.time);
            const yEntry = safePriceToCoordinate(s._series, s._p1.price);
            if (x1 === null || yEntry === null) return;

            // x2 and target
            let x2 = x1 + 120;
            let yTarget = yEntry - 60;
            let yStop = yEntry + 40;

            if (s._p2) {
                x2 = s.timeToX(s._p2.time) ?? x2;
                yTarget = safePriceToCoordinate(s._series, s._p2.price) ?? yTarget;
            }
            if (s._p3) {
                yStop = safePriceToCoordinate(s._series, s._p3.price) ?? yStop;
            }

            const xL = Math.min(x1, x2);
            const xR = Math.max(x1, x2);
            const w = xR - xL;

            // Target box (green)
            ctx.fillStyle = 'rgba(34,197,94,0.18)';
            ctx.fillRect(xL, Math.min(yTarget, yEntry), w, Math.abs(yEntry - yTarget));
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(xL, Math.min(yTarget, yEntry), w, Math.abs(yEntry - yTarget));

            // Stop box (red)
            ctx.fillStyle = 'rgba(239,68,68,0.18)';
            ctx.fillRect(xL, Math.min(yEntry, yStop), w, Math.abs(yStop - yEntry));
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(xL, Math.min(yEntry, yStop), w, Math.abs(yStop - yEntry));

            // Entry line (dashed)
            ctx.beginPath();
            ctx.setLineDash([5, 3]);
            ctx.moveTo(xL, yEntry);
            ctx.lineTo(xR, yEntry);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);

            // Labels: Target ABOVE green box, Stop BELOW red box
            const ep = s._p1.price;
            const tp = s._p2 ? s._p2.price : ep;
            const slp = s._p3 ? s._p3.price : ep;
            const tPct = ep > 0 ? ((tp - ep) / ep * 100).toFixed(3) : '—';
            const slPct = ep > 0 ? ((ep - slp) / ep * 100).toFixed(3) : '—';
            const rr = slp !== ep ? Math.abs((tp - ep) / (ep - slp)).toFixed(2) : '—';
            const fmt = (p) => p >= 1 ? p.toFixed(2) : p.toPrecision(4);

            const yTargetTop = Math.min(yTarget, yEntry); // top edge of green box
            const yStopBot   = Math.max(yEntry, yStop);   // bottom edge of red box

            if (s._p2) {
                // Target label sits just above the green box
                this._drawLabel(ctx,
                    `Target: ${fmt(tp)} (${tPct}%)`,
                    xL, yTargetTop - 9, w,
                    '#22c55e', '#fff');
            }
            if (s._p3) {
                // Stop label sits just below the red box
                this._drawLabel(ctx,
                    `Stop: ${fmt(slp)} (${slPct}%)`,
                    xL, yStopBot + 9, w,
                    '#ef4444', '#fff');
                if (s._p2) {
                    // R/R sits on the entry dashed line
                    this._drawLabel(ctx,
                        `R/R: ${rr}`,
                        xL, yEntry, w,
                        '#1e293b', '#94a3b8');
                }
            }

            // Anchor dots
            ctx.fillStyle = '#60a5fa';
            s.getHandles().forEach(h => {
                ctx.beginPath(); ctx.arc(h.x, h.y, 4, 0, 2*Math.PI); ctx.fill();
            });
        });
    }
}
class LongPositionView {
    constructor(s) { this._source = s; }
    zOrder() { return 'normal'; }
    renderer() { return new LongPositionRenderer(this._source); }
}
class LongPositionPrimitive extends DrawingBase {
    constructor(id) {
        super(id);
        this.type = 'longPosition';
        this._p3 = null;
        this.paneView = new LongPositionView(this);
    }
    setP3(time, price) {
        this._p3 = { time, price };
        this.updateAllViews();
    }
    getHandles() {
        if (!this._chart || !this._series) return [];
        const handles = [];
        const toX = t => this.timeToX(t);
        const toY = p => safePriceToCoordinate(this._series, p);
        if (this._p1 && this._p2 && this._p3) {
            const x1 = toX(this._p1.time);
            let x2 = toX(this._p2.time);
            if (x2 === null && x1 !== null) x2 = x1 + 120;

            const yE = toY(this._p1.price);
            const yT = toY(this._p2.price);
            const yS = toY(this._p3.price);
            
            if (x1 !== null && x2 !== null && yE !== null && yT !== null && yS !== null) {
                const xM = (x1 + x2) / 2;
                handles.push({ name: 'entryLeft', x: x1, y: yE });
                handles.push({ name: 'entryRight', x: x2, y: yE });
                handles.push({ name: 'targetTop', x: xM, y: yT });
                handles.push({ name: 'stopBottom', x: xM, y: yS });
                handles.push({ name: 'entryCenter', x: xM, y: yE });
            }
        } else if (this._p1) {
            const x = toX(this._p1.time), y = toY(this._p1.price);
            if (x !== null && y !== null) handles.push({ name: 'entryLeft', x, y });
        }
        return handles;
    }
    setHandle(name, time, price) {
        if (name === 'entryLeft') {
            const dPrice = price - this._p1.price;
            this.setP1(time, price);
            if (this._p2) this.setP2(this._p2.time, this._p2.price + dPrice);
            if (this._p3) this.setP3(this._p3.time, this._p3.price + dPrice);
        }
        else if (name === 'entryRight') {
            const dPrice = price - this._p1.price;
            this.setP1(this._p1.time, price);
            if (this._p2) this.setP2(time, this._p2.price + dPrice);
            if (this._p3) this.setP3(time, this._p3.price + dPrice);
        }
        else if (name === 'targetTop') this.setP2(this._p2.time, price);
        else if (name === 'stopBottom') this.setP3(this._p3.time, price);
        else if (name === 'entryCenter') {
            const dPrice = price - this._p1.price;
            this.setP1(this._p1.time, price);
            this.setP2(this._p2.time, this._p2.price + dPrice);
            this.setP3(this._p3.time, this._p3.price + dPrice);
        }
    }
}

// ── SHORT POSITION ────────────────────────────────────────────────────────────
class ShortPositionRenderer extends LongPositionRenderer {
    draw(target) {
        target.useMediaCoordinateSpace((scope) => {
            const s = this._source;
            if (!s._chart || !s._series || !s._p1) return;
            const ctx = scope.context;

            const x1 = s.timeToX(s._p1.time);
            const yEntry = safePriceToCoordinate(s._series, s._p1.price);
            if (x1 === null || yEntry === null) return;

            let x2 = x1 + 120;
            let yTarget = yEntry + 60; // short target is BELOW entry
            let yStop = yEntry - 40;   // short stop is ABOVE entry

            if (s._p2) {
                x2 = s.timeToX(s._p2.time) ?? x2;
                yTarget = safePriceToCoordinate(s._series, s._p2.price) ?? yTarget;
            }
            if (s._p3) {
                yStop = safePriceToCoordinate(s._series, s._p3.price) ?? yStop;
            }
            
            if (s.lastError) {
                ctx.fillStyle = 'red';
                ctx.font = '14px Arial';
                ctx.fillText("ERR: " + s.lastError, x1, yEntry - 20);
            }

            const xL = Math.min(x1, x2);
            const xR = Math.max(x1, x2);
            const w = xR - xL;

            // Target box (red for short)
            ctx.fillStyle = 'rgba(239,68,68,0.18)';
            ctx.fillRect(xL, Math.min(yTarget, yEntry), w, Math.abs(yEntry - yTarget));
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(xL, Math.min(yTarget, yEntry), w, Math.abs(yEntry - yTarget));

            // Stop box (green for short)
            ctx.fillStyle = 'rgba(34,197,94,0.18)';
            ctx.fillRect(xL, Math.min(yEntry, yStop), w, Math.abs(yStop - yEntry));
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(xL, Math.min(yEntry, yStop), w, Math.abs(yStop - yEntry));

            ctx.beginPath();
            ctx.setLineDash([5, 3]);
            ctx.moveTo(xL, yEntry);
            ctx.lineTo(xR, yEntry);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);

            // Labels: Target BELOW red box (short), Stop ABOVE green box
            const ep = s._p1.price;
            const tp = s._p2 ? s._p2.price : ep;
            const slp = s._p3 ? s._p3.price : ep;
            const tPct = ep > 0 ? ((ep - tp) / ep * 100).toFixed(3) : '—';
            const slPct = ep > 0 ? ((slp - ep) / ep * 100).toFixed(3) : '—';
            const rr = slp !== ep ? Math.abs((ep - tp) / (slp - ep)).toFixed(2) : '—';
            const fmt = (p) => p >= 1 ? p.toFixed(2) : p.toPrecision(4);

            const yTargetBot = Math.max(yTarget, yEntry); // bottom of red target box
            const yStopTop   = Math.min(yEntry, yStop);   // top of green stop box

            if (s._p2) {
                // Target label just below the red box
                this._drawLabel(ctx,
                    `Target: ${fmt(tp)} (${tPct}%)`,
                    xL, yTargetBot + 9, w,
                    '#ef4444', '#fff');
            }
            if (s._p3) {
                // Stop label just above the green box
                this._drawLabel(ctx,
                    `Stop: ${fmt(slp)} (${slPct}%)`,
                    xL, yStopTop - 9, w,
                    '#22c55e', '#fff');
                if (s._p2) {
                    this._drawLabel(ctx,
                        `R/R: ${rr}`,
                        xL, yEntry, w,
                        '#1e293b', '#94a3b8');
                }
            }

            ctx.fillStyle = '#f87171';
            s.getHandles().forEach(h => {
                ctx.beginPath(); ctx.arc(h.x, h.y, 4, 0, 2*Math.PI); ctx.fill();
            });
        });
    }
}
class ShortPositionView {
    constructor(s) { this._source = s; }
    zOrder() { return 'normal'; }
    renderer() { return new ShortPositionRenderer(this._source); }
}
class ShortPositionPrimitive extends DrawingBase {
    constructor(id) {
        super(id);
        this.type = 'shortPosition';
        this._p3 = null;
        this.paneView = new ShortPositionView(this);
    }
    setP3(time, price) {
        this._p3 = { time, price };
        this.updateAllViews();
    }
    getHandles() {
        if (!this._chart || !this._series) return [];
        const handles = [];
        const toX = t => this.timeToX(t);
        const toY = p => safePriceToCoordinate(this._series, p);
        if (this._p1) {
            const x = toX(this._p1.time), y = toY(this._p1.price);
            if (x !== null && y !== null) handles.push({ name: 'p1', x, y });
        }
        if (this._p2) {
            let x = toX(this._p2.time);
            if (x === null) {
                const x1 = toX(this._p1.time);
                if (x1 !== null) x = x1 + 120;
            }
            const y = toY(this._p2.price);
            if (x !== null && y !== null) handles.push({ name: 'p2', x, y });
        }
        if (this._p3) {
            let x = this._p2 ? toX(this._p2.time) : toX(this._p3.time);
            if (x === null) {
                const x1 = toX(this._p1.time);
                if (x1 !== null) x = x1 + 120;
            }
            const y = toY(this._p3.price);
            if (x !== null && y !== null) handles.push({ name: 'p3', x, y });
        }
        return handles;
    }
    setHandle(name, time, price) {
        if (name === 'p1') this.setP1(time, price);
        else if (name === 'p2') this.setP2(time, price);
        else if (name === 'p3') this.setP3(this._p2 ? this._p2.time : time, price);
    }
}

// ── PRICE RANGE ───────────────────────────────────────────────────────────────
class PriceRangeRenderer {
    constructor(source) { this._source = source; }
    draw(target) {
        target.useMediaCoordinateSpace((scope) => {
            const s = this._source;
            const coords = s._getCoords();
            if (!coords || !s._p2) return;
            const ctx = scope.context;

            const xL = Math.min(coords.x1, coords.x2);
            const xR = Math.max(coords.x1, coords.x2);
            const yTop = Math.min(coords.y1, coords.y2);
            const yBot = Math.max(coords.y1, coords.y2);
            const w = xR - xL;
            const h = yBot - yTop;

            // Box fill
            ctx.fillStyle = 'rgba(99,102,241,0.12)';
            ctx.fillRect(xL, yTop, w, h);
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(xL, yTop, w, h);

            // Vertical arrow
            const mx = (xL + xR) / 2;
            ctx.beginPath();
            ctx.moveTo(mx, yTop + 2);
            ctx.lineTo(mx, yBot - 2);
            ctx.strokeStyle = '#818cf8';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Arrowheads
            ctx.fillStyle = '#818cf8';
            [[mx, yTop + 2, -1],[mx, yBot - 2, 1]].forEach(([ax, ay, dir]) => {
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.lineTo(ax - 5, ay + dir * 8);
                ctx.lineTo(ax + 5, ay + dir * 8);
                ctx.closePath();
                ctx.fill();
            });

            // Label
            const p1 = s._p1.price;
            const p2 = s._p2.price;
            const diff = Math.abs(p2 - p1);
            const pct = p1 > 0 ? (diff / p1 * 100).toFixed(3) : '—';
            const fmt = (p) => p >= 1 ? p.toFixed(2) : p.toPrecision(4);
            const label = `${fmt(diff)}  (${pct}%)`;

            ctx.font = 'bold 11px -apple-system, Arial, sans-serif';
            const tw = ctx.measureText(label).width;
            const lx = mx - tw / 2 - 6;
            const ly = yTop - 14;
            ctx.fillStyle = 'rgba(99,102,241,0.85)';
            if (ctx.roundRect) ctx.roundRect(lx, ly - 10, tw + 12, 20, 4);
            else ctx.rect(lx, ly - 10, tw + 12, 20);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, lx + 6, ly);

            // Corner dots
            ctx.fillStyle = '#818cf8';
            [[xL, yTop],[xR, yBot]].forEach(([cx, cy]) => {
                ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 2*Math.PI); ctx.fill();
            });
        });
    }
}
class PriceRangeView {
    constructor(s) { this._source = s; }
    zOrder() { return 'normal'; }
    renderer() { return new PriceRangeRenderer(this._source); }
}
class PriceRangePrimitive extends DrawingBase {
    constructor(id) {
        super(id);
        this.type = 'priceRange';
        this.paneView = new PriceRangeView(this);
    }
}

// Export mapping
window.DrawingPrimitives = {
    TrendlinePrimitive,
    RectanglePrimitive,
    FibonacciPrimitive,
    TextPrimitive,
    LongPositionPrimitive,
    ShortPositionPrimitive,
    PriceRangePrimitive
};

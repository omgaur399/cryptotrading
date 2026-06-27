import sys

content = """// drawing-primitives.js
// Custom Drawing Tools using Lightweight Charts v4 Primitive API

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
        return [this.paneView].filter(Boolean);
    }

    setP1(time, price) {
        this._p1 = { time, price };
        this.updateAllViews();
    }

    setP2(time, price) {
        this._p2 = { time, price };
        this.updateAllViews();
    }

    _getCoords() {
        if (!this._chart || !this._series || !this._p1) return null;
        const x1 = this._chart.timeScale().timeToCoordinate(this._p1.time);
        const y1 = this._series.priceToCoordinate(this._p1.price);
        if (x1 === null || y1 === null) return null;

        let x2 = x1, y2 = y1;
        if (this._p2) {
            x2 = this._chart.timeScale().timeToCoordinate(this._p2.time);
            y2 = this._series.priceToCoordinate(this._p2.price);
            if (x2 === null || y2 === null) { x2 = x1; y2 = y1; }
        }
        return { x1, y1, x2, y2 };
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

// Export mapping
window.DrawingPrimitives = {
    TrendlinePrimitive,
    RectanglePrimitive,
    FibonacciPrimitive,
    TextPrimitive
};
"""

with open('drawing-primitives.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Created drawing-primitives.js")

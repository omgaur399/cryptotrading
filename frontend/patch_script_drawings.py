import sys

with open('script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject DrawingManager
dm_code = """
class DrawingManager {
    constructor() {
        this.activeTool = null;
        this.activeDrawing = null;
        this.chartDrawings = {};
    }
    
    setTool(tool) {
        this.activeTool = tool;
        if (this.activeDrawing && (!tool || tool !== this.activeDrawing.type)) {
            this.activeDrawing = null;
        }
    }
    
    handleClick(chartData, param) {
        if (!param.time || !param.point) return;
        const price = chartData.candleSeries.coordinateToPrice(param.point.y);
        if (price === null) return;
        
        if (!this.activeDrawing && this.activeTool) {
            let primitive;
            if (this.activeTool === 'trendline') primitive = new DrawingPrimitives.TrendlinePrimitive();
            else if (this.activeTool === 'rectangle') primitive = new DrawingPrimitives.RectanglePrimitive();
            else if (this.activeTool === 'fibonacci') primitive = new DrawingPrimitives.FibonacciPrimitive();
            else if (this.activeTool === 'text') primitive = new DrawingPrimitives.TextPrimitive();
            
            if (primitive) {
                primitive.setP1(param.time, price);
                this.activeDrawing = primitive;
                chartData.candleSeries.attachPrimitive(primitive);
                
                if (!this.chartDrawings[chartData.id]) this.chartDrawings[chartData.id] = [];
                this.chartDrawings[chartData.id].push(primitive);
                
                if (this.activeTool === 'text') {
                    const txt = prompt("Enter text:", "Text");
                    if (txt) {
                        primitive.text = txt;
                    } else {
                        chartData.candleSeries.detachPrimitive(primitive);
                        this.chartDrawings[chartData.id].pop();
                    }
                    this.activeDrawing = null;
                    setDrawingTool('cursor');
                }
            }
        } else if (this.activeDrawing) {
            this.activeDrawing.setP2(param.time, price);
            this.activeDrawing.isFinished = true;
            this.activeDrawing = null;
            setDrawingTool('cursor');
        }
    }
    
    handleCrosshairMove(chartData, param) {
        if (!this.activeDrawing) return;
        if (!param.time || !param.point) return;
        const price = chartData.candleSeries.coordinateToPrice(param.point.y);
        if (price === null) return;
        this.activeDrawing.setP2(param.time, price);
    }
    
    clearDrawings(chartData) {
        if (this.chartDrawings[chartData.id]) {
            this.chartDrawings[chartData.id].forEach(prim => {
                try { chartData.candleSeries.detachPrimitive(prim); } catch(e) {}
            });
            this.chartDrawings[chartData.id] = [];
        }
    }
}
window.drawingManager = new DrawingManager();
"""
state_end = "};\n"
idx = content.find(state_end) + len(state_end)
content = content[:idx] + dm_code + content[idx:]

# 2. Patch setDrawingTool
old_set_tool = """function setDrawingTool(tool) {
    const buttons = document.querySelectorAll('.toolbar-btn');
    buttons.forEach(btn => {
        if (btn.dataset.tool === tool) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const mode = tool === "cursor" ? null : tool;
    Object.values(state.charts).forEach(chartData => {
        chartData.drawingMode = mode;
        const container = document.getElementById(`${chartData.id}-container`);
        if (container) {
            container.style.cursor = mode ? "crosshair" : "default";
        }
    });
}"""

new_set_tool = """function setDrawingTool(tool) {
    const buttons = document.querySelectorAll('.toolbar-btn');
    buttons.forEach(btn => {
        if (btn.dataset.tool === tool) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const isPrimitiveTool = ['trendline', 'rectangle', 'fibonacci', 'text'].includes(tool);
    if (window.drawingManager) {
        window.drawingManager.setTool(isPrimitiveTool ? tool : null);
    }

    const mode = (tool === "cursor" || isPrimitiveTool) ? null : tool;
    Object.values(state.charts).forEach(chartData => {
        chartData.drawingMode = mode;
        const container = document.getElementById(`${chartData.id}-container`);
        if (container) {
            container.style.cursor = (mode || isPrimitiveTool) ? "crosshair" : "default";
        }
    });
}"""
content = content.replace(old_set_tool, new_set_tool)

# 3. Patch clearActiveChartDrawings
old_clear = """function clearActiveChartDrawings() {
    const activeChart = state.charts[state.activeChartId];
    if (!activeChart || activeChart.symbol === "No Chart" || activeChart.symbol === "none") return;
    const symbol = activeChart.symbol;
    if (confirm(`Clear all drawings for ${symbol}?`)) {
        state.drawings[symbol] = [];
        saveDrawings();
        Object.values(state.charts).forEach(cd => {
            if (cd.symbol === symbol) {
                restoreDrawings(cd);
            }
        });
    }
}"""
new_clear = """function clearActiveChartDrawings() {
    const activeChart = state.charts[state.activeChartId];
    if (!activeChart || activeChart.symbol === "No Chart" || activeChart.symbol === "none") return;
    const symbol = activeChart.symbol;
    if (confirm(`Clear all drawings for ${symbol}?`)) {
        state.drawings[symbol] = [];
        saveDrawings();
        Object.values(state.charts).forEach(cd => {
            if (cd.symbol === symbol) {
                if (window.drawingManager) window.drawingManager.clearDrawings(cd);
                restoreDrawings(cd);
            }
        });
    }
}"""
content = content.replace(old_clear, new_clear)

# 4. Patch subscribeClick
old_click = """    chartData.chart.subscribeClick((param) => {
        if (chartData.justDragged) return; // Ignore native clicks resolving immediately after a drag
        
        if (state.replay && state.replay.status === 'selecting' && state.replay.chartId === chartData.id) {
            if (param.time) {
                startReplayAt(param.time);
            }
            return;
        }

        if (!param.point || !chartData.candleSeries) return;"""

new_click = """    chartData.chart.subscribeClick((param) => {
        if (chartData.justDragged) return; // Ignore native clicks resolving immediately after a drag
        
        if (state.replay && state.replay.status === 'selecting' && state.replay.chartId === chartData.id) {
            if (param.time) {
                startReplayAt(param.time);
            }
            return;
        }

        if (!param.point || !chartData.candleSeries) return;
        
        if (window.drawingManager && (window.drawingManager.activeTool || window.drawingManager.activeDrawing)) {
            window.drawingManager.handleClick(chartData, param);
            return;
        }"""
content = content.replace(old_click, new_click)

# 5. Patch subscribeCrosshairMove
old_move = """    if (typeof chartData.chart.subscribeCrosshairMove === "function") {
        chartData.chart.subscribeCrosshairMove((param) => {
            updateChartLegend(chartData, param);"""
new_move = """    if (typeof chartData.chart.subscribeCrosshairMove === "function") {
        chartData.chart.subscribeCrosshairMove((param) => {
            if (window.drawingManager) window.drawingManager.handleCrosshairMove(chartData, param);
            updateChartLegend(chartData, param);"""
content = content.replace(old_move, new_move)

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("script.js patched")

import re

with open('script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update setTool to applyOptions to all charts
old_setTool = """    setTool(tool) {
        this.activeTool = tool;
        if (this.activeDrawing && (!tool || tool !== this.activeDrawing.type)) {
            this.activeDrawing = null;
        }
    }"""

new_setTool = """    setTool(tool) {
        this.activeTool = tool;
        if (this.activeDrawing && (!tool || tool !== this.activeDrawing.type)) {
            this.activeDrawing = null;
        }
        
        // Disable chart panning if a tool is active
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
    }"""
content = content.replace(old_setTool, new_setTool)

# 2. Add _getEventTimePrice inside DrawingManager
helper_func = """    _getEventTimePrice(chartData, param) {
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
                    }
                }
            }
        }
        if (!time) return null;
        return { time, price };
    }

    handleClick"""
content = content.replace("    handleClick", helper_func)

# 3. Update handleClick
old_handleClick = """    handleClick(chartData, param) {
        if (!param.time || !param.point) return;
        const price = chartData.candleSeries.coordinateToPrice(param.point.y);
        if (price === null) return;"""

new_handleClick = """    handleClick(chartData, param) {
        const coords = this._getEventTimePrice(chartData, param);
        if (!coords) return;
        const { time, price } = coords;"""
content = content.replace(old_handleClick, new_handleClick)

# Update the `param.time` usages inside handleClick to `time`
handleClickBlock = content.split("    handleClick")[1].split("    handleCrosshairMove")[0]
new_handleClickBlock = handleClickBlock.replace("param.time", "time")
content = content.replace(handleClickBlock, new_handleClickBlock)

# 4. Update handleCrosshairMove
old_handleCrosshairMove = """    handleCrosshairMove(chartData, param) {
        if (!this.activeDrawing) return;
        if (!param.time || !param.point) return;
        const price = chartData.candleSeries.coordinateToPrice(param.point.y);
        if (price === null) return;
        this.activeDrawing.setP2(param.time, price);
    }"""

new_handleCrosshairMove = """    handleCrosshairMove(chartData, param) {
        if (!this.activeDrawing) return;
        const coords = this._getEventTimePrice(chartData, param);
        if (!coords) return;
        this.activeDrawing.setP2(coords.time, coords.price);
    }"""
content = content.replace(old_handleCrosshairMove, new_handleCrosshairMove)

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("script.js patched")

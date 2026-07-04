import os
import re

with open('frontend/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. restoreDrawings
old_restore = """function restoreDrawings(chartData) {
    if (chartData.renderedDrawings && chartData.candleSeries) {
        Object.values(chartData.renderedDrawings).forEach(pl => {
            if (pl) {
                if (pl instanceof HTMLElement) {
                    pl.remove();
                } else {
                    try {
                        chartData.candleSeries.removePriceLine(pl);
                    } catch(e) {}
                }
            }
        });
    }
    chartData.renderedDrawings = {};
    cleanupVerticalLines(chartData);
    
    const key = chartData.symbol;
    const lines = state.drawings[key];
    if (lines) {
        lines.forEach(lineObj => {
            if (lineObj.type === "horizontalLine") {
                renderHorizontalLine(chartData, lineObj);
            } else if (lineObj.type === "verticalLine") {
                renderVerticalLine(chartData, lineObj);
            } else if (lineObj.type === "alert") {
                renderAlertLine(chartData, lineObj);
            }
        });
        updateMarkers(chartData);
    }
}"""
new_restore = """function restoreDrawings(chartData) {
    const lines = state.drawings[chartData.symbol];
    DrawingService.restoreNativeDrawings(chartData, lines);
}"""
content = content.replace(old_restore, new_restore)


# 2. cleanupVerticalLines
# we'll regex replace to catch whatever it looks like
cleanup_rx = re.compile(r"function cleanupVerticalLines\(chartData\) \{[\s\S]*?(?=\nfunction |\n\n)")
match = cleanup_rx.search(content)
if match:
    old_cleanup = match.group(0)
    # just in case it doesn't match perfectly, we'll manually specify
    pass
else:
    # fallback
    pass

# let's just do a manual replace for the others
def replace_func(func_name, body):
    global content
    rx = re.compile(rf"function {func_name}\([^)]*\)\s*\{{([\s\S]*?)\n\}}", re.MULTILINE)
    content = rx.sub(body, content)

replace_func('cleanupVerticalLines', """function cleanupVerticalLines(chartData) {
    DrawingService.cleanupVerticalLines(chartData);
}""")
replace_func('renderHorizontalLine', """function renderHorizontalLine(chartData, lineObj) {
    DrawingService.renderHorizontalLine(chartData, lineObj);
}""")
replace_func('renderVerticalLine', """function renderVerticalLine(chartData, lineObj) {
    DrawingService.renderVerticalLine(chartData, lineObj);
}""")
replace_func('renderAlertLine', """function renderAlertLine(chartData, alertObj) {
    DrawingService.renderAlertLine(chartData, alertObj);
}""")
replace_func('updateMarkers', """function updateMarkers(chartData) {
    const drawings = state.drawings[chartData.symbol];
    DrawingService.updateMarkers(chartData, drawings);
}""")


with open('frontend/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Phase 2 done")

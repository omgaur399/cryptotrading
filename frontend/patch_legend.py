"import re

with open('script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# ── PATCH 1: Replace updateChartLegend ───────────────────────────────────────
OLD_LEGEND = '''function updateChartLegend(chartData, indexOrParam = null) {
    const container = document.getElementById(`${chartData.id}-container`);
    if (!container) return;

    let legendEl = container.querySelector(".chart-legend");
    if (!legendEl) {
        legendEl = document.createElement("div");
        legendEl.className = "chart-legend";
        container.appendChild(legendEl);
    }

    let ohlc = null;
    let volume = null;
    let smaVal = null;
    let emaVal = null;
    let bbUpper = null;
    let bbMiddle = null;
    let bbLower = null;
    let rsiVal = null;
    let vwapVal = null;
    let atrVal = null;

    const cached = chartData.cachedData || [];
    let idx = cached.length - 1;

    if (indexOrParam !== null) {
        if (typeof indexOrParam === "number") {
            idx = indexOrParam;
        } else if (indexOrParam.time) {
            const hoveredTime = indexOrParam.time;
            idx = cached.findIndex(c => c.time === hoveredTime);
            if (idx === -1) idx = cached.length - 1;
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
    }

    let ohlcHtml = "";
    if (ohlc) {
        const diff = ohlc.close - ohlc.open;
        const pct = ohlc.open ? (diff / ohlc.open) * 100 : 0;
        const colorClass = diff >= 0 ? "legend-up" : "legend-down";
        const sign = diff >= 0 ? "+" : "";

        ohlcHtml = `
            <span class="legend-symbol-name">${chartData.symbol}</span>
            <span class="legend-interval">${chartDat
<truncated 10086 bytes>
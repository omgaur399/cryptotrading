import sys

with open('script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace indRows.push logic
old_push_volume = "indRows.push({ type: 'volume', label: 'Vol', value: volFmt, color: '#8b9bb0', noSettings: true });"
new_push_volume = "indRows.push({ type: 'volume', label: 'Vol', value: volFmt, color: '#8b9bb0', noSettings: true, visible: chartData.volumeSeries ? chartData.volumeSeries.options().visible !== false : true });"
content = content.replace(old_push_volume, new_push_volume)

old_push_sma = "indRows.push({ type: 'sma', label: `SMA ${ind.smaPeriod}`, value: smaVal != null ? formatPrice(smaVal) : '—', color: ind.smaColor });"
new_push_sma = "indRows.push({ type: 'sma', label: `SMA ${ind.smaPeriod}`, value: smaVal != null ? formatPrice(smaVal) : '—', color: ind.smaColor, visible: chartData.smaSeries.options().visible !== false });"
content = content.replace(old_push_sma, new_push_sma)

old_push_ema = "indRows.push({ type: 'ema', label: `EMA ${ind.emaPeriod}`, value: emaVal != null ? formatPrice(emaVal) : '—', color: ind.emaColor });"
new_push_ema = "indRows.push({ type: 'ema', label: `EMA ${ind.emaPeriod}`, value: emaVal != null ? formatPrice(emaVal) : '—', color: ind.emaColor, visible: chartData.emaSeries.options().visible !== false });"
content = content.replace(old_push_ema, new_push_ema)

old_push_bb = "indRows.push({ type: 'bb', label: `BB ${ind.bbPeriod}`, value: bbStr, color: ind.bbColor });"
new_push_bb = "indRows.push({ type: 'bb', label: `BB ${ind.bbPeriod}`, value: bbStr, color: ind.bbColor, visible: chartData.bbUpperSeries.options().visible !== false });"
content = content.replace(old_push_bb, new_push_bb)

old_push_rsi = "indRows.push({ type: 'rsi', label: `RSI ${ind.rsiPeriod}`, value: rsiVal != null ? rsiVal.toFixed(2) : '—', color: rsiColor });"
new_push_rsi = "indRows.push({ type: 'rsi', label: `RSI ${ind.rsiPeriod}`, value: rsiVal != null ? rsiVal.toFixed(2) : '—', color: rsiColor, visible: chartData.rsiSeries.options().visible !== false });"
content = content.replace(old_push_rsi, new_push_rsi)

old_push_vwap = "indRows.push({ type: 'vwap', label: 'VWAP', value: vwapVal != null ? formatPrice(vwapVal) : '—', color: ind.vwapColor });"
new_push_vwap = "indRows.push({ type: 'vwap', label: 'VWAP', value: vwapVal != null ? formatPrice(vwapVal) : '—', color: ind.vwapColor, visible: chartData.vwapSeries.options().visible !== false });"
content = content.replace(old_push_vwap, new_push_vwap)

old_push_atr = "indRows.push({ type: 'atr', label: `ATR ${ind.atrPeriod}`, value: atrVal != null ? formatPrice(atrVal) : '—', color: ind.atrColor });"
new_push_atr = "indRows.push({ type: 'atr', label: `ATR ${ind.atrPeriod}`, value: atrVal != null ? formatPrice(atrVal) : '—', color: ind.atrColor, visible: chartData.atrSeries.options().visible !== false });"
content = content.replace(old_push_atr, new_push_atr)

# 2. Add eyeOffSvg
old_svgs = """    const eyeSvg   = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const gearSvg  = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
    const trashSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;"""

new_svgs = """    const eyeSvg   = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const eyeOffSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    const gearSvg  = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
    const trashSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;"""
content = content.replace(old_svgs, new_svgs)

# 3. Update HTML template
old_html = """                <div class="legend-ind-row" data-ind="${row.type}">
                    <span class="legend-ind-dot" style="background:${row.color};"></span>
                    <span class="legend-ind-title" style="color:${row.color};">${row.label}</span>
                    <span class="legend-ind-val">${row.value}</span>
                    <span class="legend-ind-actions">
                        <button class="legend-ind-btn" data-action="toggle" data-ind="${row.type}" title="Hide/Show">${eyeSvg}</button>"""

new_html = """                <div class="legend-ind-row" data-ind="${row.type}" style="${row.visible === false ? 'opacity: 0.5;' : ''}">
                    <span class="legend-ind-dot" style="background:${row.color};"></span>
                    <span class="legend-ind-title" style="color:${row.color};">${row.label}</span>
                    <span class="legend-ind-val">${row.value}</span>
                    <span class="legend-ind-actions">
                        <button class="legend-ind-btn" data-action="toggle" data-ind="${row.type}" title="Hide/Show">${row.visible !== false ? eyeSvg : eyeOffSvg}</button>"""
content = content.replace(old_html, new_html)

# 4. Replace toggleIndicatorVisibility
old_toggle = """function toggleIndicatorVisibility(chartData, indType) {
    if (indType === "volume") {
        chartData.indicators.volume = !chartData.indicators.volume;
        if (chartData.volumeSeries) chartData.volumeSeries.applyOptions({ visible: chartData.indicators.volume });
        updateSubchartMargins(chartData);
    } else if (indType === "sma") {
        chartData.indicators.sma = !chartData.indicators.sma;
        if (chartData.smaSeries) chartData.smaSeries.applyOptions({ visible: chartData.indicators.sma });
    } else if (indType === "ema") {
        chartData.indicators.ema = !chartData.indicators.ema;
        if (chartData.emaSeries) chartData.emaSeries.applyOptions({ visible: chartData.indicators.ema });
    } else if (indType === "bb") {
        chartData.indicators.bb = !chartData.indicators.bb;
        const visible = chartData.indicators.bb;
        if (chartData.bbUpperSeries) chartData.bbUpperSeries.applyOptions({ visible });
        if (chartData.bbMiddleSeries) chartData.bbMiddleSeries.applyOptions({ visible });
        if (chartData.bbLowerSeries) chartData.bbLowerSeries.applyOptions({ visible });
    } else if (indType === "rsi") {
        chartData.indicators.rsi = !chartData.indicators.rsi;
        if (chartData.rsiSeries) chartData.rsiSeries.applyOptions({ visible: chartData.indicators.rsi });
        updateSubchartMargins(chartData);
    } else if (indType === "vwap") {
        chartData.indicators.vwap = !chartData.indicators.vwap;
        if (chartData.vwapSeries) chartData.vwapSeries.applyOptions({ visible: chartData.indicators.vwap });
    } else if (indType === "atr") {
        chartData.indicators.atr = !chartData.indicators.atr;
        if (chartData.atrSeries) chartData.atrSeries.applyOptions({ visible: chartData.indicators.atr });
        updateSubchartMargins(chartData);
    }
    saveLayoutState();
    updateChartLegend(chartData);
}"""

new_toggle = """function toggleIndicatorVisibility(chartData, indType) {
    if (indType === "volume" && chartData.volumeSeries) {
        const v = !chartData.volumeSeries.options().visible;
        chartData.volumeSeries.applyOptions({ visible: v });
        updateSubchartMargins(chartData);
    } else if (indType === "sma" && chartData.smaSeries) {
        chartData.smaSeries.applyOptions({ visible: !chartData.smaSeries.options().visible });
    } else if (indType === "ema" && chartData.emaSeries) {
        chartData.emaSeries.applyOptions({ visible: !chartData.emaSeries.options().visible });
    } else if (indType === "bb" && chartData.bbUpperSeries) {
        const v = !chartData.bbUpperSeries.options().visible;
        chartData.bbUpperSeries.applyOptions({ visible: v });
        if (chartData.bbMiddleSeries) chartData.bbMiddleSeries.applyOptions({ visible: v });
        if (chartData.bbLowerSeries) chartData.bbLowerSeries.applyOptions({ visible: v });
    } else if (indType === "rsi" && chartData.rsiSeries) {
        const v = !chartData.rsiSeries.options().visible;
        chartData.rsiSeries.applyOptions({ visible: v });
        updateSubchartMargins(chartData);
    } else if (indType === "vwap" && chartData.vwapSeries) {
        chartData.vwapSeries.applyOptions({ visible: !chartData.vwapSeries.options().visible });
    } else if (indType === "atr" && chartData.atrSeries) {
        const v = !chartData.atrSeries.options().visible;
        chartData.atrSeries.applyOptions({ visible: v });
        updateSubchartMargins(chartData);
    }
    updateChartLegend(chartData);
}"""

content = content.replace(old_toggle, new_toggle)

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated visibility logic!")

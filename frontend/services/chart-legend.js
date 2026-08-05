const ChartLegendService = (function() {
    let deps = {};

    function initialize(injectedDeps) {
        deps = injectedDeps;
    }

    const eyeSvg   = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const eyeOffSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    const gearSvg  = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
    const trashSvg = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

    function getFormatPrice(val) {
        return (deps.formatPrice || window.formatPrice)(val);
    }

    function getTimeUtils() {
        return deps.TimeUtils || window.TimeUtils;
    }

    function getOverlayService() {
        return deps.OverlayService || window.OverlayService;
    }

    function getLayoutService() {
        return deps.LayoutService || window.LayoutService;
    }

    function getIndicatorService() {
        return deps.IndicatorService || window.IndicatorService;
    }

    function updateChartLegend(chartData, indexOrParam = null) {
        const container = document.getElementById(`${chartData.id}-container`);
        if (!container) return;

        let legendEl = container.querySelector(".chart-legend");
        if (!legendEl) {
            legendEl = document.createElement("div");
            legendEl.className = "chart-legend";
            container.appendChild(legendEl);
            
            legendEl.addEventListener('click', (e) => {
                const btn = e.target.closest('.legend-ind-btn');
                if (!btn) return;
                const action = btn.dataset.action;
                const indType = btn.dataset.ind;
                
                if (action === 'toggle') {
                    toggleIndicatorVisibility(chartData, indType);
                } else if (action === 'settings') {
                    if (deps.openSettingsModal) {
                        deps.openSettingsModal(chartData, indType);
                    } else if (typeof openSettingsModal === 'function') {
                        openSettingsModal(chartData, indType);
                    }
                } else if (action === 'delete') {
                    chartData.indicators[indType] = false;
                    if (indType === 'volume' && chartData.volumeSeries) {
                        chartData.candleSeries.priceScale().applyOptions({ autoScale: true });
                        chartData.volumeSeries.applyOptions({ visible: false });
                    } else if (indType === 'sma1' && chartData.smaSeries1) {
                        chartData.smaSeries1.applyOptions({ visible: false });
                        chartData.indicators.sma = false;
                    } else if (indType === 'sma2' && chartData.smaSeries2) {
                        chartData.smaSeries2.applyOptions({ visible: false });
                    } else if (indType === 'sma3' && chartData.smaSeries3) {
                        chartData.smaSeries3.applyOptions({ visible: false });
                    } else if (indType === 'ema1' && chartData.emaSeries1) {
                        chartData.emaSeries1.applyOptions({ visible: false });
                        chartData.indicators.ema = false;
                    } else if (indType === 'ema2' && chartData.emaSeries2) {
                        chartData.emaSeries2.applyOptions({ visible: false });
                    } else if (indType === 'ema3' && chartData.emaSeries3) {
                        chartData.emaSeries3.applyOptions({ visible: false });
                    } else if (indType === 'bb') {
                        if (chartData.bbUpperSeries) chartData.bbUpperSeries.applyOptions({ visible: false });
                        if (chartData.bbMiddleSeries) chartData.bbMiddleSeries.applyOptions({ visible: false });
                        if (chartData.bbLowerSeries) chartData.bbLowerSeries.applyOptions({ visible: false });
                    } else if (indType === 'rsi' && chartData.rsiSeries) {
                        chartData.rsiSeries.applyOptions({ visible: false });
                    } else if (indType === 'vwap' && chartData.vwapSeries) {
                        chartData.vwapSeries.applyOptions({ visible: false });
                    } else if (indType === 'atr' && chartData.atrSeries) {
                        chartData.atrSeries.applyOptions({ visible: false });
                    } else if (indType === 'vpvr') {
                        if (deps.updateVpvrMarginAndScroll) {
                            deps.updateVpvrMarginAndScroll(chartData);
                        } else if (typeof updateVpvrMarginAndScroll === 'function') {
                            updateVpvrMarginAndScroll(chartData);
                        }
                    } else if (indType === 'sessions') {
                        const overlay = getOverlayService();
                        if (overlay && overlay.SessionBands) overlay.SessionBands.clear(chartData);
                    }
                    
                    const pane = document.getElementById(chartData.id);
                    const select = pane ? pane.querySelector('.indicator-select') : null;
                    if (select) {
                        if (indType === 'volume') select.options[1].text = `Volume (Off)`;
                        else if (indType === 'sma1') select.options[2].text = `SMA 1 (${chartData.indicators.sma1Period}) (Off)`;
                        else if (indType === 'sma2') select.options[3].text = `SMA 2 (${chartData.indicators.sma2Period}) (Off)`;
                        else if (indType === 'sma3') select.options[4].text = `SMA 3 (${chartData.indicators.sma3Period}) (Off)`;
                        else if (indType === 'ema1') select.options[5].text = `EMA 1 (${chartData.indicators.ema1Period}) (Off)`;
                        else if (indType === 'ema2') select.options[6].text = `EMA 2 (${chartData.indicators.ema2Period}) (Off)`;
                        else if (indType === 'ema3') select.options[7].text = `EMA 3 (${chartData.indicators.ema3Period}) (Off)`;
                        else if (indType === 'bb') select.options[8].text = `BB ${chartData.indicators.bbPeriod} (Off)`;
                        else if (indType === 'rsi') select.options[9].text = `RSI ${chartData.indicators.rsiPeriod} (Off)`;
                        else if (indType === 'vwap') select.options[10].text = `VWAP (Off)`;
                        else if (indType === 'atr') select.options[11].text = `ATR ${chartData.indicators.atrPeriod} (Off)`;
                        else if (indType === 'vpvr') select.options[12].text = `Vol Profile (Off)`;
                        else if (indType === 'sessions') select.options[13].text = `Sessions (Off)`;
                    }

                    const layout = getLayoutService();
                    if (layout && layout.updateSubchartMargins) layout.updateSubchartMargins(chartData);

                    if (deps.saveLayoutState) {
                        deps.saveLayoutState();
                    } else if (typeof saveLayoutState === 'function') {
                        saveLayoutState();
                    }
                    
                    delete legendEl.dataset.structKey;
                    updateChartLegend(chartData);
                }
            });
        }

        let ohlc = null;
        let volume = null;
        let timeVal = null;

        const cached = chartData.cachedData || [];
        let idx = cached.length - 1;

        let paramHasData = false;
        let seriesDataMap = null;

        if (indexOrParam !== null) {
            if (typeof indexOrParam === "number") {
                idx = indexOrParam;
            } else if (indexOrParam.time) {
                const hoveredTime = indexOrParam.time;
                idx = cached.findIndex(c => c.time === hoveredTime);
                if (idx === -1) idx = cached.length - 1;
                if (indexOrParam.seriesData) {
                    paramHasData = true;
                    seriesDataMap = indexOrParam.seriesData;
                }
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
            timeVal = bar.time;
        }

        let sma1Val = null, sma2Val = null, sma3Val = null;
        let ema1Val = null, ema2Val = null, ema3Val = null;
        let bbUpper = null, bbMiddle = null, bbLower = null;
        let rsiVal = null;
        let vwapVal = null;
        let atrVal = null;

        const calcSMA = deps.calculateLatestSMA || (typeof calculateLatestSMA === 'function' ? calculateLatestSMA : null);
        const calcEMA = deps.calculateLatestEMA || (typeof calculateLatestEMA === 'function' ? calculateLatestEMA : null);
        const calcRSI = deps.calculateLatestRSI || (typeof calculateLatestRSI === 'function' ? calculateLatestRSI : null);
        const calcVWAP = deps.calculateLatestVWAP || (typeof calculateLatestVWAP === 'function' ? calculateLatestVWAP : null);
        const calcATR = deps.calculateLatestATR || (typeof calculateLatestATR === 'function' ? calculateLatestATR : null);
        const calcBB = deps.calculateLatestBB || (typeof calculateLatestBB === 'function' ? calculateLatestBB : null);

        if (paramHasData) {
            if (chartData.smaSeries1) { const d = seriesDataMap.get(chartData.smaSeries1); sma1Val = d ? (d.value !== undefined ? d.value : d) : null; }
            if (chartData.smaSeries2) { const d = seriesDataMap.get(chartData.smaSeries2); sma2Val = d ? (d.value !== undefined ? d.value : d) : null; }
            if (chartData.smaSeries3) { const d = seriesDataMap.get(chartData.smaSeries3); sma3Val = d ? (d.value !== undefined ? d.value : d) : null; }
            if (chartData.emaSeries1) { const d = seriesDataMap.get(chartData.emaSeries1); ema1Val = d ? (d.value !== undefined ? d.value : d) : null; }
            if (chartData.emaSeries2) { const d = seriesDataMap.get(chartData.emaSeries2); ema2Val = d ? (d.value !== undefined ? d.value : d) : null; }
            if (chartData.emaSeries3) { const d = seriesDataMap.get(chartData.emaSeries3); ema3Val = d ? (d.value !== undefined ? d.value : d) : null; }
            if (chartData.rsiSeries) { const d = seriesDataMap.get(chartData.rsiSeries); rsiVal = d ? (d.value !== undefined ? d.value : d) : null; }
            if (chartData.vwapSeries) { const d = seriesDataMap.get(chartData.vwapSeries); vwapVal = d ? (d.value !== undefined ? d.value : d) : null; }
            if (chartData.atrSeries) { const d = seriesDataMap.get(chartData.atrSeries); atrVal = d ? (d.value !== undefined ? d.value : d) : null; }
            if (chartData.bbUpperSeries && chartData.bbMiddleSeries && chartData.bbLowerSeries) {
                const u = seriesDataMap.get(chartData.bbUpperSeries); bbUpper = u ? (u.value !== undefined ? u.value : u) : null;
                const m = seriesDataMap.get(chartData.bbMiddleSeries); bbMiddle = m ? (m.value !== undefined ? m.value : m) : null;
                const l = seriesDataMap.get(chartData.bbLowerSeries); bbLower = l ? (l.value !== undefined ? l.value : l) : null;
            }
        } else {
            if (chartData.indicators.sma1 && calcSMA) sma1Val = calcSMA(chartData.cachedData, chartData.indicators.sma1Period)?.value;
            if (chartData.indicators.sma2 && calcSMA) sma2Val = calcSMA(chartData.cachedData, chartData.indicators.sma2Period)?.value;
            if (chartData.indicators.sma3 && calcSMA) sma3Val = calcSMA(chartData.cachedData, chartData.indicators.sma3Period)?.value;
            if (chartData.indicators.ema1 && calcEMA) ema1Val = calcEMA(chartData.cachedData, chartData.indicators.ema1Period)?.value;
            if (chartData.indicators.ema2 && calcEMA) ema2Val = calcEMA(chartData.cachedData, chartData.indicators.ema2Period)?.value;
            if (chartData.indicators.ema3 && calcEMA) ema3Val = calcEMA(chartData.cachedData, chartData.indicators.ema3Period)?.value;
            if (chartData.indicators.rsi && calcRSI) rsiVal = calcRSI(chartData.cachedData, chartData.indicators.rsiPeriod)?.value;
            if (chartData.indicators.vwap && calcVWAP) vwapVal = calcVWAP(chartData.cachedData, chartData.interval)?.value;
            if (chartData.indicators.atr && calcATR) atrVal = calcATR(chartData.cachedData, chartData.indicators.atrPeriod)?.value;
            if (chartData.indicators.bb && calcBB) {
                const bb = calcBB(chartData.cachedData, chartData.indicators.bbPeriod, chartData.indicators.bbStdDev);
                if (bb) { bbUpper = bb.upper?.value; bbMiddle = bb.middle?.value; bbLower = bb.lower?.value; }
            }
        }

        let ohlcHtml = "";
        let diff = 0, pct = 0, colorClass = "", sign = "", formattedTime = "";
        const timeUtils = getTimeUtils();
        if (ohlc) {
            diff = ohlc.close - ohlc.open;
            pct = ohlc.open ? (diff / ohlc.open) * 100 : 0;
            colorClass = diff >= 0 ? "legend-up" : "legend-down";
            sign = diff >= 0 ? "+" : "";
            formattedTime = timeUtils && timeUtils.formatTooltip ? timeUtils.formatTooltip(timeVal) : '';

            ohlcHtml = `
                <span class="legend-symbol-name">${chartData.symbol}</span>
                <span class="legend-interval">${chartData.interval}</span>
                <span class="legend-ohlc-label">O</span><span class="legend-ohlc-val ${colorClass}">${getFormatPrice(ohlc.open)}</span>
                <span class="legend-ohlc-label">H</span><span class="legend-ohlc-val ${colorClass}">${getFormatPrice(ohlc.high)}</span>
                <span class="legend-ohlc-label">L</span><span class="legend-ohlc-val ${colorClass}">${getFormatPrice(ohlc.low)}</span>
                <span class="legend-ohlc-label">C</span><span class="legend-ohlc-val ${colorClass}">${getFormatPrice(ohlc.close)}</span>
                <span class="legend-ohlc-val ${colorClass}">${sign}${getFormatPrice(diff)} (${sign}${pct.toFixed(2)}%)</span>
                <span class="legend-ohlc-val" style="color: var(--muted); margin-left: 8px;">${formattedTime}</span>
            `;
        } else {
            ohlcHtml = `<span class="legend-symbol-name">${chartData.symbol === 'none' ? 'No Chart' : chartData.symbol}</span>`;
        }

        let indRows = [];
        const ind = chartData.indicators;
        
        if (ind && ind.volume) {
            indRows.push({ type: 'volume', label: 'Vol', value: volume != null ? getFormatPrice(volume) : '—', color: '#8b9bb0', noSettings: true, visible: chartData.volumeSeries ? chartData.volumeSeries.options().visible !== false : true });
        }
        if (ind && ind.sma1) {
            indRows.push({ type: 'sma1', label: `SMA 1 (${ind.sma1Period})`, value: sma1Val != null ? getFormatPrice(sma1Val) : '—', color: ind.sma1Color, visible: chartData.smaSeries1 ? chartData.smaSeries1.options().visible !== false : true });
        }
        if (ind && ind.sma2) {
            indRows.push({ type: 'sma2', label: `SMA 2 (${ind.sma2Period})`, value: sma2Val != null ? getFormatPrice(sma2Val) : '—', color: ind.sma2Color, visible: chartData.smaSeries2 ? chartData.smaSeries2.options().visible !== false : true });
        }
        if (ind && ind.sma3) {
            indRows.push({ type: 'sma3', label: `SMA 3 (${ind.sma3Period})`, value: sma3Val != null ? getFormatPrice(sma3Val) : '—', color: ind.sma3Color, visible: chartData.smaSeries3 ? chartData.smaSeries3.options().visible !== false : true });
        }
        if (ind && ind.ema1) {
            indRows.push({ type: 'ema1', label: `EMA 1 (${ind.ema1Period})`, value: ema1Val != null ? getFormatPrice(ema1Val) : '—', color: ind.ema1Color, visible: chartData.emaSeries1 ? chartData.emaSeries1.options().visible !== false : true });
        }
        if (ind && ind.ema2) {
            indRows.push({ type: 'ema2', label: `EMA 2 (${ind.ema2Period})`, value: ema2Val != null ? getFormatPrice(ema2Val) : '—', color: ind.ema2Color, visible: chartData.emaSeries2 ? chartData.emaSeries2.options().visible !== false : true });
        }
        if (ind && ind.ema3) {
            indRows.push({ type: 'ema3', label: `EMA 3 (${ind.ema3Period})`, value: ema3Val != null ? getFormatPrice(ema3Val) : '—', color: ind.ema3Color, visible: chartData.emaSeries3 ? chartData.emaSeries3.options().visible !== false : true });
        }
        if (ind && ind.bb) {
            const bbStr = bbMiddle != null ? `${getFormatPrice(bbUpper)}, ${getFormatPrice(bbMiddle)}, ${getFormatPrice(bbLower)}` : '—';
            indRows.push({ type: 'bb', label: `BB ${ind.bbPeriod}`, value: bbStr, color: ind.bbColor, visible: chartData.bbUpperSeries ? chartData.bbUpperSeries.options().visible !== false : true });
        }
        if (ind && ind.rsi) {
            indRows.push({ type: 'rsi', label: `RSI ${ind.rsiPeriod}`, value: rsiVal != null ? rsiVal.toFixed(2) : '—', color: ind.rsiColor, visible: chartData.rsiSeries ? chartData.rsiSeries.options().visible !== false : true });
        }
        if (ind && ind.vwap) {
            indRows.push({ type: 'vwap', label: 'VWAP', value: vwapVal != null ? getFormatPrice(vwapVal) : '—', color: ind.vwapColor, visible: chartData.vwapSeries ? chartData.vwapSeries.options().visible !== false : true });
        }
        if (ind && ind.atr) {
            indRows.push({ type: 'atr', label: `ATR ${ind.atrPeriod}`, value: atrVal != null ? getFormatPrice(atrVal) : '—', color: ind.atrColor, visible: chartData.atrSeries ? chartData.atrSeries.options().visible !== false : true });
        }
        if (ind && ind.vpvr) {
            const pocVal = chartData.vpvrPocPrice != null ? getFormatPrice(chartData.vpvrPocPrice) : '—';
            indRows.push({ type: 'vpvr', label: 'VPVR', value: `POC: ${pocVal}`, color: '#facc15', noSettings: true, visible: chartData.indicators.vpvrVisible !== false });
        }
        if (ind && ind.sessions) {
            let sessionsVal = '—';
            if (timeVal) {
                const d = new Date(timeVal * 1000);
                const y = d.getUTCFullYear();
                const m = d.getUTCMonth();
                const dateNum = d.getUTCDate();
                
                const active = [];
                const sessionsList = typeof SESSIONS !== 'undefined' ? SESSIONS : (deps.SESSIONS || []);
                for (const session of sessionsList) {
                    const startUtc = Date.UTC(y, m, dateNum, session.startH, 0, 0) / 1000;
                    const endUtc   = Date.UTC(y, m, dateNum, session.endH,   0, 0) / 1000;
                    if (timeVal >= startUtc && timeVal <= endUtc) {
                        active.push(session.name);
                    }
                }
                sessionsVal = active.length > 0 ? active.join(', ') : 'None';
            }
            indRows.push({ type: 'sessions', label: 'Sessions', value: sessionsVal, color: '#60a5fa', noSettings: true, visible: chartData.indicators.sessionsVisible !== false });
        }

        const structKey = chartData.symbol + '_' + chartData.interval + '_' + (ohlc !== null) + '_' + JSON.stringify(indRows.map(r => r.type + r.visible + r.color + r.label));
        
        if (legendEl.dataset.structKey === structKey) {
            if (ohlc) {
                const ohlcVals = legendEl.querySelectorAll('.legend-ohlc-val');
                if (ohlcVals.length === 6) {
                    ohlcVals[0].textContent = getFormatPrice(ohlc.open);
                    ohlcVals[1].textContent = getFormatPrice(ohlc.high);
                    ohlcVals[2].textContent = getFormatPrice(ohlc.low);
                    ohlcVals[3].textContent = getFormatPrice(ohlc.close);
                    ohlcVals[4].textContent = `${sign}${getFormatPrice(diff)} (${sign}${pct.toFixed(2)}%)`;
                    ohlcVals[5].textContent = formattedTime;
                    for(let i=0; i<5; i++) {
                        ohlcVals[i].className = `legend-ohlc-val ${colorClass}`;
                    }
                }
            }
            
            indRows.forEach(row => {
                if (row.value !== '—' || indexOrParam !== null) {
                    const valEl = legendEl.querySelector(`.legend-ind-row[data-ind="${row.type}"] .legend-ind-val`);
                    if (valEl) valEl.textContent = row.value;
                }
            });
            return;
        }
        
        legendEl.dataset.structKey = structKey;

        let indicatorsHtml = "";
        if (indRows.length > 0) {
            indicatorsHtml = `<div class="indicators-list">` + indRows.map(row => `
                <div class="legend-ind-row" data-ind="${row.type}" style="${row.visible === false ? 'opacity: 0.5;' : ''}">
                    <span class="legend-ind-dot" style="background:${row.color};"></span>
                    <span class="legend-ind-title" style="color:${row.color};">${row.label}</span>
                    <span class="legend-ind-val">${row.value}</span>
                    <span class="legend-ind-actions">
                        <button class="legend-ind-btn" data-action="toggle" data-ind="${row.type}" title="Hide/Show">${row.visible !== false ? eyeSvg : eyeOffSvg}</button>
                        ${!row.noSettings ? `<button class="legend-ind-btn" data-action="settings" data-ind="${row.type}" title="Settings">${gearSvg}</button>` : ''}
                        <button class="legend-ind-btn trash-btn" data-action="delete" data-ind="${row.type}" title="Delete">${trashSvg}</button>
                    </span>
                </div>
            `).join('') + `</div>`;
        }

        legendEl.innerHTML = `
            <div class="legend-row main-ohlc">${ohlcHtml}</div>
            ${indicatorsHtml}
        `;
    }

    function toggleIndicatorVisibility(chartData, indType) {
        if (indType === "vpvr") {
            chartData.indicators.vpvrVisible = (chartData.indicators.vpvrVisible !== false) ? false : true;
            if (deps.updateVpvrMarginAndScroll) {
                deps.updateVpvrMarginAndScroll(chartData);
            } else if (typeof updateVpvrMarginAndScroll === 'function') {
                updateVpvrMarginAndScroll(chartData);
            }
        } else if (indType === "sessions") {
            chartData.indicators.sessionsVisible = (chartData.indicators.sessionsVisible !== false) ? false : true;
            const overlay = getOverlayService();
            const canvas = overlay && overlay.SessionBands ? overlay.SessionBands.ensureCanvas(chartData) : null;
            if (canvas) canvas.style.display = chartData.indicators.sessionsVisible ? 'block' : 'none';
            if (chartData.indicators.sessionsVisible) {
                if (overlay && overlay.SessionBands) overlay.SessionBands.draw(chartData);
            } else {
                if (overlay && overlay.SessionBands) overlay.SessionBands.clear(chartData);
            }
        } else {
            const indSvc = getIndicatorService();
            if (indSvc && indSvc.toggleIndicatorVisibility) {
                indSvc.toggleIndicatorVisibility(chartData, indType);
            }
            if (indType === "volume" || indType === "rsi" || indType === "atr") {
                const layout = getLayoutService();
                if (layout && layout.updateSubchartMargins) layout.updateSubchartMargins(chartData);
            }
        }
        updateChartLegend(chartData);
    }

    function updateTicker(chartData, price, reference) {
        const pane = document.getElementById(chartData.id);
        if (!pane) return;
        
        if (price === null) {
            pane.querySelector(".ticker-symbol").textContent = chartData.symbol === "No Chart" ? "No Chart" : `${chartData.symbol} ${chartData.interval}`;
            pane.querySelector(".ticker-price").textContent = "--";
            pane.querySelector(".ticker-price").className = "ticker-price";
            pane.querySelector(".ticker-change").textContent = "--";
            pane.querySelector(".ticker-change").className = "ticker-change";
            return;
        }

        const direction = reference === null || price >= reference ? "up" : "down";
        const change = reference ? ((price - reference) / reference) * 100 : 0;

        pane.querySelector(".ticker-symbol").textContent = `${chartData.symbol} ${chartData.interval}`;
        pane.querySelector(".ticker-price").textContent = getFormatPrice(price);
        pane.querySelector(".ticker-price").className = `ticker-price ${direction}`;
        pane.querySelector(".ticker-change").textContent = `${change >= 0 ? "+" : ""}${change.toFixed(2)}% (${chartData.interval})`;
        pane.querySelector(".ticker-change").className = `ticker-change ${direction}`;
    }

    function flashTicker(chartId, direction) {
        if (document.hidden) return;
        const ticker = document.getElementById(`${chartId}-ticker`);
        if (!ticker) return;
        const flashClass = direction === "up" ? "flash-up" : "flash-down";
        
        ticker.classList.remove("flash-up", "flash-down");
        
        setTimeout(() => {
            ticker.classList.add(flashClass);
        }, 10);
    }

    function setPaneMessage(chartId, message) {
        const container = document.getElementById(`${chartId}-container`);
        if (!container) return;
        let messageEl = container.querySelector(".chart-message");
        if (!messageEl) {
            messageEl = document.createElement("div");
            messageEl.className = "chart-message";
            messageEl.style.pointerEvents = "none";
            container.appendChild(messageEl);
        }
        messageEl.textContent = message;
    }

    function clearPaneMessage(chartId) {
        const messageEl = document.querySelector(`#${chartId}-container .chart-message`);
        if (messageEl) messageEl.remove();
    }

    function updateCountdowns() {
        if (document.hidden) return;
        const now = Date.now();
        const st = deps.state || window.state;
        if (st && st.charts) {
            Object.values(st.charts).forEach(chartData => {
                updateChartCountdown(chartData, now);
            });
        }
    }

    function updateChartCountdown(chartData, now = Date.now()) {
        let timerEl = document.getElementById(`${chartData.id}-timer`);
        
        if (!timerEl) {
            const container = document.getElementById(`${chartData.id}-container`);
            if (!container) return;
            timerEl = document.createElement("div");
            timerEl.id = `${chartData.id}-timer`;
            timerEl.className = "countdown-timer";
            container.appendChild(timerEl);
        }

        if (!chartData.candleSeries || chartData.lastPrice === null) {
            timerEl.classList.remove("show");
            return;
        }

        const getCdMs = deps.getCountdownMs || window.getCountdownMs;
        const remaining = getCdMs ? getCdMs(chartData.interval, now) : null;
        if (remaining === null) {
            timerEl.classList.remove("show");
            return;
        }

        const y = chartData.candleSeries.priceToCoordinate(chartData.lastPrice);
        if (y === null || y < 0) {
            timerEl.classList.remove("show");
            return;
        }

        const scaleWidth = chartData.chart.priceScale('right').width();
        if (scaleWidth > 0) {
            timerEl.style.width = `${scaleWidth}px`;
        }

        const timerHeight = 22; 
        timerEl.style.top = `${y - (timerHeight / 2)}px`;
        
        const priceStr = getFormatPrice(chartData.lastPrice);
        const fmtCountdown = deps.formatCountdown || window.formatCountdown;
        const timerStr = fmtCountdown ? fmtCountdown(remaining) : '';
        
        timerEl.innerHTML = `<span>${priceStr}</span><span class="timer-val">${timerStr}</span>`;

        timerEl.classList.remove('up', 'down');
        timerEl.classList.add(chartData.lastDirection);
        timerEl.classList.add("show");
    }

    function updateConnectionStatus() {
        const st = deps.state || window.state;
        if (!st) return;

        const isSSEConnected = st.liveStream && st.liveStream.readyState === 1;
        const isWSConnected = st.hlWs && st.hlWs.readyState === 1;
        const isBinanceConnected = st.binanceWs && st.binanceWs.readyState === 1;
        const isConnected = isSSEConnected || isWSConnected || isBinanceConnected;
        const wasConnected = st.connected;
        st.connected = isConnected;
        
        const status = document.getElementById("connection-status");
        if (status) {
            if (isSSEConnected && (isWSConnected || isBinanceConnected)) {
                status.textContent = "Live connected (All)";
            } else if (isSSEConnected) {
                status.textContent = "Live connected (Stocks)";
            } else if (isWSConnected || isBinanceConnected) {
                status.textContent = "Live connected (Crypto)";
            } else {
                status.textContent = "Live disconnected";
            }
            status.className = `status-indicator ${isConnected ? "connected" : "disconnected"}`;
        }
        
        if (isConnected && !wasConnected && st.charts) {
            const chartDataSvc = deps.ChartDataService || window.ChartDataService;
            if (chartDataSvc && chartDataSvc.Live && chartDataSvc.Live.subscribe) {
                Object.values(st.charts).forEach(chartDataSvc.Live.subscribe);
            }
        }
    }

    function setDataStatus(message) {
        const el = document.getElementById("data-status");
        if (el) el.textContent = message;
    }

    function updateTimestamp() {
        const timeEl = document.getElementById("timestamp-time");
        const timeUtils = getTimeUtils();
        if (timeEl && timeUtils) {
            timeEl.textContent = new Date().toLocaleTimeString("en-IN", { timeZone: timeUtils.timeZone, hour12: true }).toLowerCase();
        }
    }

    // Explicitly preserve required compatibility globals used across services
    window.setPaneMessage = setPaneMessage;
    window.clearPaneMessage = clearPaneMessage;

    return {
        initialize,
        updateLegend: updateChartLegend,
        toggleIndicatorVisibility,
        updateTicker,
        flashTicker,
        setPaneMessage,
        clearPaneMessage,
        updateCountdowns,
        updateChartCountdown,
        updateConnectionStatus,
        setDataStatus,
        updateTimestamp
    };
})();

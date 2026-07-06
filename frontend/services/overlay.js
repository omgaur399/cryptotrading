const OverlayService = (() => {
    const vpState = new WeakMap();
    const sessionState = new WeakMap();

    const VolumeProfile = {
        ensureCanvas: function(chartData) {

    const container = document.getElementById(`${chartData.id}-container`);
    if (!container) return null;
    let canvas = container.querySelector('.vp-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'vp-canvas';
        canvas.style.cssText = `
            position:absolute; top:0; left:0; width:100%; height:100%;
            pointer-events:none; z-index:30;
        `;
        container.appendChild(canvas);
    }
    return canvas;

        },
        clear: function(chartData) {

    const container = document.getElementById(`${chartData.id}-container`);
    if (!container) return;
    const canvas = container.querySelector('.vp-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

        },
        draw: function(chartData) {
            if (!vpState.has(chartData)) vpState.set(chartData, {});
            const state = vpState.get(chartData);

    if (!chartData.chart || !chartData.candleSeries) return;
    if (chartData.indicators.vpvr === false || chartData.indicators.vpvrVisible === false) {
        this.clear(chartData);
        return;
    }
    const candles = chartData.cachedData;
    if (!candles || candles.length === 0) return;

    const canvas = this.ensureCanvas(chartData);
    if (!canvas) return;

    const container = document.getElementById(`${chartData.id}-container`);
    const rect = container.getBoundingClientRect();
    canvas.width  = rect.width  * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width  = rect.width  + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Use only visible candles for VPVR (visible range)
    let visibleCandles = candles;
    try {
        const lr = chartData.chart.timeScale().getVisibleLogicalRange();
        if (lr) {
            const from = Math.max(0, Math.floor(lr.from));
            const to   = Math.min(candles.length - 1, Math.ceil(lr.to));
            if (to > from) visibleCandles = candles.slice(from, to + 1);
        }
    } catch(e) {}

    // Price range from visible candles
    const priceHigh = Math.max(...visibleCandles.map(c => c.high));
    const priceLow  = Math.min(...visibleCandles.map(c => c.low));
    if (priceHigh <= priceLow) { ctx.restore(); return; }

    const bucketSize = (priceHigh - priceLow) / VP_BUCKETS;

    // Initialise buckets
    const buy  = new Float64Array(VP_BUCKETS);
    const sell = new Float64Array(VP_BUCKETS);

    // Distribute volume uniformly between low and high of each candle
    for (const c of visibleCandles) {
        const vol  = c.volume || 0;
        if (vol <= 0) continue;
        const isBuy = c.close >= c.open;
        const lo = Math.min(c.low,  priceHigh); // clamp
        const hi = Math.min(c.high, priceHigh);
        const bStart = Math.max(0, Math.floor((lo - priceLow) / bucketSize));
        const bEnd   = Math.min(VP_BUCKETS - 1, Math.floor((hi - priceLow) / bucketSize));
        const spread = Math.max(1, bEnd - bStart + 1);
        const perBucket = vol / spread;
        for (let b = bStart; b <= bEnd; b++) {
            if (isBuy)  buy[b]  += perBucket;
            else        sell[b] += perBucket;
        }
    }

    // Totals & max for scaling
    const total = new Float64Array(VP_BUCKETS);
    let maxVol = 0, pocIdx = 0;
    for (let b = 0; b < VP_BUCKETS; b++) {
        total[b] = buy[b] + sell[b];
        if (total[b] > maxVol) { maxVol = total[b]; pocIdx = b; }
    }
    if (maxVol === 0) { ctx.restore(); return; }

    // Chart geometry — right-aligned, inside price scale area
    let rightScaleW = 50;
    try {
        const w = chartData.chart.priceScale('right').width();
        if (w > 10 && w < 200) rightScaleW = w;
    } catch(e) {}
    const maxBarW = rect.width * VP_WIDTH_PCT;
    const barRight = rect.width - rightScaleW; // bars end at left edge of price scale

    ctx.globalAlpha = VP_OPACITY;

    for (let b = 0; b < VP_BUCKETS; b++) {
        if (total[b] === 0) continue;

        const bucketPrice = priceLow + b * bucketSize;
        const bucketPriceTop = bucketPrice + bucketSize;

        const yBot = chartData.candleSeries.priceToCoordinate(bucketPrice);
        const yTop = chartData.candleSeries.priceToCoordinate(bucketPriceTop);
        if (yBot === null || yTop === null) continue;

        const barH = Math.max(1, Math.abs(yBot - yTop) - 0.5);
        const yDraw = Math.min(yBot, yTop);

        const totalW = (total[b] / maxVol) * maxBarW;
        const buyW   = (buy[b]  / maxVol) * maxBarW;

        // Sell (red) portion
        if (sell[b] > 0) {
            ctx.fillStyle = VP_SELL_COLOR;
            ctx.fillRect(barRight - totalW, yDraw, totalW - buyW, barH);
        }
        // Buy (green) portion on top
        if (buy[b] > 0) {
            ctx.fillStyle = VP_BUY_COLOR;
            ctx.fillRect(barRight - buyW, yDraw, buyW, barH);
        }
    }

    // POC line — horizontal yellow dash across the full bar
    const pocPrice = priceLow + pocIdx * bucketSize + bucketSize / 2;
    chartData.vpvrPocPrice = pocPrice;
    const pocY = chartData.candleSeries.priceToCoordinate(pocPrice);
    if (pocY !== null) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = VP_POC_COLOR;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(barRight - maxBarW, pocY);
        ctx.lineTo(barRight, pocY);
        ctx.stroke();
        ctx.setLineDash([]);

        // POC label
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.fillStyle = VP_POC_COLOR;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('POC', barRight - maxBarW - 2, pocY);
    }

    ctx.restore();

    // Re-subscribe to time/price scale changes to keep VP in sync with panning/zooming
    if (!state.subscribed) {
        state.subscribed = true;
        chartData.chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
            if (chartData.indicators.vpvr) OverlayService.VolumeProfile.draw(chartData);
        });
        // Watch container resize
        if (!state.resizeObs) {
            state.resizeObs = new ResizeObserver(() => {
                if (chartData.indicators.vpvr) OverlayService.VolumeProfile.draw(chartData);
            });
            state.resizeObs.observe(container);
        }
    }

        }
    };

    const SessionBands = {
        ensureCanvas: function(chartData) {

    const container = document.getElementById(`${chartData.id}-container`);
    if (!container) return null;
    let canvas = container.querySelector('.session-canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'session-canvas';
        canvas.style.cssText = `
            position:absolute; top:0; left:0; width:100%; height:100%;
            pointer-events:none; z-index:5;
        `;
        container.appendChild(canvas);
    }
    return canvas;

        },
        clear: function(chartData) {

    const container = document.getElementById(`${chartData.id}-container`);
    if (!container) return;
    const canvas = container.querySelector('.session-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

        },
        draw: function(chartData) {
            if (!sessionState.has(chartData)) sessionState.set(chartData, {});
            const state = sessionState.get(chartData);

    if (!chartData.chart || !chartData.cachedData || chartData.cachedData.length === 0) return;
    if (chartData.indicators.sessions === false || chartData.indicators.sessionsVisible === false) {
        this.clear(chartData);
        return;
    }

    // Only draw for appropriate timeframes
    if (!SESSION_MIN_INTERVALS.includes(chartData.interval)) {
        this.clear(chartData);
        return;
    }

    const canvas = this.ensureCanvas(chartData);
    if (!canvas) return;

    const container = document.getElementById(`${chartData.id}-container`);
    const rect = container.getBoundingClientRect();
    canvas.width  = rect.width  * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width  = rect.width  + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const timeScale = chartData.chart.timeScale();
    const candles   = chartData.cachedData;

    // Get visible logical range
    let from = 0, to = candles.length - 1;
    try {
        const lr = timeScale.getVisibleLogicalRange();
        if (lr) {
            from = Math.max(0, Math.floor(lr.from));
            to   = Math.min(candles.length - 1, Math.ceil(lr.to));
        }
    } catch(e) {}

    // Build a set of unique calendar dates visible on screen
    const seenDates = new Set();
    for (let i = from; i <= to; i++) {
        const c = candles[i];
        if (!c) continue;
        const tMs = typeof c.time === 'object'
            ? Date.UTC(c.time.year, c.time.month - 1, c.time.day)
            : c.time * 1000;
        const d = new Date(tMs);
        const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
        seenDates.add(key);
    }

    // For each visible date, draw session bands + boundary markers
    const nowSec = Date.now() / 1000;
    // Extrapolate the x-pixel for "now" — timeToCoordinate(now) returns null
    // in the rightOffset gap, so we calculate it from the candle bar spacing.
    let chartRight = rect.width - 60; // safe fallback
    if (candles.length >= 2) {
        const cA = candles[candles.length - 2];
        const cB = candles[candles.length - 1];
        const tA = typeof cA.time === 'object'
            ? Date.UTC(cA.time.year, cA.time.month - 1, cA.time.day) / 1000 : cA.time;
        const tB = typeof cB.time === 'object'
            ? Date.UTC(cB.time.year, cB.time.month - 1, cB.time.day) / 1000 : cB.time;
        const xA = timeScale.timeToCoordinate(tA);
        const xB = timeScale.timeToCoordinate(tB);
        if (xA !== null && xB !== null && tB > tA) {
            const pxPerSec = (xB - xA) / (tB - tA);
            chartRight = xB + (nowSec - tB) * pxPerSec;
        }
    }

    for (const dateKey of seenDates) {
        const [y, m, d] = dateKey.split('-').map(Number);

        for (const session of SESSIONS) {
            const startUtc = Date.UTC(y, m, d, session.startH, 0, 0) / 1000;
            const endUtc   = Date.UTC(y, m, d, session.endH,   0, 0) / 1000;

            // Skip sessions entirely in the past or future (outside chart window)
            if (endUtc < (candles[from] ? (typeof candles[from].time === 'object'
                ? Date.UTC(candles[from].time.year, candles[from].time.month - 1, candles[from].time.day) / 1000
                : candles[from].time) : 0)) continue;

            const x1Raw = timeScale.timeToCoordinate(startUtc);
            const x2Raw = timeScale.timeToCoordinate(endUtc);

            // If the session is entirely off-screen (both null) skip it —
            // UNLESS it is currently active (spans the right edge into the future)
            const isActive = startUtc <= nowSec && endUtc >= nowSec;
            if (x1Raw === null && x2Raw === null && !isActive) continue;

            // Clamp off-screen edges:
            //  • start off left  → clamp to 0
            //  • end off right (future) → clamp to chart right edge
            const left  = x1Raw !== null ? x1Raw : 0;
            const right = x2Raw !== null ? x2Raw : chartRight;
            const width = right - left;
            if (width < 1) continue;

            // ── Background shading ────────────────────────────────────────
            ctx.fillStyle = session.color;
            ctx.fillRect(left, 0, width, rect.height);

            // ── Vertical dashed boundary line at session OPEN ─────────────
            // (only draw if the open is actually visible on screen)
            if (x1Raw !== null) {
                const lineColor = session.color.replace('0.06', '0.5');
                ctx.save();
                ctx.strokeStyle = lineColor;
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 4]);
                ctx.beginPath();
                ctx.moveTo(left, 0);
                ctx.lineTo(left, rect.height);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }

            // ── Pill label just above the time axis (bottom of chart) ─────
            if (width > 28) {
                const pillH   = 14;
                const pillY   = rect.height - pillH - 2;
                const pillPad = 5;
                const label   = isActive ? `${session.name} ●` : session.name;

                ctx.font = `bold 8px Inter, sans-serif`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                const textW = ctx.measureText(label).width;
                const pillW = textW + pillPad * 2;

                // Anchor pill at start of session (clamp to avoid overflow)
                const pillX = Math.max(2, Math.min(left + 2, rect.width - pillW - 4));

                // Pill background
                const bgColor = session.color.replace('0.06', isActive ? '0.32' : '0.22');
                ctx.fillStyle = bgColor;
                ctx.beginPath();
                ctx.roundRect(pillX, pillY, pillW, pillH, 3);
                ctx.fill();

                // Pill border (brighter for active session)
                ctx.strokeStyle = session.color.replace('0.06', isActive ? '0.85' : '0.55');
                ctx.lineWidth = isActive ? 1.2 : 0.8;
                ctx.stroke();

                // Pill text
                ctx.fillStyle = session.color.replace('0.06', '0.95');
                ctx.fillText(label, pillX + pillPad, pillY + pillH / 2);
            }
        }
    }

    ctx.restore();

    // Subscribe to time scale changes once
    if (!state.subscribed) {
        state.subscribed = true;
        chartData.chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
            if (chartData.indicators.sessions) OverlayService.SessionBands.draw(chartData);
        });
        if (!state.resizeObs) {
            state.resizeObs = new ResizeObserver(() => {
                if (chartData.indicators.sessions) OverlayService.SessionBands.draw(chartData);
            });
            state.resizeObs.observe(container);
        }
    }

        }
    };

    return {
        VolumeProfile,
        SessionBands
    };
})();

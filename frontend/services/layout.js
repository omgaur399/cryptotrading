const LayoutService = (() => {
    function createChartPane(chartData, index) {
        const pane = document.createElement("section");
        pane.className = "chart-pane";
        pane.id = chartData.id;

        const volText = chartData.indicators.volume ? "On" : "Off";
        const sma1Text = chartData.indicators.sma1 ? "On" : "Off";
        const sma2Text = chartData.indicators.sma2 ? "On" : "Off";
        const sma3Text = chartData.indicators.sma3 ? "On" : "Off";
        const ema1Text = chartData.indicators.ema1 ? "On" : "Off";
        const ema2Text = chartData.indicators.ema2 ? "On" : "Off";
        const ema3Text = chartData.indicators.ema3 ? "On" : "Off";
        const bbText = chartData.indicators.bb ? "On" : "Off";
        const rsiText = chartData.indicators.rsi ? "On" : "Off";
        const vwapText = chartData.indicators.vwap ? "On" : "Off";
        const atrText = chartData.indicators.atr ? "On" : "Off";

        pane.innerHTML = `
            <div class="pane-header" id="${chartData.id}-ticker">
                <div class="pane-ticker">
                    <span class="ticker-symbol">Pane ${index}</span>
                    <button class="pane-watchlist-btn" title="Add to Watchlist" data-chart-id="${chartData.id}">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <span class="ticker-price">--</span>
                    <span class="ticker-change">--</span>
                </div>
                <div class="pane-controls">
                    <div class="symbol-select-container">
                        <input type="text" class="symbol-select-input" placeholder="Search..." aria-label="Symbol Search" autocomplete="off">
                        <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        <div class="custom-select-dropdown"></div>
                    </div>
                    <select class="pane-select chart-type-select" aria-label="Chart Type" title="Chart Type">
                        <option value="candles">Candles</option>
                        <option value="heikinAshi">HA</option>
                        <option value="line">Line</option>
                        <option value="bar">Bar</option>
                    </select>
                    <select class="pane-select interval-select" aria-label="Timeframe"></select>
                    <select class="pane-select indicator-select" aria-label="Indicators" title="Indicators">
                        <option value="" disabled selected>ƒx</option>
                        <option value="volume">Volume (${volText})</option>
                        <option value="sma1">SMA 1 (${chartData.indicators.sma1Period}) (${sma1Text})</option>
                        <option value="sma2">SMA 2 (${chartData.indicators.sma2Period}) (${sma2Text})</option>
                        <option value="sma3">SMA 3 (${chartData.indicators.sma3Period}) (${sma3Text})</option>
                        <option value="ema1">EMA 1 (${chartData.indicators.ema1Period}) (${ema1Text})</option>
                        <option value="ema2">EMA 2 (${chartData.indicators.ema2Period}) (${ema2Text})</option>
                        <option value="ema3">EMA 3 (${chartData.indicators.ema3Period}) (${ema3Text})</option>
                        <option value="bb">BB ${chartData.indicators.bbPeriod} (${bbText})</option>
                        <option value="rsi">RSI ${chartData.indicators.rsiPeriod} (${rsiText})</option>
                        <option value="vwap">VWAP (${vwapText})</option>
                        <option value="atr">ATR ${chartData.indicators.atrPeriod} (${atrText})</option>
                        <option value="vpvr">Vol Profile (${chartData.indicators.vpvr ? 'On' : 'Off'})</option>
                        <option value="sessions">Sessions (${chartData.indicators.sessions ? 'On' : 'Off'})</option>
                    </select>
                    <button class="settings-btn" id="${chartData.id}-screenshot" title="Take Screenshot">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                    </button>
                    <button class="settings-btn" id="${chartData.id}-replay-toggle" title="Market Replay">
                        ⏪
                    </button>
                    <button class="settings-btn" id="${chartData.id}-go-live" title="Reset Chart View">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><polygon points="5 4 15 12 5 20"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                    </button>
                </div>
            </div>
            <div class="chart-container" id="${chartData.id}-container">
                <div class="chart-message" style="pointer-events: none;">Loading</div>
                <div class="countdown-timer" id="${chartData.id}-timer"></div>
            </div>
        `;
        return pane;
    }

    function positionGridHandles(grid, numCols, numRows) {
        const gridRect = grid.getBoundingClientRect();
        const children = Array.from(grid.querySelectorAll('.chart-pane'));
        if (children.length === 0) return;

        // Vertical handles — position at right edge of each column group
        for (let c = 1; c < numCols; c++) {
            const handle = grid.querySelector('.grid-resize-v[data-col="' + c + '"]');
            if (!handle) continue;
            const idx = c - 1; // rightmost pane of column c-1
            const pane = children[idx];
            if (!pane) continue;
            const pRect = pane.getBoundingClientRect();
            const right = pRect.right - gridRect.left;
            handle.style.cssText = [
                'position:absolute',
                'top:0',
                'height:100%',
                'width:10px',
                'left:' + (right - 5) + 'px',
                'z-index:50'
            ].join(';');
        }

        // Horizontal handles — position at bottom edge of each row group
        for (let r = 1; r < numRows; r++) {
            const handle = grid.querySelector('.grid-resize-h[data-row="' + r + '"]');
            if (!handle) continue;
            const idx = (r * numCols) - 1; // last pane of row r-1
            const pane = children[idx];
            if (!pane) continue;
            const pRect = pane.getBoundingClientRect();
            const bottom = pRect.bottom - gridRect.top;
            handle.style.cssText = [
                'position:absolute',
                'left:0',
                'width:100%',
                'height:10px',
                'top:' + (bottom - 5) + 'px',
                'z-index:50'
            ].join(';');
        }
    }

    function initGridResizeHandles(grid, chartCount, onResizeEnd) {
        // Idempotent: Remove stale handles and observers from a previous render
        grid.querySelectorAll('.grid-resize-handle').forEach(h => h.remove());
        if (grid._resizeObserver) {
            grid._resizeObserver.disconnect();
            grid._resizeObserver = null;
        }

        const colMap = { 2: 1, 4: 2, 6: 3, 8: 4 };
        const rowMap = { 2: 1, 4: 2, 6: 2, 8: 2 };
        const numCols = colMap[chartCount] || 1;
        const numRows = rowMap[chartCount] || 1;

        if (numCols < 2 && numRows < 2) return; // Nothing to drag

        // Make the grid position:relative so absolutely-positioned handles align properly
        grid.style.position = 'relative';

        // Vertical handles (between columns)
        for (let c = 1; c < numCols; c++) {
            const handle = document.createElement('div');
            handle.className = 'grid-resize-handle grid-resize-v';
            handle.dataset.col = c;
            handle.title = 'Drag to resize columns';
            grid.appendChild(handle);

            handle.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                handle.setPointerCapture(e.pointerId);
                handle.classList.add('dragging');

                const gridRect = grid.getBoundingClientRect();
                const startX = e.clientX;
                const computedCols = getComputedStyle(grid).gridTemplateColumns.split(' ').map(parseFloat);
                const totalFrs = computedCols.reduce((a,b)=>a+b, 0);
                const pxPerFr = totalFrs > 0 ? gridRect.width / totalFrs : 1;

                const onMove = (ev) => {
                    const dx = ev.clientX - startX;
                    const dFr = dx / pxPerFr;
                    const newCols = [...computedCols];
                    const minFr = 0.15;
                    newCols[c-1] = Math.max(minFr, computedCols[c-1] + dFr);
                    newCols[c]   = Math.max(minFr, computedCols[c]   - dFr);
                    grid.style.gridTemplateColumns = newCols.map(v => v + 'fr').join(' ');
                    positionGridHandles(grid, numCols, numRows);
                };

                const onUp = () => {
                    handle.classList.remove('dragging');
                    handle.releasePointerCapture(e.pointerId);
                    handle.removeEventListener('pointermove', onMove);
                    handle.removeEventListener('pointerup', onUp);
                    
                    if (onResizeEnd) {
                        onResizeEnd(grid.style.gridTemplateColumns, grid.style.gridTemplateRows);
                    }
                };

                handle.addEventListener('pointermove', onMove);
                handle.addEventListener('pointerup', onUp);
            });
        }

        // Horizontal handles (between rows)
        for (let r = 1; r < numRows; r++) {
            const handle = document.createElement('div');
            handle.className = 'grid-resize-handle grid-resize-h';
            handle.dataset.row = r;
            handle.title = 'Drag to resize rows';
            grid.appendChild(handle);

            handle.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                handle.setPointerCapture(e.pointerId);
                handle.classList.add('dragging');

                const gridRect = grid.getBoundingClientRect();
                const startY = e.clientY;
                const computedRows = getComputedStyle(grid).gridTemplateRows.split(' ').map(parseFloat);
                const totalFrs = computedRows.reduce((a,b)=>a+b, 0);
                const pxPerFr = totalFrs > 0 ? gridRect.height / totalFrs : 1;

                const onMove = (ev) => {
                    const dy = ev.clientY - startY;
                    const dFr = dy / pxPerFr;
                    const newRows = [...computedRows];
                    const minFr = 0.15;
                    newRows[r-1] = Math.max(minFr, computedRows[r-1] + dFr);
                    newRows[r]   = Math.max(minFr, computedRows[r]   - dFr);
                    grid.style.gridTemplateRows = newRows.map(v => v + 'fr').join(' ');
                    positionGridHandles(grid, numCols, numRows);
                };

                const onUp = () => {
                    handle.classList.remove('dragging');
                    handle.releasePointerCapture(e.pointerId);
                    handle.removeEventListener('pointermove', onMove);
                    handle.removeEventListener('pointerup', onUp);
                    
                    if (onResizeEnd) {
                        onResizeEnd(grid.style.gridTemplateColumns, grid.style.gridTemplateRows);
                    }
                };

                handle.addEventListener('pointermove', onMove);
                handle.addEventListener('pointerup', onUp);
            });
        }

        // Position handles after browser lays out the grid
        requestAnimationFrame(() => positionGridHandles(grid, numCols, numRows));

        // Observer tracks chart panes to keep handles aligned when window resizes
        grid._resizeObserver = new ResizeObserver(() => positionGridHandles(grid, numCols, numRows));
        grid.querySelectorAll('.chart-pane').forEach(pane => grid._resizeObserver.observe(pane));
    }

    function getMarginOffset(chartData, chartCount) {
        const isVpvrActive = chartData && chartData.indicators && chartData.indicators.vpvr && chartData.indicators.vpvrVisible !== false;
        if (isVpvrActive) {
            return chartCount === 1 ? 20 : 12;
        }
        return 2;
    }

    function getRightOffset(chartData, chartCount) {
        const isVpvrActive = chartData && chartData.indicators && chartData.indicators.vpvr && chartData.indicators.vpvrVisible !== false;
        if (isVpvrActive) {
            return chartCount === 1 ? 19 : 11;
        }
        return 1;
    }

    function updateSubchartMargins(chartData) {
        if (!chartData.chart) return;
        const activeSubcharts = [];
        if (chartData.indicators.rsi) activeSubcharts.push('rsi');
        if (chartData.indicators.atr) activeSubcharts.push('atr');
        
        const count = activeSubcharts.length;
        
        // If ATR is active, it needs more space. Give the sub-panel area more height.
        const totalSpace = chartData.indicators.atr ? 0.25 : (count > 0 ? 0.15 : 0);

        // Uplift the main candles area by increasing its bottom margin.
        chartData.chart.priceScale('right').applyOptions({
            scaleMargins: { top: 0.1, bottom: count > 0 ? totalSpace + 0.05 : 0.15 }
        });
        
        // Decouple volume from subchart stacking, restoring it as an overlay on the main chart
        if (chartData.volumeSeries) {
            // We want the base of the volume bars to sit slightly inside the sub-chart panel area.
            // Let's target 5% of the chart height below the top of the sub-chart panel.
            const volBottom = count > 0 ? totalSpace - 0.05 : 0;
            
            chartData.volumeSeries.priceScale().applyOptions({
                scaleMargins: { 
                    top: 1.0 - volBottom - 0.20, // Give volume bars a consistent 20% height
                    bottom: volBottom 
                }
            });
        }
        
        if (count === 0) return;
        
        // Distribute the total space evenly among active subcharts.
        const spacePerChart = totalSpace / count;
        activeSubcharts.forEach((id, index) => {
            const topM = 1.0 - totalSpace + (index * spacePerChart) + 0.02;
            const bottomM = 1.0 - (1.0 - totalSpace + ((index + 1) * spacePerChart));
            
            let scale = null;
            if (id === 'rsi') scale = chartData.chart.priceScale('rsi');
            else if (id === 'atr') scale = chartData.chart.priceScale('atr');
            if (scale) scale.applyOptions({ scaleMargins: { top: topM, bottom: bottomM } });
        });
    }

    function scrollToNewestActualCandle(chartData, chartCount) {
        if (!chartData.chart || !chartData.cachedData || chartData.cachedData.length === 0) return;
        try {
            const timeScale = chartData.chart.timeScale();
            const visibleRange = timeScale.getVisibleLogicalRange();
            let visibleCount = 100;
            if (visibleRange) {
                visibleCount = Math.round(visibleRange.to - visibleRange.from);
                if (visibleCount <= 0 || visibleCount > 1000) visibleCount = 100;
            }
            const lastIndex = chartData.cachedData.length - 1;
            const marginOffset = getMarginOffset(chartData, chartCount);
            timeScale.setVisibleLogicalRange({
                from: lastIndex - visibleCount + marginOffset,
                to: lastIndex + marginOffset
            });
        } catch (e) {
            console.warn("Failed to scroll to newest actual candle:", e);
        }
    }

    function resetDefaultViewport(chartData, chartCount) {
        if (!chartData.chart || !chartData.cachedData || chartData.cachedData.length === 0) return;
        try {
            const timeScale = chartData.chart.timeScale();
            const visibleCount = 100; // default viewport
            const lastIndex = chartData.cachedData.length - 1;
            const marginOffset = getMarginOffset(chartData, chartCount);
            timeScale.setVisibleLogicalRange({
                from: lastIndex - visibleCount + marginOffset,
                to: lastIndex + marginOffset
            });
        } catch (e) {
            console.warn("Failed to reset default viewport:", e);
        }
    }


    return {
        createChartPane,
        positionGridHandles,
        initGridResizeHandles,
        getMarginOffset,
        getRightOffset,
        updateSubchartMargins,
        scrollToNewestActualCandle,
        resetDefaultViewport
    };
})();

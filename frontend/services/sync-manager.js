const SyncManagerService = (function() {
    let deps = {};

    function initialize(injectedDeps) {
        deps = injectedDeps;
    }

    function getState() {
        return deps.state || window.state;
    }

    function getTimeUtils() {
        return deps.TimeUtils || window.TimeUtils;
    }

    function getChartLegendService() {
        return deps.ChartLegendService || window.ChartLegendService;
    }

    function getLayoutService() {
        return deps.LayoutService || window.LayoutService;
    }

    function getFormatPrice() {
        return deps.formatPrice || window.formatPrice;
    }

    function getIntervalSeconds(interval) {
        if (deps.getIntervalSeconds) return deps.getIntervalSeconds(interval);
        if (typeof window.getIntervalSeconds === 'function') return window.getIntervalSeconds(interval);
        const map = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 };
        return map[interval] || 60;
    }

    function getMarginOffset(chartData) {
        const layoutSvc = getLayoutService();
        const st = getState();
        if (layoutSvc && layoutSvc.getRightOffset) {
            return layoutSvc.getRightOffset(chartData, st ? st.chartCount : 1);
        }
        return 8;
    }

    function syncTimeScales(sourceChartId, logicalRange) {
        const st = getState();
        if (!st || st.isSyncingScales || !st.syncCharts) return;
        st.isSyncingScales = true;
        
        const sourceChart = st.charts[sourceChartId];
        const sourceOffset = sourceChart ? getMarginOffset(sourceChart) : 8;
        
        Object.values(st.charts).forEach(cd => {
            if (cd.id !== sourceChartId && cd.chart) {
                try {
                    const targetOffset = getMarginOffset(cd);
                    const offsetDiff = targetOffset - sourceOffset;
                    const adjustedRange = {
                        from: logicalRange.from + offsetDiff,
                        to: logicalRange.to + offsetDiff
                    };
                    cd.chart.timeScale().setVisibleLogicalRange(adjustedRange);
                } catch(e) {
                    console.warn("Failed to sync timescale range", e);
                }
            }
        });
        
        setTimeout(() => {
            st.isSyncingScales = false;
        }, 100);
    }

    function handleCrosshairSync(sourceChartData, param) {
        const st = getState();
        const legendSvc = getChartLegendService();
        const timeUtils = getTimeUtils();
        const fmtPrice = getFormatPrice();

        if (!st || sourceChartData.symbol === "No Chart" || sourceChartData.symbol === "none") return;

        const isLight = st.theme === "light";
        const syncColor = isLight ? "#0f172a" : "#ffffff";

        if (!param.point || !sourceChartData.candleSeries) {
            Object.values(st.charts).forEach(target => {
                const crosshairEl = document.getElementById(`${target.id}-sync-crosshair`);
                if (crosshairEl) crosshairEl.style.display = 'none';
                target.hoverParam = null;
                if (legendSvc) legendSvc.updateLegend(target);
            });
            return;
        }

        const hoveredPrice = sourceChartData.candleSeries.coordinateToPrice(param.point.y);
        const sourceTimeScale = sourceChartData.chart.timeScale();
        const logical = sourceTimeScale.coordinateToLogical(param.point.x);

        let sourceTimeSec = null;
        if (param.time !== undefined) {
            sourceTimeSec = typeof param.time === 'object' ? (timeUtils ? timeUtils._getMs(param.time) / 1000 : param.time) : param.time;
        } else if (logical !== null && sourceChartData.cachedData.length > 0) {
            const lastCandle = sourceChartData.cachedData[sourceChartData.cachedData.length - 1];
            const lastCoord = sourceTimeScale.timeToCoordinate(lastCandle.time);
            if (lastCoord !== null) {
                const lastLogical = sourceTimeScale.coordinateToLogical(lastCoord);
                if (lastLogical !== null) {
                    sourceTimeSec = lastCandle.time + (logical - lastLogical) * getIntervalSeconds(sourceChartData.interval);
                }
            }
        }

        Object.values(st.charts).forEach(target => {
            if (target.id === sourceChartData.id) {
                const crosshairEl = document.getElementById(`${target.id}-sync-crosshair`);
                if (crosshairEl) crosshairEl.style.display = 'none';
                return;
            }

            if (target.symbol === sourceChartData.symbol && target.chart && target.candleSeries) {
                let crosshairEl = document.getElementById(`${target.id}-sync-crosshair`);
                if (!crosshairEl) {
                    const container = document.getElementById(`${target.id}-container`);
                    if (!container) return;
                    
                    crosshairEl = document.createElement('div');
                    crosshairEl.id = `${target.id}-sync-crosshair`;
                    crosshairEl.style.position = 'absolute';
                    crosshairEl.style.top = '0';
                    crosshairEl.style.left = '0';
                    crosshairEl.style.width = '100%';
                    crosshairEl.style.height = '100%';
                    crosshairEl.style.pointerEvents = 'none';
                    crosshairEl.style.zIndex = '50';
                    crosshairEl.style.overflow = 'visible';
                    
                    const vLine = document.createElement('div');
                    vLine.id = `${target.id}-sync-vline`;
                    vLine.style.position = 'absolute';
                    vLine.style.top = '0';
                    vLine.style.bottom = '0';
                    vLine.style.width = '0px';
                    vLine.style.borderLeft = '1px dashed';
                    vLine.style.opacity = '0.5';
                    
                    const hLine = document.createElement('div');
                    hLine.id = `${target.id}-sync-hline`;
                    hLine.style.position = 'absolute';
                    hLine.style.left = '0';
                    hLine.style.height = '0px';
                    hLine.style.borderTop = '1px dashed';
                    hLine.style.opacity = '0.5';
                    
                    const vLabel = document.createElement('div');
                    vLabel.id = `${target.id}-sync-vlabel`;
                    vLabel.style.position = 'absolute';
                    vLabel.style.bottom = '0';
                    vLabel.style.transform = 'translateX(-50%)';
                    vLabel.style.padding = '2px 6px';
                    vLabel.style.fontSize = '11px';
                    vLabel.style.fontFamily = 'inherit';
                    vLabel.style.borderRadius = '4px';
                    vLabel.style.zIndex = '51';
                    vLabel.style.whiteSpace = 'nowrap';
                    
                    const hLabel = document.createElement('div');
                    hLabel.id = `${target.id}-sync-hlabel`;
                    hLabel.style.position = 'absolute';
                    hLabel.style.right = '0';
                    hLabel.style.transform = 'translateY(-50%)';
                    hLabel.style.padding = '2px 6px';
                    hLabel.style.fontSize = '11px';
                    hLabel.style.fontFamily = 'inherit';
                    hLabel.style.borderRadius = '4px';
                    hLabel.style.zIndex = '51';
                    hLabel.style.textAlign = 'center';
                    
                    crosshairEl.appendChild(vLine);
                    crosshairEl.appendChild(hLine);
                    crosshairEl.appendChild(vLabel);
                    crosshairEl.appendChild(hLabel);
                    container.appendChild(crosshairEl);
                }

                const vLine = document.getElementById(`${target.id}-sync-vline`);
                const hLine = document.getElementById(`${target.id}-sync-hline`);
                const vLabel = document.getElementById(`${target.id}-sync-vlabel`);
                const hLabel = document.getElementById(`${target.id}-sync-hlabel`);
                
                vLine.style.borderColor = syncColor;
                hLine.style.borderColor = syncColor;
                
                const labelBgC = syncColor;
                const labelTextC = isLight ? "#ffffff" : "#0f172a";
                vLabel.style.backgroundColor = labelBgC;
                vLabel.style.color = labelTextC;
                hLabel.style.backgroundColor = labelBgC;
                hLabel.style.color = labelTextC;

                let targetX = null;
                let targetY = null;
                const targetTimeScale = target.chart.timeScale();

                let targetIdx = -1;
                if (sourceTimeSec !== null && target.cachedData.length > 0) {
                    let low = 0; let high = target.cachedData.length - 1;
                    while (low <= high) {
                        const mid = Math.floor((low + high) / 2);
                        const current = target.cachedData[mid];
                        if (current.time <= sourceTimeSec) {
                            targetIdx = mid;
                            low = mid + 1;
                        } else {
                            high = mid - 1;
                        }
                    }
                    
                    if (targetIdx !== -1) {
                        const targetCandle = target.cachedData[targetIdx];
                        const coord = targetTimeScale.timeToCoordinate(targetCandle.time);
                        if (coord !== null) {
                            const sourceIntSec = getIntervalSeconds(sourceChartData.interval);
                            const targetIntSec = getIntervalSeconds(target.interval);
                            const baseLogical = targetTimeScale.coordinateToLogical(coord);
                            
                            if (baseLogical !== null) {
                                const diffLogical = (sourceTimeSec - targetCandle.time) / targetIntSec;
                                if (sourceIntSec < targetIntSec) {
                                    // Snap to the larger timeframe block, projecting seamlessly into future blank space
                                    targetX = targetTimeScale.logicalToCoordinate(baseLogical + Math.floor(diffLogical));
                                } else {
                                    // Glide smoothly if source is a larger or equal timeframe
                                    targetX = targetTimeScale.logicalToCoordinate(baseLogical + diffLogical);
                                }
                            }
                        }
                    }
                }

                if (targetIdx !== -1) {
                    target.hoverParam = { time: target.cachedData[targetIdx].time };
                    if (legendSvc) legendSvc.updateLegend(target, targetIdx);
                } else {
                    target.hoverParam = null;
                    if (legendSvc) legendSvc.updateLegend(target);
                }

                if (hoveredPrice !== null) {
                    targetY = target.candleSeries.priceToCoordinate(hoveredPrice);
                }

                let rightScaleWidth = 0;
                try { rightScaleWidth = target.chart.priceScale('right').width(); } catch(e) {}
                const containerWidth = document.getElementById(`${target.id}-container`).clientWidth;

                crosshairEl.style.display = 'block';

                // Ensures the vertical line completely hides if dragged over the right price scale
                if (targetX !== null && targetX <= (containerWidth - rightScaleWidth)) {
                    vLine.style.display = 'block';
                    vLine.style.left = `${targetX}px`;
                    
                    vLabel.style.display = 'block';
                    vLabel.style.left = `${targetX}px`;
                    const date = new Date(sourceTimeSec * 1000);
                    const day = date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit" });
                    const mon = date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "short" });
                    const yy = date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", year: "2-digit" });
                    const timeStr = date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
                    vLabel.textContent = `${day} ${mon} '${yy} ${timeStr}`;
                } else {
                    vLine.style.display = 'none';
                    vLabel.style.display = 'none';
                }

                if (targetY !== null && hoveredPrice !== null) {
                    hLine.style.display = 'block';
                    hLine.style.top = `${targetY}px`;
                    hLine.style.width = `${containerWidth - rightScaleWidth}px`;
                    
                    hLabel.style.display = 'block';
                    hLabel.style.top = `${targetY}px`;
                    hLabel.style.width = `${rightScaleWidth}px`;
                    hLabel.textContent = fmtPrice ? fmtPrice(hoveredPrice) : hoveredPrice;
                } else {
                    hLine.style.display = 'none';
                    hLabel.style.display = 'none';
                }

                if (targetX === null && targetY === null) {
                    crosshairEl.style.display = 'none';
                }
            } else {
                const crosshairEl = document.getElementById(`${target.id}-sync-crosshair`);
                if (crosshairEl) crosshairEl.style.display = 'none';
                target.hoverParam = null;
                if (legendSvc) legendSvc.updateLegend(target);
            }
        });
    }

    return {
        initialize,
        syncTimeScales,
        handleCrosshairSync
    };
})();

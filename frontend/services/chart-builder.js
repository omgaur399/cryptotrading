const ChartBuilderService = (() => {
    let deps = {};

    function initialize(injected) {
        deps = injected;
    }

    function build(chartData) {
        const {
            state, ChartService, ThemeService, ChartLifecycleService, IndicatorService,
            LayoutService, ContextMenuService, AlertService, StorageService, DrawingService,
            syncTimeScales, loadOlderHistoricalData, addHorizontalLine, updateMarkers,
            checkAndInteractWithLine, handleCrosshairSync, updateChartLegend, TimeUtils
        } = deps;

    const container = document.getElementById(`${chartData.id}-container`);
    container.style.position = 'relative'; // Ensure absolute positioning works for overlays
    const isLight = state.theme === "light";
    const themeOptions = ThemeService.getChartThemeOptions(isLight);

    ChartService.initialize(chartData, container, themeOptions, TimeUtils);

    // --- Custom Drag & Hover Overlay Logic ---
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'hover-delete-btn';
    deleteBtn.innerHTML = '✖';
    deleteBtn.style.display = 'none';
    deleteBtn.title = 'Delete Line';
    container.appendChild(deleteBtn);
    chartData.hoverDeleteBtn = deleteBtn;

    const addAlertBtn = document.createElement('div');
    addAlertBtn.className = 'hover-add-alert-btn';
    addAlertBtn.innerHTML = '＋';
    addAlertBtn.style.display = 'none';
    addAlertBtn.title = 'Add Alert';
    container.appendChild(addAlertBtn);
    chartData.hoverAddAlertBtn = addAlertBtn;

    let isDragging = false;
    let draggingLineInfo = null;
    
    // --- INFINITE SCROLL PAGINATION & SYNC ---
    const logicalRangeChangeHandler = (logicalRange) => {
        if (!logicalRange) return;
        
        if (state.syncCharts) {
            syncTimeScales(chartData.id, logicalRange);
        }
        
        if (chartData.isFetchingHistory || chartData.hasReachedBeginning) return;
        
        // If user scrolls within 100 bars of the oldest loaded candle, fetch more
        if (logicalRange.from < 100) {
            loadOlderHistoricalData(chartData);
        }
    };
    ChartLifecycleService.attach(chartData, { visibleLogicalRangeChange: logicalRangeChangeHandler });

    container.addEventListener('mousedown', (e) => {
        if (chartData.drawingMode === 'hline' || chartData.drawingMode === 'vline') return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (!chartData.candleSeries) return;
        const clickedPrice = chartData.candleSeries.coordinateToPrice(y);

        const key = chartData.symbol;
        const lines = state.drawings[key] || [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.type === 'horizontalLine') {
                if (clickedPrice === null) continue;
                const lineY = chartData.candleSeries.priceToCoordinate(line.price);
                if (lineY !== null && Math.abs(y - lineY) < 15) {
                    isDragging = true;
                    draggingLineInfo = { line, index: i, key, startY: y };
                    // Temporarily disable panning
                    chartData.chart.applyOptions({ handleScroll: { pressedMouseMove: false } });
                    break;
                }
            } else if (line.type === 'alert') {
                if (clickedPrice === null) continue;
                const lineY = chartData.candleSeries.priceToCoordinate(line.price);
                let rightScaleWidth = 55;
                try { const w = chartData.chart.priceScale('right').width(); if (w > 10 && w < 150) rightScaleWidth = w; } catch(e) {}
                if (lineY !== null && Math.abs(y - lineY) < 15 && x >= rect.width - rightScaleWidth - 30) {
                    isDragging = true;
                    draggingLineInfo = { line, index: i, key, startY: y };
                    chartData.chart.applyOptions({ handleScroll: { pressedMouseMove: false } });
                    break;
                }
            } else if (line.type === 'verticalLine') {
                const timeScale = chartData.chart.timeScale();
                let lineX = null;
                if (line.logical !== undefined && line.logical !== null && timeScale.logicalToCoordinate) {
                    lineX = timeScale.logicalToCoordinate(line.logical);
                } else if (line.time !== undefined && timeScale.timeToCoordinate) {
                    lineX = timeScale.timeToCoordinate(line.time);
                }
                if (lineX !== null && Math.abs(x - lineX) < 15) {
                    isDragging = true;
                    draggingLineInfo = { line, index: i, key, startX: x };
                    chartData.chart.applyOptions({ handleScroll: { pressedMouseMove: false } });
                    break;
                }
            }
        }

        if (!isDragging && window.paperTrading) {
            const checkItem = (item, isOrder) => {
                if (item.symbol !== chartData.symbol) return false;
                
                if (isOrder && item.price !== null && item.price !== undefined) {
                    const lineY = chartData.candleSeries.priceToCoordinate(item.price);
                    if (lineY !== null && Math.abs(y - lineY) < 15) {
                        isDragging = true;
                        draggingLineInfo = { isPT: true, id: item.id, type: 'price', isOrder: isOrder, startY: y };
                        chartData.chart.applyOptions({ handleScroll: { pressedMouseMove: false } });
                        return true;
                    }
                }
                
                if (window.paperTrading.activeTPSLIds && !window.paperTrading.activeTPSLIds.has(item.id)) return false;
                if (item.tp !== null && item.tp !== undefined) {
                    const lineY = chartData.candleSeries.priceToCoordinate(item.tp);
                    if (lineY !== null && Math.abs(y - lineY) < 15) {
                        isDragging = true;
                        draggingLineInfo = { isPT: true, id: item.id, type: 'tp', isOrder: isOrder, startY: y };
                        chartData.chart.applyOptions({ handleScroll: { pressedMouseMove: false } });
                        return true;
                    }
                }
                if (item.sl !== null && item.sl !== undefined) {
                    const lineY = chartData.candleSeries.priceToCoordinate(item.sl);
                    if (lineY !== null && Math.abs(y - lineY) < 15) {
                        isDragging = true;
                        draggingLineInfo = { isPT: true, id: item.id, type: 'sl', isOrder: isOrder, startY: y };
                        chartData.chart.applyOptions({ handleScroll: { pressedMouseMove: false } });
                        return true;
                    }
                }
                return false;
            };
            for (let pos of window.paperTrading.positions.positions) if (checkItem(pos, false)) break;
            if (!isDragging) for (let order of window.paperTrading.positions.orders) if (checkItem(order, true)) break;
        }
        
        if (!isDragging) {
            let rightScaleWidth = 55;
            try { const w = chartData.chart.priceScale('right').width(); if (w > 10 && w < 150) rightScaleWidth = w; } catch(err) {}
            if (x < rect.width - rightScaleWidth) {
                chartData.verticalPanArmed = true;
                chartData.panStartX = x;
                chartData.panStartY = y;
                chartData.isVerticalPanning = false;
            }
        }
        

    }, { capture: true });

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (chartData.verticalPanArmed) {
            const dx = Math.abs(x - chartData.panStartX);
            const dy = Math.abs(y - chartData.panStartY);
            if (dy > 5 && dy > dx) {
                chartData.isVerticalPanning = true;
                chartData.verticalPanArmed = false;
                chartData.lastPanY = y;
            } else if (dx > 5) {
                chartData.verticalPanArmed = false;
            }
        }

        if (chartData.isVerticalPanning) {
            const p1 = chartData.candleSeries.coordinateToPrice(0);
            const p2 = chartData.candleSeries.coordinateToPrice(100);
            if (p1 !== null && p2 !== null) {
                const pricePerPixel = (p1 - p2) / 100;
                const dy = y - chartData.lastPanY;
                const deltaPrice = dy * pricePerPixel;
                chartData.customPriceOffset = (chartData.customPriceOffset || 0) + deltaPrice;
                chartData.chart.priceScale('right').applyOptions({ autoScale: true });
            }
            chartData.lastPanY = y;
        }

        // Handle dragging updates
        if (isDragging && draggingLineInfo) {
            if (draggingLineInfo.isPT) {
                if (Math.abs(y - draggingLineInfo.startY) > 3) chartData.justDragged = true;
                const newPrice = chartData.candleSeries.coordinateToPrice(y);
                if (newPrice !== null && window.paperTrading) {
                    const collection = draggingLineInfo.isOrder ? window.paperTrading.positions.orders : window.paperTrading.positions.positions;
                    const item = collection.find(i => i.id === draggingLineInfo.id);
                    if (item) {
                        if (draggingLineInfo.type === 'tp') item.tp = newPrice;
                        if (draggingLineInfo.type === 'sl') item.sl = newPrice;
                        if (draggingLineInfo.type === 'price') item.price = newPrice;
                        
                        Object.values(state.charts).forEach(cd => {
                            if (cd.symbol === chartData.symbol && cd.ptLineObjects) {
                                const pl = cd.ptLineObjects[`${item.id}_${draggingLineInfo.type}`];
                                if (pl && pl.applyOptions) pl.applyOptions({ price: newPrice });
                            }
                        });
                        
                        const tpInput = document.getElementById(`pt-edit-tp-${item.id}`);
                        const slInput = document.getElementById(`pt-edit-sl-${item.id}`);
                        const fmt = (p) => p < 1 ? p.toFixed(4) : p.toFixed(2);
                        if (draggingLineInfo.type === 'tp' && tpInput) tpInput.value = fmt(newPrice);
                        if (draggingLineInfo.type === 'sl' && slInput) slInput.value = fmt(newPrice);
                    }
                }
                chartData.hoverDeleteBtn.style.display = 'none';
                return;
            }
            if (draggingLineInfo.line.type === 'horizontalLine' || draggingLineInfo.line.type === 'alert') {
                if (Math.abs(y - draggingLineInfo.startY) > 3) {
                    chartData.justDragged = true;
                }
                const newPrice = chartData.candleSeries.coordinateToPrice(y);
                if (newPrice !== null) {
                    draggingLineInfo.line.price = newPrice;
                    Object.values(state.charts).forEach(cd => {
                        if (cd.symbol === chartData.symbol) {
                            const pl = cd.renderedDrawings[draggingLineInfo.line.id];
                            if (pl) {
                                if (pl instanceof HTMLElement) {
                                    if (draggingLineInfo.line.type === 'alert') draggingLineInfo.line.active = true;
                                    if (pl._updatePosition) pl._updatePosition();
                                } else if (pl.applyOptions) {
                                    if (draggingLineInfo.line.type === 'alert') {
                                        draggingLineInfo.line.active = true;
                                        pl.applyOptions({ price: newPrice, color: 'rgba(0, 0, 0, 0)', title: '🔔' });
                                    } else {
                                        pl.applyOptions({ price: newPrice });
                                    }
                                }
                            }
                        }
                    });
                }
            } else if (draggingLineInfo.line.type === 'verticalLine') {
                if (Math.abs(x - draggingLineInfo.startX) > 3) {
                    chartData.justDragged = true;
                }
                const timeScale = chartData.chart.timeScale();
                if (timeScale.coordinateToLogical) {
                    const newLogical = timeScale.coordinateToLogical(x);
                    if (newLogical !== null) {
                        draggingLineInfo.line.logical = newLogical;
                        if (timeScale.coordinateToTime) {
                            const newTime = timeScale.coordinateToTime(x);
                            if (newTime !== null) draggingLineInfo.line.time = newTime;
                        }
                        Object.values(state.charts).forEach(cd => {
                            if (cd.symbol === chartData.symbol) DrawingService.renderVerticalLine(cd, draggingLineInfo.line);
                        });
                    }
                }
            }
            if (chartData.hoverAddAlertBtn) chartData.hoverAddAlertBtn.style.display = 'none';
            chartData.hoverDeleteBtn.style.display = 'none';
            return;
        }

        // Handle hover displays
        if (!chartData.candleSeries || chartData.drawingMode === 'hline' || chartData.drawingMode === 'vline') {
            chartData.hoverDeleteBtn.style.display = 'none';
            if (chartData.hoverAddAlertBtn) chartData.hoverAddAlertBtn.style.display = 'none';
            container.classList.remove('hovering-hline');
            container.classList.remove('hovering-vline');
            return;
        }

        const hoverPrice = chartData.candleSeries.coordinateToPrice(y);
        let hoveredLine = null;
        let hoveredLineY = null;
        let hoveredLineX = null;
        let hoveredIsPT = false;

        const key = chartData.symbol;
        const lines = state.drawings[key];
        if (lines) {
            for (let line of lines) {
                if (line.type === 'horizontalLine') {
                    if (hoverPrice !== null) {
                        const lineY = chartData.candleSeries.priceToCoordinate(line.price);
                        if (lineY !== null && Math.abs(y - lineY) < 15) {
                            hoveredLine = line;
                            hoveredLineY = lineY;
                            break;
                        }
                    }
                } else if (line.type === 'alert') {
                    if (hoverPrice !== null) {
                        const lineY = chartData.candleSeries.priceToCoordinate(line.price);
                        let rightScaleWidth = 55;
                        try { const w = chartData.chart.priceScale('right').width(); if (w > 10 && w < 150) rightScaleWidth = w; } catch(e) {}
                        if (lineY !== null && Math.abs(y - lineY) < 15 && x >= rect.width - rightScaleWidth - 30) {
                            hoveredLine = line;
                            hoveredLineY = lineY;
                            break;
                        }
                    }
                } else if (line.type === 'verticalLine') {
                    const timeScale = chartData.chart.timeScale();
                    let lineX = null;
                    if (line.logical !== undefined && line.logical !== null && timeScale.logicalToCoordinate) {
                        lineX = timeScale.logicalToCoordinate(line.logical);
                    } else if (line.time !== undefined && timeScale.timeToCoordinate) {
                        lineX = timeScale.timeToCoordinate(line.time);
                    }
                    if (lineX !== null && Math.abs(x - lineX) < 15) {
                        hoveredLine = line;
                        hoveredLineX = lineX;
                        hoveredLineY = y;
                        break;
                    }
                }
            }
        }

        if (!hoveredLine && window.paperTrading && hoverPrice !== null) {
            const checkPTHover = (item, isOrder) => {
                if (item.symbol !== chartData.symbol) return false;
                
                if (isOrder && item.price !== null && item.price !== undefined) {
                    const lineY = chartData.candleSeries.priceToCoordinate(item.price);
                    if (lineY !== null && Math.abs(y - lineY) < 15) {
                        hoveredLine = { id: item.id, type: 'price' };
                        hoveredLineY = lineY;
                        hoveredIsPT = true;
                        return true;
                    }
                }
                
                if (window.paperTrading.activeTPSLIds && !window.paperTrading.activeTPSLIds.has(item.id)) return false;
                if (item.tp !== null && item.tp !== undefined) {
                    const lineY = chartData.candleSeries.priceToCoordinate(item.tp);
                    if (lineY !== null && Math.abs(y - lineY) < 15) {
                        hoveredLine = { id: item.id, type: 'tp' };
                        hoveredLineY = lineY;
                        hoveredIsPT = true;
                        return true;
                    }
                }
                if (item.sl !== null && item.sl !== undefined) {
                    const lineY = chartData.candleSeries.priceToCoordinate(item.sl);
                    if (lineY !== null && Math.abs(y - lineY) < 15) {
                        hoveredLine = { id: item.id, type: 'sl' };
                        hoveredLineY = lineY;
                        hoveredIsPT = true;
                        return true;
                    }
                }
                return false;
            };
            for (let pos of window.paperTrading.positions.positions) if (checkPTHover(pos, false)) break;
            if (!hoveredLine) for (let order of window.paperTrading.positions.orders) if (checkPTHover(order, true)) break;
        }

        if (hoveredLine) {
            if (hoveredIsPT) {
                container.classList.add('hovering-hline');
                container.classList.remove('hovering-vline');
                chartData.hoverDeleteBtn.style.display = 'none';
                chartData.hoveredLineId = null;
            } else if (hoveredLine.type === 'horizontalLine') {
                let currentLeft = parseFloat(chartData.hoverDeleteBtn.style.left) || 0;
                if (chartData.hoveredLineId !== hoveredLine.id || Math.abs(x - currentLeft) > 50) {
                    const safeX = Math.min(x + 15, rect.width - 50); // Keep it away from the right-side price scale
                    chartData.hoverDeleteBtn.style.left = `${safeX}px`;
                }
                chartData.hoverDeleteBtn.style.top = `${hoveredLineY - 9}px`;
                container.classList.add('hovering-hline');
                container.classList.remove('hovering-vline');
            } else if (hoveredLine.type === 'alert') {
                let rightScaleWidth = 55;
                try { const w = chartData.chart.priceScale('right').width(); if (w > 10 && w < 150) rightScaleWidth = w; } catch(e) {}
                chartData.hoverDeleteBtn.style.left = `${rect.width - rightScaleWidth - 25}px`;
                chartData.hoverDeleteBtn.style.top = `${hoveredLineY - 9}px`;
                container.classList.add('hovering-hline');
                container.classList.remove('hovering-vline');
            } else if (hoveredLine.type === 'verticalLine') {
                let currentTop = parseFloat(chartData.hoverDeleteBtn.style.top) || 0;
                if (chartData.hoveredLineId !== hoveredLine.id || Math.abs(y - currentTop) > 50) {
                    const safeY = Math.min(y + 15, rect.height - 30);
                    chartData.hoverDeleteBtn.style.top = `${safeY}px`;
                }
                chartData.hoverDeleteBtn.style.left = `${hoveredLineX - 9}px`;
                container.classList.add('hovering-vline');
                container.classList.remove('hovering-hline');
            }

            chartData.hoverDeleteBtn.style.display = 'flex';
            chartData.hoveredLineId = hoveredLine.id;
            if (chartData.hoverAddAlertBtn) chartData.hoverAddAlertBtn.style.display = 'none';
        } else {
            chartData.hoverDeleteBtn.style.display = 'none';
            chartData.hoveredLineId = null;
            container.classList.remove('hovering-hline');
            container.classList.remove('hovering-vline');
            
            if (hoverPrice !== null && !isDragging) {
                chartData.lastHoveredPrice = hoverPrice;
                let rightScaleWidth = 55;
                try { const w = chartData.chart.priceScale('right').width(); if (w > 10 && w < 150) rightScaleWidth = w; } catch(e) {}
                // Position it perfectly to the left of the right price scale
                const safeX = rect.width - rightScaleWidth - 22; 
                if (chartData.hoverAddAlertBtn) {
                    chartData.hoverAddAlertBtn.style.left = `${safeX}px`;
                    chartData.hoverAddAlertBtn.style.top = `${y - 9}px`;
                    chartData.hoverAddAlertBtn.style.display = 'flex';
                }
            } else {
                if (chartData.hoverAddAlertBtn) chartData.hoverAddAlertBtn.style.display = 'none';
            }
        }

        let overBtn = false;
        if (chartData.hoverAddAlertBtn && chartData.hoverAddAlertBtn.style.display !== 'none') {
            const bLeft = parseFloat(chartData.hoverAddAlertBtn.style.left);
            const bTop = parseFloat(chartData.hoverAddAlertBtn.style.top);
            if (x >= bLeft && x <= bLeft + 18 && y >= bTop && y <= bTop + 18) {
                chartData.hoverAddAlertBtn.classList.add('hovered');
                overBtn = true;
            } else {
                chartData.hoverAddAlertBtn.classList.remove('hovered');
            }
        }
        if (chartData.hoverDeleteBtn && chartData.hoverDeleteBtn.style.display !== 'none') {
            const bLeft = parseFloat(chartData.hoverDeleteBtn.style.left);
            const bTop = parseFloat(chartData.hoverDeleteBtn.style.top);
            if (x >= bLeft && x <= bLeft + 18 && y >= bTop && y <= bTop + 18) {
                chartData.hoverDeleteBtn.classList.add('hovered');
                overBtn = true;
            } else {
                chartData.hoverDeleteBtn.classList.remove('hovered');
            }
        }
        
        if (overBtn) container.classList.add('hovering-btn');
        else container.classList.remove('hovering-btn');
    });

    const finishDrag = (e) => {
        chartData.verticalPanArmed = false;
        if (chartData.isVerticalPanning) {
            chartData.isVerticalPanning = false;
            chartData.panStartPrice = null;
        }

        if (isDragging) {
            isDragging = false;
            if (draggingLineInfo && draggingLineInfo.isPT && window.paperTrading) {
                window.paperTrading.positions.save();
                window.paperTrading.renderPositions();
            } else {
                StorageService.saveDrawings(state.drawings);
            }
            // Re-enable panning
            chartData.chart.applyOptions({ handleScroll: { pressedMouseMove: true } });
            if (chartData.justDragged) {
                setTimeout(() => chartData.justDragged = false, 50);
            }
        } else if (e && e.clientX !== undefined) {
            // Handle clicks strictly on the right side price scale (e.g., for Alerts)
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            let rightScaleWidth = 55;
            try { const w = chartData.chart.priceScale('right').width(); if (w > 10 && w < 150) rightScaleWidth = w; } catch(err) {}
            
            if (x >= rect.width - rightScaleWidth - 30) {
                if (chartData.candleSeries) {
                    const clickedPrice = chartData.candleSeries.coordinateToPrice(y);
                    if (clickedPrice !== null) {
                        const key = chartData.symbol;
                        const lines = state.drawings[key];
                        if (lines) {
                            for (let line of lines) {
                                if (line.type === 'alert') {
                                    const lineY = chartData.candleSeries.priceToCoordinate(line.price);
                                    if (lineY !== null && Math.abs(y - lineY) < 15) {
                                        AlertService.AlertModal.openSettings(chartData, line, key);
                                        return;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    container.addEventListener('mouseup', finishDrag);
    container.addEventListener('mouseleave', () => {
        finishDrag();
        chartData.hoverDeleteBtn.style.display = 'none';
        if (chartData.hoverAddAlertBtn) chartData.hoverAddAlertBtn.style.display = 'none';
        container.classList.remove('hovering-hline');
        container.classList.remove('hovering-vline');
        container.classList.remove('hovering-btn');
    });

    container.addEventListener('click', (e) => {
        if (!chartData.candleSeries || !chartData.chart) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
            
            if (chartData.hoverAddAlertBtn && chartData.hoverAddAlertBtn.style.display !== 'none') {
                const bLeft = parseFloat(chartData.hoverAddAlertBtn.style.left);
                const bTop = parseFloat(chartData.hoverAddAlertBtn.style.top);
                if (x >= bLeft && x <= bLeft + 18 && y >= bTop && y <= bTop + 18) {
                    if (chartData.lastHoveredPrice !== null) {
                        AlertService.AlertModal.open(chartData, chartData.lastHoveredPrice);
                    }
                    chartData.hoverAddAlertBtn.style.display = 'none';
                    e.stopPropagation();
                    return;
                }
            }
            
            if (chartData.hoverDeleteBtn && chartData.hoverDeleteBtn.style.display !== 'none') {
                const bLeft = parseFloat(chartData.hoverDeleteBtn.style.left);
                const bTop = parseFloat(chartData.hoverDeleteBtn.style.top);
                if (x >= bLeft && x <= bLeft + 18 && y >= bTop && y <= bTop + 18) {
                    const id = chartData.hoveredLineId;
                    if (id) {
                        const key = chartData.symbol;
                        const lines = state.drawings[key];
                        if (lines) {
                            const idx = lines.findIndex(l => l.id === id);
                            if (idx !== -1) {
                                const lineType = lines[idx].type;
                                Object.values(state.charts).forEach(cd => {
                                    if (cd.symbol === chartData.symbol) {
                                        if (lineType === 'verticalLine') {
                                            const el = document.getElementById(`vline-${cd.id}-${id}`);
                                            if (el) el.remove();
                                        } else {
                                            const pl = cd.renderedDrawings[id];
                                            if (pl) {
                                                if (pl instanceof HTMLElement) { pl.remove(); }
                                                else { try { cd.candleSeries.removePriceLine(pl); } catch(err){} }
                                                delete cd.renderedDrawings[id];
                                            }
                                        }
                                        updateMarkers(cd);
                                    }
                                });
                                lines.splice(idx, 1);
                                StorageService.saveDrawings(state.drawings);
                            }
                        }
                    }
                    chartData.hoverDeleteBtn.style.display = 'none';
                    container.classList.remove('hovering-hline');
                    container.classList.remove('hovering-vline');
                    container.classList.remove('hovering-btn');
                    e.stopPropagation();
                    return;
                }
            }
    }, { capture: true });

    container.addEventListener('dblclick', (e) => {
        if (!chartData.candleSeries || !chartData.chart) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let rightScaleWidth = 55;
        try { const w = chartData.chart.priceScale('right').width(); if (w > 10 && w < 150) rightScaleWidth = w; } catch(err) {}

        if (x >= rect.width - rightScaleWidth) {
            const price = chartData.candleSeries.coordinateToPrice(y);
            if (price !== null) {
                AlertService.AlertModal.open(chartData, price);
            }
        } else {
            chartData.customPriceOffset = 0;
            chartData.chart.timeScale().applyOptions({ rightOffset: LayoutService.getRightOffset(chartData, state.chartCount), barSpacing: 8 });
            LayoutService.resetDefaultViewport(chartData, state.chartCount);
            chartData.chart.priceScale('right').applyOptions({ autoScale: true });
        }
    });

    const clickHandler = (param) => {
        if (chartData.justDragged) return; // Ignore native clicks resolving immediately after a drag
        
        if (chartData.replay && chartData.replay.status === 'selecting') {
            if (param.time) {
                ReplayService.Controller.start(chartData.id, param.time);
            }
            return;
        }

        if (!param.point || !chartData.candleSeries) return;
        
        if (window.drawingManager && (window.drawingManager.activeTool || window.drawingManager.activeDrawing)) {
            window.drawingManager.handleClick(chartData, param);
            return;
        }

        if (chartData.drawingMode) {
            const price = chartData.candleSeries.coordinateToPrice(param.point.y);
            const time = param.time;
            const logical = chartData.chart.timeScale().coordinateToLogical ? chartData.chart.timeScale().coordinateToLogical(param.point.x) : null;
            const id = Date.now().toString() + Math.random().toString().slice(2, 6);
            const key = chartData.symbol;
            if (!state.drawings[key]) state.drawings[key] = [];

            if (chartData.drawingMode === "hline") {
                if (price !== null) addHorizontalLine(chartData, price);
            } else if (chartData.drawingMode === "vline") {
                if (logical !== null || time !== undefined) {
                    const lineObj = { type: 'verticalLine', symbol: chartData.symbol, time: time, logical: logical, id: id, color: state.theme === 'light' ? '#3b82f6' : '#60a5fa', lineWidth: 2 };
                    state.drawings[key].push(lineObj);
                    StorageService.saveDrawings(state.drawings);
                    Object.values(state.charts).forEach(cd => {
                        if (cd.symbol === chartData.symbol) DrawingService.renderVerticalLine(cd, lineObj);
                    });
                }
            } else if (chartData.drawingMode === "buyMarker" || chartData.drawingMode === "sellMarker") {
                if (time) {
                    state.drawings[key].push({
                        type: chartData.drawingMode, symbol: chartData.symbol, time: time, price: price, id: id
                    });
                    StorageService.saveDrawings(state.drawings);
                    Object.values(state.charts).forEach(cd => {
                        if (cd.symbol === chartData.symbol) updateMarkers(cd);
                    });
                }
            } else if (chartData.drawingMode === "priceAlert") {
                if (price !== null) {
                    AlertService.AlertModal.open(chartData, price);
                }
            }
            
            if (window.setDrawingTool) {
                window.setDrawingTool('cursor');
            } else {
                Object.values(state.charts).forEach(cd => {
                    cd.drawingMode = null;
                    const container = document.getElementById(`${cd.id}-container`);
                    if (container) container.style.cursor = "default";
                });
            }
            return;
        }

        let clickedPrice = null;
        if (chartData.candleSeries) {
            clickedPrice = chartData.candleSeries.coordinateToPrice(param.point.y);
        }
        checkAndInteractWithLine(chartData, clickedPrice, param.time, param.point);
    };
    ChartLifecycleService.attach(chartData, { click: clickHandler });

    const crosshairMoveHandler = (param) => {
        if (window.drawingManager && window.drawingManager.activeDrawing) {
            window.drawingManager.handleCrosshairMove(chartData, param);
        }
        
        // Track if crosshair is hovering inside chart
        if (param && param.point) {
            chartData.hoverParam = param;
        } else {
            chartData.hoverParam = null;
        }
        
        updateChartLegend(chartData, param);
        
        if (state.isSyncingCrosshair) return;
        
        state.isSyncingCrosshair = true;
        try {
            handleCrosshairSync(chartData, param);
        } catch (err) {
            console.warn("Crosshair sync error:", err);
        } finally {
            state.isSyncingCrosshair = false;
        }
    };
    ChartLifecycleService.attach(chartData, { crosshairMove: crosshairMoveHandler });



    IndicatorService.createIndicators(chartData);

    chartData.futureWhitespaceSeries = chartData.chart.addLineSeries({
        visible: false,
        lastValueVisible: false,
        priceLineVisible: false
    });

    LayoutService.updateSubchartMargins(chartData);

    // Bind drawing handle drag events for the drawing manager
    if (window.drawingManager) {
        window.drawingManager.bindDragHandles(chartData);
    }

    // Attach right-click context menu to this chart
    ContextMenuService.attach(chartData);
    }

    return {
        initialize,
        build
    };
})();

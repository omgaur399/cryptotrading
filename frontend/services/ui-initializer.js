const UIInitializer = (() => {

    function bindChartCount(deps) {
        const { state, setChartCount } = deps;
        const chartCountEl = document.getElementById("chart-count");
        if (!chartCountEl) return;
        
        chartCountEl.value = String(state.chartCount);
        chartCountEl.addEventListener("change", event => {
            setChartCount(Number(event.target.value));
        });
    }

    function injectBacktestButton(deps) {
        const { openBacktestModal } = deps;
        const chartCountEl = document.getElementById("chart-count");
        if (chartCountEl && chartCountEl.parentNode) {
            const backtestBtn = document.createElement("button");
            backtestBtn.id = "global-backtest-btn";
            backtestBtn.className = "theme-btn";
            backtestBtn.textContent = "📊 Backtest";
            backtestBtn.style.marginLeft = "12px";
            backtestBtn.onclick = openBacktestModal;
            chartCountEl.parentNode.appendChild(backtestBtn);
        }
    }

    function bindTimezoneSelector(deps) {
        const { state, TimeUtils, updateTimestamp, StorageService } = deps;
        const tzSelect = document.getElementById("global-tz-select");
        if (tzSelect) {
            const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            tzSelect.innerHTML = `
                <option value="${localTz}">LCL</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">EST</option>
                <option value="Asia/Kolkata">IST</option>
            `;
            tzSelect.value = TimeUtils.timeZone;
            if (!tzSelect.value) tzSelect.value = localTz;
            
            const tzDisplay = document.getElementById("global-tz-display");
            if (tzDisplay) tzDisplay.textContent = tzSelect.options[tzSelect.selectedIndex].text;
            
            tzSelect.addEventListener("change", (e) => {
                TimeUtils.timeZone = e.target.value;
                if (tzDisplay) tzDisplay.textContent = tzSelect.options[tzSelect.selectedIndex].text;
                StorageService.saveTimeZone(e.target.value);
                Object.values(state.charts).forEach(chartData => {
                    if (chartData.chart) chartData.chart.applyOptions({ localization: { timeFormatter: TimeUtils.formatTooltip } });
                });
                updateTimestamp();
            });
        }
    }

    function injectThemeToggle(deps) {
        const { state, toggleTheme } = deps;
        const chartCountEl = document.getElementById("chart-count");
        
        const themeBtn = document.createElement("button");
        themeBtn.id = "theme-toggle";
        themeBtn.className = "toolbar-btn";
        themeBtn.title = "Toggle Light/Dark Mode";
        themeBtn.textContent = state.theme === "dark" ? "☀️" : "🌙";
        themeBtn.style.marginTop = "auto";
        themeBtn.style.marginBottom = "4px";
        themeBtn.onclick = toggleTheme;
        const drawingToolbar = document.getElementById("drawing-toolbar");
        if (drawingToolbar) {
            drawingToolbar.appendChild(themeBtn);
        } else if (chartCountEl && chartCountEl.parentNode) {
            chartCountEl.parentNode.appendChild(themeBtn);
        }
    }

    function injectResetGridButton(deps) {
        const { state, StorageService, renderGrid } = deps;
        const chartCountEl = document.getElementById("chart-count");
        if (chartCountEl && chartCountEl.parentNode) {
            const resetGridBtn = document.createElement("button");
            resetGridBtn.id = "reset-grid-btn";
            resetGridBtn.className = "theme-btn";
            resetGridBtn.title = "Reset chart grid to default equal sizes";
            resetGridBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>Reset Grid`;
            resetGridBtn.style.marginLeft = "8px";
            resetGridBtn.onclick = () => {
                try {
                    const raw = StorageService.getGridSizes();
                    if (raw) {
                        const all = JSON.parse(raw);
                        delete all[state.chartCount];
                        StorageService.saveGridSizes(all);
                    }
                } catch(e) {}
                renderGrid();
                resetGridBtn.textContent = '✓ Reset';
                resetGridBtn.style.color = 'var(--green)';
                setTimeout(() => {
                    resetGridBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>Reset Grid`;
                    resetGridBtn.style.color = '';
                }, 1200);
            };
            chartCountEl.parentNode.appendChild(resetGridBtn);
        }
    }

    function bindMarketTicker(deps) {
        const { state, WatchlistService, switchChartSymbol } = deps;
        const marketTicker = document.getElementById('market-ticker-container');
        if (marketTicker) {
            marketTicker.addEventListener('click', (e) => {
                const wlBtn = e.target.closest('.ticker-watchlist-btn');
                if (wlBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const symbol = wlBtn.getAttribute('data-symbol');
                    if (symbol) WatchlistService.toggleWatchlistSymbol(symbol);
                    return;
                }

                const moverItem = e.target.closest('.market-ticker-item');
                if (moverItem && moverItem.dataset.symbol) {
                    const symbol = moverItem.dataset.symbol;
                    const activeChartId = state.activeChartId || 'chart-1';
                    switchChartSymbol(activeChartId, symbol);
                }
            });
        }
    }

    function bindVisibilityChange(deps) {
        const { state, updateTicker, syncChartWithCache, updateCountdowns, fetchMarketMovers } = deps;
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) {
                Object.values(state.charts).forEach(chartData => {
                    if (chartData.lastPrice !== null) {
                        updateTicker(chartData, chartData.lastPrice, chartData.referencePrice);
                    }
                    syncChartWithCache(chartData);
                });
                updateCountdowns();
                fetchMarketMovers();
            }
        });
    }

    function bindSidebar(deps) {
        const { state, StorageService, fetchAndRenderAssetInfo, MarketWidgetService, ChartService } = deps;
        
        const sidebarToggleBtn = document.getElementById("sidebar-toggle-divider");
        const globalSidebar = document.getElementById("global-right-sidebar");
        
        if (sidebarToggleBtn && globalSidebar) {
            const isCollapsed = StorageService.getSidebarCollapsed();
            const arrowEl = sidebarToggleBtn.querySelector(".sidebar-toggle-arrow");
            if (isCollapsed) {
                globalSidebar.classList.add("collapsed");
                if (arrowEl) arrowEl.textContent = "◀";
            } else {
                globalSidebar.classList.remove("collapsed");
                if (arrowEl) arrowEl.textContent = "▶";
            }
            
            sidebarToggleBtn.addEventListener("click", () => {
                const willCollapse = !globalSidebar.classList.contains("collapsed");
                if (willCollapse) {
                    globalSidebar.classList.add("collapsed");
                    if (arrowEl) arrowEl.textContent = "◀";
                } else {
                    globalSidebar.classList.remove("collapsed");
                    if (arrowEl) arrowEl.textContent = "▶";
                    const activeChart = state.charts[state.activeChartId] || state.charts['chart-1'];
                    if (activeChart && activeChart.symbol !== 'none' && activeChart.symbol !== 'No Chart') {
                        fetchAndRenderAssetInfo(activeChart.symbol);
                        MarketWidgetService.OrderBook.updateHeader(activeChart.symbol);
                        if (window.paperTrading) {
                            window.paperTrading.setActiveSymbol(activeChart.symbol);
                        }
                    }
                }
                StorageService.saveSidebarCollapsed(willCollapse);
                
                setTimeout(() => {
                    Object.values(state.charts).forEach(cd => {
                        if (cd.chart) {
                            const el = document.getElementById(`${cd.id}-container`);
                            if (el) {
                                ChartService.resize(cd);
                            }
                        }
                    });
                }, 250);
            });
        }

        const sidebarTabs = document.querySelectorAll(".global-right-sidebar .sidebar-tab");
        const sidebarSlider = document.getElementById("sidebar-slider");
        if (sidebarTabs && sidebarSlider) {
            sidebarTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    sidebarTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const idx = tab.dataset.index;
                    sidebarSlider.style.transform = `translateX(-${(idx * 100) / 3}%)`;
                });
            });
        }
    }

    function bindChartSync(deps) {
        const { state, StorageService, syncTimeScales } = deps;
        
        const syncChartsBtn = document.getElementById("sync-charts-btn");
        state.syncCharts = StorageService.getSyncCharts();
        if (syncChartsBtn) {
            if (state.syncCharts) {
                syncChartsBtn.classList.add("active");
            } else {
                syncChartsBtn.classList.remove("active");
            }
            
            syncChartsBtn.addEventListener("click", () => {
                state.syncCharts = !state.syncCharts;
                if (state.syncCharts) {
                    syncChartsBtn.classList.add("active");
                    const activeChart = state.charts[state.activeChartId] || state.charts['chart-1'];
                    if (activeChart && activeChart.chart) {
                        const range = activeChart.chart.timeScale().getVisibleLogicalRange();
                        if (range) {
                            syncTimeScales(activeChart.id, range);
                        }
                    }
                } else {
                    syncChartsBtn.classList.remove("active");
                }
                StorageService.saveSyncCharts(state.syncCharts);
            });
        }

        const updateSyncBtnVisibility = () => {
            const btn = document.getElementById("sync-charts-btn");
            if (btn) btn.style.display = state.chartCount === 1 ? "none" : "";
        };
        updateSyncBtnVisibility();
        window._updateSyncBtnVisibility = updateSyncBtnVisibility;
    }

    function initialize(deps) {
        bindChartCount(deps);
        injectBacktestButton(deps);
        bindTimezoneSelector(deps);
        injectThemeToggle(deps);
        injectResetGridButton(deps);
        bindMarketTicker(deps);
        bindVisibilityChange(deps);
        bindSidebar(deps);
        bindChartSync(deps);
    }

    return { initialize };
})();

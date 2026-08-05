const GridManagerService = (function() {
    let deps = {};

    function initialize(injectedDeps) {
        deps = injectedDeps;
    }

    function getState() {
        return deps.state || window.state;
    }

    function getConfig() {
        return deps.CONFIG || window.CONFIG;
    }

    function getStorageService() {
        return deps.StorageService || window.StorageService;
    }

    function getLayoutService() {
        return deps.LayoutService || window.LayoutService;
    }

    function getChartBuilderService() {
        return deps.ChartBuilderService || window.ChartBuilderService;
    }

    function getChartDataService() {
        return deps.ChartDataService || window.ChartDataService;
    }

    function getChartService() {
        return deps.ChartService || window.ChartService;
    }

    function getMarketWidgetService() {
        return deps.MarketWidgetService || window.MarketWidgetService;
    }

    function getWatchlistService() {
        return deps.WatchlistService || window.WatchlistService;
    }

    function getReplayService() {
        return deps.ReplayService || window.ReplayService;
    }

    function getIndicatorService() {
        return deps.IndicatorService || window.IndicatorService;
    }

    function getOverlayService() {
        return deps.OverlayService || window.OverlayService;
    }

    function getDrawingManagerService() {
        return deps.DrawingManagerService || window.DrawingManagerService;
    }

    function getChartLegendService() {
        return deps.ChartLegendService || window.ChartLegendService;
    }

    function getApiService() {
        return deps.ApiService || window.ApiService;
    }

    function getTimeUtils() {
        return deps.TimeUtils || window.TimeUtils;
    }

    function getFormatPrice() {
        return deps.formatPrice || window.formatPrice;
    }

    function getAssetName(sym) {
        if (deps.getAssetName) return deps.getAssetName(sym);
        if (typeof window.getAssetName === 'function') return window.getAssetName(sym);
        return sym;
    }

    function readSavedChartCount() {
        const storageSvc = getStorageService();
        const cfg = getConfig();
        const saved = storageSvc ? storageSvc.getChartCount(0) : 0;
        const allowed = cfg ? cfg.ALLOWED_COUNTS : [1, 2, 3, 4, 6, 8];
        const defaultCount = cfg ? cfg.DEFAULT_CHART_COUNT : 1;
        return allowed.includes(saved) ? saved : defaultCount;
    }

    function getSavedLayoutState() {
        const storageSvc = getStorageService();
        return (storageSvc && storageSvc.getLayout()) || {};
    }

    function saveLayoutState() {
        const st = getState();
        const storageSvc = getStorageService();
        if (!st || !storageSvc) return;

        const layout = {};
        Object.values(st.charts || {}).forEach(chartData => {
            layout[chartData.id] = {
                symbol: chartData.symbol,
                interval: chartData.interval,
                chartType: chartData.chartType,
                indicators: chartData.indicators
            };
        });
        storageSvc.saveLayout(layout);
    }

    async function loadInstruments() {
        const st = getState();
        const apiSvc = getApiService();
        if (!st) return;

        let cryptoPairs = [];
        
        try {
            // Fetch the full active coin universe directly from Binance
            const data = apiSvc ? await apiSvc.getExchangeInfo() : null;
            if (data && data.symbols) {
                cryptoPairs = data.symbols
                    .filter(coin => coin.quoteAsset === 'USDT' && coin.status === 'TRADING')
                    .map(coin => coin.baseAsset);
                // Remove duplicates and sort alphabetically
                cryptoPairs = [...new Set(cryptoPairs)].sort();
            } else {
                throw new Error("No symbols returned");
            }
        } catch (error) {
            console.warn("Could not fetch live coin universe from Binance, using 130+ fallback list.", error);
            cryptoPairs = [
                "BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT",
                "POL", "TON", "SHIB", "LTC", "TRX", "NEAR", "APT", "ARB", "OP", "SUI",
                "INJ", "TIA", "RNDR", "SEI", "DYDX", "FIL", "KAS", "STX", "LDO", "FET",
                "RUNE", "WLD", "IMX", "HYPE", "PEPE", "WIF", "JUP", "PYTH", "BONK", "ORDI",
                "BCH", "ETC", "XMR", "XLM", "HBAR", "VET", "ALGO", "GRT", "EGLD", "AAVE",
                "SNX", "THETA", "EOS", "XTZ", "MANA", "SAND", "AXS", "GALA", "CRV", "MKR",
                "STRK", "ENA", "W", "ZETA", "ONDO", "AERO", "JTO", "ETHFI", "BOME", "MEW",
                "SLERF", "POPCAT", "PENGU", "OM", "TAO", "AR", "TRB", "SATS", "RATS", "ZIG",
                "MYRO", "NFP", "ALT", "AI", "XAI", "MANTA", "MEME", "ACE", "NTRN", "BIGTIME",
                "BLUR", "SUPER", "ILV", "BEAM", "MAGIC", "GMX", "COMP", "1INCH", "YFI", "SUSHI",
                "UNI", "CAKE", "SSV", "EDU", "ID", "HOOK", "LQTY", "FXS", "GNS", "PENDLE",
                "RDNT", "GTC", "BAND", "CYBER", "ARKM", "PORTAL", "PIXEL", "MAVIA", "GMT",
                "LUNA", "DASH", "ZEC", "IOTA", "NEO", "CHZ", "BAT", "ENJ", "ZIL", "KAVA",
                "RVN", "WAVES", "ONT", "ICX", "QTUM", "NANO", "OMG", "ZRX", "CELO", "BAL"
            ];
        }

        st.instruments = cryptoPairs.map(sym => ({
            id: sym,
            source: "hyperliquid",
            symbol: sym,
            name: getAssetName(sym),
            timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"]
        }));
    }

    function setChartCount(count) {
        const st = getState();
        const cfg = getConfig();
        const storageSvc = getStorageService();
        if (!st) return;

        const allowed = cfg ? cfg.ALLOWED_COUNTS : [1, 2, 3, 4, 6, 8];
        const defaultCount = cfg ? cfg.DEFAULT_CHART_COUNT : 1;
        const safeCount = allowed.includes(count) ? count : defaultCount;
        st.chartCount = safeCount;
        if (storageSvc) storageSvc.saveChartCount(safeCount);
        renderGrid();
        // Hide sync button in single-chart mode
        if (window._updateSyncBtnVisibility) window._updateSyncBtnVisibility();
    }

    function renderGrid() {
        const st = getState();
        const layoutSvc = getLayoutService();
        const chartBuilderSvc = getChartBuilderService();
        const chartDataSvc = getChartDataService();
        if (!st) return;

        const grid = document.getElementById("charts-grid");
        if (!grid) return;

        grid.className = `charts-grid layout-${st.chartCount}`;
        Object.values(st.charts || {}).forEach(chartData => {
            if (chartDataSvc && chartDataSvc.Live) chartDataSvc.Live.unsubscribe(chartData);
            if (window.ChartLifecycleService) window.ChartLifecycleService.detach(chartData);
            if (chartData.chart) chartData.chart.remove();
        });
        st.charts = {};
        st.activeChartId = null;

        grid.innerHTML = "";

        const savedLayout = getSavedLayoutState();

        for (let index = 1; index <= st.chartCount; index += 1) {
            const chartId = `chart-${index}`;
            
            const defaultConfigs = [
                { symbol: "BTC", interval: "1m" },
                { symbol: "BTC", interval: "5m" },
                { symbol: "BTC", interval: "15m" },
                { symbol: "BTC", interval: "1h" },
                { symbol: "BTC", interval: "4h" },
                { symbol: "BTC", interval: "1d" },
                { symbol: "none", interval: "1d" },
                { symbol: "none", interval: "1d" }
            ];
            const defaultConfig = defaultConfigs[(index - 1) % 8];
            const savedConfig = savedLayout[chartId] || {};
            
            let instrumentId = "none";
            let source = "none";
            let symbol = "No Chart";
            let interval = "1d";
            let targetSymbol = savedConfig.symbol || defaultConfig.symbol;
            let targetInterval = savedConfig.interval || defaultConfig.interval;
            let targetIndicators = savedConfig.indicators || {
                volume: true,
                sma1: false, sma2: false, sma3: false,
                ema1: false, ema2: false, ema3: false
            };

            if (targetIndicators.sma !== undefined && targetIndicators.sma1 === undefined) {
                targetIndicators.sma1 = targetIndicators.sma;
            }
            if (targetIndicators.ema !== undefined && targetIndicators.ema1 === undefined) {
                targetIndicators.ema1 = targetIndicators.ema;
            }

            // SMA 1 Defaults
            targetIndicators.sma1 = targetIndicators.sma1 || false;
            targetIndicators.sma1Period = targetIndicators.sma1Period || targetIndicators.smaPeriod || 20;
            targetIndicators.sma1Color = targetIndicators.sma1Color || targetIndicators.smaColor || '#f59e0b';
            targetIndicators.sma1LineWidth = targetIndicators.sma1LineWidth || targetIndicators.smaLineWidth || 1;

            // SMA 2 Defaults
            targetIndicators.sma2 = targetIndicators.sma2 || false;
            targetIndicators.sma2Period = targetIndicators.sma2Period || 50;
            targetIndicators.sma2Color = targetIndicators.sma2Color || '#10b981';
            targetIndicators.sma2LineWidth = targetIndicators.sma2LineWidth || 1;

            // SMA 3 Defaults
            targetIndicators.sma3 = targetIndicators.sma3 || false;
            targetIndicators.sma3Period = targetIndicators.sma3Period || 200;
            targetIndicators.sma3Color = targetIndicators.sma3Color || '#ef4444';
            targetIndicators.sma3LineWidth = targetIndicators.sma3LineWidth || 1;

            // EMA 1 Defaults
            targetIndicators.ema1 = targetIndicators.ema1 || false;
            targetIndicators.ema1Period = targetIndicators.ema1Period || targetIndicators.emaPeriod || 9;
            targetIndicators.ema1Color = targetIndicators.ema1Color || targetIndicators.emaColor || '#3b82f6';
            targetIndicators.ema1LineWidth = targetIndicators.ema1LineWidth || targetIndicators.emaLineWidth || 1;

            // EMA 2 Defaults
            targetIndicators.ema2 = targetIndicators.ema2 || false;
            targetIndicators.ema2Period = targetIndicators.ema2Period || 21;
            targetIndicators.ema2Color = targetIndicators.ema2Color || '#a855f7';
            targetIndicators.ema2LineWidth = targetIndicators.ema2LineWidth || 1;

            // EMA 3 Defaults
            targetIndicators.ema3 = targetIndicators.ema3 || false;
            targetIndicators.ema3Period = targetIndicators.ema3Period || 50;
            targetIndicators.ema3Color = targetIndicators.ema3Color || '#ec4899';
            targetIndicators.ema3LineWidth = targetIndicators.ema3LineWidth || 1;

            // Keep aliases for backward compatibility
            targetIndicators.sma = targetIndicators.sma1;
            targetIndicators.smaPeriod = targetIndicators.sma1Period;
            targetIndicators.smaColor = targetIndicators.sma1Color;
            targetIndicators.smaLineWidth = targetIndicators.sma1LineWidth;
            targetIndicators.ema = targetIndicators.ema1;
            targetIndicators.emaPeriod = targetIndicators.ema1Period;
            targetIndicators.emaColor = targetIndicators.ema1Color;
            targetIndicators.emaLineWidth = targetIndicators.ema1LineWidth;
            targetIndicators.bb = targetIndicators.bb || false;
            targetIndicators.bbPeriod = targetIndicators.bbPeriod || 20;
            targetIndicators.bbStdDev = targetIndicators.bbStdDev || 2;
            targetIndicators.bbColor = targetIndicators.bbColor || '#ec4899';
            targetIndicators.bbLineWidth = targetIndicators.bbLineWidth || 1;
            targetIndicators.rsi = targetIndicators.rsi || false;
            targetIndicators.rsiPeriod = targetIndicators.rsiPeriod || 14;
            targetIndicators.rsiColor = targetIndicators.rsiColor || '#8b5cf6';
            targetIndicators.rsiLineWidth = targetIndicators.rsiLineWidth || 2;
            targetIndicators.vwap = targetIndicators.vwap || false;
            targetIndicators.vwapColor = targetIndicators.vwapColor || '#ff6d00';
            targetIndicators.vwapLineWidth = targetIndicators.vwapLineWidth || 1;
            targetIndicators.atr = targetIndicators.atr || false;
            targetIndicators.atrPeriod = targetIndicators.atrPeriod || 14;
            targetIndicators.atrColor = targetIndicators.atrColor || '#2962ff';
            targetIndicators.atrLineWidth = targetIndicators.atrLineWidth || 2;
            
            if (targetSymbol !== "none" && targetSymbol !== "No Chart" && st.instruments) {
                const instrument = st.instruments.find(i => i.symbol === targetSymbol) || st.instruments.find(i => i.symbol === defaultConfig.symbol) || st.instruments[0];
                if (instrument) {
                    instrumentId = instrument.id;
                    source = instrument.source;
                    symbol = instrument.symbol;
                    interval = instrument.timeframes.includes(targetInterval) ? targetInterval : instrument.timeframes[0];
                }
            }

            let targetChartType = savedConfig.chartType || "candles";
            const chartData = window.StateManager ? window.StateManager.createChartState(
                chartId,
                instrumentId,
                source,
                symbol,
                interval,
                targetChartType,
                targetIndicators
            ) : { id: chartId, symbol, interval, chartType: targetChartType, indicators: targetIndicators };

            st.charts[chartId] = chartData;
            const pane = layoutSvc ? layoutSvc.createChartPane(chartData, index) : null;
            if (pane) {
                pane.addEventListener('click', () => setActiveChart(chartData.id));
                grid.appendChild(pane);
            }
            if (chartBuilderSvc) chartBuilderSvc.build(chartData);
            populatePaneControls(chartData);
            if (chartDataSvc && chartDataSvc.History) chartDataSvc.History.loadInitial(chartData);
        }

        const nextActive = st.charts[st.activeChartId] ? st.activeChartId : 'chart-1';
        setActiveChart(nextActive);

        // Reset inline styles before applying new layout to prevent bleed-over
        grid.style.gridTemplateColumns = '';
        grid.style.gridTemplateRows = '';

        // Restore saved grid sizes then attach drag handles
        const savedSizes = getSavedGridSizes(st.chartCount);
        if (savedSizes) {
            grid.style.gridTemplateColumns = savedSizes.cols;
            grid.style.gridTemplateRows    = savedSizes.rows;
        }
        if (st.chartCount > 1 && layoutSvc && layoutSvc.initGridResizeHandles) {
            layoutSvc.initGridResizeHandles(grid, st.chartCount, (cols, rows) => {
                saveGridSizes(st.chartCount, cols, rows);
                Object.values(st.charts).forEach(cd => {
                    if (cd.chart) try { cd.chart.applyOptions({}); } catch(err) {}
                });
            });
        }

        setActiveChart('chart-1');
    }

    function getSavedGridSizes(count) {
        const storageSvc = getStorageService();
        try {
            const raw = storageSvc ? storageSvc.getGridSizes() : null;
            if (!raw) return null;
            const all = JSON.parse(raw);
            return all[count] || null;
        } catch(e) { return null; }
    }

    function saveGridSizes(count, cols, rows) {
        const storageSvc = getStorageService();
        try {
            const raw = storageSvc ? storageSvc.getGridSizes() : null;
            const all = raw ? JSON.parse(raw) : {};
            all[count] = { cols, rows };
            if (storageSvc) storageSvc.saveGridSizes(all);
        } catch(e) {}
    }

    function populatePaneControls(chartData) {
        const st = getState();
        const layoutSvc = getLayoutService();
        const watchlistSvc = getWatchlistService();
        const chartDataSvc = getChartDataService();
        const replaySvc = getReplayService();
        const indicatorSvc = getIndicatorService();
        const overlaySvc = getOverlayService();

        const pane = document.getElementById(chartData.id);
        if (!pane) return;

        const input = pane.querySelector(".symbol-select-input");
        const dropdown = pane.querySelector(".custom-select-dropdown");
        const symbolContainer = pane.querySelector(".symbol-select-container");
        const intervalSelect = pane.querySelector(".interval-select");
        const indicatorSelect = pane.querySelector(".indicator-select");
        const goLiveBtn = pane.querySelector(`#${chartData.id}-go-live`);
        const replayToggleBtn = pane.querySelector(`#${chartData.id}-replay-toggle`);

        if (input) input.value = chartData.symbol;

        let highlightedIndex = -1;

        const renderOptions = (filter = "") => {
            const lowerFilter = filter.toLowerCase();
            const instruments = (st && st.instruments) || [];
            const filtered = instruments.filter(item => 
                item.symbol.toLowerCase().includes(lowerFilter) || 
                (item.name && item.name.toLowerCase().includes(lowerFilter))
            );
            let html = "";
            if ("no chart".includes(lowerFilter) || "none".includes(lowerFilter)) {
                html += `<div class="custom-select-option" data-id="none">
                    <span class="option-symbol">No Chart</span>
                </div>`;
            }
            const wlState = window.watchlistState;
            const wlList = (wlState && wlState.symbolsList) || [];
            html += filtered.map(item => {
                const inWl = wlList.includes(item.symbol);
                return `<div class="custom-select-option" data-id="${item.id}">
                    <span class="option-symbol">${item.symbol}</span>
                    <button class="option-watchlist-btn${inWl ? ' wl-active' : ''}" title="${inWl ? 'Remove from Watchlist' : 'Add to Watchlist'}" data-symbol="${item.symbol}">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>`;
            }).join("");
            if (dropdown) dropdown.innerHTML = html;
            highlightedIndex = -1;
        };

        const updateHighlight = () => {
            if (!dropdown) return;
            const options = dropdown.querySelectorAll(".custom-select-option");
            options.forEach((opt, idx) => {
                if (idx === highlightedIndex) {
                    opt.classList.add("highlighted");
                    opt.scrollIntoView({ block: "nearest" });
                } else {
                    opt.classList.remove("highlighted");
                }
            });
        };

        const openDropdown = () => {
            if (dropdown && !dropdown.classList.contains("show")) {
                renderOptions("");
                dropdown.classList.add("show");
                if (input) input.select();
            }
        };

        const closeDropdown = () => {
            if (dropdown) dropdown.classList.remove("show");
            if (input) {
                input.value = chartData.symbol;
                input.blur();
            }
        };

        if (input) {
            input.addEventListener("focus", openDropdown);
            input.addEventListener("click", () => {
                if (dropdown && dropdown.classList.contains("show")) {
                    input.select();
                }
            });
        }

        const chartTypeSelect = pane.querySelector(".chart-type-select");
        if (chartTypeSelect) {
            chartTypeSelect.value = chartData.chartType || "candles";
            chartTypeSelect.addEventListener("change", (e) => {
                chartData.chartType = e.target.value;
                changeChartType(chartData);
                saveLayoutState();
            });
        }

        const screenshotBtn = pane.querySelector(`#${chartData.id}-screenshot`);
        if (screenshotBtn) {
            screenshotBtn.addEventListener("click", () => {
                if (chartData.chart) {
                    const canvas = chartData.chart.takeScreenshot();
                    const link = document.createElement('a');
                    link.download = `${chartData.symbol !== 'none' ? chartData.symbol : 'chart'}-${chartData.interval}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }
            });
        }

        const paneWatchlistBtn = pane.querySelector(".pane-watchlist-btn");
        if (paneWatchlistBtn) {
            // Set initial active state
            const sym0 = chartData.symbol;
            const wlState = window.watchlistState;
            if (sym0 && sym0 !== 'none' && wlState && wlState.symbolsList && wlState.symbolsList.includes(sym0)) {
                paneWatchlistBtn.classList.add('wl-active');
                paneWatchlistBtn.title = 'Remove from Watchlist';
            }

            paneWatchlistBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const symbol = chartData.symbol;
                if (symbol && symbol !== "No Chart" && symbol !== "none" && watchlistSvc) {
                    watchlistSvc.toggleWatchlistSymbol(symbol);
                }
            });
        }

        if (goLiveBtn) {
            goLiveBtn.addEventListener("click", () => {
                if (chartData.chart && layoutSvc) {
                    chartData.customPriceOffset = 0;
                    // Reset zoom (barSpacing) and right margin
                    chartData.chart.timeScale().applyOptions({ rightOffset: layoutSvc.getRightOffset(chartData, st.chartCount), barSpacing: 8 });
                    layoutSvc.scrollToNewestActualCandle(chartData, st.chartCount);
                    chartData.chart.priceScale('right').applyOptions({ autoScale: true });
                }
            });
        }

        if (replayToggleBtn) {
            replayToggleBtn.addEventListener("click", () => {
                if (replaySvc && replaySvc.Controller) {
                    replaySvc.Controller.toggle(chartData.id);
                }
            });
        }

        if (input) {
            input.addEventListener("input", (e) => {
                if (dropdown) dropdown.classList.add("show");
                renderOptions(e.target.value);
            });

            input.addEventListener("keydown", (e) => {
                if (!dropdown) return;
                const options = dropdown.querySelectorAll(".custom-select-option");
                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (!dropdown.classList.contains("show")) {
                        openDropdown();
                    } else {
                        highlightedIndex = (highlightedIndex + 1) % options.length;
                        updateHighlight();
                    }
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    if (!dropdown.classList.contains("show")) {
                        openDropdown();
                    } else {
                        highlightedIndex = (highlightedIndex - 1 + options.length) % options.length;
                        updateHighlight();
                    }
                } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (dropdown.classList.contains("show")) {
                        let selectedOption = null;
                        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
                            selectedOption = options[highlightedIndex];
                        } else if (options.length > 0) {
                            selectedOption = options[0];
                        }
                        
                        if (selectedOption) {
                            const selectedId = selectedOption.getAttribute("data-id");
                            if (selectedId === "none") {
                                switchChartSymbol(chartData.id, 'none');
                            } else {
                                const instrument = st.instruments.find(item => item.id === selectedId);
                                if (instrument) switchChartSymbol(chartData.id, instrument.symbol);
                            }
                            closeDropdown();
                        }
                    }
                } else if (e.key === "Escape") {
                    closeDropdown();
                }
            });
        }

        if (dropdown) {
            dropdown.addEventListener("click", (e) => {
                const wlBtn = e.target.closest(".option-watchlist-btn");
                if (wlBtn) {
                    e.preventDefault();
                    e.stopPropagation();
                    const symbol = wlBtn.getAttribute("data-symbol");
                    if (symbol && watchlistSvc) watchlistSvc.toggleWatchlistSymbol(symbol);
                    return;
                }

                const option = e.target.closest(".custom-select-option");
                if (option) {
                    e.preventDefault();
                    e.stopPropagation();
                    const selectedId = option.getAttribute("data-id");
                    
                    if (selectedId === "none") {
                        switchChartSymbol(chartData.id, 'none');
                    } else {
                        const instrument = st.instruments.find(item => item.id === selectedId);
                        if (instrument) {
                            switchChartSymbol(chartData.id, instrument.symbol);
                        }
                    }
                    closeDropdown();
                }
            });
        }

        if (intervalSelect) {
            updateIntervalOptions(chartData, intervalSelect);

            intervalSelect.addEventListener("change", async () => {
                const wasReplaying = chartData.replay && chartData.replay.active && chartData.replay.status === 'active';
                let replayTime = null;
                if (wasReplaying) {
                    const currentCandle = chartData.replay.fullData[chartData.replay.currentIndex];
                    if (currentCandle) replayTime = currentCandle.time;
                    if (chartData.replay.timer) clearTimeout(chartData.replay.timer);
                }

                if (chartDataSvc && chartDataSvc.Live) chartDataSvc.Live.unsubscribe(chartData);
                chartData.interval = intervalSelect.value;
                resetChart(chartData);
                if (chartDataSvc && chartDataSvc.History) await chartDataSvc.History.loadInitial(chartData);
                
                if (wasReplaying && replaySvc && replaySvc.Controller) {
                    chartData.replay.fullData = [...chartData.cachedData];
                    replaySvc.Controller.start(chartData.id, replayTime);
                }

                saveLayoutState();
            });
        }

        if (indicatorSelect) {
            indicatorSelect.addEventListener("change", (e) => {
                const indicator = e.target.value;
                const updateVpvr = deps.updateVpvrMarginAndScroll || window.updateVpvrMarginAndScroll;
                
                if (indicator === "vpvr") {
                    chartData.indicators.vpvr = !chartData.indicators.vpvr;
                    if (updateVpvr) updateVpvr(chartData);
                    e.target.options[12].text = `Vol Profile (${chartData.indicators.vpvr ? 'On' : 'Off'})`;
                } else if (indicator === "sessions") {
                    chartData.indicators.sessions = !chartData.indicators.sessions;
                    if (overlaySvc && overlaySvc.SessionBands) {
                        if (chartData.indicators.sessions) {
                            overlaySvc.SessionBands.draw(chartData);
                        } else {
                            overlaySvc.SessionBands.clear(chartData);
                        }
                    }
                    e.target.options[13].text = `Sessions (${chartData.indicators.sessions ? 'On' : 'Off'})`;
                } else {
                    // Update the state
                    if (indicator === "volume") chartData.indicators.volume = !chartData.indicators.volume;
                    else if (indicator === "sma1") { chartData.indicators.sma1 = !chartData.indicators.sma1; chartData.indicators.sma = chartData.indicators.sma1; }
                    else if (indicator === "sma2") chartData.indicators.sma2 = !chartData.indicators.sma2;
                    else if (indicator === "sma3") chartData.indicators.sma3 = !chartData.indicators.sma3;
                    else if (indicator === "ema1") { chartData.indicators.ema1 = !chartData.indicators.ema1; chartData.indicators.ema = chartData.indicators.ema1; }
                    else if (indicator === "ema2") chartData.indicators.ema2 = !chartData.indicators.ema2;
                    else if (indicator === "ema3") chartData.indicators.ema3 = !chartData.indicators.ema3;
                    else if (indicator === "bb") chartData.indicators.bb = !chartData.indicators.bb;
                    else if (indicator === "rsi") chartData.indicators.rsi = !chartData.indicators.rsi;
                    else if (indicator === "vwap") chartData.indicators.vwap = !chartData.indicators.vwap;
                    else if (indicator === "atr") chartData.indicators.atr = !chartData.indicators.atr;
                    
                    if (indicatorSvc) indicatorSvc.toggleIndicatorVisibility(chartData, indicator);
                    
                    // If turning on, we might need to populate data
                    const isOn = chartData.indicators[indicator] || (indicator === 'sma1' && chartData.indicators.sma) || (indicator === 'ema1' && chartData.indicators.ema);
                    if (isOn && indicatorSvc) {
                        indicatorSvc.updateAllIndicatorData(chartData);
                    }
                    
                    if ((indicator === "volume" || indicator === "rsi" || indicator === "atr") && layoutSvc) {
                        layoutSvc.updateSubchartMargins(chartData);
                    }

                    // Update text
                    const textMap = {
                        "volume": `Volume (${chartData.indicators.volume ? 'On' : 'Off'})`,
                        "sma1": `SMA 1 (${chartData.indicators.sma1Period}) (${chartData.indicators.sma1 ? 'On' : 'Off'})`,
                        "sma2": `SMA 2 (${chartData.indicators.sma2Period}) (${chartData.indicators.sma2 ? 'On' : 'Off'})`,
                        "sma3": `SMA 3 (${chartData.indicators.sma3Period}) (${chartData.indicators.sma3 ? 'On' : 'Off'})`,
                        "ema1": `EMA 1 (${chartData.indicators.ema1Period}) (${chartData.indicators.ema1 ? 'On' : 'Off'})`,
                        "ema2": `EMA 2 (${chartData.indicators.ema2Period}) (${chartData.indicators.ema2 ? 'On' : 'Off'})`,
                        "ema3": `EMA 3 (${chartData.indicators.ema3Period}) (${chartData.indicators.ema3 ? 'On' : 'Off'})`,
                        "bb": `BB ${chartData.indicators.bbPeriod} (${chartData.indicators.bb ? 'On' : 'Off'})`,
                        "rsi": `RSI ${chartData.indicators.rsiPeriod} (${chartData.indicators.rsi ? 'On' : 'Off'})`,
                        "vwap": `VWAP (${chartData.indicators.vwap ? 'On' : 'Off'})`,
                        "atr": `ATR ${chartData.indicators.atrPeriod} (${chartData.indicators.atr ? 'On' : 'Off'})`
                    };
                    
                    const indexMap = { "volume": 1, "sma1": 2, "sma2": 3, "sma3": 4, "ema1": 5, "ema2": 6, "ema3": 7, "bb": 8, "rsi": 9, "vwap": 10, "atr": 11 };
                    if (indexMap[indicator]) {
                        e.target.options[indexMap[indicator]].text = textMap[indicator];
                    }
                }
                e.target.value = ""; // Reset the dropdown back to the "ƒx" placeholder
                saveLayoutState();
            });
        }
    }

    function updateIntervalOptions(chartData, intervalSelect) {
        const st = getState();
        const instruments = (st && st.instruments) || [];
        const instrument = instruments.find(item => item.id === chartData.instrumentId);
        const intervals = instrument ? instrument.timeframes : ["1d"];
        if (intervalSelect) {
            intervalSelect.innerHTML = intervals.map(interval => `<option value="${interval}">${interval}</option>`).join("");
            intervalSelect.value = chartData.interval;
        }
    }

    function changeChartType(chartData) {
        const chartSvc = getChartService();
        const chartDataSvc = getChartDataService();
        const drawingMgrSvc = getDrawingManagerService();
        const updateFormat = deps.updateChartPriceFormat || window.updateChartPriceFormat;

        if (chartSvc) chartSvc.changeType(chartData);
        
        if (chartData.lastPrice && updateFormat) updateFormat(chartData, chartData.lastPrice);

        if (chartDataSvc && chartDataSvc.Render) chartDataSvc.Render.syncCache(chartData);
        if (drawingMgrSvc) {
            drawingMgrSvc.restoreDrawings(chartData);
            drawingMgrSvc.restorePrimitiveDrawings(chartData);
        }
        if (window.paperTrading && window.paperTrading.updatePositionLines) window.paperTrading.updatePositionLines(chartData);
    }

    function resetChart(chartData) {
        const drawingSvc = window.DrawingService;
        const legendSvc = getChartLegendService();

        chartData.isFetchingHistory = false;
        chartData.hasReachedBeginning = false;
        chartData.customPriceOffset = 0;
        chartData.currentCandle = null;
        chartData.lastPrice = null;
        chartData.referencePrice = null;
        chartData.liveSubscribed = false;
        chartData.cachedData = [];
        chartData.isSyncedCrosshairActive = false;
        if (chartData.candleSeries) chartData.candleSeries.setData([]);
        if (chartData.volumeSeries) chartData.volumeSeries.setData([]);
        if (chartData.smaSeries) chartData.smaSeries.setData([]);
        if (chartData.emaSeries) chartData.emaSeries.setData([]);
        if (chartData.bbUpperSeries) chartData.bbUpperSeries.setData([]);
        if (chartData.bbMiddleSeries) chartData.bbMiddleSeries.setData([]);
        if (chartData.bbLowerSeries) chartData.bbLowerSeries.setData([]);
        if (chartData.rsiSeries) chartData.rsiSeries.setData([]);
        if (chartData.vwapSeries) chartData.vwapSeries.setData([]);
        if (chartData.atrSeries) chartData.atrSeries.setData([]);
        if (chartData.futureWhitespaceSeries) chartData.futureWhitespaceSeries.setData([]);
        
        chartData.drawingMode = null;
        const container = document.getElementById(`${chartData.id}-container`);
        if (container) container.style.cursor = "default";

        if (chartData.renderedDrawings && chartData.candleSeries) {
            Object.values(chartData.renderedDrawings).forEach(pl => {
                if (pl instanceof HTMLElement) {
                    pl.remove();
                } else {
                    try {
                        chartData.candleSeries.removePriceLine(pl);
                    } catch(e) {}
                }
            });
            chartData.renderedDrawings = {};
        }
        if (drawingSvc) drawingSvc.cleanupVerticalLines(chartData);

        if (legendSvc) {
            legendSvc.setPaneMessage(chartData.id, chartData.instrumentId === "none" ? "No Chart Selected" : "Loading");
            legendSvc.updateTicker(chartData, null, null);
        }
    }

    function setActiveChart(chartId) {
        const st = getState();
        const marketWidgetSvc = getMarketWidgetService();
        if (!st || st.activeChartId === chartId || !st.charts[chartId]) return;

        const oldActiveId = st.activeChartId;
        if (oldActiveId) {
            const oldPane = document.getElementById(oldActiveId);
            if (oldPane) oldPane.classList.remove('active-chart');
            
            // Unsubscribe from previous L2 Book
            const oldChartData = st.charts[oldActiveId];
            if (oldChartData && oldChartData.l2Subscribed && st.hlWs && st.hlWs.readyState === WebSocket.OPEN) {
                st.hlWs.send(JSON.stringify({
                    method: "unsubscribe",
                    subscription: { type: "l2Book", coin: oldChartData.symbol }
                }));
                oldChartData.l2Subscribed = false;
            }
        }

        st.activeChartId = chartId;
        const newPane = document.getElementById(chartId);
        if (newPane) newPane.classList.add('active-chart');

        updateMarketMoverHighlights();
        
        const chartData = st.charts[chartId];
        if (chartData && chartData.symbol !== 'none' && chartData.symbol !== 'No Chart' && marketWidgetSvc) {
            marketWidgetSvc.fetchAndRenderAssetInfo(chartData.symbol);
            if (marketWidgetSvc.OrderBook) marketWidgetSvc.OrderBook.updateHeader(chartData.symbol);
            
            // Subscribe to new active chart L2 Book
            if (st.hlWs && st.hlWs.readyState === WebSocket.OPEN) {
                st.hlWs.send(JSON.stringify({
                    method: "subscribe",
                    subscription: { type: "l2Book", coin: chartData.symbol }
                }));
                chartData.l2Subscribed = true;
            }
        }
        
        if (window.paperTrading && chartData) {
            window.paperTrading.setActiveSymbol(chartData.symbol);
        }
    }

    function updateMarketMoverHighlights() {
        const st = getState();
        const activeChart = st ? st.charts[st.activeChartId] : null;
        const activeSymbol = activeChart ? activeChart.symbol : null;

        document.querySelectorAll('.market-ticker-item').forEach(item => {
            item.classList.toggle('active-mover', item.dataset.symbol === activeSymbol);
        });
    }

    function switchChartSymbol(chartId, newSymbol) {
        const st = getState();
        const chartDataSvc = getChartDataService();
        const replaySvc = getReplayService();
        const marketWidgetSvc = getMarketWidgetService();

        if (!st) return;
        const chartData = st.charts[chartId];
        if (!chartData || chartData.symbol === newSymbol) return;

        if (chartData.replay && chartData.replay.active && replaySvc && replaySvc.Controller) {
            replaySvc.Controller.exit(chartId);
        }

        if (newSymbol === 'none') {
            if (chartData.instrumentId === 'none') return;
            if (chartDataSvc && chartDataSvc.Live) chartDataSvc.Live.unsubscribe(chartData);
            chartData.instrumentId = "none";
            chartData.source = "none";
            chartData.symbol = "No Chart";

            const pane = document.getElementById(chartId);
            if (pane) {
                const input = pane.querySelector(".symbol-select-input");
                if (input) input.value = chartData.symbol;
            }

            resetChart(chartData);
            saveLayoutState();
            
            if (st.activeChartId === chartId && marketWidgetSvc) {
                if (marketWidgetSvc.AssetInfo) marketWidgetSvc.AssetInfo.clear();
                if (marketWidgetSvc.OrderBook) {
                    marketWidgetSvc.OrderBook.clear();
                    marketWidgetSvc.OrderBook.updateHeader('none');
                }
            }
            updateMarketMoverHighlights();
            return;
        }

        const instruments = st.instruments || [];
        const instrument = instruments.find(item => item.symbol === newSymbol);
        if (!instrument) {
            console.warn(`Instrument not found for symbol: ${newSymbol}`);
            return;
        }

        if (chartDataSvc && chartDataSvc.Live) chartDataSvc.Live.unsubscribe(chartData);
        chartData.instrumentId = instrument.id;
        chartData.source = instrument.source;
        chartData.symbol = instrument.symbol;
        chartData.interval = instrument.timeframes.includes(chartData.interval)
            ? chartData.interval
            : instrument.timeframes[0];

        const pane = document.getElementById(chartId);
        if (pane) {
            const input = pane.querySelector(".symbol-select-input");
            if (input) input.value = chartData.symbol;

            const intervalSelect = pane.querySelector(".interval-select");
            if (intervalSelect) updateIntervalOptions(chartData, intervalSelect);
        }

        resetChart(chartData);
        if (chartDataSvc && chartDataSvc.History) chartDataSvc.History.loadInitial(chartData);
        saveLayoutState();

        if (st.activeChartId === chartId && marketWidgetSvc) {
            if (marketWidgetSvc.OrderBook) marketWidgetSvc.OrderBook.clear();
            marketWidgetSvc.fetchAndRenderAssetInfo(chartData.symbol);
        }

        updateMarketMoverHighlights();

        if (window.paperTrading && st.activeChartId === chartId) {
            window.paperTrading.setActiveSymbol(newSymbol);
        }
    }

    // Expose backward-compatible global methods
    window.setChartCount = setChartCount;
    window.renderGrid = renderGrid;
    window.switchChartSymbol = switchChartSymbol;
    window.setActiveChart = setActiveChart;
    window.saveLayoutState = saveLayoutState;
    window.resetChart = resetChart;

    return {
        initialize,
        readSavedChartCount,
        getSavedLayoutState,
        saveLayoutState,
        loadInstruments,
        setChartCount,
        renderGrid,
        getSavedGridSizes,
        saveGridSizes,
        populatePaneControls,
        updateIntervalOptions,
        changeChartType,
        resetChart,
        setActiveChart,
        updateMarketMoverHighlights,
        switchChartSymbol
    };
})();

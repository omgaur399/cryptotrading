const CONFIG = {
    API_BASE: "/api",
    STORAGE_KEY: "trading-dashboard-chart-count",
    LAYOUT_STORAGE_KEY: "trading-dashboard-layout",
    THEME_STORAGE_KEY: "trading-dashboard-theme",
    DEFAULT_CHART_COUNT: 4,
    ALLOWED_COUNTS: [1, 2, 4, 6, 8],
};

const TimeUtils = {
    timeZone: "Asia/Kolkata",

    _getMs: (time) => {
        // Lightweight Charts may pass a BusinessDay object for 1d+ timeframes or Unix timestamps (seconds)
        if (typeof time === "object" && time.year) {
            return Date.UTC(time.year, time.month - 1, time.day);
        }
        return time * 1000;
    },

    formatTooltip: (time) => {
        const date = new Date(TimeUtils._getMs(time));
        return date.toLocaleString("en-IN", {
            timeZone: TimeUtils.timeZone,
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }) + " (IST)";
    },

    formatAxis: (time, tickMarkType) => {
        const date = new Date(TimeUtils._getMs(time));
        // tickMarkType maps to zoom level: 0: Year, 1: Month, 2: DayOfMonth, 3: Time, 4: TimeWithSeconds
        switch (tickMarkType) {
            case 0: return date.toLocaleString("en-IN", { timeZone: TimeUtils.timeZone, year: "numeric" });
            case 1: return date.toLocaleString("en-IN", { timeZone: TimeUtils.timeZone, month: "short", year: "numeric" });
            case 2: return date.toLocaleString("en-IN", { timeZone: TimeUtils.timeZone, day: "numeric", month: "short" });
            case 3:
            case 4: return date.toLocaleString("en-IN", { timeZone: TimeUtils.timeZone, hour: "2-digit", minute: "2-digit", hour12: false });
            default: return date.toLocaleString("en-IN", { timeZone: TimeUtils.timeZone, month: "short", day: "numeric" });
        }
    },

    getCurrentTime: () => {
        return new Date().toLocaleTimeString("en-IN", { timeZone: TimeUtils.timeZone, hour12: true }) + " (IST)";
    }
};

const state = {
    chartCount: CONFIG.DEFAULT_CHART_COUNT,
    instruments: [],
    charts: {},
    liveStream: null,
    connected: false,
    theme: "dark",
};

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
    state.theme = localStorage.getItem(CONFIG.THEME_STORAGE_KEY) || "dark";
    if (state.theme === "light") document.body.classList.add("light-theme");
    injectThemeStyles();

    state.chartCount = readSavedChartCount();
    document.getElementById("chart-count").value = String(state.chartCount);
    document.getElementById("chart-count").addEventListener("change", event => {
        setChartCount(Number(event.target.value));
    });

    const chartCountEl = document.getElementById("chart-count");
    if (chartCountEl && chartCountEl.parentNode) {
        const themeBtn = document.createElement("button");
        themeBtn.id = "theme-toggle";
        themeBtn.className = "theme-btn";
        themeBtn.textContent = state.theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
        themeBtn.style.marginLeft = "12px";
        themeBtn.onclick = toggleTheme;
        chartCountEl.parentNode.appendChild(themeBtn);
    }

    connectLiveStream();
    await loadInstruments();
    sortDefaultInstruments();
    renderGrid();
    updateTimestamp();
    setInterval(updateCountdowns, 1000);
    setInterval(updateTimestamp, 1000);

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            Object.values(state.charts).forEach(chartData => {
                if (chartData.lastPrice !== null) {
                    updateTicker(chartData, chartData.lastPrice, chartData.referencePrice);
                }
            });
            updateCountdowns();
        }
    });
}

function readSavedChartCount() {
    const saved = Number(localStorage.getItem(CONFIG.STORAGE_KEY));
    return CONFIG.ALLOWED_COUNTS.includes(saved) ? saved : CONFIG.DEFAULT_CHART_COUNT;
}

function getSavedLayoutState() {
    try {
        const saved = localStorage.getItem(CONFIG.LAYOUT_STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch (e) {
        return {};
    }
}

function saveLayoutState() {
    const layout = {};
    Object.values(state.charts).forEach(chartData => {
        layout[chartData.id] = {
            symbol: chartData.symbol,
            interval: chartData.interval,
            indicators: chartData.indicators
        };
    });
    localStorage.setItem(CONFIG.LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}

async function loadInstruments() {
    const response = await fetch(`${CONFIG.API_BASE}/instruments`);
    if (!response.ok) throw new Error("Unable to load instruments");
    const instruments = await response.json();
    state.instruments = instruments.filter(item => item.source === "hyperliquid");
    if (!state.instruments.length) throw new Error("No Hyperliquid instruments available");
}

function sortDefaultInstruments() {
    const order = [
        "BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "LINK", "DOT",
        "MATIC", "TON", "SHIB", "LTC", "TRX", "NEAR", "APT", "ARB", "OP", "SUI",
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

    state.instruments.sort((left, right) => {
        const indexLeft = order.indexOf(left.symbol);
        const indexRight = order.indexOf(right.symbol);
        
        if (indexLeft !== -1 && indexRight !== -1) return indexLeft - indexRight;
        if (indexLeft !== -1) return -1;
        if (indexRight !== -1) return 1;
        return left.symbol.localeCompare(right.symbol);
    });
}

function connectLiveStream() {
    if (!window.EventSource) {
        updateConnectionStatus(false);
        return;
    }

    state.liveStream = new EventSource(`${CONFIG.API_BASE}/live`);
    state.liveStream.onopen = () => updateConnectionStatus(true);
    state.liveStream.onerror = () => updateConnectionStatus(false);
    state.liveStream.onmessage = event => {
        if (!event.data) return;
        handlePriceUpdate(JSON.parse(event.data));
    };
}

function setChartCount(count) {
    const safeCount = CONFIG.ALLOWED_COUNTS.includes(count) ? count : CONFIG.DEFAULT_CHART_COUNT;
    state.chartCount = safeCount;
    localStorage.setItem(CONFIG.STORAGE_KEY, String(safeCount));
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById("charts-grid");
    grid.className = `charts-grid layout-${state.chartCount}`;
    grid.innerHTML = "";

    Object.values(state.charts).forEach(chartData => {
        if (chartData.chart) chartData.chart.remove();
    });
    state.charts = {};

    const savedLayout = getSavedLayoutState();

    for (let index = 1; index <= state.chartCount; index += 1) {
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
            volume: true, sma: false, ema: false, smaPeriod: 20, emaPeriod: 20
        };
        
        if (targetSymbol !== "none" && targetSymbol !== "No Chart") {
            const instrument = state.instruments.find(i => i.symbol === targetSymbol) || state.instruments.find(i => i.symbol === defaultConfig.symbol) || state.instruments[0];
            if (instrument) {
                instrumentId = instrument.id;
                source = instrument.source;
                symbol = instrument.symbol;
                interval = instrument.timeframes.includes(targetInterval) ? targetInterval : instrument.timeframes[0];
            }
        }

        const chartData = {
            id: chartId,
            instrumentId: instrumentId,
            source: source,
            symbol: symbol,
            interval: interval,
            chart: null,
            candleSeries: null,
            volumeSeries: null,
            smaSeries: null,
            emaSeries: null,
            cachedData: [],
            currentCandle: null,
            lastPrice: null,
            referencePrice: null,
            liveSubscribed: false,
            lastDirection: 'up',
            indicators: targetIndicators,
        };

        state.charts[chartId] = chartData;
        grid.appendChild(createChartPane(chartData, index));
        initializeChart(chartData);
        populatePaneControls(chartData);
        loadChartData(chartData);
    }
}

function createChartPane(chartData, index) {
    const pane = document.createElement("section");
    pane.className = "chart-pane";
    pane.id = chartData.id;

    const volText = chartData.indicators.volume ? "On" : "Off";
    const smaText = chartData.indicators.sma ? "On" : "Off";
    const emaText = chartData.indicators.ema ? "On" : "Off";

    pane.innerHTML = `
        <div class="pane-header" id="${chartData.id}-ticker">
            <div class="pane-ticker">
                <span class="ticker-symbol">Pane ${index}</span>
                <span class="ticker-price">--</span>
                <span class="ticker-change">--</span>
            </div>
            <div class="pane-controls">
                <div class="symbol-select-container">
                    <input type="text" class="symbol-select-input" placeholder="Search..." aria-label="Symbol Search" autocomplete="off">
                    <div class="custom-select-dropdown"></div>
                </div>
                <select class="pane-select interval-select" aria-label="Timeframe"></select>
                <select class="pane-select indicator-select" aria-label="Indicators">
                    <option value="" disabled selected>Indicators</option>
                    <option value="volume">Volume (${volText})</option>
                    <option value="sma">SMA ${chartData.indicators.smaPeriod} (${smaText})</option>
                    <option value="ema">EMA ${chartData.indicators.emaPeriod} (${emaText})</option>
                </select>
            </div>
        </div>
        <div class="chart-container" id="${chartData.id}-container">
            <div class="chart-message">Loading</div>
            <div class="countdown-timer" id="${chartData.id}-timer"></div>
        </div>
    `;
    return pane;
}

function populatePaneControls(chartData) {
    const pane = document.getElementById(chartData.id);
    const input = pane.querySelector(".symbol-select-input");
    const dropdown = pane.querySelector(".custom-select-dropdown");
    const intervalSelect = pane.querySelector(".interval-select");
    const indicatorSelect = pane.querySelector(".indicator-select");

    input.value = chartData.symbol;

    const renderOptions = (filter = "") => {
        const lowerFilter = filter.toLowerCase();
        const filtered = state.instruments.filter(item => 
            item.symbol.toLowerCase().includes(lowerFilter)
        );
        let html = "";
        if ("no chart".includes(lowerFilter) || "none".includes(lowerFilter)) {
            html += `<div class="custom-select-option" data-id="none">No Chart</div>`;
        }
        html += filtered.map(item => 
            `<div class="custom-select-option" data-id="${item.id}">${item.symbol}</div>`
        ).join("");
        dropdown.innerHTML = html;
    };

    input.addEventListener("focus", () => {
        input.value = "";
        renderOptions();
        dropdown.classList.add("show");
    });

    input.addEventListener("input", (e) => {
        renderOptions(e.target.value);
    });

    input.addEventListener("blur", () => {
        // Short delay allows the click event on the dropdown to fire before it disappears
        setTimeout(() => {
            dropdown.classList.remove("show");
            input.value = chartData.symbol;
        }, 150);
    });

    dropdown.addEventListener("click", (e) => {
        if (e.target.classList.contains("custom-select-option")) {
            const selectedId = e.target.getAttribute("data-id");
            
            if (selectedId === "none") {
                if (chartData.instrumentId !== "none") {
                    unsubscribeChart(chartData);
                    chartData.instrumentId = "none";
                    chartData.source = "none";
                    chartData.symbol = "No Chart";
                    resetChart(chartData);
                    saveLayoutState();
                }
            } else {
                const instrument = state.instruments.find(item => item.id === selectedId);
                
                if (instrument && instrument.id !== chartData.instrumentId) {
                    unsubscribeChart(chartData);
                    chartData.instrumentId = instrument.id;
                    chartData.source = instrument.source;
                    chartData.symbol = instrument.symbol;
                    chartData.interval = instrument.timeframes.includes(chartData.interval)
                        ? chartData.interval
                        : instrument.timeframes[0];
                    updateIntervalOptions(chartData, intervalSelect);
                    resetChart(chartData);
                    loadChartData(chartData);
                    saveLayoutState();
                }
            }
            input.value = chartData.symbol;
            dropdown.classList.remove("show");
        }
    });

    updateIntervalOptions(chartData, intervalSelect);

    intervalSelect.addEventListener("change", () => {
        unsubscribeChart(chartData);
        chartData.interval = intervalSelect.value;
        resetChart(chartData);
        loadChartData(chartData);
        saveLayoutState();
    });

    indicatorSelect.addEventListener("change", (e) => {
        const indicator = e.target.value;
        if (indicator === "volume") {
            chartData.indicators.volume = !chartData.indicators.volume;
            if (chartData.volumeSeries) {
                chartData.volumeSeries.applyOptions({ visible: chartData.indicators.volume });
            }
            e.target.options[1].text = `Volume (${chartData.indicators.volume ? 'On' : 'Off'})`;
        } else if (indicator === "sma") {
            if (!chartData.indicators.sma) {
                const input = prompt("Enter period for SMA:", chartData.indicators.smaPeriod);
                const period = parseInt(input, 10);
                if (input !== null && !isNaN(period) && period > 0) {
                    chartData.indicators.smaPeriod = period;
                    chartData.indicators.sma = true;
                    if (chartData.smaSeries) {
                        chartData.smaSeries.setData(calculateSMA(chartData.cachedData, period));
                        chartData.smaSeries.applyOptions({ visible: true });
                    }
                }
            } else {
                chartData.indicators.sma = false;
                if (chartData.smaSeries) {
                    chartData.smaSeries.applyOptions({ visible: false });
                }
            }
            e.target.options[2].text = `SMA ${chartData.indicators.smaPeriod} (${chartData.indicators.sma ? 'On' : 'Off'})`;
        } else if (indicator === "ema") {
            if (!chartData.indicators.ema) {
                const input = prompt("Enter period for EMA:", chartData.indicators.emaPeriod);
                const period = parseInt(input, 10);
                if (input !== null && !isNaN(period) && period > 0) {
                    chartData.indicators.emaPeriod = period;
                    chartData.indicators.ema = true;
                    if (chartData.emaSeries) {
                        chartData.emaSeries.setData(calculateEMA(chartData.cachedData, period));
                        chartData.emaSeries.applyOptions({ visible: true });
                    }
                }
            } else {
                chartData.indicators.ema = false;
                if (chartData.emaSeries) {
                    chartData.emaSeries.applyOptions({ visible: false });
                }
            }
            e.target.options[3].text = `EMA ${chartData.indicators.emaPeriod} (${chartData.indicators.ema ? 'On' : 'Off'})`;
        }
        e.target.value = ""; // Reset the dropdown back to the "Indicators" placeholder
        saveLayoutState();
    });
}

function updateIntervalOptions(chartData, intervalSelect) {
    const instrument = state.instruments.find(item => item.id === chartData.instrumentId);
    const intervals = instrument ? instrument.timeframes : ["1d"];
    intervalSelect.innerHTML = intervals.map(interval => `<option value="${interval}">${interval}</option>`).join("");
    intervalSelect.value = chartData.interval;
}

function initializeChart(chartData) {
    const container = document.getElementById(`${chartData.id}-container`);
    const isLight = state.theme === "light";
    const themeOptions = getChartThemeOptions(isLight);

    chartData.chart = LightweightCharts.createChart(container, {
        autoSize: true,
        layout: themeOptions.layout,
        localization: {
            timeFormatter: TimeUtils.formatTooltip,
        },
        grid: themeOptions.grid,
        timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: themeOptions.timeScale.borderColor,
            tickMarkFormatter: TimeUtils.formatAxis,
            rightOffset: 25,
            barSpacing: 8,
            shiftVisibleRangeOnNewBar: true,
        },
        rightPriceScale: {
            borderColor: themeOptions.rightPriceScale.borderColor,
            ticksVisible: false,
            entireTextOnly: false,
            scaleMargins: {
                top: 0.1,
                bottom: 0.25, // Leave 25% empty at the bottom for volume bars
            },
        },
        crosshair: themeOptions.crosshair,
    });

    chartData.candleSeries = chartData.chart.addCandlestickSeries({
            upColor: "#16a34a", downColor: "#dc2626",
            wickUpColor: "#16a34a", wickDownColor: "#dc2626",
            borderVisible: false, priceLineVisible: true,
            priceLineColor: "#16a34a", priceLineWidth: 1, priceLineStyle: 1,
            lastValueVisible: false,
        });

    chartData.volumeSeries = chartData.chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '', // Place it on a separate, hidden scale
        visible: chartData.indicators.volume,
    });
    chartData.volumeSeries.priceScale().applyOptions({
        scaleMargins: {
            top: 0.8, // Push volume down to the bottom 20%
            bottom: 0,
        },
    });

    chartData.smaSeries = chartData.chart.addLineSeries({
        color: '#f59e0b',
        lineWidth: 1,
        visible: chartData.indicators.sma,
        lastValueVisible: false,
        priceLineVisible: false,
    });
    
    chartData.emaSeries = chartData.chart.addLineSeries({
        color: '#3b82f6',
        lineWidth: 1,
        visible: chartData.indicators.ema,
        lastValueVisible: false,
        priceLineVisible: false,
    });
}

function resetChart(chartData) {
    chartData.currentCandle = null;
    chartData.lastPrice = null;
    chartData.referencePrice = null;
    chartData.liveSubscribed = false;
    chartData.cachedData = [];
    if (chartData.candleSeries) chartData.candleSeries.setData([]);
    if (chartData.volumeSeries) chartData.volumeSeries.setData([]);
    if (chartData.smaSeries) chartData.smaSeries.setData([]);
    if (chartData.emaSeries) chartData.emaSeries.setData([]);
    setPaneMessage(chartData.id, chartData.instrumentId === "none" ? "No Chart Selected" : "Loading");
    updateTicker(chartData, null, null);
}

async function loadChartData(chartData) {
    if (chartData.instrumentId === "none") {
        setPaneMessage(chartData.id, "No Chart Selected");
        return;
    }
    try {
        setDataStatus(`Loading ${chartData.symbol} ${chartData.interval}`);
        const response = await fetch(`${CONFIG.API_BASE}/data/${chartData.source}/${chartData.symbol}/${chartData.interval}`);
        const payload = await response.json();
        if (!response.ok || !payload.candles || payload.candles.length === 0) {
            throw new Error(payload.error || "No candles available");
        }

        const candles = payload.candles.map(normalizeCandle).filter(Boolean);
        chartData.cachedData = candles;

        chartData.candleSeries.setData(candles);
        chartData.volumeSeries.setData(candles.map(c => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(22, 163, 74, 0.4)' : 'rgba(220, 38, 38, 0.4)'
        })));

        if (chartData.indicators.sma) {
            chartData.smaSeries.setData(calculateSMA(candles, chartData.indicators.smaPeriod));
        }
        if (chartData.indicators.ema) {
            chartData.emaSeries.setData(calculateEMA(candles, chartData.indicators.emaPeriod));
        }

        chartData.chart.timeScale().applyOptions({ rightOffset: 25, barSpacing: 8 });
        chartData.chart.timeScale().scrollToRealTime();

        chartData.currentCandle = candles[candles.length - 1];
        chartData.referencePrice = candles.length > 1 ? candles[candles.length - 2].close : chartData.currentCandle.open;
        
        const isUp = chartData.currentCandle.close >= chartData.currentCandle.open;
        chartData.lastDirection = isUp ? 'up' : 'down';
        chartData.candleSeries.applyOptions({
            priceLineColor: isUp ? "#16a34a" : "#dc2626"
        });

        updateTicker(chartData, chartData.currentCandle.close, chartData.referencePrice);
        clearPaneMessage(chartData.id);
        subscribeChart(chartData);
        setDataStatus(`Loaded ${chartData.symbol} ${chartData.interval}`);
        updateChartCountdown(chartData); // Show timer instantly after load
    } catch (error) {
        setPaneMessage(chartData.id, error.message);
        setDataStatus(error.message);
    }
}

function normalizeCandle(candle) {
    const normalized = {
        time: Number(candle.time),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume || 0),
    };
    return Object.values(normalized).every(Number.isFinite) ? normalized : null;
}

function subscribeChart(chartData) {
    if (chartData.source !== "hyperliquid" || chartData.liveSubscribed) return;
    chartData.liveSubscribed = true;
    fetch(`${CONFIG.API_BASE}/live/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            source: chartData.source,
            symbol: chartData.symbol,
        }),
    }).catch(error => {
        chartData.liveSubscribed = false;
        console.warn("Live subscribe failed", error);
        updateConnectionStatus(false);
    });
}

function unsubscribeChart() {}

function handlePriceUpdate(tick) {
    Object.values(state.charts).forEach(chartData => {
        if (chartData.source !== tick.source || chartData.symbol !== tick.symbol) return;
        applyPriceUpdate(chartData, tick);
    });
}

function applyPriceUpdate(chartData, tick) {
    const price = Number(tick.price);
    const time = Number(tick.time);
    if (!Number.isFinite(price) || !Number.isFinite(time)) return;

    const candle = buildRealtimeCandle(chartData, time, price);
    
    // Cache maintenance
    if (chartData.cachedData.length > 0) {
        const last = chartData.cachedData[chartData.cachedData.length - 1];
        if (last.time === candle.time) chartData.cachedData[chartData.cachedData.length - 1] = candle;
        else chartData.cachedData.push(candle);
    }

    chartData.candleSeries.update(candle);
    
    if (chartData.indicators.volume) {
        chartData.volumeSeries.update({
            time: candle.time,
            value: candle.volume,
            color: candle.close >= candle.open ? 'rgba(22, 163, 74, 0.4)' : 'rgba(220, 38, 38, 0.4)'
        });
    }

    if (chartData.indicators.sma) {
        const lastSma = calculateLatestSMA(chartData.cachedData, chartData.indicators.smaPeriod);
        if (lastSma) chartData.smaSeries.update(lastSma);
    }

    if (chartData.indicators.ema) {
        const lastEma = calculateLatestEMA(chartData.cachedData, chartData.indicators.emaPeriod);
        if (lastEma) chartData.emaSeries.update(lastEma);
    }

    const isUp = candle.close >= candle.open;
    chartData.lastDirection = isUp ? 'up' : 'down';
    chartData.candleSeries.applyOptions({
        priceLineColor: isUp ? "#16a34a" : "#dc2626"
    });

    const direction = chartData.lastPrice === null || price >= chartData.lastPrice ? "up" : "down";
    chartData.lastPrice = price;

    if (!document.hidden) {
        updateTicker(chartData, price, chartData.referencePrice);
        flashTicker(chartData.id, direction);
        updateChartCountdown(chartData); // Only update this specific chart's timer!
    }
}

function buildRealtimeCandle(chartData, time, price) {
    const bucket = bucketTime(time, chartData.interval);
    const current = chartData.currentCandle;
    if (!current || current.time !== bucket) {
        if (current) {
            chartData.referencePrice = current.close;
        }
        chartData.currentCandle = {
            time: bucket,
            open: price,
            high: price,
            low: price,
            close: price,
            volume: 0,
        };
        return chartData.currentCandle;
    }

    current.high = Math.max(current.high, price);
    current.low = Math.min(current.low, price);
    current.close = price;
    current.volume += 1; // Tick increment fallback
    return current;
}

function bucketTime(time, interval) {
    const seconds = {
        "1m": 60,
        "5m": 300,
        "15m": 900,
        "1h": 3600,
        "4h": 14400,
        "1d": 86400,
    }[interval] || 60;
    return Math.floor(time / seconds) * seconds;
}

function updateTicker(chartData, price, reference) {
    const pane = document.getElementById(chartData.id);
    
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
    pane.querySelector(".ticker-price").textContent = formatPrice(price);
    pane.querySelector(".ticker-price").className = `ticker-price ${direction}`;
    pane.querySelector(".ticker-change").textContent = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
    pane.querySelector(".ticker-change").className = `ticker-change ${direction}`;
}

function flashTicker(chartId, direction) {
    if (document.hidden) return; // Prevent layout thrashing when tab is hidden
    const ticker = document.getElementById(`${chartId}-ticker`);
    ticker.classList.remove("flash-up", "flash-down");
    void ticker.offsetWidth;
    ticker.classList.add(direction === "up" ? "flash-up" : "flash-down");
}

function formatPrice(price) {
    if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(2);
    return price.toPrecision(4);
}

function setPaneMessage(chartId, message) {
    const container = document.getElementById(`${chartId}-container`);
    let messageEl = container.querySelector(".chart-message");
    if (!messageEl) {
        messageEl = document.createElement("div");
        messageEl.className = "chart-message";
        container.appendChild(messageEl);
    }
    messageEl.textContent = message;
}

function clearPaneMessage(chartId) {
    const messageEl = document.querySelector(`#${chartId}-container .chart-message`);
    if (messageEl) messageEl.remove();
}

function updateCountdowns() {
    if (document.hidden) return; // Skip updating visually when inactive
    const now = Date.now();
    Object.values(state.charts).forEach(chartData => {
        updateChartCountdown(chartData, now);
    });
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

    const remaining = getCountdownMs(chartData.interval, now);
    if (remaining === null) {
        timerEl.classList.remove("show");
        return;
    }

    const y = chartData.candleSeries.priceToCoordinate(chartData.lastPrice);
    if (y === null || y < 0) {
        timerEl.classList.remove("show");
        return;
    }

    const timerHeight = 32; 
    timerEl.style.top = `${y - (timerHeight / 2)}px`;
    
    const priceStr = formatPrice(chartData.lastPrice);
    const timerStr = formatCountdown(remaining);
    
    timerEl.innerHTML = `<span>${priceStr}</span><span class="timer-val">${timerStr}</span>`;

    timerEl.classList.remove('up', 'down');
    timerEl.classList.add(chartData.lastDirection);
    timerEl.classList.add("show");
}

function getCountdownMs(interval, now) {
    const secondsMap = { "1m": 60, "3m": 180, "5m": 300, "15m": 900, "30m": 1800, "1h": 3600, "4h": 14400, "1d": 86400 };
    const seconds = secondsMap[interval];
    if (!seconds) return null; // Skip complex intervals like 1wk, 1mo

    const ms = seconds * 1000;
    const next = Math.ceil(now / ms) * ms;
    return next === now ? ms : next - now;
}

function formatCountdown(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    const minSec = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return h > 0 ? `${h.toString().padStart(2, "0")}:${minSec}` : minSec;
}

function updateConnectionStatus(isConnected) {
    state.connected = isConnected;
    const status = document.getElementById("connection-status");
    status.textContent = isConnected ? "Live connected" : "Live disconnected";
    status.className = `status-indicator ${isConnected ? "connected" : "disconnected"}`;
    if (isConnected) Object.values(state.charts).forEach(subscribeChart);
}

function setDataStatus(message) {
    document.getElementById("data-status").textContent = message;
}

function updateTimestamp() {
    document.getElementById("timestamp").textContent = TimeUtils.getCurrentTime();
}

function calculateSMA(data, period) {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        sma.push({ time: data[i].time, value: sum / period });
    }
    return sma;
}

function calculateLatestSMA(data, period) {
    if (data.length < period) return null;
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[data.length - 1 - i].close;
    }
    return { time: data[data.length - 1].time, value: sum / period };
}

function calculateLatestEMA(data, period) {
    if (data.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = 0;
    for (let i = 0; i < period; i++) ema += data[i].close;
    ema /= period;

    for (let i = period; i < data.length; i++) {
        ema = (data[i].close - ema) * multiplier + ema;
    }
    return { time: data[data.length - 1].time, value: ema };
}

function calculateEMA(data, period) {
    const ema = [];
    if (data.length < period) return ema;
    
    const multiplier = 2 / (period + 1);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[i].close;
    let prevEMA = sum / period;
    ema.push({ time: data[period - 1].time, value: prevEMA });

    for (let i = period; i < data.length; i++) {
        const currentEMA = (data[i].close - prevEMA) * multiplier + prevEMA;
        ema.push({ time: data[i].time, value: currentEMA });
        prevEMA = currentEMA;
    }
    return ema;
}

function injectThemeStyles() {
    const style = document.createElement('style');
    style.id = "theme-styles";
    style.textContent = `
        body.light-theme {
            --primary-bg: #f8fafc;
            --secondary-bg: #ffffff;
            --text-primary: #0f172a;
            --border-color: #cbd5e1;
            background-color: var(--primary-bg);
            color: var(--text-primary);
        }
        body.light-theme .chart-pane {
            background-color: var(--secondary-bg);
            border-color: var(--border-color);
        }
        body.light-theme .pane-header {
            border-bottom-color: var(--border-color);
        }
        body.light-theme .symbol-select-input, 
        body.light-theme .pane-select {
            background-color: #f1f5f9;
            color: #0f172a;
            border-color: #cbd5e1;
        }
        body.light-theme .custom-select-dropdown {
            background-color: #ffffff;
            border-color: #cbd5e1;
        }
        body.light-theme .custom-select-option:hover {
            background-color: #f1f5f9;
        }
        body.light-theme .chart-message,
        body.light-theme .ticker-symbol {
            color: var(--text-primary);
        }
        body.light-theme .countdown-timer {
            background-color: rgba(255, 255, 255, 0.9);
            border-color: #cbd5e1;
            color: #0f172a;
        }
        .theme-btn {
            background-color: #2a3f5f;
            color: #ffffff;
            border: 1px solid #394654;
            padding: 4px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-family: inherit;
        }
        .theme-btn:hover { background-color: #394654; }
        body.light-theme .theme-btn {
            background-color: #e2e8f0;
            color: #0f172a;
            border-color: #cbd5e1;
        }
        body.light-theme .theme-btn:hover { background-color: #cbd5e1; }
    `;
    document.head.appendChild(style);
}

function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem(CONFIG.THEME_STORAGE_KEY, state.theme);
    
    const isLight = state.theme === "light";
    document.body.classList.toggle("light-theme", isLight);
    
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = isLight ? "🌙 Dark Mode" : "☀️ Light Mode";
    
    const themeOptions = getChartThemeOptions(isLight);
    Object.values(state.charts).forEach(chartData => {
        if (chartData.chart) chartData.chart.applyOptions(themeOptions);
    });
}

function getChartThemeOptions(isLight) {
    return {
        layout: {
            background: { color: isLight ? "#ffffff" : "#11161d" },
            textColor: isLight ? "#1e293b" : "#d8dee8",
        },
        grid: {
            vertLines: { color: isLight ? "#f1f5f9" : "#26313d" },
            horzLines: { color: isLight ? "#f1f5f9" : "#26313d" },
        },
        timeScale: { borderColor: isLight ? "#cbd5e1" : "#394654" },
        rightPriceScale: { borderColor: isLight ? "#cbd5e1" : "#394654" },
        crosshair: {
            horzLine: { color: isLight ? "#64748b" : "#8b9bb0", style: 2, labelBackgroundColor: isLight ? "#334155" : "#151b23" },
            vertLine: { color: isLight ? "#64748b" : "#8b9bb0", style: 2, labelBackgroundColor: isLight ? "#334155" : "#151b23" }
        }
    };
}

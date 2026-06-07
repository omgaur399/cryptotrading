const CONFIG = {
    API_BASE: "/api",
    STORAGE_KEY: "trading-dashboard-chart-count",
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
};

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
    state.chartCount = readSavedChartCount();
    document.getElementById("chart-count").value = String(state.chartCount);
    document.getElementById("chart-count").addEventListener("change", event => {
        setChartCount(Number(event.target.value));
    });

    connectLiveStream();
    await loadInstruments();
    sortDefaultInstruments();
    renderGrid();
    updateTimestamp();
    setInterval(updateCountdowns, 1000);
    setInterval(updateTimestamp, 1000);
}

function readSavedChartCount() {
    const saved = Number(localStorage.getItem(CONFIG.STORAGE_KEY));
    return CONFIG.ALLOWED_COUNTS.includes(saved) ? saved : CONFIG.DEFAULT_CHART_COUNT;
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
        const config = defaultConfigs[(index - 1) % 8];
        
        let instrumentId = "none";
        let source = "none";
        let symbol = "No Chart";
        let interval = "1d";
        
        if (config.symbol !== "none") {
            const instrument = state.instruments.find(i => i.symbol === config.symbol) || state.instruments[0];
            if (instrument) {
                instrumentId = instrument.id;
                source = instrument.source;
                symbol = instrument.symbol;
                interval = instrument.timeframes.includes(config.interval) ? config.interval : instrument.timeframes[0];
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
            currentCandle: null,
            lastPrice: null,
            referencePrice: null,
            liveSubscribed: false,
            lastDirection: 'up',
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

    chartData.chart = LightweightCharts.createChart(container, {
        autoSize: true,
        layout: {
            background: { color: "#11161d" },
            textColor: "#d8dee8",
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            fontSize: 10,
        },
        localization: {
            timeFormatter: TimeUtils.formatTooltip,
        },
        grid: {
            vertLines: { color: "#26313d" },
            horzLines: { color: "#26313d" },
        },
        timeScale: {
            timeVisible: true,
            secondsVisible: false,
            borderColor: "#394654",
            tickMarkFormatter: TimeUtils.formatAxis,
            rightOffset: 25,
            barSpacing: 8,
            shiftVisibleRangeOnNewBar: true,
        },
        rightPriceScale: {
            borderColor: "#394654",
            ticksVisible: false,
            entireTextOnly: false,
        },
        crosshair: {
            horzLine: {
                color: "#8b9bb0",
                style: 2, // LightweightCharts Dashed Style
                labelBackgroundColor: "#151b23",
            },
            vertLine: {
                color: "#8b9bb0",
                style: 2, // LightweightCharts Dashed Style
                labelBackgroundColor: "#151b23",
            }
        },
    });

    chartData.candleSeries = chartData.chart.addCandlestickSeries({
        upColor: "#16a34a",
        downColor: "#dc2626",
        wickUpColor: "#16a34a",
        wickDownColor: "#dc2626",
        borderVisible: false,
        priceLineVisible: true,
        priceLineColor: "#16a34a", 
        priceLineWidth: 1,
        priceLineStyle: 1, // 1 = Dotted Line
        lastValueVisible: false, // Disable default label; we'll draw our own.
    });
}

function resetChart(chartData) {
    chartData.currentCandle = null;
    chartData.lastPrice = null;
    chartData.referencePrice = null;
    chartData.liveSubscribed = false;
    if (chartData.candleSeries) chartData.candleSeries.setData([]);
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
        chartData.candleSeries.setData(candles);

        // Forcefully re-apply the right gap because setData() overwrites it by default
        chartData.chart.timeScale().applyOptions({
            rightOffset: 25,
            barSpacing: 8,
        });
        chartData.chart.timeScale().scrollToRealTime();

        chartData.currentCandle = candles[candles.length - 1];
        chartData.referencePrice = candles.length > 1 ? candles[candles.length - 2].close : chartData.currentCandle.open;
        
        // Set initial dynamic price line color
        const isUp = chartData.currentCandle.close >= chartData.currentCandle.open;
        chartData.lastDirection = isUp ? 'up' : 'down';
        chartData.candleSeries.applyOptions({
            priceLineColor: isUp ? "#16a34a" : "#dc2626"
        });

        updateTicker(chartData, chartData.currentCandle.close, chartData.referencePrice);
        clearPaneMessage(chartData.id);
        subscribeChart(chartData);
        setDataStatus(`Loaded ${chartData.symbol} ${chartData.interval}`);
        updateCountdowns(); // Show timer instantly after load
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
    chartData.candleSeries.update(candle);

    // Dynamically update the dotted line and box color based on tick direction
    const isUp = candle.close >= candle.open;
    chartData.lastDirection = isUp ? 'up' : 'down';
    chartData.candleSeries.applyOptions({
        priceLineColor: isUp ? "#16a34a" : "#dc2626"
    });

    updateTicker(chartData, price, chartData.referencePrice);
    flashTicker(chartData.id, chartData.lastPrice === null || price >= chartData.lastPrice ? "up" : "down");
    chartData.lastPrice = price;
    updateCountdowns(); // Show timer instantly after tick
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
        };
        return chartData.currentCandle;
    }

    current.high = Math.max(current.high, price);
    current.low = Math.min(current.low, price);
    current.close = price;
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
    const now = Date.now();
    Object.values(state.charts).forEach(chartData => {
        let timerEl = document.getElementById(`${chartData.id}-timer`);
        
        // Recreate the timer dynamically if the charting engine wiped the container HTML
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

        // Get the exact Y coordinate of the live price on the canvas
        const y = chartData.candleSeries.priceToCoordinate(chartData.lastPrice);
        if (y === null || y < 0) {
            timerEl.classList.remove("show");
            return;
        }

        const timerHeight = 32; // Double height for price and timer
        timerEl.style.top = `${y - (timerHeight / 2)}px`;
        
        const priceStr = formatPrice(chartData.lastPrice);
        const timerStr = formatCountdown(remaining);
        
        timerEl.innerHTML = `<span>${priceStr}</span><span class="timer-val">${timerStr}</span>`;

        timerEl.classList.remove('up', 'down');
        timerEl.classList.add(chartData.lastDirection);
        timerEl.classList.add("show");
    });
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

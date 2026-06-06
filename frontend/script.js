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
        const defaultInstrument = state.instruments[(index - 1) % state.instruments.length];
        const chartData = {
            id: chartId,
            instrumentId: defaultInstrument.id,
            source: defaultInstrument.source,
            symbol: defaultInstrument.symbol,
            interval: defaultInstrument.timeframes.includes("1m") ? "1m" : defaultInstrument.timeframes[0],
            chart: null,
            candleSeries: null,
            currentCandle: null,
            lastPrice: null,
            referencePrice: null,
            liveSubscribed: false,
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
        dropdown.innerHTML = filtered.map(item => 
            `<div class="custom-select-option" data-id="${item.id}">${item.symbol}</div>`
        ).join("");
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
    container.innerHTML = "";

    chartData.chart = LightweightCharts.createChart(container, {
        autoSize: true,
        layout: {
            background: { color: "#11161d" },
            textColor: "#d8dee8",
            fontFamily: "Inter, system-ui, -apple-system, sans-serif",
            fontSize: 12,
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
        },
        rightPriceScale: {
            borderColor: "#394654",
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
    });
}

function resetChart(chartData) {
    chartData.currentCandle = null;
    chartData.lastPrice = null;
    chartData.referencePrice = null;
    chartData.liveSubscribed = false;
    if (chartData.candleSeries) chartData.candleSeries.setData([]);
    setPaneMessage(chartData.id, "Loading");
}

async function loadChartData(chartData) {
    try {
        setDataStatus(`Loading ${chartData.symbol} ${chartData.interval}`);
        const response = await fetch(`${CONFIG.API_BASE}/data/${chartData.source}/${chartData.symbol}/${chartData.interval}`);
        const payload = await response.json();
        if (!response.ok || !payload.candles || payload.candles.length === 0) {
            throw new Error(payload.error || "No candles available");
        }

        const candles = payload.candles.map(normalizeCandle).filter(Boolean);
        chartData.candleSeries.setData(candles);
        chartData.chart.timeScale().fitContent();
        chartData.currentCandle = candles[candles.length - 1];
        chartData.referencePrice = candles.length > 1 ? candles[candles.length - 2].close : chartData.currentCandle.open;
        updateTicker(chartData, chartData.currentCandle.close, chartData.referencePrice);
        clearPaneMessage(chartData.id);
        subscribeChart(chartData);
        setDataStatus(`Loaded ${chartData.symbol} ${chartData.interval}`);
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
    updateTicker(chartData, price, chartData.referencePrice);
    flashTicker(chartData.id, chartData.lastPrice === null || price >= chartData.lastPrice ? "up" : "down");
    chartData.lastPrice = price;
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

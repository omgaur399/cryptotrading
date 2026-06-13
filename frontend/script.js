const CONFIG = {
    API_BASE: window.location.protocol === 'file:' ? "http://127.0.0.1:5000/api" : "/api",
    STORAGE_KEY: "trading-dashboard-chart-count",
    LAYOUT_STORAGE_KEY: "trading-dashboard-layout",
    THEME_STORAGE_KEY: "trading-dashboard-theme",
    DRAWINGS_STORAGE_KEY: "trading-dashboard-drawings",
    DEFAULT_CHART_COUNT: 4,
    ALLOWED_COUNTS: [1, 2, 4, 6, 8],
};

const COMMON_IDS = {
    "BTC": "bitcoin", "ETH": "ethereum", "SOL": "solana", "BNB": "binancecoin", "XRP": "ripple",
    "DOGE": "dogecoin", "ADA": "cardano", "AVAX": "avalanche-2", "LINK": "chainlink", "DOT": "polkadot",
    "POL": "polygon-ecosystem-token", "TON": "the-open-network", "SHIB": "shiba-inu", "LTC": "litecoin",
    "TRX": "tron", "NEAR": "near", "APT": "aptos", "ARB": "arbitrum", "OP": "optimism", "SUI": "sui",
    "INJ": "injective-protocol", "TIA": "celestia", "RNDR": "render-token", "SEI": "sei-network",
    "DYDX": "dydx", "FIL": "filecoin", "KAS": "kaspa", "STX": "blockstack", "LDO": "lido-dao",
    "FET": "fetch-ai", "RUNE": "thorchain", "WLD": "worldcoin-wld", "IMX": "immutable-x",
    "PEPE": "pepe", "WIF": "dogwifcoin", "JUP": "jupiter-exchange-solana", "PYTH": "pyth-network",
    "BONK": "bonk", "ORDI": "ordi", "BCH": "bitcoin-cash", "ETC": "ethereum-classic", "XMR": "monero",
    "XLM": "stellar", "HBAR": "hedera-hashgraph", "VET": "vechain", "ALGO": "algorand", "GRT": "the-graph",
    "EGLD": "elrond-erd-2", "AAVE": "aave", "SNX": "havven", "THETA": "theta-token", "EOS": "eos",
    "XTZ": "tezos", "MANA": "decentraland", "SAND": "the-sandbox", "AXS": "axie-infinity",
    "GALA": "gala", "CRV": "curve-dao-token", "MKR": "maker", "STRK": "starknet", "ENA": "ethena",
    "MEW": "cat-in-a-dogs-world", "POPCAT": "popcat", "SLERF": "slerf", "PENGU": "penguiana",
    "OM": "mantra-dao", "TAO": "bittensor", "AR": "arweave", "TRB": "tellor", "SATS": "sats",
    "RATS": "rats", "ZIG": "zignaly", "MYRO": "myro", "NFP": "nfprompt", "ALT": "altlayer",
    "AI": "sleepless-ai", "XAI": "xai", "MANTA": "manta-network", "MEME": "memecoin",
    "ACE": "fusionist", "NTRN": "neutron", "BIGTIME": "big-time", "BLUR": "blur",
    "SUPER": "superfarm", "ILV": "illuvium", "BEAM": "beam-2", "MAGIC": "magic",
    "GMX": "gmx", "COMP": "compound-governance-token", "1INCH": "1inch", "YFI": "yearn-finance",
    "SUSHI": "sushi", "UNI": "uniswap", "CAKE": "pancakeswap-token", "SSV": "ssv-network",
    "EDU": "open-campus", "ID": "space-id", "HOOK": "hooked-protocol", "LQTY": "liquity",
    "FXS": "frax", "GNS": "gains-network", "PENDLE": "pendle", "RDNT": "radiant-capital",
    "GTC": "gitcoin", "BAND": "band-protocol", "CYBER": "cyberconnect", "ARKM": "arkham",
    "PORTAL": "portal", "PIXEL": "pixels", "MAVIA": "heroes-of-mavia", "GMT": "stepn",
    "LUNA": "terra-luna-2", "DASH": "dash", "ZEC": "zcash", "IOTA": "iota", "NEO": "neo",
    "CHZ": "chiliz", "BAT": "basic-attention-token", "ENJ": "enjincoin", "ZIL": "zilliqa",
    "KAVA": "kava", "RVN": "ravencoin", "WAVES": "waves", "ONT": "ontology", "ICX": "icon",
    "QTUM": "qtum", "NANO": "nano", "OMG": "omg", "ZRX": "0x", "CELO": "celo", "BAL": "balancer",
    "HYPE": "hyperliquid", "ZETA": "zetachain", "ONDO": "ondo-finance", "AERO": "aerodrome-finance",
    "JTO": "jito-governance-token", "ETHFI": "ether-fi", "BOME": "book-of-meme"
};

function getAssetName(sym) {
    if (COMMON_IDS[sym]) {
        return COMMON_IDS[sym].split('-').map(w => w === '2' ? '' : w.charAt(0).toUpperCase() + w.slice(1)).join(' ').trim();
    }
    return sym;
}

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
    activeChartId: 'chart-1',
    instruments: [],
    charts: {},
    liveStream: null,
    drawings: {},
    hlWs: null,
    hlPingInterval: null,
    connected: false,
    theme: "dark",
};

document.addEventListener("DOMContentLoaded", initializeApp);

async function initializeApp() {
    // Inject a blank favicon to prevent 404 errors
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = 'data:,';
    document.head.appendChild(favicon);

    state.theme = localStorage.getItem(CONFIG.THEME_STORAGE_KEY) || "dark";
    if (state.theme === "light") document.body.classList.add("light-theme");
    injectThemeStyles();

    const savedDrawings = localStorage.getItem(CONFIG.DRAWINGS_STORAGE_KEY);
    if (savedDrawings) {
        try {
            state.drawings = JSON.parse(savedDrawings);
        } catch (e) {
            state.drawings = {};
        }
    }

    state.chartCount = readSavedChartCount();
    document.getElementById("chart-count").value = String(state.chartCount);
    document.getElementById("chart-count").addEventListener("change", event => {
        setChartCount(Number(event.target.value));
    });

    const chartCountEl = document.getElementById("chart-count");
    if (chartCountEl && chartCountEl.parentNode) {
        const toolsSelect = document.createElement("select");
        toolsSelect.id = "global-tools-select";
        toolsSelect.className = "theme-btn";
        toolsSelect.style.marginLeft = "12px";
        toolsSelect.innerHTML = `
            <option value="" disabled selected>Tools</option>
            <option value="hline">✏️ Horizontal Line</option>
            <option value="vline">📏 Vertical Line</option>
            <option value="buyMarker">⬆️ Buy Marker</option>
            <option value="sellMarker">⬇️ Sell Marker</option>
            <option value="priceAlert">🔔 Price Alert</option>
        `;
        toolsSelect.addEventListener("change", (e) => {
            const tool = e.target.value;
            if (tool) {
                Object.values(state.charts).forEach(chartData => {
                    chartData.drawingMode = tool;
                    const container = document.getElementById(`${chartData.id}-container`);
                    if (container) container.style.cursor = "crosshair";
                });
            }
            e.target.value = "";
        });
        chartCountEl.parentNode.appendChild(toolsSelect);

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
    renderGrid();
    updateTimestamp();
    
    createMarketTicker();
    fetchMarketMovers();
    
    const marketTicker = document.getElementById('market-ticker-container');
    if (marketTicker) {
        marketTicker.addEventListener('click', (e) => {
            const moverItem = e.target.closest('.market-ticker-item');
            if (moverItem && moverItem.dataset.symbol) {
                const symbol = moverItem.dataset.symbol;
                const activeChartId = state.activeChartId || 'chart-1';
                switchChartSymbol(activeChartId, symbol);
            }
        });
    }

    setInterval(updateCountdowns, 1000);
    setInterval(updateTimestamp, 1000);
    setInterval(fetchMarketMovers, 5000);

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
    let hyperliquidPairs = [];
    
    try {
        // Try to fetch the live active coin universe directly from the exchange
        const res = await fetch("https://api.hyperliquid.xyz/info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "meta" })
        });
        const data = await res.json();
        hyperliquidPairs = data.universe.map(coin => coin.name);
    } catch (error) {
        console.warn("Could not fetch live coin universe, using 130+ fallback list.", error);
        // Fallback master list just in case of an ad-blocker or network hiccup
        hyperliquidPairs = [
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

    state.instruments = hyperliquidPairs.map(sym => ({
        id: sym,
        source: "hyperliquid",
        symbol: sym,
        name: getAssetName(sym),
        timeframes: ["1m", "5m", "15m", "1h", "4h", "1d"]
    }));
}

function connectLiveStream() {
    // Backend SSE for local Mock Data and YFinance
    if (window.EventSource && !state.liveStream) {
        state.liveStream = new EventSource(`${CONFIG.API_BASE}/live`);
        state.liveStream.onopen = () => updateConnectionStatus();
        state.liveStream.onerror = () => updateConnectionStatus();
        state.liveStream.onmessage = event => {
            if (!event.data) return;
            handlePriceUpdate(JSON.parse(event.data));
        };
        state.liveStream.addEventListener('status', () => updateConnectionStatus());
        state.liveStream.addEventListener('ping', () => updateConnectionStatus());
    }

    // Native Hyperliquid WebSocket for all Crypto pairs
    if (!state.hlWs) {
        state.hlWs = new WebSocket('wss://api.hyperliquid.xyz/ws');
        state.hlWs.onopen = () => {
            updateConnectionStatus();
            
            // Keep the connection alive by pinging every 40 seconds
            if (state.hlPingInterval) clearInterval(state.hlPingInterval);
            state.hlPingInterval = setInterval(() => {
                if (state.hlWs && state.hlWs.readyState === WebSocket.OPEN) {
                    state.hlWs.send(JSON.stringify({ method: "ping" }));
                }
            }, 40000);
            
            Object.values(state.charts).forEach(chartData => {
                chartData.liveSubscribed = false; // Force resubscribe
                if (chartData.source === 'hyperliquid' && chartData.symbol !== 'none') {
                    subscribeChart(chartData);
                }
            });
        };
        state.hlWs.onclose = () => {
            if (state.hlPingInterval) {
                clearInterval(state.hlPingInterval);
                state.hlPingInterval = null;
            }
            state.hlWs = null;
            updateConnectionStatus();
            Object.values(state.charts).forEach(chartData => {
                chartData.liveSubscribed = false; // Reset so they resubscribe later
            });
            setTimeout(connectLiveStream, 5000); // Reconnect loop
        };
        state.hlWs.onmessage = event => {
            const data = JSON.parse(event.data);
            if (data.channel === 'trades' && data.data) {
                data.data.forEach(trade => {
                    handlePriceUpdate({
                        source: 'hyperliquid',
                        symbol: trade.coin,
                        price: parseFloat(trade.px),
                        time: trade.time / 1000,
                        volume: parseFloat(trade.sz)
                    });
                });
            }
        };
    }
}

function setChartCount(count) {
    const safeCount = CONFIG.ALLOWED_COUNTS.includes(count) ? count : CONFIG.DEFAULT_CHART_COUNT;
    state.chartCount = safeCount;
    localStorage.setItem(CONFIG.STORAGE_KEY, String(safeCount));
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById("charts-grid");
    grid.className = `charts-grid layout-${state.chartCount}${state.chartCount === 1 ? ' with-info-panel' : ''}`;
    grid.innerHTML = "";

    Object.values(state.charts).forEach(chartData => {
        unsubscribeChart(chartData);
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
        targetIndicators.smaColor = targetIndicators.smaColor || '#f59e0b';
        targetIndicators.emaColor = targetIndicators.emaColor || '#3b82f6';
        targetIndicators.smaLineWidth = targetIndicators.smaLineWidth || 1;
        targetIndicators.emaLineWidth = targetIndicators.emaLineWidth || 1;
        targetIndicators.bb = targetIndicators.bb || false;
        targetIndicators.bbPeriod = targetIndicators.bbPeriod || 20;
        targetIndicators.bbStdDev = targetIndicators.bbStdDev || 2;
        targetIndicators.bbColor = targetIndicators.bbColor || '#ec4899';
        targetIndicators.bbLineWidth = targetIndicators.bbLineWidth || 1;
        targetIndicators.rsi = targetIndicators.rsi || false;
        targetIndicators.rsiPeriod = targetIndicators.rsiPeriod || 14;
        targetIndicators.rsiColor = targetIndicators.rsiColor || '#8b5cf6';
        targetIndicators.rsiLineWidth = targetIndicators.rsiLineWidth || 2;
        
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
            bbUpperSeries: null,
            bbMiddleSeries: null,
            bbLowerSeries: null,
            rsiSeries: null,
            cachedData: [],
            currentCandle: null,
            lastPrice: null,
            referencePrice: null,
            liveSubscribed: false,
            lastDirection: 'up',
            indicators: targetIndicators,
            pendingUpdate: false,
            flashDirection: 'up',
            lastUIUpdate: 0,
        };

        state.charts[chartId] = chartData;
        grid.appendChild(createChartPane(chartData, index));
        initializeChart(chartData);
        populatePaneControls(chartData);
        loadChartData(chartData);
    }

    if (state.chartCount === 1) {
        grid.appendChild(createInfoPanel());
        const chartData = state.charts['chart-1'];
        if (chartData && chartData.symbol !== 'none' && chartData.symbol !== 'No Chart') {
            fetchAndRenderAssetInfo(chartData.symbol);
        }
    }

    setActiveChart('chart-1');
}

function createChartPane(chartData, index) {
    const pane = document.createElement("section");
    pane.className = "chart-pane";
    pane.id = chartData.id;
    pane.addEventListener('click', () => setActiveChart(chartData.id));

    const volText = chartData.indicators.volume ? "On" : "Off";
    const smaText = chartData.indicators.sma ? "On" : "Off";
    const emaText = chartData.indicators.ema ? "On" : "Off";
    const bbText = chartData.indicators.bb ? "On" : "Off";
    const rsiText = chartData.indicators.rsi ? "On" : "Off";

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
                    <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    <div class="custom-select-dropdown"></div>
                </div>
                <select class="pane-select interval-select" aria-label="Timeframe"></select>
                <select class="pane-select indicator-select" aria-label="Indicators" title="Indicators">
                    <option value="" disabled selected>ƒx</option>
                    <option value="volume">Volume (${volText})</option>
                    <option value="sma">SMA ${chartData.indicators.smaPeriod} (${smaText})</option>
                    <option value="ema">EMA ${chartData.indicators.emaPeriod} (${emaText})</option>
                    <option value="bb">BB ${chartData.indicators.bbPeriod} (${bbText})</option>
                    <option value="rsi">RSI ${chartData.indicators.rsiPeriod} (${rsiText})</option>
                </select>
                <button class="settings-btn" id="${chartData.id}-go-live" title="Reset Chart View">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><polygon points="5 4 15 12 5 20"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                </button>
                <button class="settings-btn" id="${chartData.id}-settings" title="Chart Settings">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </button>
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
    const symbolContainer = pane.querySelector(".symbol-select-container");
    const intervalSelect = pane.querySelector(".interval-select");
    const indicatorSelect = pane.querySelector(".indicator-select");
    const settingsBtn = pane.querySelector(`#${chartData.id}-settings`);
    const goLiveBtn = pane.querySelector(`#${chartData.id}-go-live`);

    input.value = chartData.symbol;

    let highlightedIndex = -1;

    const renderOptions = (filter = "") => {
        const lowerFilter = filter.toLowerCase();
        const filtered = state.instruments.filter(item => 
            item.symbol.toLowerCase().includes(lowerFilter) || 
            (item.name && item.name.toLowerCase().includes(lowerFilter))
        );
        let html = "";
        if ("no chart".includes(lowerFilter) || "none".includes(lowerFilter)) {
            html += `<div class="custom-select-option" data-id="none">
                <span class="option-symbol">No Chart</span>
            </div>`;
        }
        html += filtered.map(item => 
            `<div class="custom-select-option" data-id="${item.id}">
                <span class="option-symbol">${item.symbol}</span>
            </div>`
        ).join("");
        dropdown.innerHTML = html;
        highlightedIndex = -1;
    };

    const updateHighlight = () => {
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
        if (!dropdown.classList.contains("show")) {
            renderOptions("");
            dropdown.classList.add("show");
            input.select();
        }
    };

    const closeDropdown = () => {
        dropdown.classList.remove("show");
        input.value = chartData.symbol;
        input.blur();
    };

    input.addEventListener("focus", openDropdown);
    input.addEventListener("click", () => {
        if (dropdown.classList.contains("show")) {
            input.select();
        }
    });

    symbolContainer.addEventListener("mousedown", (e) => {
        if (dropdown.contains(e.target)) return; // Let dropdown clicks pass through naturally
        if (e.target !== input) {
            e.preventDefault(); // Prevent input from losing focus
            input.focus();
            openDropdown();
        }
    });

    settingsBtn.addEventListener("click", () => openSettingsModal(chartData));

    goLiveBtn.addEventListener("click", () => {
        if (chartData.chart) {
            // Reset zoom (barSpacing) and right margin
            chartData.chart.timeScale().applyOptions({ rightOffset: 3, barSpacing: 8 });
            chartData.chart.timeScale().scrollToRealTime(); // Jump to newest candle
            chartData.chart.priceScale('right').applyOptions({ autoScale: true });
        }
    });

    input.addEventListener("input", (e) => {
        dropdown.classList.add("show");
        renderOptions(e.target.value);
    });

    const clickOutsideHandler = (e) => {
        if (!symbolContainer.isConnected) {
            document.removeEventListener("mousedown", clickOutsideHandler);
            document.removeEventListener("touchstart", clickOutsideHandler);
            return;
        }
        if (dropdown.classList.contains("show") && !symbolContainer.contains(e.target)) {
            closeDropdown();
        }
    };
    document.addEventListener("mousedown", clickOutsideHandler);
    document.addEventListener("touchstart", clickOutsideHandler, { passive: true });

    input.addEventListener("keydown", (e) => {
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
                        const instrument = state.instruments.find(item => item.id === selectedId);
                        if (instrument) switchChartSymbol(chartData.id, instrument.symbol);
                    }
                    closeDropdown();
                }
            }
        } else if (e.key === "Escape") {
            closeDropdown();
        }
    });

    dropdown.addEventListener("click", (e) => {
        const option = e.target.closest(".custom-select-option");
        if (option) {
            e.preventDefault();
            e.stopPropagation();
            const selectedId = option.getAttribute("data-id");
            
            if (selectedId === "none") {
                switchChartSymbol(chartData.id, 'none');
            } else {
                const instrument = state.instruments.find(item => item.id === selectedId);
                
                if (instrument) {
                    switchChartSymbol(chartData.id, instrument.symbol);
                }
            }
            closeDropdown();
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
            chartData.indicators.sma = !chartData.indicators.sma;
            if (chartData.smaSeries) {
                if (chartData.indicators.sma) {
                    chartData.smaSeries.setData(calculateSMA(chartData.cachedData, chartData.indicators.smaPeriod));
                }
                chartData.smaSeries.applyOptions({ visible: chartData.indicators.sma });
            }
            e.target.options[2].text = `SMA ${chartData.indicators.smaPeriod} (${chartData.indicators.sma ? 'On' : 'Off'})`;
        } else if (indicator === "ema") {
            chartData.indicators.ema = !chartData.indicators.ema;
            if (chartData.emaSeries) {
                if (chartData.indicators.ema) {
                    chartData.emaSeries.setData(calculateEMA(chartData.cachedData, chartData.indicators.emaPeriod));
                }
                chartData.emaSeries.applyOptions({ visible: chartData.indicators.ema });
            }
            e.target.options[3].text = `EMA ${chartData.indicators.emaPeriod} (${chartData.indicators.ema ? 'On' : 'Off'})`;
        } else if (indicator === "bb") {
            chartData.indicators.bb = !chartData.indicators.bb;
            if (chartData.bbUpperSeries) {
                if (chartData.indicators.bb) {
                    const bbData = calculateBB(chartData.cachedData, chartData.indicators.bbPeriod, chartData.indicators.bbStdDev);
                    chartData.bbUpperSeries.setData(bbData.upper);
                    chartData.bbMiddleSeries.setData(bbData.middle);
                    chartData.bbLowerSeries.setData(bbData.lower);
                }
                chartData.bbUpperSeries.applyOptions({ visible: chartData.indicators.bb });
                chartData.bbMiddleSeries.applyOptions({ visible: chartData.indicators.bb });
                chartData.bbLowerSeries.applyOptions({ visible: chartData.indicators.bb });
            }
            e.target.options[4].text = `BB ${chartData.indicators.bbPeriod} (${chartData.indicators.bb ? 'On' : 'Off'})`;
        } else if (indicator === "rsi") {
            chartData.indicators.rsi = !chartData.indicators.rsi;
            if (chartData.rsiSeries) {
                if (chartData.indicators.rsi) {
                    chartData.rsiSeries.setData(calculateRSI(chartData.cachedData, chartData.indicators.rsiPeriod));
                    chartData.chart.priceScale('rsi').applyOptions({
                        scaleMargins: { top: 0.8, bottom: 0 },
                    });
                }
                chartData.rsiSeries.applyOptions({ visible: chartData.indicators.rsi });
            }
            e.target.options[5].text = `RSI ${chartData.indicators.rsiPeriod} (${chartData.indicators.rsi ? 'On' : 'Off'})`;
        }
        e.target.value = ""; // Reset the dropdown back to the "ƒx" placeholder
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
    container.style.position = 'relative'; // Ensure absolute positioning works for overlays
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
            rightOffset: 3,
            barSpacing: 8,
            shiftVisibleRangeOnNewBar: true,
        },
        rightPriceScale: {
            borderColor: themeOptions.rightPriceScale.borderColor,
            ticksVisible: false,
            autoScale: true, // Auto-scale vertically to keep candles in view
            entireTextOnly: true, // Forces scale to wrap tightly around the longest visible label
            minimumWidth: 40, // Compress width as much as possible
            scaleMargins: {
                top: 0.1,
                bottom: 0.2, // Leave 20% empty at the bottom for layered Volume and RSI
            },
        },
        crosshair: themeOptions.crosshair,
        // Enable all native user interactions. These are defaults but are made explicit here.
        handleScroll: {
            mouseWheel: false, // Must be false! If true, it overrides zooming and pans instead.
            pressedMouseMove: true, // Panning
            horzTouchDrag: true,
        },
        handleScale: {
            mouseWheel: true,
            pinch: true, // Pinch-to-zoom on touch devices
            axisDoubleClickReset: false, // Custom behavior: double click on price axis creates alert
        },
    });

    // --- Custom Drag & Hover Overlay Logic ---
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'hover-delete-btn';
    deleteBtn.innerHTML = '✖';
    deleteBtn.style.display = 'none';
    deleteBtn.title = 'Delete Line';
    container.appendChild(deleteBtn);
    chartData.hoverDeleteBtn = deleteBtn;

    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = chartData.hoveredLineId;
        if (!id) return;
        const key = `${chartData.symbol}_${chartData.interval}`;
        const lines = state.drawings[key];
        if (lines) {
            const idx = lines.findIndex(l => l.id === id);
            if (idx !== -1) {
                const lineType = lines[idx].type;
                if (lineType === 'verticalLine') {
                    const el = document.getElementById(`vline-${id}`);
                    if (el) el.remove();
                } else {
                    const pl = chartData.renderedDrawings[id];
                    if (pl) {
                        try { chartData.candleSeries.removePriceLine(pl); } catch(err){}
                        delete chartData.renderedDrawings[id];
                    }
                }
                lines.splice(idx, 1);
                saveDrawings();
            }
        }
        deleteBtn.style.display = 'none';
        container.classList.remove('hovering-hline');
        container.classList.remove('hovering-vline');
    });

    let isDragging = false;
    let draggingLineInfo = null;

    container.addEventListener('mousedown', (e) => {
        if (chartData.drawingMode === 'hline' || chartData.drawingMode === 'vline') return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (!chartData.candleSeries) return;
        const clickedPrice = chartData.candleSeries.coordinateToPrice(y);

        const key = `${chartData.symbol}_${chartData.interval}`;
        const lines = state.drawings[key];
        if (!lines) return;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.type === 'horizontalLine' || line.type === 'alert') {
                if (clickedPrice === null) continue;
                const lineY = chartData.candleSeries.priceToCoordinate(line.price);
                if (lineY !== null && Math.abs(y - lineY) < 15) {
                    isDragging = true;
                    draggingLineInfo = { line, index: i, key, startY: y };
                    // Temporarily disable panning
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
    }, { capture: true });

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Handle dragging updates
        if (isDragging && draggingLineInfo) {
            if (draggingLineInfo.line.type === 'horizontalLine' || draggingLineInfo.line.type === 'alert') {
                if (Math.abs(y - draggingLineInfo.startY) > 3) {
                    chartData.justDragged = true;
                }
                const newPrice = chartData.candleSeries.coordinateToPrice(y);
                if (newPrice !== null) {
                    draggingLineInfo.line.price = newPrice;
                    const pl = chartData.renderedDrawings[draggingLineInfo.line.id];
                    if (pl && pl.applyOptions) {
                        if (draggingLineInfo.line.type === 'alert') {
                            draggingLineInfo.line.active = true; // Reactivate triggered alerts on drag
                            pl.applyOptions({ price: newPrice, color: '#f59e0b', title: '🔔' });
                        } else {
                            pl.applyOptions({ price: newPrice });
                        }
                    }
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
                        renderVerticalLine(chartData, draggingLineInfo.line);
                    }
                }
            }
            chartData.hoverDeleteBtn.style.display = 'none';
            return;
        }

        // Handle hover displays
        if (!chartData.candleSeries || chartData.drawingMode === 'hline' || chartData.drawingMode === 'vline') {
            chartData.hoverDeleteBtn.style.display = 'none';
            container.classList.remove('hovering-hline');
            container.classList.remove('hovering-vline');
            return;
        }

        const hoverPrice = chartData.candleSeries.coordinateToPrice(y);
        let hoveredLine = null;
        let hoveredLineY = null;
        let hoveredLineX = null;

        const key = `${chartData.symbol}_${chartData.interval}`;
        const lines = state.drawings[key];
        if (lines) {
            for (let line of lines) {
                if (line.type === 'horizontalLine' || line.type === 'alert') {
                    if (hoverPrice !== null) {
                        const lineY = chartData.candleSeries.priceToCoordinate(line.price);
                        if (lineY !== null && Math.abs(y - lineY) < 15) {
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

        if (hoveredLine) {
            if (hoveredLine.type === 'horizontalLine' || hoveredLine.type === 'alert') {
                let currentLeft = parseFloat(chartData.hoverDeleteBtn.style.left) || 0;
                if (chartData.hoveredLineId !== hoveredLine.id || Math.abs(x - currentLeft) > 50) {
                    const safeX = Math.min(x + 15, rect.width - 50); // Keep it away from the right-side price scale
                    chartData.hoverDeleteBtn.style.left = `${safeX}px`;
                }
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
        } else {
            chartData.hoverDeleteBtn.style.display = 'none';
            chartData.hoveredLineId = null;
            container.classList.remove('hovering-hline');
            container.classList.remove('hovering-vline');
        }
    });

    const finishDrag = () => {
        if (isDragging) {
            isDragging = false;
            saveDrawings();
            // Re-enable panning
            chartData.chart.applyOptions({ handleScroll: { pressedMouseMove: true } });
            if (chartData.justDragged) {
                setTimeout(() => chartData.justDragged = false, 50);
            }
        }
    };

    container.addEventListener('mouseup', finishDrag);
    container.addEventListener('mouseleave', () => {
        finishDrag();
        chartData.hoverDeleteBtn.style.display = 'none';
        container.classList.remove('hovering-hline');
        container.classList.remove('hovering-vline');
    });

    container.addEventListener('dblclick', (e) => {
        if (!chartData.candleSeries || !chartData.chart) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let rightScaleWidth = 0;
        try { rightScaleWidth = chartData.chart.priceScale('right').width(); } catch(err) {}

        if (rightScaleWidth > 0 && x >= rect.width - rightScaleWidth) {
            const price = chartData.candleSeries.coordinateToPrice(y);
            if (price !== null) {
                openPriceAlertModal(chartData, price);
            }
        }
    });

    chartData.chart.subscribeClick((param) => {
        if (chartData.justDragged) return; // Ignore native clicks resolving immediately after a drag
        
        if (!param.point || !chartData.candleSeries) return;

        if (chartData.drawingMode) {
            const price = chartData.candleSeries.coordinateToPrice(param.point.y);
            const time = param.time;
            const logical = chartData.chart.timeScale().coordinateToLogical ? chartData.chart.timeScale().coordinateToLogical(param.point.x) : null;
            const id = Date.now().toString() + Math.random().toString().slice(2, 6);
            const key = `${chartData.symbol}_${chartData.interval}`;
            if (!state.drawings[key]) state.drawings[key] = [];

            if (chartData.drawingMode === "hline") {
                if (price !== null) addHorizontalLine(chartData, price);
            } else if (chartData.drawingMode === "vline") {
                if (logical !== null || time !== undefined) {
                    const lineObj = { type: 'verticalLine', symbol: chartData.symbol, timeframe: chartData.interval, time: time, logical: logical, id: id };
                    state.drawings[key].push(lineObj);
                    saveDrawings();
                    renderVerticalLine(chartData, lineObj);
                }
            } else if (chartData.drawingMode === "buyMarker" || chartData.drawingMode === "sellMarker") {
                if (time) {
                    state.drawings[key].push({
                        type: chartData.drawingMode, symbol: chartData.symbol, timeframe: chartData.interval, time: time, price: price, id: id
                    });
                    saveDrawings();
                    updateMarkers(chartData);
                }
            } else if (chartData.drawingMode === "priceAlert") {
                if (price !== null) {
                    openPriceAlertModal(chartData, price);
                }
            }
            
            Object.values(state.charts).forEach(cd => {
                cd.drawingMode = null;
                const container = document.getElementById(`${cd.id}-container`);
                if (container) container.style.cursor = "default";
            });
            return;
        }

        let clickedPrice = null;
        if (chartData.candleSeries) {
            clickedPrice = chartData.candleSeries.coordinateToPrice(param.point.y);
        }
        checkAndInteractWithLine(chartData, clickedPrice, param.time, param.point);
    });

    chartData.candleSeries = chartData.chart.addCandlestickSeries({
            upColor: "#16a34a", downColor: "#dc2626",
            wickUpColor: "#16a34a", wickDownColor: "#dc2626",
            borderVisible: false, priceLineVisible: true,
            priceLineColor: "#16a34a", priceLineWidth: 1, priceLineStyle: 2,
            lastValueVisible: false,
        });

    chartData.volumeSeries = chartData.chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '', // Place it on a separate, hidden scale
        visible: true, // Force visible on init to apply scale margins
        lastValueVisible: false,
        priceLineVisible: false,
    });
    chartData.volumeSeries.priceScale().applyOptions({
        scaleMargins: {
            top: 0.8, // Layer Volume at the bottom 20% of the chart
            bottom: 0,
        },
    });
    if (!chartData.indicators.volume) {
        chartData.volumeSeries.applyOptions({ visible: false });
    }

    chartData.smaSeries = chartData.chart.addLineSeries({
        color: chartData.indicators.smaColor,
        lineWidth: chartData.indicators.smaLineWidth,
        visible: chartData.indicators.sma,
        lastValueVisible: false,
        priceLineVisible: false,
    });
    
    chartData.emaSeries = chartData.chart.addLineSeries({
        color: chartData.indicators.emaColor,
        lineWidth: chartData.indicators.emaLineWidth,
        visible: chartData.indicators.ema,
        lastValueVisible: false,
        priceLineVisible: false,
    });
    
    const bbOptions = {
        color: chartData.indicators.bbColor, lineWidth: chartData.indicators.bbLineWidth,
        visible: chartData.indicators.bb, lastValueVisible: false, priceLineVisible: false,
    };
    chartData.bbUpperSeries = chartData.chart.addLineSeries(bbOptions);
    chartData.bbMiddleSeries = chartData.chart.addLineSeries(bbOptions);
    chartData.bbLowerSeries = chartData.chart.addLineSeries(bbOptions);
    
    chartData.rsiSeries = chartData.chart.addLineSeries({
        color: chartData.indicators.rsiColor, lineWidth: chartData.indicators.rsiLineWidth,
        priceScaleId: 'rsi', visible: true, // Force visible on init to apply scale margins
        lastValueVisible: false, priceLineVisible: false,
        autoscaleInfoProvider: () => ({
            priceRange: {
                minValue: 0,
                maxValue: 100,
            },
        }),
    });
    
    chartData.chart.priceScale('rsi').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
        entireTextOnly: true, // Compress RSI scale width
        minimumWidth: 40, // Match main scale minimum width
    });
    
    if (!chartData.indicators.rsi) {
        chartData.rsiSeries.applyOptions({ visible: false });
    }
    
    // Add horizontal RSI bounds (70 Overbought / 30 Oversold)
    if (chartData.rsiSeries.createPriceLine) {
        chartData.rsiSeries.createPriceLine({ price: 70, color: '#ef4444', lineStyle: 2, axisLabelVisible: false, title: 'OB', lineWidth: 1 });
        chartData.rsiSeries.createPriceLine({ price: 30, color: '#10b981', lineStyle: 2, axisLabelVisible: false, title: 'OS', lineWidth: 1 });
    }

    // Add diagnostics requested for wheel event investigation
    setTimeout(() => runWheelDiagnostics(chartData.id), 1000);
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
    if (chartData.bbUpperSeries) chartData.bbUpperSeries.setData([]);
    if (chartData.bbMiddleSeries) chartData.bbMiddleSeries.setData([]);
    if (chartData.bbLowerSeries) chartData.bbLowerSeries.setData([]);
    if (chartData.rsiSeries) chartData.rsiSeries.setData([]);
    
    chartData.drawingMode = null;
    const container = document.getElementById(`${chartData.id}-container`);
    if (container) container.style.cursor = "default";

    if (chartData.renderedDrawings && chartData.candleSeries) {
        Object.values(chartData.renderedDrawings).forEach(pl => {
            try {
                chartData.candleSeries.removePriceLine(pl);
            } catch(e) {}
        });
        chartData.renderedDrawings = {};
    }
    cleanupVerticalLines(chartData);

    setPaneMessage(chartData.id, chartData.instrumentId === "none" ? "No Chart Selected" : "Loading");
    updateTicker(chartData, null, null);
}

function saveDrawings() {
    localStorage.setItem(CONFIG.DRAWINGS_STORAGE_KEY, JSON.stringify(state.drawings));
}

function addHorizontalLine(chartData, price) {
    const key = `${chartData.symbol}_${chartData.interval}`;
    if (!state.drawings[key]) state.drawings[key] = [];
    
    const isLight = state.theme === 'light';
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    const lineObj = {
        type: "horizontalLine",
        symbol: chartData.symbol,
        timeframe: chartData.interval,
        price: price,
        id: id,
        color: isLight ? '#3b82f6' : '#60a5fa',
        lineWidth: 2
    };
    state.drawings[key].push(lineObj);
    saveDrawings();
    renderHorizontalLine(chartData, lineObj);
}

function renderHorizontalLine(chartData, lineObj) {
    if (!chartData.candleSeries) return;
    
    const isLight = state.theme === 'light';
    const color = lineObj.color || (isLight ? '#3b82f6' : '#60a5fa');
    const lineWidth = lineObj.lineWidth || 2;
    const priceLine = chartData.candleSeries.createPriceLine({
        price: lineObj.price,
        color: color,
        lineWidth: lineWidth,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
        title: '',
    });
    
    if (!chartData.renderedDrawings) chartData.renderedDrawings = {};
    chartData.renderedDrawings[lineObj.id] = priceLine;
}

function checkAndInteractWithLine(chartData, clickedPrice, clickedTime, point) {
    const key = `${chartData.symbol}_${chartData.interval}`;
    if (!state.drawings[key]) return;
    
    const lines = state.drawings[key];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.type === "horizontalLine") {
            if (chartData.candleSeries && clickedPrice !== null) {
                const clickedY = chartData.candleSeries.priceToCoordinate(clickedPrice);
                const lineY = chartData.candleSeries.priceToCoordinate(line.price);
                    if (clickedY !== null && lineY !== null && Math.abs(clickedY - lineY) < 15) {
                    openLineSettingsModal(chartData, line, key);
                    return;
                }
            }
        } else if (line.type === "alert") {
            if (chartData.candleSeries && clickedPrice !== null) {
                const clickedY = chartData.candleSeries.priceToCoordinate(clickedPrice);
                const lineY = chartData.candleSeries.priceToCoordinate(line.price);
                    if (clickedY !== null && lineY !== null && Math.abs(clickedY - lineY) < 15) {
                    openAlertSettingsModal(chartData, line, key);
                    return;
                }
            }
        } else if ((line.type === "buyMarker" || line.type === "sellMarker") && clickedTime === line.time) {
            openMarkerSettingsModal(chartData, line, key);
            return;
        } else if (line.type === "verticalLine" && point) {
            if (chartData.chart) {
                const timeScale = chartData.chart.timeScale();
                let lineX = null;
                if (line.logical !== undefined && line.logical !== null && timeScale.logicalToCoordinate) {
                    lineX = timeScale.logicalToCoordinate(line.logical);
                } else if (line.time !== undefined && timeScale.timeToCoordinate) {
                    lineX = timeScale.timeToCoordinate(line.time);
                }
                    if (lineX !== null && Math.abs(point.x - lineX) < 15) {
                    openVLineSettingsModal(chartData, line);
                    return;
                }
            }
        }
    }
}

function openLineSettingsModal(chartData, lineObj, key) {
    let modal = document.getElementById("line-settings-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "line-settings-modal";
        modal.className = "settings-modal-overlay";
        document.body.appendChild(modal);
    }

    const isLight = state.theme === 'light';
    const defaultColor = isLight ? '#3b82f6' : '#60a5fa';
    const color = lineObj.color || defaultColor;
    const lineWidth = lineObj.lineWidth || 2;

    modal.innerHTML = `
        <div class="settings-modal-content" style="width: 280px;">
            <h3>Horizontal Line Settings</h3>
            <div class="settings-group">
                <label>Price</label>
                <input type="number" id="line-price-input" value="${lineObj.price}" step="0.01">
            </div>
            <div class="settings-group">
                <label>Color</label>
                <input type="color" id="line-color-input" value="${color}">
            </div>
            <div class="settings-group">
                <label>Thickness</label>
                <select id="line-width-input">
                    <option value="1" ${lineWidth == 1 ? 'selected' : ''}>Thin</option>
                    <option value="2" ${lineWidth == 2 ? 'selected' : ''}>Medium</option>
                    <option value="3" ${lineWidth == 3 ? 'selected' : ''}>Thick</option>
                    <option value="4" ${lineWidth == 4 ? 'selected' : ''}>Extra Thick</option>
                </select>
            </div>
            <div class="settings-actions">
                <button id="line-delete-btn">Delete</button>
                <button id="line-cancel-btn">Cancel</button>
                <button id="line-save-btn">Save</button>
            </div>
        </div>
    `;
    
    modal.style.display = "flex";

    document.getElementById("line-cancel-btn").onclick = () => {
        modal.style.display = "none";
    };

    document.getElementById("line-delete-btn").onclick = () => {
        const priceLine = chartData.renderedDrawings?.[lineObj.id];
        if (priceLine) {
            try {
                chartData.candleSeries.removePriceLine(priceLine);
            } catch (e) {}
            delete chartData.renderedDrawings[lineObj.id];
        }
        const idx = state.drawings[key].findIndex(l => l.id === lineObj.id);
        if (idx !== -1) state.drawings[key].splice(idx, 1);
        saveDrawings();
        modal.style.display = "none";
    };

    document.getElementById("line-save-btn").onclick = () => {
        const newPrice = parseFloat(document.getElementById("line-price-input").value);
        const newColor = document.getElementById("line-color-input").value;
        const newWidth = parseInt(document.getElementById("line-width-input").value, 10);
        
        lineObj.price = isNaN(newPrice) ? lineObj.price : newPrice;
        lineObj.color = newColor;
        lineObj.lineWidth = newWidth;
        
        const priceLine = chartData.renderedDrawings?.[lineObj.id];
        if (priceLine && priceLine.applyOptions) {
            priceLine.applyOptions({
                price: lineObj.price,
                color: lineObj.color,
                lineWidth: lineObj.lineWidth
            });
        }
        
        saveDrawings();
        modal.style.display = "none";
    };
}

function restoreDrawings(chartData) {
    if (chartData.renderedDrawings && chartData.candleSeries) {
        Object.values(chartData.renderedDrawings).forEach(pl => {
            if (pl) {
                try {
                    chartData.candleSeries.removePriceLine(pl);
                } catch(e) {}
            }
        });
    }
    chartData.renderedDrawings = {};
    cleanupVerticalLines(chartData);
    
    const key = `${chartData.symbol}_${chartData.interval}`;
    const lines = state.drawings[key];
    if (lines) {
        lines.forEach(lineObj => {
            if (lineObj.type === "horizontalLine") {
                renderHorizontalLine(chartData, lineObj);
            } else if (lineObj.type === "verticalLine") {
                renderVerticalLine(chartData, lineObj);
            } else if (lineObj.type === "alert") {
                renderAlertLine(chartData, lineObj);
            }
        });
        updateMarkers(chartData);
    }
}

function cleanupVerticalLines(chartData) {
    if (chartData._vLineHandlers && chartData.chart) {
        chartData._vLineHandlers.forEach(handler => {
            try {
                const ts = chartData.chart.timeScale();
                if (typeof ts.unsubscribeVisibleTimeRangeChange === 'function') {
                    ts.unsubscribeVisibleTimeRangeChange(handler);
                }
                if (typeof ts.unsubscribeLogicalRangeChange === 'function') {
                    ts.unsubscribeLogicalRangeChange(handler);
                }
            } catch(e) {}
        });
    }
    chartData._vLineHandlers = [];
    
    const container = document.getElementById(`${chartData.id}-container`);
    if (container) {
        container.querySelectorAll('.vertical-line-drawing').forEach(el => el.remove());
    }
}

function renderVerticalLine(chartData, lineObj) {
    const container = document.getElementById(`${chartData.id}-container`);
    if (!container || !chartData.chart) return;
    
    let el = document.getElementById(`vline-${lineObj.id}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `vline-${lineObj.id}`;
        el.className = 'vertical-line-drawing';
        el.style.position = 'absolute';
        el.style.top = '0px';
        el.style.bottom = '0px';
        el.style.width = '0px'; // Force 0 width to prevent any box rendering bugs
        el.style.borderLeft = `${lineObj.lineWidth || 2}px solid ${lineObj.color || (state.theme === 'light' ? '#3b82f6' : '#60a5fa')}`;
        el.style.marginLeft = `-${Math.floor((lineObj.lineWidth || 2) / 2)}px`;
        el.style.backgroundColor = 'transparent';
        el.style.zIndex = '40';
        el.style.pointerEvents = 'none'; 
        
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            openVLineSettingsModal(chartData, lineObj);
        });
        
        container.appendChild(el);

        const updatePosition = () => {
            if (!chartData.chart || !document.getElementById(`vline-${lineObj.id}`)) return;
            const timeScale = chartData.chart.timeScale();
            
            let x = null;
            if (lineObj.logical !== undefined && lineObj.logical !== null && timeScale.logicalToCoordinate) {
                x = timeScale.logicalToCoordinate(lineObj.logical);
            } else if (lineObj.time !== undefined && timeScale.timeToCoordinate) {
                x = timeScale.timeToCoordinate(lineObj.time);
            }
            
            let rightScaleWidth = 0;
            try { rightScaleWidth = chartData.chart.priceScale('right').width(); } catch(e) {}
            
            if (x !== null && x >= 0 && x <= (container.clientWidth - rightScaleWidth)) {
                el.style.left = `${x}px`;
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        };

        el._updatePosition = updatePosition;
        updatePosition();
        
        if (!chartData._vLineHandlers) chartData._vLineHandlers = [];
        chartData._vLineHandlers.push(updatePosition);
        
        const ts = chartData.chart.timeScale();
        if (typeof ts.subscribeVisibleTimeRangeChange === 'function') {
            ts.subscribeVisibleTimeRangeChange(updatePosition);
        }
        if (typeof ts.subscribeLogicalRangeChange === 'function') {
            ts.subscribeLogicalRangeChange(updatePosition);
        }
    } else {
        el.style.borderLeft = `${lineObj.lineWidth || 2}px solid ${lineObj.color || (state.theme === 'light' ? '#3b82f6' : '#60a5fa')}`;
        el.style.marginLeft = `-${Math.floor((lineObj.lineWidth || 2) / 2)}px`;
        if (el._updatePosition) el._updatePosition();
    }
}

function openVLineSettingsModal(chartData, lineObj) {
    let modal = document.getElementById("vline-settings-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "vline-settings-modal";
        modal.className = "settings-modal-overlay";
        document.body.appendChild(modal);
    }

    const key = `${chartData.symbol}_${chartData.interval}`;
    const isLight = state.theme === 'light';
    const defaultColor = isLight ? '#3b82f6' : '#60a5fa';
    const color = lineObj.color || defaultColor;
    const lineWidth = lineObj.lineWidth || 2;

    modal.innerHTML = `
        <div class="settings-modal-content" style="width: 280px;">
            <h3>Vertical Line Settings</h3>
            <div class="settings-group">
                <label>Color</label>
                <input type="color" id="vline-color-input" value="${color}">
            </div>
            <div class="settings-group">
                <label>Thickness</label>
                <select id="vline-width-input">
                    <option value="1" ${lineWidth == 1 ? 'selected' : ''}>Thin</option>
                    <option value="2" ${lineWidth == 2 ? 'selected' : ''}>Medium</option>
                    <option value="3" ${lineWidth == 3 ? 'selected' : ''}>Thick</option>
                    <option value="4" ${lineWidth == 4 ? 'selected' : ''}>Extra Thick</option>
                </select>
            </div>
            <div class="settings-actions">
                <button id="vline-delete-btn" style="background: #ef4444; color: white; margin-right: auto;">Delete</button>
                <button id="vline-cancel-btn" style="background: #394654; color: white;">Cancel</button>
                <button id="vline-save-btn" style="background: #10b981; color: white;">Save</button>
            </div>
        </div>
    `;
    
    modal.style.display = "flex";

    document.getElementById("vline-cancel-btn").onclick = () => {
        modal.style.display = "none";
    };

    document.getElementById("vline-delete-btn").onclick = () => {
        const el = document.getElementById(`vline-${lineObj.id}`);
        if (el) el.remove();
        if (state.drawings[key]) {
            state.drawings[key] = state.drawings[key].filter(d => d.id !== lineObj.id);
            saveDrawings();
        }
        modal.style.display = "none";
    };

    document.getElementById("vline-save-btn").onclick = () => {
        const newColor = document.getElementById("vline-color-input").value;
        const newWidth = parseInt(document.getElementById("vline-width-input").value, 10);
        
        lineObj.color = newColor;
        lineObj.lineWidth = newWidth;
        
        renderVerticalLine(chartData, lineObj);
        
        saveDrawings();
        modal.style.display = "none";
    };
}

function openMarkerSettingsModal(chartData, markerObj, key) {
    let modal = document.getElementById("marker-settings-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "marker-settings-modal";
        modal.className = "settings-modal-overlay";
        document.body.appendChild(modal);
    }

    const typeLabel = markerObj.type === 'buyMarker' ? 'Buy Marker' : 'Sell Marker';

    modal.innerHTML = `
        <div class="settings-modal-content" style="width: 280px; text-align: center;">
            <h3 style="margin-bottom: 24px;">Manage ${typeLabel}</h3>
            <div class="settings-actions" style="justify-content: center; gap: 16px;">
                <button id="marker-delete-btn" style="background: #ef4444; color: white; flex: 1;">Delete</button>
                <button id="marker-cancel-btn" style="background: #394654; color: white; flex: 1;">Cancel</button>
            </div>
        </div>
    `;
    
    modal.style.display = "flex";

    document.getElementById("marker-cancel-btn").onclick = () => {
        modal.style.display = "none";
    };

    document.getElementById("marker-delete-btn").onclick = () => {
        const lines = state.drawings[key];
        if (lines) {
            const idx = lines.findIndex(d => d.id === markerObj.id);
            if (idx !== -1) lines.splice(idx, 1);
            saveDrawings();
            updateMarkers(chartData);
        }
        modal.style.display = "none";
    };
}

function updateMarkers(chartData) {
    if (!chartData.candleSeries) return;
    const key = `${chartData.symbol}_${chartData.interval}`;
    const drawings = state.drawings[key] || [];
    
    const markers = [];
    drawings.forEach(d => {
        if (d.type === 'buyMarker') {
            markers.push({ time: d.time, position: 'belowBar', color: '#16a34a', shape: 'arrowUp', text: 'BUY', id: d.id });
        } else if (d.type === 'sellMarker') {
            markers.push({ time: d.time, position: 'aboveBar', color: '#dc2626', shape: 'arrowDown', text: 'SELL', id: d.id });
        }
    });
    
    markers.sort((a, b) => a.time - b.time);
    chartData.candleSeries.setMarkers(markers);
}

function renderAlertLine(chartData, alertObj) {
    if (!chartData.candleSeries) return;
    
    const color = alertObj.active === false ? '#6b7280' : '#f59e0b';
    
    const priceLine = chartData.candleSeries.createPriceLine({
        price: alertObj.price,
        color: color,
        lineWidth: 1,
        lineStyle: 2, 
        axisLabelVisible: true,
        title: '🔔',
    });
    
    if (!chartData.renderedDrawings) chartData.renderedDrawings = {};
    chartData.renderedDrawings[alertObj.id] = priceLine;
}

function openPriceAlertModal(chartData, defaultPrice) {
    let modal = document.getElementById("alert-settings-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "alert-settings-modal";
        modal.className = "settings-modal-overlay";
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="settings-modal-content" style="width: 280px;">
            <h3>Create Price Alert</h3>
            <div class="settings-group">
                <label>Price</label>
                <input type="number" id="alert-price-input" value="${defaultPrice.toFixed(2)}" step="0.01">
            </div>
            <div class="settings-actions">
                <button id="alert-cancel-btn" style="background: #394654; color: white;">Cancel</button>
                <button id="alert-save-btn" style="background: #10b981; color: white;">Create</button>
            </div>
        </div>
    `;
    modal.style.display = "flex";
    
    document.getElementById("alert-cancel-btn").onclick = () => {
        modal.style.display = "none";
    };
    
    document.getElementById("alert-save-btn").onclick = () => {
        const price = parseFloat(document.getElementById("alert-price-input").value);
        if (!isNaN(price)) {
            const id = Date.now().toString() + Math.random().toString().slice(2, 6);
            const alertObj = {
                type: 'alert',
                symbol: chartData.symbol,
                timeframe: chartData.interval,
                price: price,
                id: id,
                active: true
            };
            const key = `${chartData.symbol}_${chartData.interval}`;
            if (!state.drawings[key]) state.drawings[key] = [];
            state.drawings[key].push(alertObj);
            saveDrawings();
            renderAlertLine(chartData, alertObj);
            
            if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
                Notification.requestPermission();
            }
        }
        modal.style.display = "none";
    };
}

function openAlertSettingsModal(chartData, alertObj, key) {
    let modal = document.getElementById("alert-edit-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "alert-edit-modal";
        modal.className = "settings-modal-overlay";
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="settings-modal-content" style="width: 280px;">
            <h3>Edit Price Alert</h3>
            <div class="settings-group">
                <label>Price</label>
                <input type="number" id="edit-alert-price" value="${alertObj.price}" step="0.01">
            </div>
            <div class="settings-actions">
                <button id="edit-alert-delete" style="background: #ef4444; color: white; margin-right: auto;">Delete</button>
                <button id="edit-alert-cancel" style="background: #394654; color: white;">Cancel</button>
                <button id="edit-alert-save" style="background: #10b981; color: white;">Save</button>
            </div>
        </div>
    `;
    modal.style.display = "flex";
    
    document.getElementById("edit-alert-cancel").onclick = () => {
        modal.style.display = "none";
    };
    
    document.getElementById("edit-alert-delete").onclick = () => {
        const priceLine = chartData.renderedDrawings?.[alertObj.id];
        if (priceLine) {
            try { chartData.candleSeries.removePriceLine(priceLine); } catch (e) {}
            delete chartData.renderedDrawings[alertObj.id];
        }
        const idx = state.drawings[key].findIndex(l => l.id === alertObj.id);
        if (idx !== -1) state.drawings[key].splice(idx, 1);
        saveDrawings();
        modal.style.display = "none";
    };
    
    document.getElementById("edit-alert-save").onclick = () => {
        const newPrice = parseFloat(document.getElementById("edit-alert-price").value);
        alertObj.price = isNaN(newPrice) ? alertObj.price : newPrice;
        alertObj.active = true;
        
        const priceLine = chartData.renderedDrawings?.[alertObj.id];
        if (priceLine && priceLine.applyOptions) {
            priceLine.applyOptions({
                price: alertObj.price,
                title: '🔔',
                color: '#f59e0b'
            });
        }
        saveDrawings();
        modal.style.display = "none";
    };
}

function checkAlerts(chartData, currentPrice) {
    if (chartData.lastPrice === null) return;
    const prevPrice = chartData.lastPrice;
    
    const key = `${chartData.symbol}_${chartData.interval}`;
    const lines = state.drawings[key];
    if (!lines) return;
    
    lines.forEach(line => {
        if (line.type === 'alert' && line.active !== false) {
            let triggered = false;
            if ((prevPrice <= line.price && currentPrice > line.price) || (prevPrice >= line.price && currentPrice < line.price)) {
                triggered = true;
            }
            
            if (triggered) {
                line.active = false;
                saveDrawings();
                showNotification(`Alert Triggered: ${chartData.symbol}`, `Price crossed ${line.price}. Current: ${currentPrice}`);
                
                const priceLine = chartData.renderedDrawings?.[line.id];
                if (priceLine && priceLine.applyOptions) {
                    priceLine.applyOptions({ color: '#6b7280', title: '🔔' });
                }
            }
        }
    });
}

function showNotification(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body: body });
    }
    
    const popup = document.createElement("div");
    popup.className = "alert-popup";
    popup.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
        <div>${body}</div>
    `;
    document.body.appendChild(popup);
    
    setTimeout(() => {
        popup.style.opacity = "0";
        setTimeout(() => popup.remove(), 300);
    }, 5000);
}

async function loadChartData(chartData) {
    if (chartData.instrumentId === "none") {
        setPaneMessage(chartData.id, "No Chart Selected");
        return;
    }
    try {
        setDataStatus(`Loading ${chartData.symbol} ${chartData.interval}`);
        
        let candles = [];
        
        if (chartData.source === "hyperliquid") {
            let hlData = [];
            try {
                const intervalMap = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400 };
                const seconds = intervalMap[chartData.interval] || 3600;
                // Request 3000 candles of history from Hyperliquid instead of 500
                const startTime = Date.now() - (seconds * 3000 * 1000);
                
                const res = await fetch("https://api.hyperliquid.xyz/info", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "candleSnapshot",
                    req: { coin: chartData.symbol, interval: chartData.interval, startTime: startTime, endTime: Date.now() }
                    })
                });
                
                if (res.ok) hlData = await res.json();
            } catch (e) {
                console.warn("Hyperliquid fetch failed", e);
            }
            
            if (Array.isArray(hlData) && hlData.length > 0) {
                candles = hlData.map(c => normalizeCandle({
                    time: Math.floor(c.t / 1000),
                    open: c.o,
                    high: c.h,
                    low: c.l,
                    close: c.c,
                    volume: c.v
                })).filter(Boolean);
            } else {
                console.warn(`No candles from Hyperliquid for ${chartData.symbol}, trying Binance Spot...`);
                let cleanSymbol = chartData.symbol.toUpperCase();
                if (cleanSymbol === 'MATIC') cleanSymbol = 'POL';
                if (cleanSymbol.startsWith('1000')) cleanSymbol = cleanSymbol.replace(/^1000/, '');
                
                // Maximize the historical limits for the fallback APIs
                const endpoints = [
                    `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}USDT&interval=${chartData.interval}&limit=1000`,
                    `https://data-api.binance.vision/api/v3/klines?symbol=${cleanSymbol}USDT&interval=${chartData.interval}&limit=1000`,
                    `https://fapi.binance.com/fapi/v1/klines?symbol=${cleanSymbol}USDT&interval=${chartData.interval}&limit=1500`,
                    `https://fapi.binance.com/fapi/v1/klines?symbol=1000${cleanSymbol}USDT&interval=${chartData.interval}&limit=1500`,
                    `https://api.mexc.com/api/v3/klines?symbol=${cleanSymbol}USDT&interval=${chartData.interval === '1h' ? '60m' : chartData.interval}&limit=1000`,
                    `https://api.mexc.com/api/v3/klines?symbol=1000${cleanSymbol}USDT&interval=${chartData.interval === '1h' ? '60m' : chartData.interval}&limit=1000`
                ];
                
                let bData = null;
                let is1000x = false;
                for (const url of endpoints) {
                    try {
                        const bRes = await fetch(url);
                        if (bRes.ok) { 
                            bData = await bRes.json(); 
                            if (url.includes('symbol=1000')) is1000x = true;
                            break; 
                        }
                    } catch (err) { /* Ignore ISP blocks/CORS errors and try next */ }
                }
                
                if (!bData) throw new Error(`Data blocked or unavailable for ${chartData.symbol}`);

                const scale = is1000x ? 1000 : 1;
                candles = bData.filter(c => Array.isArray(c) && c.length >= 6).map(c => normalizeCandle({
                    time: Math.floor(c[0] / 1000),
                    open: c[1] / scale,
                    high: c[2] / scale,
                    low: c[3] / scale,
                    close: c[4] / scale,
                    volume: c[5] * scale
                })).filter(Boolean);
            }
        } else {
            const response = await fetch(`${CONFIG.API_BASE}/data/${chartData.source}/${chartData.symbol}/${chartData.interval}`);
            const payload = await response.json();
            if (!response.ok || !payload.candles || payload.candles.length === 0) {
                throw new Error(payload.error || "No candles available");
            }
            candles = payload.candles.map(normalizeCandle).filter(Boolean);
        }

        if (candles.length === 0) throw new Error("No valid candle data parsed");
        
        // Ensure strictly ascending time order and remove duplicates to prevent chart glitches
        candles.sort((a, b) => a.time - b.time);
        candles = candles.filter((c, i, arr) => i === 0 || c.time > arr[i - 1].time);
        
        chartData.cachedData = candles;
        syncChartWithCache(chartData);

        chartData.chart.timeScale().applyOptions({ rightOffset: 3, barSpacing: 8 });
        chartData.chart.timeScale().scrollToRealTime();

        // Let the chart auto-scale perfectly to the data, then unlock the Y-axis
        // so you can instantly drag the candles up and down with the mouse.
        // Let the chart auto-scale perfectly to the data.
        // Users can unlock the Y-axis manually at any time by dragging the price scale.
        chartData.chart.priceScale('right').applyOptions({ autoScale: true });

        chartData.currentCandle = candles[candles.length - 1];
        chartData.referencePrice = candles.length > 1 ? candles[candles.length - 2].close : chartData.currentCandle.open;
        
        const isUp = chartData.currentCandle.close >= chartData.currentCandle.open;
        chartData.lastDirection = isUp ? 'up' : 'down';
        chartData.candleSeries.applyOptions({
            priceLineColor: isUp ? "#16a34a" : "#dc2626"
        });

        restoreDrawings(chartData);

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

function syncChartWithCache(chartData) {
    if (!chartData.candleSeries || !chartData.cachedData || chartData.cachedData.length === 0) return;
    
    chartData.candleSeries.setData(chartData.cachedData);
    
    if (chartData.indicators.volume && chartData.volumeSeries) {
        chartData.volumeSeries.setData(chartData.cachedData.map(c => ({
            time: c.time,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(22, 163, 74, 0.4)' : 'rgba(220, 38, 38, 0.4)'
        })));
    }
    if (chartData.indicators.sma && chartData.smaSeries) {
        chartData.smaSeries.setData(calculateSMA(chartData.cachedData, chartData.indicators.smaPeriod));
    }
    if (chartData.indicators.ema && chartData.emaSeries) {
        chartData.emaSeries.setData(calculateEMA(chartData.cachedData, chartData.indicators.emaPeriod));
    }
    if (chartData.indicators.bb && chartData.bbUpperSeries) {
        const bbData = calculateBB(chartData.cachedData, chartData.indicators.bbPeriod, chartData.indicators.bbStdDev);
        chartData.bbUpperSeries.setData(bbData.upper);
        chartData.bbMiddleSeries.setData(bbData.middle);
        chartData.bbLowerSeries.setData(bbData.lower);
    }
    if (chartData.indicators.rsi && chartData.rsiSeries) {
        chartData.rsiSeries.setData(calculateRSI(chartData.cachedData, chartData.indicators.rsiPeriod));
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
    if (chartData.liveSubscribed || chartData.symbol === "No Chart" || chartData.symbol === "none") return;
    
    if (chartData.source === "hyperliquid" && state.hlWs && state.hlWs.readyState === WebSocket.OPEN) {
        state.hlWs.send(JSON.stringify({
            method: "subscribe",
            subscription: { type: "trades", coin: chartData.symbol }
        }));
        chartData.liveSubscribed = true;
    } else if (chartData.source !== "hyperliquid") {
        chartData.liveSubscribed = true;
        fetch(`${CONFIG.API_BASE}/live/subscribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source: chartData.source, symbol: chartData.symbol }),
        }).catch(error => {
            chartData.liveSubscribed = false;
            console.warn("Live subscribe failed", error);
        });
    }
}

function unsubscribeChart(chartData) {
    if (!chartData.liveSubscribed || chartData.symbol === "No Chart" || chartData.symbol === "none") return;
    
    if (chartData.source === "hyperliquid") {
        if (state.hlWs && state.hlWs.readyState === WebSocket.OPEN) {
            state.hlWs.send(JSON.stringify({
                method: "unsubscribe",
                subscription: { type: "trades", coin: chartData.symbol }
            }));
        }
    }
    chartData.liveSubscribed = false;
}

function handlePriceUpdate(tick) {
    Object.values(state.charts).forEach(chartData => {
        if (chartData.source !== tick.source || chartData.symbol !== tick.symbol) return;
        applyPriceUpdate(chartData, tick);
    });
}

function applyPriceUpdate(chartData, tick) {
    const price = Number(tick.price);
    const time = Number(tick.time);
    const volume = Number(tick.volume) || 0;
    if (!Number.isFinite(price) || !Number.isFinite(time)) return;

    checkAlerts(chartData, price);

    const candle = buildRealtimeCandle(chartData, time, price, volume);
    
    // Cache maintenance
    chartData.isNewBar = false;
    if (chartData.cachedData.length > 0) {
        const last = chartData.cachedData[chartData.cachedData.length - 1];
        if (last.time === candle.time) {
            chartData.cachedData[chartData.cachedData.length - 1] = candle;
        } else {
            chartData.cachedData.push(candle);
            chartData.isNewBar = true;
        }
    } else {
        chartData.cachedData.push(candle);
        chartData.isNewBar = true;
    }

    chartData.flashDirection = chartData.lastPrice === null || price >= chartData.lastPrice ? "up" : "down";
    chartData.lastPrice = price;
    chartData.lastDirection = candle.close >= candle.open ? 'up' : 'down';

    if (!chartData.pendingUpdate) {
        chartData.pendingUpdate = true;
        requestAnimationFrame(() => flushChartUpdate(chartData));
    }
}

function flushChartUpdate(chartData) {
    chartData.pendingUpdate = false;
    
    const candle = chartData.cachedData[chartData.cachedData.length - 1];
    if (!candle) return;

    let shouldShift = false;
    if (chartData.isNewBar && chartData.chart) {
        const timeScale = chartData.chart.timeScale();
        if (typeof timeScale.scrollPosition === 'function') {
            const pos = timeScale.scrollPosition();
            if (pos <= 5) shouldShift = true; // Snap if we are hovering near the live edge
        }
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
    
    if (chartData.indicators.bb) {
        const lastBB = calculateLatestBB(chartData.cachedData, chartData.indicators.bbPeriod, chartData.indicators.bbStdDev);
        if (lastBB) {
            chartData.bbUpperSeries.update(lastBB.upper);
            chartData.bbMiddleSeries.update(lastBB.middle);
            chartData.bbLowerSeries.update(lastBB.lower);
        }
    }
    
    if (chartData.indicators.rsi) {
        const lastRsi = calculateLatestRSI(chartData.cachedData, chartData.indicators.rsiPeriod);
        if (lastRsi) chartData.rsiSeries.update(lastRsi);
    }

    chartData.candleSeries.applyOptions({
        priceLineColor: chartData.lastDirection === 'up' ? "#16a34a" : "#dc2626"
    });

    if (shouldShift) {
        chartData.chart.timeScale().scrollToRealTime();
    }

    if (!document.hidden) {
        const now = Date.now();
        if (now - chartData.lastUIUpdate > 100) {
            updateTicker(chartData, chartData.lastPrice, chartData.referencePrice);
            flashTicker(chartData.id, chartData.flashDirection);
            updateChartCountdown(chartData, now);
            chartData.lastUIUpdate = now;
            
            if (state.chartCount === 1 && chartData.id === 'chart-1') {
                updateInfoPanelPrice(chartData.lastPrice);
            }
        }
    }
}

function buildRealtimeCandle(chartData, time, price, volume) {
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
                volume: volume,
        };
        return chartData.currentCandle;
    }

    current.high = Math.max(current.high, price);
    current.low = Math.min(current.low, price);
    current.close = price;
        current.volume += volume;
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
    pane.querySelector(".ticker-change").textContent = `${change >= 0 ? "+" : ""}${change.toFixed(2)}% (${chartData.interval})`;
    pane.querySelector(".ticker-change").className = `ticker-change ${direction}`;
}

function flashTicker(chartId, direction) {
    if (document.hidden) return; // Prevent layout thrashing when tab is hidden
    const ticker = document.getElementById(`${chartId}-ticker`);
    if (!ticker) return;
    const flashClass = direction === "up" ? "flash-up" : "flash-down";
    
    ticker.classList.remove("flash-up", "flash-down");
    
    setTimeout(() => {
        ticker.classList.add(flashClass);
    }, 10);
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

        // Dynamically match the timer box width to the exact width of the price axis
        const scaleWidth = chartData.chart.priceScale('right').width();
        if (scaleWidth > 0) {
            timerEl.style.width = `${scaleWidth}px`;
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

function updateConnectionStatus() {
    const isSSEConnected = state.liveStream && state.liveStream.readyState === 1; // 1 is OPEN
    const isWSConnected = state.hlWs && state.hlWs.readyState === 1;
    const isConnected = isSSEConnected || isWSConnected;
    const wasConnected = state.connected;
    state.connected = isConnected;
    
    const status = document.getElementById("connection-status");
    if (status) {
        status.textContent = isConnected ? "Live connected" : "Live disconnected";
        status.className = `status-indicator ${isConnected ? "connected" : "disconnected"}`;
    }
    
    if (isConnected && !wasConnected) {
        Object.values(state.charts).forEach(subscribeChart);
    }
}

function setDataStatus(message) {
    document.getElementById("data-status").textContent = message;
}

function updateTimestamp() {
    document.getElementById("timestamp").textContent = TimeUtils.getCurrentTime();
}

function setActiveChart(chartId) {
    if (state.activeChartId === chartId || !state.charts[chartId]) return;

    if (state.activeChartId) {
        const oldPane = document.getElementById(state.activeChartId);
        if (oldPane) oldPane.classList.remove('active-chart');
    }

    state.activeChartId = chartId;
    const newPane = document.getElementById(chartId);
    if (newPane) newPane.classList.add('active-chart');

    updateMarketMoverHighlights();
}

function updateMarketMoverHighlights() {
    const activeChart = state.charts[state.activeChartId];
    const activeSymbol = activeChart ? activeChart.symbol : null;

    document.querySelectorAll('.market-ticker-item').forEach(item => {
        item.classList.toggle('active-mover', item.dataset.symbol === activeSymbol);
    });
}

function switchChartSymbol(chartId, newSymbol) {
    const chartData = state.charts[chartId];
    if (!chartData || chartData.symbol === newSymbol) return;

    if (newSymbol === 'none') {
        if (chartData.instrumentId === 'none') return;
        unsubscribeChart(chartData);
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
        if (state.chartCount === 1 && chartData.id === 'chart-1') {
            clearInfoPanel();
        }
        updateMarketMoverHighlights();
        return;
    }

    const instrument = state.instruments.find(item => item.symbol === newSymbol);
    if (!instrument) {
        console.warn(`Instrument not found for symbol: ${newSymbol}`);
        return;
    }

    unsubscribeChart(chartData);
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
    loadChartData(chartData);
    saveLayoutState();

    if (state.chartCount === 1 && chartData.id === 'chart-1') {
        fetchAndRenderAssetInfo(chartData.symbol);
    }

    updateMarketMoverHighlights();
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

function calculateBB(data, period, stdDevMult) {
    const upper = [], middle = [], lower = [];
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += data[i - j].close;
        const sma = sum / period;
        
        let varianceSum = 0;
        for (let j = 0; j < period; j++) {
            varianceSum += Math.pow(data[i - j].close - sma, 2);
        }
        const stdDev = Math.sqrt(varianceSum / period);
        
        const time = data[i].time;
        upper.push({ time, value: sma + stdDevMult * stdDev });
        middle.push({ time, value: sma });
        lower.push({ time, value: sma - stdDevMult * stdDev });
    }
    return { upper, middle, lower };
}

function calculateLatestBB(data, period, stdDevMult) {
    if (data.length < period) return null;
    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[data.length - 1 - i].close;
    const sma = sum / period;
    
    let varianceSum = 0;
    for (let i = 0; i < period; i++) varianceSum += Math.pow(data[data.length - 1 - i].close - sma, 2);
    const stdDev = Math.sqrt(varianceSum / period);
    
    const time = data[data.length - 1].time;
    return { upper: { time, value: sma + stdDevMult * stdDev }, middle: { time, value: sma }, lower: { time, value: sma - stdDevMult * stdDev } };
}

function calculateRSI(data, period) {
    const rsi = [];
    if (data.length < period + 1) return rsi;

    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const change = data[i].close - data[i - 1].close;
        if (change >= 0) gains += change;
        else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    let rsiValue = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    if (avgGain === 0 && avgLoss === 0) rsiValue = 50;
    rsi.push({ time: data[period].time, value: rsiValue });

    for (let i = period + 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        const gain = change >= 0 ? change : 0;
        const loss = change < 0 ? -change : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        rsiValue = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
        if (avgGain === 0 && avgLoss === 0) rsiValue = 50;
        rsi.push({ time: data[i].time, value: rsiValue });
    }
    return rsi;
}

function calculateLatestRSI(data, period) {
    const lookback = Math.min(data.length, period * 5);
    if (lookback < period + 1) return null;
    
    const startIdx = data.length - lookback;
    let gains = 0, losses = 0;
    for (let i = startIdx + 1; i <= startIdx + period; i++) {
        const change = data[i].close - data[i - 1].close;
        if (change >= 0) gains += change;
        else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    let rsiValue = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    if (avgGain === 0 && avgLoss === 0) rsiValue = 50;

    for (let i = startIdx + period + 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        const gain = change >= 0 ? change : 0;
        const loss = change < 0 ? -change : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        rsiValue = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
        if (avgGain === 0 && avgLoss === 0) rsiValue = 50;
    }
    return { time: data[data.length - 1].time, value: rsiValue };
}

function openSettingsModal(chartData) {
    let modal = document.getElementById("chart-settings-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "chart-settings-modal";
        modal.className = "settings-modal-overlay";
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="settings-modal-content">
            <h3>Chart Settings</h3>
            <div class="settings-group">
                <label>SMA Period</label>
                <input type="number" id="sma-period-input" value="${chartData.indicators.smaPeriod}" min="1">
            </div>
            <div class="settings-group">
                <label>SMA Color</label>
                <input type="color" id="sma-color-input" value="${chartData.indicators.smaColor}">
            </div>
            <div class="settings-group">
                <label>SMA Thickness</label>
                <select id="sma-width-input">
                    <option value="1" ${chartData.indicators.smaLineWidth == 1 ? 'selected' : ''}>Thin</option>
                    <option value="2" ${chartData.indicators.smaLineWidth == 2 ? 'selected' : ''}>Medium</option>
                    <option value="3" ${chartData.indicators.smaLineWidth == 3 ? 'selected' : ''}>Thick</option>
                </select>
            </div>
            <div class="settings-group">
                <label>EMA Period</label>
                <input type="number" id="ema-period-input" value="${chartData.indicators.emaPeriod}" min="1">
            </div>
            <div class="settings-group">
                <label>EMA Color</label>
                <input type="color" id="ema-color-input" value="${chartData.indicators.emaColor}">
            </div>
            <div class="settings-group">
                <label>EMA Thickness</label>
                <select id="ema-width-input">
                    <option value="1" ${chartData.indicators.emaLineWidth == 1 ? 'selected' : ''}>Thin</option>
                    <option value="2" ${chartData.indicators.emaLineWidth == 2 ? 'selected' : ''}>Medium</option>
                    <option value="3" ${chartData.indicators.emaLineWidth == 3 ? 'selected' : ''}>Thick</option>
                </select>
            </div>
            <div class="settings-group">
                <label>BB Period</label>
                <input type="number" id="bb-period-input" value="${chartData.indicators.bbPeriod}" min="1">
            </div>
            <div class="settings-group">
                <label>BB Std Dev</label>
                <input type="number" id="bb-stddev-input" value="${chartData.indicators.bbStdDev}" min="0.1" step="0.1">
            </div>
            <div class="settings-group">
                <label>BB Color</label>
                <input type="color" id="bb-color-input" value="${chartData.indicators.bbColor}">
            </div>
            <div class="settings-group">
                <label>BB Thickness</label>
                <select id="bb-width-input">
                    <option value="1" ${chartData.indicators.bbLineWidth == 1 ? 'selected' : ''}>Thin</option>
                    <option value="2" ${chartData.indicators.bbLineWidth == 2 ? 'selected' : ''}>Medium</option>
                    <option value="3" ${chartData.indicators.bbLineWidth == 3 ? 'selected' : ''}>Thick</option>
                </select>
            </div>
            <div class="settings-group">
                <label>RSI Period</label>
                <input type="number" id="rsi-period-input" value="${chartData.indicators.rsiPeriod}" min="1">
            </div>
            <div class="settings-group">
                <label>RSI Color</label>
                <input type="color" id="rsi-color-input" value="${chartData.indicators.rsiColor}">
            </div>
            <div class="settings-group">
                <label>RSI Thickness</label>
                <select id="rsi-width-input">
                    <option value="1" ${chartData.indicators.rsiLineWidth == 1 ? 'selected' : ''}>Thin</option>
                    <option value="2" ${chartData.indicators.rsiLineWidth == 2 ? 'selected' : ''}>Medium</option>
                    <option value="3" ${chartData.indicators.rsiLineWidth == 3 ? 'selected' : ''}>Thick</option>
                </select>
            </div>
            <div class="settings-actions">
                <button id="settings-cancel-btn">Cancel</button>
                <button id="settings-save-btn">Save</button>
            </div>
        </div>
    `;
    
    modal.style.display = "flex";

    document.getElementById("settings-cancel-btn").onclick = () => {
        modal.style.display = "none";
    };

    document.getElementById("settings-save-btn").onclick = () => {
        const smaPeriod = parseInt(document.getElementById("sma-period-input").value, 10);
        const emaPeriod = parseInt(document.getElementById("ema-period-input").value, 10);
        const bbPeriod = parseInt(document.getElementById("bb-period-input").value, 10);
        const bbStdDev = parseFloat(document.getElementById("bb-stddev-input").value);
        const rsiPeriod = parseInt(document.getElementById("rsi-period-input").value, 10);
        
        if (!isNaN(smaPeriod) && smaPeriod > 0) chartData.indicators.smaPeriod = smaPeriod;
        if (!isNaN(emaPeriod) && emaPeriod > 0) chartData.indicators.emaPeriod = emaPeriod;
        if (!isNaN(bbPeriod) && bbPeriod > 0) chartData.indicators.bbPeriod = bbPeriod;
        if (!isNaN(bbStdDev) && bbStdDev > 0) chartData.indicators.bbStdDev = bbStdDev;
        if (!isNaN(rsiPeriod) && rsiPeriod > 0) chartData.indicators.rsiPeriod = rsiPeriod;
        
        chartData.indicators.smaColor = document.getElementById("sma-color-input").value;
        chartData.indicators.emaColor = document.getElementById("ema-color-input").value;
        chartData.indicators.bbColor = document.getElementById("bb-color-input").value;
        chartData.indicators.rsiColor = document.getElementById("rsi-color-input").value;
        chartData.indicators.smaLineWidth = parseInt(document.getElementById("sma-width-input").value, 10);
        chartData.indicators.emaLineWidth = parseInt(document.getElementById("ema-width-input").value, 10);
        chartData.indicators.bbLineWidth = parseInt(document.getElementById("bb-width-input").value, 10);
        chartData.indicators.rsiLineWidth = parseInt(document.getElementById("rsi-width-input").value, 10);

        if (chartData.smaSeries) {
            chartData.smaSeries.applyOptions({ color: chartData.indicators.smaColor, lineWidth: chartData.indicators.smaLineWidth });
            if (chartData.indicators.sma) chartData.smaSeries.setData(calculateSMA(chartData.cachedData, chartData.indicators.smaPeriod));
        }
        if (chartData.emaSeries) {
            chartData.emaSeries.applyOptions({ color: chartData.indicators.emaColor, lineWidth: chartData.indicators.emaLineWidth });
            if (chartData.indicators.ema) chartData.emaSeries.setData(calculateEMA(chartData.cachedData, chartData.indicators.emaPeriod));
        }
        if (chartData.bbUpperSeries) {
            const bbOpts = { color: chartData.indicators.bbColor, lineWidth: chartData.indicators.bbLineWidth };
            chartData.bbUpperSeries.applyOptions(bbOpts);
            chartData.bbMiddleSeries.applyOptions(bbOpts);
            chartData.bbLowerSeries.applyOptions(bbOpts);
            if (chartData.indicators.bb) {
                const bbData = calculateBB(chartData.cachedData, chartData.indicators.bbPeriod, chartData.indicators.bbStdDev);
                chartData.bbUpperSeries.setData(bbData.upper);
                chartData.bbMiddleSeries.setData(bbData.middle);
                chartData.bbLowerSeries.setData(bbData.lower);
            }
        }
        if (chartData.rsiSeries) {
            chartData.rsiSeries.applyOptions({ color: chartData.indicators.rsiColor, lineWidth: chartData.indicators.rsiLineWidth });
            if (chartData.indicators.rsi) {
                chartData.rsiSeries.setData(calculateRSI(chartData.cachedData, chartData.indicators.rsiPeriod));
                chartData.chart.priceScale('rsi').applyOptions({
                    scaleMargins: { top: 0.8, bottom: 0 },
                });
            }
        }

        const select = document.querySelector(`#${chartData.id} .indicator-select`);
        if (select) {
            select.options[2].text = `SMA ${chartData.indicators.smaPeriod} (${chartData.indicators.sma ? 'On' : 'Off'})`;
            select.options[3].text = `EMA ${chartData.indicators.emaPeriod} (${chartData.indicators.ema ? 'On' : 'Off'})`;
            select.options[4].text = `BB ${chartData.indicators.bbPeriod} (${chartData.indicators.bb ? 'On' : 'Off'})`;
            select.options[5].text = `RSI ${chartData.indicators.rsiPeriod} (${chartData.indicators.rsi ? 'On' : 'Off'})`;
        }
        saveLayoutState();
        modal.style.display = "none";
    };
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
        
        .symbol-select-container {
            position: relative;
            display: inline-flex;
            align-items: center;
        }
        .symbol-select-input {
            width: 65px !important;
            padding-left: 4px !important;
            padding-right: 16px !important;
            box-sizing: border-box !important;
            cursor: pointer;
            font-size: 12px !important;
        }
        .dropdown-arrow {
            position: absolute;
            right: 2px;
            pointer-events: none;
            color: #8b9bb0;
        }
        .pane-controls {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            flex-wrap: nowrap !important;
        }
        /* CRITICAL FIX: Ensure dropdown is not hidden by header overflow clipping */
        .chart-pane, .pane-header, .pane-controls {
            overflow: visible !important;
        }
        .custom-select-dropdown {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            min-width: 100%;
            z-index: 1000;
            background-color: #151b23;
            border: 1px solid #394654;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            margin-top: 4px;
            max-height: 300px !important;
            overflow-y: auto !important;
        }
        .custom-select-dropdown.show {
            display: block;
        }
        .custom-select-option {
            display: flex !important;
            align-items: center !important;
            transition: background-color 0.15s ease !important;
            cursor: pointer;
            padding: 6px 10px;
        }
        .custom-select-option.highlighted, .custom-select-option:hover {
            background-color: rgba(59, 130, 246, 0.2) !important;
        }
        body.light-theme .custom-select-option.highlighted, body.light-theme .custom-select-option:hover {
            background-color: rgba(59, 130, 246, 0.1) !important;
        }
        .option-symbol {
            font-weight: 600;
        }

        /* Compact top header to maximize chart area */
        header, .header, .dashboard-header {
            padding: 6px 16px !important;
            min-height: unset !important;
            display: flex !important;
            align-items: center !important;
        }
        header h1, .header h1, .dashboard-header h1 {
            font-size: 18px !important;
            margin: 0 !important;
            line-height: 1 !important;
        }
        #chart-count, .theme-btn {
            padding-top: 2px !important;
            padding-bottom: 2px !important;
            height: 26px !important;
        }

        /* Compact footer to prevent scrolling */
        footer, .footer, .status-bar, #status-bar {
            height: 24px !important;
            min-height: 24px !important;
            padding: 0 16px !important;
            display: flex !important;
            align-items: center !important;
        }
        .status-indicator, #timestamp, #data-status {
            font-size: 11px !important;
        }

        /* Lock body to screen and prevent scrolling completely */
        html, body {
            overflow: hidden !important;
        }

        /* Ensure grid expands into the space saved by the compacted header */
        .charts-grid {
            height: calc(100vh - 105px) !important; 
            height: calc(100vh - 118px) !important; 
            min-height: 0 !important;
        }
        /* Allow charts to shrink below their default min-height */
        .chart-pane, .chart-container {
            min-height: 0 !important;
        }
        .chart-container {
            overflow: hidden !important;
        }

        /* Prevent countdown timer from blocking mouse events on the chart */
        .countdown-timer {
            pointer-events: none;
        }

        /* Market Ticker Styles */
        .market-ticker-container {
            display: flex;
            flex-direction: column;
            background-color: #151b23;
            border-bottom: 1px solid #394654;
            font-family: inherit;
            font-size: 12px;
            overflow: hidden;
            flex-shrink: 0;
        }
        .ticker-row {
            display: flex;
            align-items: center;
            height: 26px;
            border-bottom: 1px solid rgba(57, 70, 84, 0.3);
        }
        .ticker-row:last-child {
            border-bottom: none;
        }
        .ticker-label {
            padding: 0 16px;
            font-weight: 700;
            font-size: 11px;
            letter-spacing: 0.5px;
            white-space: nowrap;
            z-index: 10;
            background-color: #151b23;
            box-shadow: 10px 0 10px -5px #151b23;
            display: flex;
            align-items: center;
            height: 100%;
        }
        .gainers-label { color: #10b981; }
        .losers-label { color: #ef4444; }
        .ticker-scroll-wrapper {
            flex: 1;
            overflow: hidden;
            position: relative;
            display: flex;
            align-items: center;
            height: 100%;
            mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent);
            -webkit-mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent);
        }
        .ticker-scroll {
            display: flex;
            width: max-content;
            animation: ticker-scroll 40s linear infinite;
        }
        .ticker-content {
            display: flex;
        }
        .market-ticker-item {
            display: inline-flex;
            align-items: center;
            margin-right: 24px;
            gap: 6px;
            cursor: pointer;
            padding: 2px 8px;
            border-radius: 4px;
            transition: background-color 0.2s ease;
            border: 1px solid transparent;
        }
        .market-ticker-item.active-mover {
            border-color: #3b82f6;
            background-color: rgba(59, 130, 246, 0.1);
        }
        .market-ticker-symbol {
            font-weight: 600;
            color: #d8dee8;
        }
        .market-ticker-percent {
            font-weight: 700;
            font-size: 13px;
        }
        .market-ticker-percent.up { color: #10b981; }
        .market-ticker-percent.down { color: #ef4444; }
        @keyframes ticker-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        body.light-theme .market-ticker-container,
        body.light-theme .ticker-label {
            background-color: #f8fafc;
            box-shadow: 10px 0 10px -5px #f8fafc;
        }
        body.light-theme .market-ticker-container { border-color: #cbd5e1; }
        body.light-theme .ticker-row { border-bottom: 1px solid rgba(203, 213, 225, 0.5); }
        body.light-theme .market-ticker-symbol { color: #0f172a; }
        body.light-theme .market-ticker-item.active-mover {
            background-color: rgba(59, 130, 246, 0.15);
        }

        /* Hover Icon & Drag Interactions */
        .hover-delete-btn {
            position: absolute !important;
            width: 18px !important;
            height: 18px !important;
            min-width: 18px !important;
            max-width: 18px !important;
            min-height: 18px !important;
            max-height: 18px !important;
            background: #151b23;
            color: #ef4444;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 100;
            font-size: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.4);
            pointer-events: auto;
            border: 1px solid #394654;
            transition: background-color 0.1s ease, color 0.1s ease, border-color 0.1s ease !important;
            box-sizing: border-box;
            padding: 0;
            margin: 0;
            line-height: 1;
        }
        body.light-theme .hover-delete-btn {
            background: #ffffff;
            border-color: #cbd5e1;
        }
        .hover-delete-btn:hover {
            background: #ef4444;
            color: white;
            border-color: #ef4444;
        }
        .chart-container.hovering-hline,
        .chart-container.hovering-hline * {
            cursor: ns-resize !important;
        }
        .chart-container.hovering-vline,
        .chart-container.hovering-vline * {
            cursor: pointer !important;
        }
        .vertical-line-drawing {
            cursor: pointer;
        }
        .vertical-line-drawing:hover {
            box-shadow: 0 0 4px 1px rgba(0,0,0,0.5);
            opacity: 0.8;
        }
        body.light-theme .vertical-line-drawing:hover {
            box-shadow: 0 0 4px 1px rgba(255,255,255,0.5);
        }
        .alert-popup {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #f59e0b;
            color: #fff;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 9999;
            transition: opacity 0.3s ease;
            font-family: inherit;
            pointer-events: none;
        }

        .settings-modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .settings-modal-content {
            background: #151b23;
            padding: 24px;
            border-radius: 8px;
            border: 1px solid #394654;
            width: 320px;
            max-height: 85vh;
            overflow-y: auto;
            color: #d8dee8;
            font-family: inherit;
        }
        body.light-theme .settings-modal-content {
            background: #ffffff;
            border-color: #cbd5e1;
            color: #0f172a;
        }
        .settings-modal-content h3 {
            margin-top: 0;
            margin-bottom: 16px;
            font-size: 16px;
        }
        .settings-group {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .settings-group label {
            font-size: 13px;
        }
        .settings-group input[type="number"], .settings-group select {
            width: 80px;
            background: #0f1419;
            color: #d8dee8;
            border: 1px solid #394654;
            border-radius: 4px;
            padding: 4px;
            font-size: 13px;
        }
        body.light-theme .settings-group input[type="number"], body.light-theme .settings-group select {
            background: #f1f5f9;
            color: #0f172a;
            border-color: #cbd5e1;
        }
        .settings-group input[type="color"] {
            width: 40px;
            height: 24px;
            padding: 0;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            background: transparent;
        }
        .settings-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 20px;
        }
        .settings-actions button {
            padding: 6px 16px;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            font-family: inherit;
            font-size: 13px;
        }
        #settings-cancel-btn {
            background: #394654;
            color: white;
        }
        body.light-theme #settings-cancel-btn {
            background: #e2e8f0;
            color: #0f172a;
        }
        #settings-save-btn {
            background: #10b981;
            color: white;
        }
        #line-cancel-btn { background: #394654; color: white; }
        body.light-theme #line-cancel-btn { background: #e2e8f0; color: #0f172a; }
        #line-save-btn { background: #10b981; color: white; }
        #line-delete-btn { background: #ef4444; color: white; margin-right: auto; }
        .settings-btn {
            background: transparent;
            border: none;
            cursor: pointer;
            font-size: 16px;
            padding: 4px;
            margin-left: 4px;
            opacity: 0.7;
        }
        .settings-btn:hover {
            opacity: 1;
        }
        /* Active Chart Pane Highlight */
        .chart-pane.active-chart {
            border: 1px solid #3b82f6;
            box-shadow: 0 0 8px -2px rgba(59, 130, 246, 0.5);
        }
        body.light-theme .chart-pane.active-chart {
            border: 1px solid #3b82f6;
            box-shadow: 0 0 8px -1px rgba(59, 130, 246, 0.4);
        }
        /* Asset Info Panel Styles */
        .charts-grid.layout-1.with-info-panel {
            display: grid;
            grid-template-columns: 78% calc(22% - 12px);
            gap: 12px;
            /* Lock grid height to screen view to prevent panel from stretching it */
            height: calc(100vh - 105px) !important;
            height: calc(100vh - 118px) !important;
        }
        /* Force children to respect grid height so overflow scrolling kicks in */
        .charts-grid.layout-1.with-info-panel > * {
            min-height: 0;
        }
        .charts-grid.layout-1.with-info-panel .chart-pane {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        .charts-grid.layout-1.with-info-panel .chart-container {
            flex: 1;
            min-height: 0;
        }
        @media (max-width: 1024px) {
            .charts-grid.layout-1.with-info-panel {
                grid-template-columns: 1fr;
                height: auto;
            }
            .charts-grid.layout-1.with-info-panel .chart-pane {
                height: 60vh;
            }
        }
        .asset-info-panel {
            background-color: #151b23;
            border: 1px solid #394654;
            border-radius: 8px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            color: #d8dee8;
            font-family: inherit;
            height: 100%;
        }
        body.light-theme .asset-info-panel {
            background-color: #ffffff;
            border-color: #cbd5e1;
            color: #0f172a;
        }
        .info-panel-content {
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .info-panel-message {
            text-align: center;
            padding: 40px 20px;
            color: #8b9bb0;
            font-size: 14px;
        }
        .info-header {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .info-logo {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 18px;
            color: #fff;
        }
        .info-title h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }
        .info-symbol {
            font-size: 13px;
            color: #8b9bb0;
            text-transform: uppercase;
        }
        .info-price-section {
            display: flex;
            align-items: baseline;
            gap: 12px;
        }
        .info-price {
            font-size: 28px;
            font-weight: 700;
        }
        .info-change {
            font-size: 14px;
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 4px;
        }
        .perf-up {
            color: #10b981;
            background: rgba(16, 185, 129, 0.1);
        }
        .perf-down {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
        }
        .info-section h3 {
            margin: 0 0 12px 0;
            font-size: 14px;
            color: #8b9bb0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #394654;
            padding-bottom: 6px;
        }
        body.light-theme .info-section h3 {
            color: #64748b;
            border-bottom-color: #cbd5e1;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px 16px;
        }
        .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .info-label {
            font-size: 12px;
            color: #8b9bb0;
        }
        body.light-theme .info-label {
            color: #64748b;
        }
        .info-value {
            font-size: 14px;
            font-weight: 500;
        }
        .perf-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
            gap: 8px;
        }
        .perf-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 8px 4px;
            border-radius: 6px;
            gap: 4px;
        }
        .perf-period {
            font-size: 11px;
            opacity: 0.8;
            font-weight: 600;
        }
        .perf-val {
            font-size: 13px;
            font-weight: 600;
        }
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
        if (chartData.renderedDrawings) {
            const lineColor = isLight ? '#3b82f6' : '#60a5fa';
            Object.values(chartData.renderedDrawings).forEach(pl => {
                if (pl && pl.applyOptions) {
                    pl.applyOptions({ color: lineColor });
                }
            });
        }
        restoreDrawings(chartData);
    });
}

function getChartThemeOptions(isLight) {
    return {
        layout: {
            background: { color: isLight ? "#ffffff" : "#11161d" },
            textColor: isLight ? "#1e293b" : "#d8dee8",
            fontSize: 10, // Reduce native chart text size to shrink axis width
        },
        grid: {
            vertLines: { color: isLight ? "#f1f5f9" : "#26313d" },
            horzLines: { color: isLight ? "#f1f5f9" : "#26313d" },
        },
        timeScale: { borderColor: isLight ? "#cbd5e1" : "#394654" },
        rightPriceScale: { borderColor: isLight ? "#cbd5e1" : "#394654" },
        crosshair: {
            mode: 0, // CrosshairMode.Normal - free moving crosshair instead of magnet snapping
            horzLine: { color: isLight ? "#64748b" : "#8b9bb0", style: 1, labelBackgroundColor: isLight ? "#334155" : "#151b23" },
            vertLine: { color: isLight ? "#64748b" : "#8b9bb0", style: 1, labelBackgroundColor: isLight ? "#334155" : "#151b23" }
        }
    };
}

const assetInfoCache = {};

function createInfoPanel() {
    const panel = document.createElement('aside');
    panel.id = 'asset-info-panel';
    panel.className = 'asset-info-panel';
    panel.innerHTML = `
        <div class="info-panel-content">
            <div id="info-panel-loading" class="info-panel-message">Loading Asset Info...</div>
            <div id="info-panel-data" style="display: none;"></div>
        </div>
    `;
    return panel;
}

function clearInfoPanel() {
    const dataContainer = document.getElementById('info-panel-data');
    const loadingContainer = document.getElementById('info-panel-loading');
    if (dataContainer && loadingContainer) {
        dataContainer.style.display = 'none';
        loadingContainer.style.display = 'block';
        loadingContainer.textContent = 'No Chart Selected';
    }
}

// --- Market Ticker Functions ---

function createMarketTicker() {
    if (document.getElementById('market-ticker-container')) return;

    const tickerContainer = document.createElement('div');
    tickerContainer.id = 'market-ticker-container';
    tickerContainer.className = 'market-ticker-container';
    
    tickerContainer.innerHTML = `
        <div class="ticker-row gainers-row">
            <div class="ticker-label gainers-label">▲ TOP GAINERS</div>
            <div class="ticker-scroll-wrapper">
                <div class="ticker-scroll" id="ticker-gainers"></div>
            </div>
        </div>
        <div class="ticker-row losers-row">
            <div class="ticker-label losers-label">▼ TOP LOSERS</div>
            <div class="ticker-scroll-wrapper">
                <div class="ticker-scroll" id="ticker-losers"></div>
            </div>
        </div>
    `;

    const grid = document.getElementById('charts-grid');
    if (grid && grid.parentNode) {
        grid.parentNode.insertBefore(tickerContainer, grid);
    } else {
        document.body.prepend(tickerContainer);
    }
}

async function fetchMarketMovers() {
    if (document.hidden) return; // Save resources when tab is inactive

    try {
        const res = await fetch("https://api.hyperliquid.xyz/info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "metaAndAssetCtxs" })
        });
        if (!res.ok) throw new Error("Market data fetch failed");
        
        const data = await res.json();
        if (!Array.isArray(data) || data.length < 2) return;
        
        const meta = data[0];
        const assetCtxs = data[1];
        
        if (!meta.universe || !Array.isArray(assetCtxs)) return;
        
        const changes = meta.universe.map((coin, index) => {
            const ctx = assetCtxs[index];
            if (!ctx) return null;
            const prev = parseFloat(ctx.prevDayPx);
            const mark = parseFloat(ctx.markPx);
            let change = 0;
            if (!isNaN(prev) && !isNaN(mark) && prev !== 0) {
                change = ((mark - prev) / prev) * 100;
            }
            return {
                symbol: coin.name,
                price: mark,
                change: change
            };
        }).filter(item => item !== null && !isNaN(item.change));
        
        changes.sort((a, b) => b.change - a.change);
        
        const topGainers = changes.slice(0, 10);
        const topLosers = changes.slice().reverse().slice(0, 10);
        
        updateTickerUI('ticker-gainers', topGainers);
        updateTickerUI('ticker-losers', topLosers);
    } catch (e) {
        console.warn("Could not fetch market movers:", e);
    }
}

function updateTickerUI(containerId, data) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const activeChart = state.charts[state.activeChartId];
    const activeSymbol = activeChart ? activeChart.symbol : null;

    let html = '';
    data.forEach(item => {
        const sign = item.change > 0 ? '+' : '';
        const colorClass = item.change >= 0 ? 'up' : 'down';
        const isActive = item.symbol === activeSymbol;
        const activeClass = isActive ? 'active-mover' : '';
        html += `
            <div class="market-ticker-item">
            <div class="market-ticker-item ${activeClass}" data-symbol="${item.symbol}" title="Click to load ${item.symbol} chart">
                <span class="market-ticker-symbol">${item.symbol}</span>
                <span class="market-ticker-percent ${colorClass}">${sign}${item.change.toFixed(2)}%</span>
            </div>
        `;
    });
    
    if (container.children.length === 2 && container.dataset.initialized === 'true') {
        // Update inner text without recreating nodes to prevent animation resetting
        const contents = container.querySelectorAll('.ticker-content');
        contents.forEach(content => {
            content.innerHTML = html;
        });
    } else {
        // Two identical blocks ensure perfectly smooth loop animation
        container.innerHTML = `
            <div class="ticker-content">${html}</div>
            <div class="ticker-content">${html}</div>
        `;
        container.dataset.initialized = 'true';
    }
}

async function fetchAndRenderAssetInfo(symbol, forceRefresh = false) {
    const dataContainer = document.getElementById('info-panel-data');
    const loadingContainer = document.getElementById('info-panel-loading');
    if (!dataContainer || !loadingContainer) return;

    loadingContainer.style.display = 'block';
    loadingContainer.textContent = 'Loading Asset Info...';
    dataContainer.style.display = 'none';

    if (forceRefresh || !assetInfoCache[symbol] || assetInfoCache[symbol].isPartial) {
        try {
            // Clean up the symbol for searching (e.g., BTC-USD -> btc, BTCUSDT -> btc)
            let cleanSymbol = symbol.split('-')[0].replace(/USDT$/, '').replace(/USD$/, '');
            if (cleanSymbol.startsWith('1000')) cleanSymbol = cleanSymbol.replace(/^1000/, ''); // Fix meme coins
            if (cleanSymbol.toUpperCase() === 'MATIC') cleanSymbol = 'POL';
            
            // 1. Resolve Coin ID
            let coinId = null;
            
            const upperClean = cleanSymbol.toUpperCase();
            if (COMMON_IDS[upperClean]) {
                coinId = COMMON_IDS[upperClean];
            } else {
                const searchRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${cleanSymbol}`);
                if (!searchRes.ok) throw new Error('Search failed');
                const searchData = await searchRes.json();
                
                if (searchData.coins && searchData.coins.length > 0) {
                    const exactMatches = searchData.coins.filter(c => c.symbol.toLowerCase() === cleanSymbol.toLowerCase());
                    if (exactMatches.length > 0) {
                        exactMatches.sort((a, b) => (a.market_cap_rank || Infinity) - (b.market_cap_rank || Infinity));
                        coinId = exactMatches[0].id;
                    } else {
                        coinId = searchData.coins[0].id;
                    }
                } else {
                    throw new Error('Coin not found');
                }
            }

            // 2. Fetch the detailed market data
            const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`);
            if (!res.ok) throw new Error('Details failed');
            const data = await res.json();
            
            const md = data.market_data || {};
            
            assetInfoCache[symbol] = {
                symbol: data.symbol.toUpperCase(),
                name: data.name,
                price: md.current_price?.usd ?? null,
                change24: md.price_change_percentage_24h ?? null,
                marketCap: md.market_cap?.usd ?? null,
                vol24: md.total_volume?.usd ?? null,
                circSupply: md.circulating_supply ?? null,
                totalSupply: md.total_supply ?? md.max_supply ?? null,
                fdv: md.fully_diluted_valuation?.usd ?? null,
                performance: {
                    '1H': md.price_change_percentage_1h_in_currency?.usd ?? null,
                    '24H': md.price_change_percentage_24h ?? null,
                    '7D': md.price_change_percentage_7d ?? null,
                    '30D': md.price_change_percentage_30d ?? null,
                    '60D': md.price_change_percentage_60d ?? null,
                    '200D': md.price_change_percentage_200d ?? null,
                    '1Y': md.price_change_percentage_1y ?? null,
                },
                rank: data.market_cap_rank ?? '-',
                category: data.categories && data.categories.length > 0 ? data.categories[0] : 'Crypto',
                exchanges: '-', 
                pairs: '-',
                high24: md.high_24h?.usd ?? null,
                low24: md.low_24h?.usd ?? null,
                ath: md.ath?.usd ?? null,
                atl: md.atl?.usd ?? null,
                image: data.image?.small || null,
                isPartial: false
            };
        } catch (error) {
            console.warn(`Failed to fetch full data for ${symbol}. Trying Binance fallback... Error:`, error);
            try {
                let cleanSymbol = symbol.split('-')[0].replace(/USDT$/, '').replace(/USD$/, '').toUpperCase();
                if (cleanSymbol.startsWith('1000')) cleanSymbol = cleanSymbol.replace(/^1000/, '');
                if (cleanSymbol === 'MATIC') cleanSymbol = 'POL';
                
                const endpoints = [
                    `https://api.binance.com/api/v3/ticker/24hr?symbol=${cleanSymbol}USDT`,
                    `https://data-api.binance.vision/api/v3/ticker/24hr?symbol=${cleanSymbol}USDT`,
                    `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${cleanSymbol}USDT`,
                    `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=1000${cleanSymbol}USDT`,
                    `https://api.mexc.com/api/v3/ticker/24hr?symbol=${cleanSymbol}USDT`,
                    `https://api.mexc.com/api/v3/ticker/24hr?symbol=1000${cleanSymbol}USDT`
                ];

                let bData = null;
                let is1000x = false;
                for (const url of endpoints) {
                    try {
                        const binanceRes = await fetch(url);
                        if (binanceRes.ok) { 
                            bData = await binanceRes.json(); 
                            if (url.includes('symbol=1000')) is1000x = true;
                            break; 
                        }
                    } catch (err) { /* Ignore ISP blocks/CORS errors and try next */ }
                }
                
                if (!bData) throw new Error('All fallbacks failed');

                const scale = is1000x ? 1000 : 1;

                assetInfoCache[symbol] = {
                    symbol: cleanSymbol,
                    name: cleanSymbol,
                    price: parseFloat(bData.lastPrice) / scale,
                    change24: parseFloat(bData.priceChangePercent),
                    marketCap: null,
                    vol24: parseFloat(bData.quoteVolume),
                    circSupply: null,
                    totalSupply: null,
                    fdv: null,
                    performance: {
                        '1H': null,
                        '24H': parseFloat(bData.priceChangePercent),
                        '7D': null, '30D': null, '60D': null, '200D': null, '1Y': null,
                    },
                    rank: '-', category: 'Crypto', exchanges: '-', pairs: '-',
                    high24: parseFloat(bData.highPrice) / scale,
                    low24: parseFloat(bData.lowPrice) / scale,
                    ath: null, atl: null, image: null,
                    isPartial: true
                };
            } catch (bError) {
                console.warn(`Binance fallback failed. Using empty fallback.`, bError);
                assetInfoCache[symbol] = getEmptyAssetInfo(symbol);
            }
        }
    }

    const info = assetInfoCache[symbol];
    renderAssetInfo(info);

    loadingContainer.style.display = 'none';
    dataContainer.style.display = 'block';
}

function getEmptyAssetInfo(symbol) {
    return {
        symbol: symbol,
        name: symbol,
        price: null,
        change24: null,
        marketCap: null,
        vol24: null,
        circSupply: null,
        totalSupply: null,
        fdv: null,
        performance: {
            '1H': null,
            '24H': null,
            '7D': null,
            '30D': null,
            '60D': null,
            '200D': null,
            '1Y': null,
        },
        rank: '-',
        category: '-',
        exchanges: '-',
        pairs: '-',
        high24: null,
        low24: null,
        ath: null,
        atl: null,
        image: null,
        isPartial: true
    };
}

function formatCurrency(num) {
    if (typeof num !== 'number' || isNaN(num)) return '-';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K';
    return '$' + num.toFixed(2);
}

function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '-';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatPercent(num) {
    if (typeof num !== 'number' || isNaN(num)) return '-';
    const sign = num > 0 ? '+' : '';
    return sign + num.toFixed(2) + '%';
}

function getPerfClass(num) {
    if (typeof num !== 'number' || isNaN(num)) return '';
    return num >= 0 ? 'perf-up' : 'perf-down';
}

function renderAssetInfo(info) {
    const container = document.getElementById('info-panel-data');
    if (!container) return;

    const logoColor = `hsl(${Math.abs(info.symbol.charCodeAt(0) * 30 % 360)}, 70%, 50%)`;

    container.innerHTML = `
        <div class="info-header" style="justify-content: space-between; width: 100%;">
            <div style="display: flex; align-items: center; gap: 12px;">
                ${info.image ? `<img src="${info.image}" class="info-logo" style="background-color: transparent;">` : `<div class="info-logo" style="background-color: ${logoColor}">${info.symbol.charAt(0)}</div>`}
                <div class="info-title">
                    <h2>${info.name}</h2>
                    <span class="info-symbol">${info.symbol}</span>
                </div>
            </div>
            <button onclick="fetchAndRenderAssetInfo('${info.symbol}', true)" class="settings-btn" title="Refresh Data" style="font-size: 14px; padding: 6px; margin: 0;">🔄</button>
        </div>
        <div class="info-price-section">
            <div class="info-price" id="info-panel-price">${formatCurrency(info.price)}</div>
            <div class="info-change ${getPerfClass(info.change24)}">${formatPercent(info.change24)}</div>
        </div>

        <div class="info-section">
            <h3>Market Statistics</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Market Cap</span>
                    <span class="info-value">${formatCurrency(info.marketCap)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">24h Volume</span>
                    <span class="info-value">${formatCurrency(info.vol24)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Circulating Supply</span>
                    <span class="info-value">${formatNumber(info.circSupply)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Total Supply</span>
                    <span class="info-value">${formatNumber(info.totalSupply)}</span>
                </div>
            </div>
        </div>

        <div class="info-section">
            <h3>Performance</h3>
            <div class="perf-grid">
                ${Object.entries(info.performance).map(([period, val]) => `
                    <div class="perf-card ${getPerfClass(val)}">
                        <div class="perf-period">${period}</div>
                        <div class="perf-val">${formatPercent(val)}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="info-section">
            <h3>Market Information</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Rank</span>
                    <span class="info-value">#${info.rank}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Category</span>
                    <span class="info-value">${info.category}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Exchanges</span>
                    <span class="info-value">${info.exchanges}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Trading Pairs</span>
                    <span class="info-value">${info.pairs}</span>
                </div>
            </div>
        </div>

        <div class="info-section">
            <h3>Quick Metrics</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">24h High</span>
                    <span class="info-value">${formatCurrency(info.high24)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">24h Low</span>
                    <span class="info-value">${formatCurrency(info.low24)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">All Time High</span>
                    <span class="info-value">${formatCurrency(info.ath)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">All Time Low</span>
                    <span class="info-value">${formatCurrency(info.atl)}</span>
                </div>
            </div>
        </div>
    `;
}

function updateInfoPanelPrice(price) {
    const priceEl = document.getElementById('info-panel-price');
    if (priceEl && price !== null) {
        priceEl.textContent = formatCurrency(price);
    }
}

// --- Diagnostics for Wheel Events ---
function runWheelDiagnostics(chartId) {
    const container = document.getElementById(`${chartId}-container`);
    if (!container) return;
    
    console.group(`🔍 Wheel Event Investigation: ${chartId}`);
    console.log("1. Exact DOM element acting as container:", container);
    
    const canvas = container.querySelector('canvas');
    if (canvas) {
        const containerRect = container.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        console.log(`2. Canvas fills area? Container: ${containerRect.width}x${containerRect.height}, Canvas: ${canvasRect.width}x${canvasRect.height}`);
        console.log("7. Canvas Z-Index:", window.getComputedStyle(canvas).zIndex || 'auto');
        
        const getPath = (el) => {
            const path = [];
            while (el && el !== document.body && el !== document.documentElement) {
                let name = el.tagName.toLowerCase();
                if (el.id) name += `#${el.id}`;
                if (el.className && typeof el.className === 'string') name += `.${el.className.split(' ').join('.')}`;
                path.unshift(name);
                el = el.parentNode;
            }
            return path.join(' > ');
        };
        console.log("8. DOM Path to Canvas:", getPath(canvas));
    }

    let node = container;
    while (node && node !== document) {
        const style = window.getComputedStyle(node);
        if (['auto', 'scroll'].includes(style.overflow) || ['auto', 'scroll'].includes(style.overflowY)) {
            console.warn(`4. Scrollable parent found:`, node, `overflow: ${style.overflow}`);
        }
        node = node.parentNode;
    }

    const tracker = (source) => (e) => console.log(`[Wheel Event] Captured by ${source} | Target:`, e.target);
    window.addEventListener('wheel', tracker('Window'), { capture: true, passive: true });
    document.addEventListener('wheel', tracker('Document'), { capture: true, passive: true });
    container.addEventListener('wheel', tracker('Chart Container'), { capture: true, passive: true });
    if (canvas) canvas.addEventListener('wheel', tracker('Chart Canvas'), { capture: true, passive: true });
    console.groupEnd();
}

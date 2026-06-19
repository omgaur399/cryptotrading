const CONFIG = {
    API_BASE: (window.location.protocol === 'file:' || ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000')) ? "http://127.0.0.1:5000/api" : "/api",
    STORAGE_KEY: "trading-dashboard-chart-count",
    LAYOUT_STORAGE_KEY: "trading-dashboard-layout",
    THEME_STORAGE_KEY: "trading-dashboard-theme",
    DRAWINGS_STORAGE_KEY: "trading-dashboard-drawings",
    BACKTEST_STORAGE_KEY: "trading-dashboard-backtest",
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
    timeZone: localStorage.getItem("trading-dashboard-tz") || Intl.DateTimeFormat().resolvedOptions().timeZone,

    _getMs: (time) => {
        // Lightweight Charts may pass a BusinessDay object for 1d+ timeframes or Unix timestamps (seconds)
        if (typeof time === "object" && time.year) {
            return Date.UTC(time.year, time.month - 1, time.day);
        }
        return time * 1000;
    },

    formatTooltip: (time) => {
        const date = new Date(TimeUtils._getMs(time));
        const tzName = TimeUtils.timeZone === "UTC" ? "UTC" : (TimeUtils.timeZone === "America/New_York" ? "EST" : (TimeUtils.timeZone === "Asia/Kolkata" ? "IST" : "Local"));
        return date.toLocaleString("en-IN", {
            timeZone: TimeUtils.timeZone,
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        }) + " (" + tzName + ")";
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
        const tzName = TimeUtils.timeZone === "UTC" ? "UTC" : (TimeUtils.timeZone === "America/New_York" ? "EST" : (TimeUtils.timeZone === "Asia/Kolkata" ? "IST" : "Local"));
        return new Date().toLocaleTimeString("en-IN", { timeZone: TimeUtils.timeZone, hour12: true }) + " (" + tzName + ")";
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
    binanceWs: null,
    hlPingInterval: null,
    connected: false,
    theme: "dark",
    isSyncingCrosshair: false,
    obCentered: false,
    backtest: null, // New state for backtesting
    replay: null,
};

document.addEventListener("DOMContentLoaded", initializeApp);

async function loadDependencies() {
    const scripts = ['indicators.js', 'paper-account.js', 'paper-positions.js', 'paper-history.js', 'paper-trading.js'];
    for (const s of scripts) {
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = s;
            script.onload = resolve;
            script.onerror = () => { console.warn(`Failed to load ${s}`); resolve(); };
            document.head.appendChild(script);
        });
    }
}

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

    const savedBacktest = localStorage.getItem(CONFIG.BACKTEST_STORAGE_KEY);
    if (savedBacktest) {
        try {
            state.backtest = JSON.parse(savedBacktest);
        } catch (e) {
            state.backtest = null;
        }
    }

    state.chartCount = readSavedChartCount();
    
    await loadDependencies();
    if (window.PaperTrading) {
        window.paperTrading = new window.PaperTrading();
    }
    
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

        const tzSelect = document.createElement("select");
        tzSelect.id = "global-tz-select";
        tzSelect.className = "theme-btn";
        tzSelect.style.marginLeft = "12px";
        const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        tzSelect.innerHTML = `
            <option value="${localTz}">Local</option>
            <option value="UTC">UTC</option>
            <option value="America/New_York">EST</option>
            <option value="Asia/Kolkata">IST</option>
        `;
        tzSelect.value = TimeUtils.timeZone;
        if (!tzSelect.value) tzSelect.value = localTz;
        
        tzSelect.addEventListener("change", (e) => {
            TimeUtils.timeZone = e.target.value;
            localStorage.setItem("trading-dashboard-tz", e.target.value);
            Object.values(state.charts).forEach(chartData => {
                if (chartData.chart) chartData.chart.applyOptions({ localization: { timeFormatter: TimeUtils.formatTooltip } });
            });
            updateTimestamp();
        });
        chartCountEl.parentNode.appendChild(tzSelect);

        const themeBtn = document.createElement("button");
        themeBtn.id = "theme-toggle";
        themeBtn.className = "theme-btn";
        themeBtn.textContent = state.theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";
        themeBtn.style.marginLeft = "12px";
        themeBtn.onclick = toggleTheme;
        chartCountEl.parentNode.appendChild(themeBtn);

        const replayBtn = document.createElement("button");
        replayBtn.id = "global-replay-btn";
        replayBtn.className = "theme-btn";
        replayBtn.textContent = "⏪ Replay";
        replayBtn.style.marginLeft = "12px";
        replayBtn.onclick = toggleReplayMode;
        chartCountEl.parentNode.appendChild(replayBtn);

        const backtestBtn = document.createElement("button");
        backtestBtn.id = "global-backtest-btn";
        backtestBtn.className = "theme-btn";
        backtestBtn.textContent = "📊 Backtest";
        backtestBtn.style.marginLeft = "12px";
        backtestBtn.onclick = openBacktestModal;
        chartCountEl.parentNode.appendChild(backtestBtn);

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
            chartType: chartData.chartType,
            indicators: chartData.indicators
        };
    });
    localStorage.setItem(CONFIG.LAYOUT_STORAGE_KEY, JSON.stringify(layout));
}

async function loadInstruments() {
    let cryptoPairs = [];
    
    try {
        // Fetch the full active coin universe directly from Binance
        const res = await fetch("https://api.binance.com/api/v3/exchangeInfo");
        const data = await res.json();
        cryptoPairs = data.symbols
            .filter(coin => coin.quoteAsset === 'USDT' && coin.status === 'TRADING')
            .map(coin => coin.baseAsset);
        // Remove duplicates and sort alphabetically
        cryptoPairs = [...new Set(cryptoPairs)].sort();
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

    state.instruments = cryptoPairs.map(sym => ({
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

    // Native Binance WebSocket for all Crypto pairs (Trade Streaming)
    if (!state.binanceWs) {
        state.binanceWs = new WebSocket('wss://stream.binance.com:9443/ws');
        state.binanceWs.onopen = () => {
            updateConnectionStatus();
            
            Object.values(state.charts).forEach(chartData => {
                chartData.liveSubscribed = false; // Force resubscribe
                if (chartData.source === 'hyperliquid' && chartData.symbol !== 'none') {
                    subscribeChart(chartData);
                }
            });
        };
        state.binanceWs.onclose = () => {
            state.binanceWs = null;
            updateConnectionStatus();
            setTimeout(connectLiveStream, 5000); // Reconnect loop
        };
        state.binanceWs.onmessage = event => {
            const data = JSON.parse(event.data);
            if (data.e === 'trade') {
                handlePriceUpdate({
                    source: 'hyperliquid',
                    symbol: data.s.replace(/USDT$/, ''),
                    price: parseFloat(data.p),
                    time: data.T / 1000,
                    volume: parseFloat(data.q)
                });
            }
        };
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
                chartData.l2Subscribed = false;
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
            } else if (data.channel === 'l2Book' && data.data) {
                renderOrderBook(data.data);
                if (state.chartCount === 1 && state.charts['chart-1'] && state.charts['chart-1'].symbol === data.data.coin) {
                    renderOrderBook(data.data);
                }
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
    grid.className = `charts-grid layout-${state.chartCount}`;
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
        targetIndicators.vwap = targetIndicators.vwap || false;
        targetIndicators.vwapColor = targetIndicators.vwapColor || '#ff6d00';
        targetIndicators.vwapLineWidth = targetIndicators.vwapLineWidth || 1;
        targetIndicators.atr = targetIndicators.atr || false;
        targetIndicators.atrPeriod = targetIndicators.atrPeriod || 14;
        targetIndicators.atrColor = targetIndicators.atrColor || '#2962ff';
        targetIndicators.atrLineWidth = targetIndicators.atrLineWidth || 2;
        
        if (targetSymbol !== "none" && targetSymbol !== "No Chart") {
            const instrument = state.instruments.find(i => i.symbol === targetSymbol) || state.instruments.find(i => i.symbol === defaultConfig.symbol) || state.instruments[0];
            if (instrument) {
                instrumentId = instrument.id;
                source = instrument.source;
                symbol = instrument.symbol;
                interval = instrument.timeframes.includes(targetInterval) ? targetInterval : instrument.timeframes[0];
            }
        }

        let targetChartType = savedConfig.chartType || "candles";
        const chartData = {
            id: chartId,
            instrumentId: instrumentId,
            source: source,
            symbol: symbol,
            interval: interval,
            chart: null,
            chartType: targetChartType,
            candleSeries: null,
            volumeSeries: null,
            smaSeries: null,
            emaSeries: null,
            bbUpperSeries: null,
            bbMiddleSeries: null,
            bbLowerSeries: null,
            rsiSeries: null,
            vwapSeries: null,
            atrSeries: null,
            cachedData: [],
            currentCandle: null,
            lastPrice: null,
            referencePrice: null,
            liveSubscribed: false,
            l2Subscribed: false,
            lastDirection: 'up',
            indicators: targetIndicators,
            pendingUpdate: false,
            flashDirection: 'up',
            lastUIUpdate: 0,
            customPriceOffset: 0,
            isVerticalPanning: false,
            panStartPrice: null,
        };

        state.charts[chartId] = chartData;
        grid.appendChild(createChartPane(chartData, index));
        initializeChart(chartData);
        populatePaneControls(chartData);
        loadChartData(chartData);
    }

    const nextActive = state.charts[state.activeChartId] ? state.activeChartId : 'chart-1';
    setActiveChart(nextActive);
    if (state.chartCount === 1) {
        state.obCentered = false;
        grid.appendChild(createInfoPanel());
            
            if (window.paperTrading) {
                const tradePanel = document.getElementById('paper-trade-panel');
                if (tradePanel) window.paperTrading.buildUI(tradePanel);
            }
            
        const chartData = state.charts['chart-1'];
        if (chartData && chartData.symbol !== 'none' && chartData.symbol !== 'No Chart') {
            fetchAndRenderAssetInfo(chartData.symbol);
            updateOrderBookHeader(chartData.symbol);
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
    const vwapText = chartData.indicators.vwap ? "On" : "Off";
    const atrText = chartData.indicators.atr ? "On" : "Off";

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
                    <option value="sma">SMA ${chartData.indicators.smaPeriod} (${smaText})</option>
                    <option value="ema">EMA ${chartData.indicators.emaPeriod} (${emaText})</option>
                    <option value="bb">BB ${chartData.indicators.bbPeriod} (${bbText})</option>
                    <option value="rsi">RSI ${chartData.indicators.rsiPeriod} (${rsiText})</option>
                    <option value="vwap">VWAP (${vwapText})</option>
                    <option value="atr">ATR ${chartData.indicators.atrPeriod} (${atrText})</option>
                </select>
                <button class="settings-btn" id="${chartData.id}-screenshot" title="Take Screenshot">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                </button>
                <button class="settings-btn" id="${chartData.id}-go-live" title="Reset Chart View">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><polygon points="5 4 15 12 5 20"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                </button>
                <button class="settings-btn" id="${chartData.id}-settings" title="Chart Settings">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
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

    settingsBtn.addEventListener("click", () => openSettingsModal(chartData));

    goLiveBtn.addEventListener("click", () => {
        if (chartData.chart) {
            chartData.customPriceOffset = 0;
            if (chartData.candleSeries) {
                chartData.candleSeries.applyOptions({ autoscaleInfoProvider: null });
            }
            // Reset zoom (barSpacing) and right margin
            chartData.chart.timeScale().applyOptions({ rightOffset: 7, barSpacing: 8 });
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

    intervalSelect.addEventListener("change", async () => {
        const wasReplaying = state.replay && state.replay.active && state.replay.chartId === chartData.id && state.replay.status === 'active';
        let replayTime = null;
        if (wasReplaying) {
            const currentCandle = state.replay.fullData[state.replay.currentIndex];
            if (currentCandle) replayTime = currentCandle.time;
            if (state.replay.timer) clearTimeout(state.replay.timer);
        }

        unsubscribeChart(chartData);
        chartData.interval = intervalSelect.value;
        resetChart(chartData);
        await loadChartData(chartData);
        
        if (wasReplaying) {
            state.replay.fullData = [...chartData.cachedData];
            startReplayAt(replayTime);
        }

        saveLayoutState();
    });

    indicatorSelect.addEventListener("change", (e) => {
        const indicator = e.target.value;
        if (indicator === "volume") {
            chartData.indicators.volume = !chartData.indicators.volume;
            if (chartData.volumeSeries) {
                chartData.volumeSeries.applyOptions({ visible: chartData.indicators.volume });
            }
            updateSubchartMargins(chartData);
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
                }
                chartData.rsiSeries.applyOptions({ visible: chartData.indicators.rsi });
            }
            updateSubchartMargins(chartData);
            e.target.options[5].text = `RSI ${chartData.indicators.rsiPeriod} (${chartData.indicators.rsi ? 'On' : 'Off'})`;
        } else if (indicator === "vwap") {
            chartData.indicators.vwap = !chartData.indicators.vwap;
            if (chartData.vwapSeries) {
                if (chartData.indicators.vwap) {
                    chartData.vwapSeries.setData(calculateVWAP(chartData.cachedData, chartData.interval));
                }
                chartData.vwapSeries.applyOptions({ visible: chartData.indicators.vwap });
            }
            e.target.options[6].text = `VWAP (${chartData.indicators.vwap ? 'On' : 'Off'})`;
        } else if (indicator === "atr") {
            chartData.indicators.atr = !chartData.indicators.atr;
            if (chartData.atrSeries) {
                if (chartData.indicators.atr) {
                    chartData.atrSeries.setData(calculateATR(chartData.cachedData, chartData.indicators.atrPeriod));
                }
                chartData.atrSeries.applyOptions({ visible: chartData.indicators.atr });
            }
            updateSubchartMargins(chartData);
            e.target.options[7].text = `ATR ${chartData.indicators.atrPeriod} (${chartData.indicators.atr ? 'On' : 'Off'})`;
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

function changeChartType(chartData) {
    if (!chartData.chart) return;
    
    const isUp = chartData.lastDirection === 'up';
    const upColor = "#16a34a";
    const downColor = "#dc2626";
    
    if (chartData.candleSeries) {
        chartData.chart.removeSeries(chartData.candleSeries);
    }
    
    if (chartData.chartType === 'line') {
        chartData.candleSeries = chartData.chart.addLineSeries({
            color: isUp ? upColor : downColor, lineWidth: 2, crosshairMarkerVisible: true,
            lastValueVisible: false, priceLineVisible: true, priceLineColor: isUp ? upColor : downColor,
            priceLineWidth: 1, priceLineStyle: 2,
        });
    } else if (chartData.chartType === 'bar') {
        chartData.candleSeries = chartData.chart.addBarSeries({
            upColor: upColor, downColor: downColor, lastValueVisible: false,
            priceLineVisible: true, priceLineColor: isUp ? upColor : downColor, priceLineWidth: 1, priceLineStyle: 2,
        });
    } else {
        chartData.candleSeries = chartData.chart.addCandlestickSeries({
            upColor: upColor, downColor: downColor, wickUpColor: upColor, wickDownColor: downColor,
            borderVisible: false, priceLineVisible: true, priceLineColor: isUp ? upColor : downColor,
            priceLineWidth: 1, priceLineStyle: 2, lastValueVisible: false,
        });
    }
    
    if (chartData.lastPrice) updateChartPriceFormat(chartData, chartData.lastPrice);
    syncChartWithCache(chartData);
    restoreDrawings(chartData);
    if (window.paperTrading && window.paperTrading.updatePositionLines) window.paperTrading.updatePositionLines(chartData);
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
            rightOffset: 7,
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
            pressedMouseMove: true, // Allow panning
            horzTouchDrag: true,
            vertTouchDrag: true,
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

    const addAlertBtn = document.createElement('div');
    addAlertBtn.className = 'hover-add-alert-btn';
    addAlertBtn.innerHTML = '＋';
    addAlertBtn.style.display = 'none';
    addAlertBtn.title = 'Add Alert';
    container.appendChild(addAlertBtn);
    chartData.hoverAddAlertBtn = addAlertBtn;

    let isDragging = false;
    let draggingLineInfo = null;
    
    // --- INFINITE SCROLL PAGINATION ---
    if (typeof chartData.chart.timeScale().subscribeVisibleLogicalRangeChange === "function") {
        chartData.chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
            if (!logicalRange || chartData.isFetchingHistory || chartData.hasReachedBeginning) return;
            
            // If user scrolls within 100 bars of the oldest loaded candle, fetch more
            if (logicalRange.from < 100) {
                loadOlderHistoricalData(chartData);
            }
        });
    }

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
                chartData.panStartPrice = chartData.candleSeries.coordinateToPrice(y);
            } else if (dx > 5) {
                chartData.verticalPanArmed = false;
            }
        }

        if (chartData.isVerticalPanning && chartData.panStartPrice !== null) {
            const currentPrice = chartData.candleSeries.coordinateToPrice(y);
            if (currentPrice !== null) {
                chartData.chart.priceScale('right').applyOptions({ autoScale: true });
                const deltaPrice = chartData.panStartPrice - currentPrice;
                chartData.customPriceOffset = (chartData.customPriceOffset || 0) + deltaPrice;
                
                // Reset to native first to break the infinite recursion chain
                chartData.candleSeries.applyOptions({ autoscaleInfoProvider: null });
                chartData.candleSeries.applyOptions({
                    autoscaleInfoProvider: (baseImplementation) => {
                        const res = baseImplementation();
                        if (res !== null) {
                            return {
                                priceRange: {
                                    minValue: res.priceRange.minValue + chartData.customPriceOffset,
                                    maxValue: res.priceRange.maxValue + chartData.customPriceOffset,
                                },
                                margins: res.margins || undefined,
                            };
                        }
                        return null;
                    }
                });
            }
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
                            if (cd.symbol === chartData.symbol) renderVerticalLine(cd, draggingLineInfo.line);
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
                saveDrawings();
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
                                        openAlertSettingsModal(chartData, line, key);
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
                        openPriceAlertModal(chartData, chartData.lastHoveredPrice);
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
                                saveDrawings();
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
                openPriceAlertModal(chartData, price);
            }
        } else {
            chartData.customPriceOffset = 0;
            chartData.candleSeries.applyOptions({ autoscaleInfoProvider: null });
            chartData.chart.timeScale().applyOptions({ rightOffset: 7, barSpacing: 8 });
            chartData.chart.timeScale().scrollToRealTime();
            chartData.chart.priceScale('right').applyOptions({ autoScale: true });
        }
    });

    chartData.chart.subscribeClick((param) => {
        if (chartData.justDragged) return; // Ignore native clicks resolving immediately after a drag
        
        if (state.replay && state.replay.status === 'selecting' && state.replay.chartId === chartData.id) {
            if (param.time) {
                startReplayAt(param.time);
            }
            return;
        }

        if (!param.point || !chartData.candleSeries) return;

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
                    saveDrawings();
                    Object.values(state.charts).forEach(cd => {
                        if (cd.symbol === chartData.symbol) renderVerticalLine(cd, lineObj);
                    });
                }
            } else if (chartData.drawingMode === "buyMarker" || chartData.drawingMode === "sellMarker") {
                if (time) {
                    state.drawings[key].push({
                        type: chartData.drawingMode, symbol: chartData.symbol, time: time, price: price, id: id
                    });
                    saveDrawings();
                    Object.values(state.charts).forEach(cd => {
                        if (cd.symbol === chartData.symbol) updateMarkers(cd);
                    });
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

    if (typeof chartData.chart.subscribeCrosshairMove === "function") {
        chartData.chart.subscribeCrosshairMove((param) => {
            if (state.isSyncingCrosshair) return;
            
            state.isSyncingCrosshair = true;
            try {
                handleCrosshairSync(chartData, param);
            } catch (err) {
                console.warn("Crosshair sync error:", err);
            } finally {
                state.isSyncingCrosshair = false;
            }
        });
    }

    const isUp = true;
    const upColor = "#16a34a";
    const downColor = "#dc2626";
    
    if (chartData.chartType === 'line') {
        chartData.candleSeries = chartData.chart.addLineSeries({
            color: upColor, lineWidth: 2, crosshairMarkerVisible: true,
            lastValueVisible: false, priceLineVisible: true, priceLineColor: upColor,
            priceLineWidth: 1, priceLineStyle: 2,
        });
    } else if (chartData.chartType === 'bar') {
        chartData.candleSeries = chartData.chart.addBarSeries({
            upColor: upColor, downColor: downColor, lastValueVisible: false,
            priceLineVisible: true, priceLineColor: upColor, priceLineWidth: 1, priceLineStyle: 2,
        });
    } else {
        chartData.candleSeries = chartData.chart.addCandlestickSeries({
            upColor: upColor, downColor: downColor, wickUpColor: upColor, wickDownColor: downColor,
            borderVisible: false, priceLineVisible: true, priceLineColor: upColor,
            priceLineWidth: 1, priceLineStyle: 2, lastValueVisible: false,
        });
    }

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

    chartData.vwapSeries = chartData.chart.addLineSeries({
        color: chartData.indicators.vwapColor,
        lineWidth: chartData.indicators.vwapLineWidth,
        visible: chartData.indicators.vwap,
        lastValueVisible: false,
        priceLineVisible: false,
        lineStyle: 2, // Dashed
    });

    chartData.atrSeries = chartData.chart.addLineSeries({
        color: chartData.indicators.atrColor,
        lineWidth: chartData.indicators.atrLineWidth,
        priceScaleId: 'atr',
        visible: true, // Force visible on init
        lastValueVisible: false,
        priceLineVisible: false,
    });

    chartData.chart.priceScale('atr').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
        entireTextOnly: true,
        minimumWidth: 40,
    });

    if (!chartData.indicators.atr) {
        chartData.atrSeries.applyOptions({ visible: false });
    }

    updateSubchartMargins(chartData);

    // Add diagnostics requested for wheel event investigation
    setTimeout(() => runWheelDiagnostics(chartData.id), 1000);
}

function resetChart(chartData) {
    chartData.isFetchingHistory = false;
    chartData.hasReachedBeginning = false;
    chartData.customPriceOffset = 0;
    if (chartData.candleSeries) {
        chartData.candleSeries.applyOptions({ autoscaleInfoProvider: null });
    }
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
    cleanupVerticalLines(chartData);

    setPaneMessage(chartData.id, chartData.instrumentId === "none" ? "No Chart Selected" : "Loading");
    updateTicker(chartData, null, null);
}

function saveDrawings() {
    localStorage.setItem(CONFIG.DRAWINGS_STORAGE_KEY, JSON.stringify(state.drawings));
}

function addHorizontalLine(chartData, price) {
    const key = chartData.symbol;
    if (!state.drawings[key]) state.drawings[key] = [];
    
    const isLight = state.theme === 'light';
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    const lineObj = {
        type: "horizontalLine",
        symbol: chartData.symbol,
        price: price,
        id: id,
        color: isLight ? '#3b82f6' : '#60a5fa',
        lineWidth: 2
    };
    state.drawings[key].push(lineObj);
    saveDrawings();
    Object.values(state.charts).forEach(cd => {
        if (cd.symbol === chartData.symbol) renderHorizontalLine(cd, lineObj);
    });
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
    const key = chartData.symbol;
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
            // Alerts are now exclusively handled by mouseup directly on the right scale
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
                <input type="number" id="line-price-input" value="${lineObj.price}" step="any">
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
        Object.values(state.charts).forEach(cd => {
            if (cd.symbol === chartData.symbol) {
                const priceLine = cd.renderedDrawings?.[lineObj.id];
                if (priceLine) {
                    if (priceLine instanceof HTMLElement) {
                        priceLine.remove();
                    } else {
                        try { cd.candleSeries.removePriceLine(priceLine); } catch (e) {}
                    }
                    delete cd.renderedDrawings[lineObj.id];
                }
            }
        });
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
        
        Object.values(state.charts).forEach(cd => {
            if (cd.symbol === chartData.symbol) {
                const priceLine = cd.renderedDrawings?.[lineObj.id];
                if (priceLine && priceLine.applyOptions) {
                    priceLine.applyOptions({
                        price: lineObj.price,
                        color: lineObj.color,
                        lineWidth: lineObj.lineWidth
                    });
                }
            }
        });
        
        saveDrawings();
        modal.style.display = "none";
    };
}

function restoreDrawings(chartData) {
    if (chartData.renderedDrawings && chartData.candleSeries) {
        Object.values(chartData.renderedDrawings).forEach(pl => {
            if (pl) {
                if (pl instanceof HTMLElement) {
                    pl.remove();
                } else {
                    try {
                        chartData.candleSeries.removePriceLine(pl);
                    } catch(e) {}
                }
            }
        });
    }
    chartData.renderedDrawings = {};
    cleanupVerticalLines(chartData);
    
    const key = chartData.symbol;
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
    
    let el = document.getElementById(`vline-${chartData.id}-${lineObj.id}`);
    if (!el) {
        el = document.createElement('div');
        el.id = `vline-${chartData.id}-${lineObj.id}`;
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
            if (!chartData.chart || !document.getElementById(`vline-${chartData.id}-${lineObj.id}`)) return;
            const timeScale = chartData.chart.timeScale();
            
            let x = null;
            if (lineObj.logical !== undefined && lineObj.logical !== null && timeScale.logicalToCoordinate) {
                x = timeScale.logicalToCoordinate(lineObj.logical);
            } else if (lineObj.time !== undefined && timeScale.timeToCoordinate) {
                x = timeScale.timeToCoordinate(lineObj.time);
            }
            
            let rightScaleWidth = 55;
            try { const w = chartData.chart.priceScale('right').width(); if (w > 10 && w < 150) rightScaleWidth = w; } catch(e) {}
            
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

    const key = chartData.symbol;
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
        Object.values(state.charts).forEach(cd => {
            if (cd.symbol === chartData.symbol) {
                const el = document.getElementById(`vline-${cd.id}-${lineObj.id}`);
                if (el) el.remove();
            }
        });
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
        
        Object.values(state.charts).forEach(cd => {
            if (cd.symbol === chartData.symbol) renderVerticalLine(cd, lineObj);
        });
        
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
            Object.values(state.charts).forEach(cd => {
                if (cd.symbol === chartData.symbol) updateMarkers(cd);
            });
        }
        modal.style.display = "none";
    };
}

window.refreshChartMarkers = () => {
    Object.values(state.charts).forEach(cd => updateMarkers(cd));
};

function updateMarkers(chartData) {
    if (!chartData.candleSeries) return;
    
    if (state.replay && state.replay.active && state.replay.chartId === chartData.id && state.replay.status === 'active') {
        updateReplayMarkers();
        return;
    }

    const key = chartData.symbol;
    const drawings = state.drawings[key] || [];
    
    let markers = [];
    drawings.forEach(d => {
        if (d.type === 'buyMarker') {
            markers.push({ time: d.time, position: 'belowBar', color: '#16a34a', shape: 'arrowUp', text: 'BUY', id: d.id });
        } else if (d.type === 'sellMarker') {
            markers.push({ time: d.time, position: 'aboveBar', color: '#dc2626', shape: 'arrowDown', text: 'SELL', id: d.id });
        }
    });
    
    if (window.paperTrading) {
        const ptMarkers = window.paperTrading.getChartMarkers(chartData.symbol);
        markers = markers.concat(ptMarkers);
        if (typeof window.paperTrading.updatePositionLines === 'function') {
            window.paperTrading.updatePositionLines(chartData);
        }
    }
    
    if (chartData.backtestMarkers && chartData.backtestMarkers.length > 0) {
        markers = markers.concat(chartData.backtestMarkers);
    }

    markers.sort((a, b) => a.time - b.time);
    chartData.candleSeries.setMarkers(markers);
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

function renderAlertLine(chartData, alertObj) {
    if (!chartData.candleSeries) return;
    
    const oldEl = document.getElementById(`alert-bell-${chartData.id}-${alertObj.id}`);
    if (oldEl) oldEl.remove();

    const priceLine = chartData.candleSeries.createPriceLine({
        price: alertObj.price,
        color: 'rgba(0, 0, 0, 0)',
        lineWidth: 1,
        lineStyle: 1, 
        axisLabelVisible: true,
        title: alertObj.active === false ? '🔕' : '🔔',
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
                <input type="number" id="alert-price-input" value="${defaultPrice < 1 ? defaultPrice.toPrecision(4) : defaultPrice.toFixed(2)}" step="any">
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
                price: price,
                id: id,
                active: true
            };
            const key = chartData.symbol;
            if (!state.drawings[key]) state.drawings[key] = [];
            state.drawings[key].push(alertObj);
            saveDrawings();
            Object.values(state.charts).forEach(cd => {
                if (cd.symbol === chartData.symbol) renderAlertLine(cd, alertObj);
            });
            
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
                <input type="number" id="edit-alert-price" value="${alertObj.price}" step="any">
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
        Object.values(state.charts).forEach(cd => {
            if (cd.symbol === chartData.symbol) {
                const priceLine = cd.renderedDrawings?.[alertObj.id];
                if (priceLine) {
                    if (priceLine instanceof HTMLElement) {
                        priceLine.remove();
                    } else {
                        try { cd.candleSeries.removePriceLine(priceLine); } catch (e) {}
                    }
                    delete cd.renderedDrawings[alertObj.id];
                }
            }
        });
        const idx = state.drawings[key].findIndex(l => l.id === alertObj.id);
        if (idx !== -1) state.drawings[key].splice(idx, 1);
        saveDrawings();
        modal.style.display = "none";
    };
    
    document.getElementById("edit-alert-save").onclick = () => {
        const newPrice = parseFloat(document.getElementById("edit-alert-price").value);
        alertObj.price = isNaN(newPrice) ? alertObj.price : newPrice;
        alertObj.active = true;
        
        Object.values(state.charts).forEach(cd => {
            if (cd.symbol === chartData.symbol) {
                const priceLine = cd.renderedDrawings?.[alertObj.id];
                if (priceLine) {
                    if (priceLine instanceof HTMLElement) {
                        if (priceLine._updatePosition) priceLine._updatePosition();
                    } else if (priceLine.applyOptions) {
                        priceLine.applyOptions({
                            price: alertObj.price,
                                        title: '🔔',
                                        color: 'rgba(0, 0, 0, 0)'
                        });
                    }
                }
            }
        });
        saveDrawings();
        modal.style.display = "none";
    };
}

function checkAlerts(chartData, currentPrice) {
    if (chartData.lastPrice === null) return;
    const prevPrice = chartData.lastPrice;
    
    const key = chartData.symbol;
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
                
                Object.values(state.charts).forEach(cd => {
                    if (cd.symbol === chartData.symbol) {
                        const priceLine = cd.renderedDrawings?.[line.id];
                        if (priceLine) {
                            if (priceLine instanceof HTMLElement) {
                                if (priceLine._updatePosition) priceLine._updatePosition();
                            } else if (priceLine.applyOptions) {
                                    priceLine.applyOptions({ color: 'rgba(0, 0, 0, 0)', title: '🔕' });
                            }
                        }
                    }
                });
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

async function loadOlderHistoricalData(chartData) {
    if (chartData.isFetchingHistory || !chartData.cachedData || chartData.cachedData.length === 0) return;
    chartData.isFetchingHistory = true;
    
    const oldestCandle = chartData.cachedData[0];
    const beforeTimestamp = oldestCandle.time;
    
    try {
        const response = await fetch(`${CONFIG.API_BASE}/history?symbol=${chartData.symbol}&timeframe=${chartData.interval}&before_timestamp=${beforeTimestamp}&limit=1000`);
        const payload = await response.json();
        
        if (!response.ok || !payload.candles || payload.candles.length === 0) {
            chartData.hasReachedBeginning = true;
            chartData.isFetchingHistory = false;
            return;
        }
        
        let oldCandles = payload.candles.map(normalizeCandle).filter(Boolean);
        if (oldCandles.length === 0) {
            chartData.hasReachedBeginning = true;
            chartData.isFetchingHistory = false;
            return;
        }
        
        oldCandles.sort((a, b) => a.time - b.time);
        
        // Safely prepend the older data
        chartData.cachedData = [...oldCandles, ...chartData.cachedData];
        
        // Re-calculate indicators smoothly and push into existing series arrays
        syncChartWithCache(chartData);
        restoreDrawings(chartData);
        if (typeof updateMarkers === 'function') updateMarkers(chartData);
        
        chartData.isFetchingHistory = false;
    } catch (err) {
        console.error("Failed to load older history", err);
        chartData.isFetchingHistory = false;
    }
}

function updateChartPriceFormat(chartData, currentPrice) {
    if (!currentPrice) return;
    let precision = 2;
    let minMove = 0.01;
    
    const absPrice = Math.abs(currentPrice);
    if (absPrice < 0.0000001) { precision = 10; minMove = 0.0000000001; }
    else if (absPrice < 0.00001) { precision = 8; minMove = 0.00000001; }
    else if (absPrice < 0.001) { precision = 6; minMove = 0.000001; }
    else if (absPrice < 0.1) { precision = 4; minMove = 0.0001; }
    else if (absPrice < 10) { precision = 3; minMove = 0.001; }
    else { precision = 2; minMove = 0.01; }

    const priceFormat = { type: 'price', precision: precision, minMove: minMove };
    
    if (chartData.candleSeries) chartData.candleSeries.applyOptions({ priceFormat });
    if (chartData.smaSeries) chartData.smaSeries.applyOptions({ priceFormat });
    if (chartData.emaSeries) chartData.emaSeries.applyOptions({ priceFormat });
    if (chartData.bbUpperSeries) chartData.bbUpperSeries.applyOptions({ priceFormat });
    if (chartData.bbMiddleSeries) chartData.bbMiddleSeries.applyOptions({ priceFormat });
    if (chartData.bbLowerSeries) chartData.bbLowerSeries.applyOptions({ priceFormat });
    if (chartData.vwapSeries) chartData.vwapSeries.applyOptions({ priceFormat });
    if (chartData.atrSeries) chartData.atrSeries.applyOptions({ priceFormat });
}

async function loadChartData(chartData) {
    if (chartData.instrumentId === "none") {
        setPaneMessage(chartData.id, "No Chart Selected");
        return;
    }
    try {
        setDataStatus(`Loading ${chartData.symbol} ${chartData.interval}`);
        
        const response = await fetch(`${CONFIG.API_BASE}/history?symbol=${chartData.symbol}&timeframe=${chartData.interval}&limit=1000`);
        const payload = await response.json();
        if (!response.ok || !payload.candles || payload.candles.length === 0) {
            throw new Error(payload.error || "No candles available");
        }
        let candles = payload.candles.map(normalizeCandle).filter(Boolean);

        if (candles.length === 0) throw new Error("No valid candle data parsed");
        
        // Ensure strictly ascending time order and remove duplicates to prevent chart glitches
        candles.sort((a, b) => a.time - b.time);
        candles = candles.filter((c, i, arr) => i === 0 || c.time > arr[i - 1].time);
        
        chartData.cachedData = candles;
        syncChartWithCache(chartData);

        const forceReset = () => {
            if (!chartData.chart) return;
            try {
                chartData.chart.timeScale().applyOptions({ rightOffset: 7, barSpacing: 8 });
                chartData.chart.timeScale().scrollToRealTime();
                chartData.chart.priceScale('right').applyOptions({ autoScale: true });
            } catch(e) {}
        };
        forceReset();
        setTimeout(forceReset, 50);

        chartData.currentCandle = candles[candles.length - 1];
        chartData.referencePrice = candles.length > 1 ? candles[candles.length - 2].close : chartData.currentCandle.open;
        
        updateChartPriceFormat(chartData, chartData.currentCandle.close);

        const isUp = chartData.currentCandle.close >= chartData.currentCandle.open;
        chartData.lastDirection = isUp ? 'up' : 'down';
        const color = isUp ? "#16a34a" : "#dc2626";
        if (chartData.chartType === 'line') {
            chartData.candleSeries.applyOptions({ color: color, priceLineColor: color });
        } else {
            chartData.candleSeries.applyOptions({ priceLineColor: color });
        }

        restoreDrawings(chartData);

        updateTicker(chartData, chartData.currentCandle.close, chartData.referencePrice);
        clearPaneMessage(chartData.id);
        subscribeChart(chartData);
        setDataStatus(`Loaded ${chartData.symbol} ${chartData.interval}`);
        updateChartCountdown(chartData); // Show timer instantly after load

        if (state.backtest && state.backtest.symbol === chartData.symbol && state.backtest.interval === chartData.interval) {
            renderBacktestResults(chartData, state.backtest);
        }
    } catch (error) {
        setPaneMessage(chartData.id, error.message);
        setDataStatus(error.message);
    }
}

function syncChartWithCache(chartData) {
    if (!chartData.candleSeries || !chartData.cachedData || chartData.cachedData.length === 0) return;
    
    let mainData = chartData.cachedData;
    if (chartData.chartType === 'heikinAshi') {
        chartData.haData = calculateHeikinAshi(chartData.cachedData);
        mainData = chartData.haData;
    } else if (chartData.chartType === 'line') {
        mainData = chartData.cachedData.map(c => ({ time: c.time, value: c.close }));
    }
    
    chartData.candleSeries.setData(mainData);
    
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
    if (chartData.indicators.vwap && chartData.vwapSeries) {
        chartData.vwapSeries.setData(calculateVWAP(chartData.cachedData, chartData.interval));
    }
    if (chartData.indicators.atr && chartData.atrSeries) {
        chartData.atrSeries.setData(calculateATR(chartData.cachedData, chartData.indicators.atrPeriod));
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
    
    if (chartData.source === "hyperliquid") {
        // Subscribe to Binance for Trades
        if (state.binanceWs && state.binanceWs.readyState === WebSocket.OPEN) {
            const streamName = `${chartData.symbol.toLowerCase()}usdt@trade`;
            state.binanceWs.send(JSON.stringify({
                method: "SUBSCRIBE",
                params: [streamName],
                id: Date.now()
            }));
            chartData.liveSubscribed = true;
        }
        
        // Subscribe to Hyperliquid for L2 Book (only chart 1)
        if (state.chartCount === 1 && chartData.id === 'chart-1' && state.hlWs && state.hlWs.readyState === WebSocket.OPEN) {
            state.hlWs.send(JSON.stringify({
                method: "subscribe",
                subscription: { type: "l2Book", coin: chartData.symbol }
            }));
            chartData.l2Subscribed = true;
        }
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
        // Unsubscribe from Binance
        if (state.binanceWs && state.binanceWs.readyState === WebSocket.OPEN) {
            const streamName = `${chartData.symbol.toLowerCase()}usdt@trade`;
            state.binanceWs.send(JSON.stringify({
                method: "UNSUBSCRIBE",
                params: [streamName],
                id: Date.now()
            }));
        }
        // Unsubscribe from Hyperliquid L2
        if (chartData.l2Subscribed && state.hlWs && state.hlWs.readyState === WebSocket.OPEN) {
            state.hlWs.send(JSON.stringify({
                method: "unsubscribe",
                subscription: { type: "l2Book", coin: chartData.symbol }
            }));
            chartData.l2Subscribed = false;
        }
    }
    chartData.liveSubscribed = false;
}

function handlePriceUpdate(tick) {
    Object.values(state.charts).forEach(chartData => {
        if (chartData.source !== tick.source || chartData.symbol !== tick.symbol) return;
        if (state.replay && state.replay.active && state.replay.chartId === chartData.id) return;
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

    if (window.paperTrading) {
        window.paperTrading.updatePrice(chartData.symbol, price, time);
    }

    chartData.flashDirection = chartData.lastPrice === null || price >= chartData.lastPrice ? "up" : "down";
    chartData.lastPrice = price;
    chartData.lastDirection = candle.close >= candle.open ? 'up' : 'down';

    if (!chartData.pendingUpdate) {
        chartData.pendingUpdate = true;
        requestAnimationFrame(() => flushChartUpdate(chartData));
    }
}

function getIntervalSeconds(interval) {
    const map = { "1m": 60, "3m": 180, "5m": 300, "15m": 900, "30m": 1800, "1h": 3600, "4h": 14400, "1d": 86400, "1wk": 604800, "1mo": 2592000 };
    return map[interval] || 60;
}

function handleCrosshairSync(sourceChartData, param) {
    if (sourceChartData.symbol === "No Chart" || sourceChartData.symbol === "none") return;

    const isLight = state.theme === "light";
    const syncColor = isLight ? "#0f172a" : "#ffffff";

    if (!param.point || !sourceChartData.candleSeries) {
        Object.values(state.charts).forEach(target => {
            const crosshairEl = document.getElementById(`${target.id}-sync-crosshair`);
            if (crosshairEl) crosshairEl.style.display = 'none';
        });
        return;
    }

    const hoveredPrice = sourceChartData.candleSeries.coordinateToPrice(param.point.y);
    const sourceTimeScale = sourceChartData.chart.timeScale();
    const logical = sourceTimeScale.coordinateToLogical(param.point.x);

        let sourceTimeSec = null;
        if (param.time !== undefined) {
            sourceTimeSec = typeof param.time === 'object' ? TimeUtils._getMs(param.time) / 1000 : param.time;
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

    Object.values(state.charts).forEach(target => {
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

            if (sourceTimeSec !== null && target.cachedData.length > 0) {
                let low = 0; let high = target.cachedData.length - 1;
                let targetIdx = -1;
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
                    hLabel.textContent = formatPrice(hoveredPrice);
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
        }
    });
}

function flushChartUpdate(chartData) {
    chartData.pendingUpdate = false;
    
    const candle = chartData.cachedData[chartData.cachedData.length - 1];
    if (!candle) return;

    let shouldShift = false;
    const isNewBar = chartData.isNewBar;
    if (isNewBar && chartData.chart) {
        const timeScale = chartData.chart.timeScale();
        if (typeof timeScale.scrollPosition === 'function') {
            const pos = timeScale.scrollPosition();
            if (pos <= 5 && pos >= -15) shouldShift = true; // Snap if we are hovering near the live edge
        }
    }
    
    chartData.isNewBar = false;

    let seriesUpdate;
    if (chartData.chartType === 'heikinAshi') {
        if (!chartData.haData) chartData.haData = calculateHeikinAshi(chartData.cachedData);
        const c = candle;
        let haOpen;
        if (chartData.haData.length >= 2) {
            const prevHA = isNewBar ? chartData.haData[chartData.haData.length - 1] : chartData.haData[chartData.haData.length - 2];
            haOpen = (prevHA.open + prevHA.close) / 2;
        } else {
            haOpen = c.open;
        }
        const haClose = (c.open + c.high + c.low + c.close) / 4;
        const haHigh = Math.max(c.high, haOpen, haClose);
        const haLow = Math.min(c.low, haOpen, haClose);
        seriesUpdate = { time: c.time, open: haOpen, high: haHigh, low: haLow, close: haClose };
        if (isNewBar) chartData.haData.push(seriesUpdate);
        else chartData.haData[chartData.haData.length - 1] = seriesUpdate;
    } else if (chartData.chartType === 'line') {
        seriesUpdate = { time: candle.time, value: candle.close };
    } else {
        seriesUpdate = candle;
    }

    chartData.candleSeries.update(seriesUpdate);
    
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

    if (chartData.indicators.vwap) {
        const lastVwap = calculateLatestVWAP(chartData.cachedData, chartData.interval);
        if (lastVwap) chartData.vwapSeries.update(lastVwap);
    }

    if (chartData.indicators.atr) {
        const lastAtr = calculateLatestATR(chartData.cachedData, chartData.indicators.atrPeriod);
        if (lastAtr) chartData.atrSeries.update(lastAtr);
    }

    const color = chartData.lastDirection === 'up' ? "#16a34a" : "#dc2626";
    if (chartData.chartType === 'line') {
        chartData.candleSeries.applyOptions({ color: color, priceLineColor: color });
    } else {
        chartData.candleSeries.applyOptions({ priceLineColor: color });
    }

    if (shouldShift) {
        chartData.chart.timeScale().scrollToRealTime();
    }

    if (chartData._vLineHandlers) {
        chartData._vLineHandlers.forEach(fn => fn());
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
                updateOrderBookPrice(chartData.lastPrice);
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
    if (price === null || price === undefined) return "--";
    const absPrice = Math.abs(price);
    if (absPrice >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (absPrice >= 1) return price.toFixed(2);
    if (absPrice >= 0.01) return price.toFixed(4);
    if (absPrice >= 0.00001) return price.toFixed(6);
    if (absPrice >= 0.0000001) return price.toFixed(8);
    return price.toPrecision(4);
}

function setPaneMessage(chartId, message) {
    const container = document.getElementById(`${chartId}-container`);
    let messageEl = container.querySelector(".chart-message");
    if (!messageEl) {
        messageEl = document.createElement("div");
        messageEl.className = "chart-message";
        messageEl.style.pointerEvents = "none";
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

    const timerHeight = 22; 
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
    const isBinanceConnected = state.binanceWs && state.binanceWs.readyState === 1;
    const isConnected = isSSEConnected || isWSConnected || isBinanceConnected;
    const wasConnected = state.connected;
    state.connected = isConnected;
    
    const status = document.getElementById("connection-status");
    if (status) {
        if (isSSEConnected && (isWSConnected || isBinanceConnected)) {
            status.textContent = "Live connected (All)";
        } else if (isSSEConnected) {
            status.textContent = "Live connected (Stocks)";
        } else if (isWSConnected || isBinanceConnected) {
            status.textContent = "Live connected (Crypto)";
        } else {
            status.textContent = "Live disconnected";
        }
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
    
    if (window.paperTrading && state.charts[chartId]) {
        window.paperTrading.setActiveSymbol(state.charts[chartId].symbol);
    }
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

    if (state.replay && state.replay.active && state.replay.chartId === chartId) {
        exitReplayMode();
    }

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
            clearOrderBook();
            updateOrderBookHeader('none');
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
        clearOrderBook();
        fetchAndRenderAssetInfo(chartData.symbol);
    }

    updateMarketMoverHighlights();

    if (window.paperTrading && state.activeChartId === chartId) {
        window.paperTrading.setActiveSymbol(newSymbol);
    }
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
            <div class="settings-group">
                <label>VWAP Color</label>
                <input type="color" id="vwap-color-input" value="${chartData.indicators.vwapColor}">
            </div>
            <div class="settings-group">
                <label>VWAP Thickness</label>
                <select id="vwap-width-input">
                    <option value="1" ${chartData.indicators.vwapLineWidth == 1 ? 'selected' : ''}>Thin</option>
                    <option value="2" ${chartData.indicators.vwapLineWidth == 2 ? 'selected' : ''}>Medium</option>
                    <option value="3" ${chartData.indicators.vwapLineWidth == 3 ? 'selected' : ''}>Thick</option>
                </select>
            </div>
            <div class="settings-group">
                <label>ATR Period</label>
                <input type="number" id="atr-period-input" value="${chartData.indicators.atrPeriod}" min="1">
            </div>
            <div class="settings-group">
                <label>ATR Color</label>
                <input type="color" id="atr-color-input" value="${chartData.indicators.atrColor}">
            </div>
            <div class="settings-group">
                <label>ATR Thickness</label>
                <select id="atr-width-input">
                    <option value="1" ${chartData.indicators.atrLineWidth == 1 ? 'selected' : ''}>Thin</option>
                    <option value="2" ${chartData.indicators.atrLineWidth == 2 ? 'selected' : ''}>Medium</option>
                    <option value="3" ${chartData.indicators.atrLineWidth == 3 ? 'selected' : ''}>Thick</option>
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
        const atrPeriod = parseInt(document.getElementById("atr-period-input").value, 10);
        
        if (!isNaN(smaPeriod) && smaPeriod > 0) chartData.indicators.smaPeriod = smaPeriod;
        if (!isNaN(emaPeriod) && emaPeriod > 0) chartData.indicators.emaPeriod = emaPeriod;
        if (!isNaN(bbPeriod) && bbPeriod > 0) chartData.indicators.bbPeriod = bbPeriod;
        if (!isNaN(bbStdDev) && bbStdDev > 0) chartData.indicators.bbStdDev = bbStdDev;
        if (!isNaN(rsiPeriod) && rsiPeriod > 0) chartData.indicators.rsiPeriod = rsiPeriod;
        if (!isNaN(atrPeriod) && atrPeriod > 0) chartData.indicators.atrPeriod = atrPeriod;
        
        chartData.indicators.smaColor = document.getElementById("sma-color-input").value;
        chartData.indicators.emaColor = document.getElementById("ema-color-input").value;
        chartData.indicators.bbColor = document.getElementById("bb-color-input").value;
        chartData.indicators.rsiColor = document.getElementById("rsi-color-input").value;
        chartData.indicators.vwapColor = document.getElementById("vwap-color-input").value;
        chartData.indicators.atrColor = document.getElementById("atr-color-input").value;
        chartData.indicators.smaLineWidth = parseInt(document.getElementById("sma-width-input").value, 10);
        chartData.indicators.emaLineWidth = parseInt(document.getElementById("ema-width-input").value, 10);
        chartData.indicators.bbLineWidth = parseInt(document.getElementById("bb-width-input").value, 10);
        chartData.indicators.rsiLineWidth = parseInt(document.getElementById("rsi-width-input").value, 10);
        chartData.indicators.vwapLineWidth = parseInt(document.getElementById("vwap-width-input").value, 10);
        chartData.indicators.atrLineWidth = parseInt(document.getElementById("atr-width-input").value, 10);

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
            }
        }
        if (chartData.vwapSeries) {
            chartData.vwapSeries.applyOptions({ color: chartData.indicators.vwapColor, lineWidth: chartData.indicators.vwapLineWidth });
            if (chartData.indicators.vwap) chartData.vwapSeries.setData(calculateVWAP(chartData.cachedData, chartData.interval));
        }
        if (chartData.atrSeries) {
            chartData.atrSeries.applyOptions({ color: chartData.indicators.atrColor, lineWidth: chartData.indicators.atrLineWidth });
            if (chartData.indicators.atr) {
                chartData.atrSeries.setData(calculateATR(chartData.cachedData, chartData.indicators.atrPeriod));
            }
        }

        updateSubchartMargins(chartData);

        const select = document.querySelector(`#${chartData.id} .indicator-select`);
        if (select) {
            select.options[2].text = `SMA ${chartData.indicators.smaPeriod} (${chartData.indicators.sma ? 'On' : 'Off'})`;
            select.options[3].text = `EMA ${chartData.indicators.emaPeriod} (${chartData.indicators.ema ? 'On' : 'Off'})`;
            select.options[4].text = `BB ${chartData.indicators.bbPeriod} (${chartData.indicators.bb ? 'On' : 'Off'})`;
            select.options[5].text = `RSI ${chartData.indicators.rsiPeriod} (${chartData.indicators.rsi ? 'On' : 'Off'})`;
            select.options[6].text = `VWAP (${chartData.indicators.vwap ? 'On' : 'Off'})`;
            select.options[7].text = `ATR ${chartData.indicators.atrPeriod} (${chartData.indicators.atr ? 'On' : 'Off'})`;
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
        .chart-message {
            pointer-events: none;
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
            margin: 0 !important;
        }
        .dropdown-arrow {
            position: absolute;
            right: 4px;
            pointer-events: none;
            color: #8b9bb0;
        }
        .layout-6 .symbol-select-input,
        .layout-8 .symbol-select-input {
            width: 52px !important;
            padding-left: 4px !important;
            padding-right: 16px !important;
            font-size: 11px !important;
        }
        .layout-6 .dropdown-arrow,
        .layout-8 .dropdown-arrow {
            width: 10px;
            height: 10px;
        }
        .layout-6 .pane-controls,
        .layout-8 .pane-controls {
            gap: 2px !important;
        }
        
        /* Sidebar Tabs Implementation */
        .sidebar-tabbed { flex-direction: column !important; }
        .sidebar-tabs-header { display: flex; background: #1e293b; border-bottom: 1px solid #394654; flex-shrink: 0; }
        body.light-theme .sidebar-tabs-header { background: #f1f5f9; border-bottom-color: #cbd5e1; }
        .sidebar-tab { flex: 1; text-align: center; padding: 10px 0; font-size: 12px; font-weight: 600; cursor: pointer; color: #8b9bb0; border-bottom: 2px solid transparent; transition: all 0.2s; }
        body.light-theme .sidebar-tab { color: #64748b; }
        .sidebar-tab.active { color: #3b82f6; border-bottom-color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
        .sidebar-slider-tabs { display: flex; width: 300%; height: 100%; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .sidebar-panel { width: 33.3333%; height: 100%; overflow-y: auto; flex-shrink: 0; }

        /* Paper Trading Module CSS */
        .pt-container { padding: 16px; font-family: inherit; font-size: 13px; color: #d8dee8; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; }
        body.light-theme .pt-container { color: #0f172a; }
        .pt-header { background: #151b23; border: 1px solid #394654; padding: 12px; border-radius: 6px; }
        body.light-theme .pt-header { background: #ffffff; border-color: #cbd5e1; }
        .pt-title { font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #3b82f6; letter-spacing: 1px; }
        .pt-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .pt-stat-box { display: flex; flex-direction: column; }
        .pt-label { font-size: 11px; color: #8b9bb0; text-transform: uppercase; }
        body.light-theme .pt-label { color: #64748b; }
        .pt-value { font-size: 14px; font-weight: 600; }
        .pt-green { color: #10b981 !important; }
        .pt-red { color: #ef4444 !important; }
        .pt-form-group { margin-bottom: 10px; display: flex; flex-direction: column; gap: 4px; }
        .pt-input { background: #0f1419; color: #d8dee8; border: 1px solid #394654; padding: 8px; border-radius: 4px; font-size: 13px; width: 100%; box-sizing: border-box;}
        body.light-theme .pt-input { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
        .pt-btn-group { display: flex; gap: 8px; margin-top: 12px; }
        .pt-btn { flex: 1; padding: 10px; font-weight: 700; border: none; border-radius: 4px; cursor: pointer; color: white; transition: opacity 0.2s; }
        .pt-btn:hover { opacity: 0.9; }
        .pt-buy-btn { background: #10b981; }
        .pt-sell-btn { background: #ef4444; }
        .pt-close-btn { background: #394654; color: white; padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;}
        body.light-theme .pt-close-btn { background: #e2e8f0; color: #0f172a; }
        .pt-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .pt-table th, .pt-table td { padding: 6px 4px; text-align: left; border-bottom: 1px solid #394654; }
        body.light-theme .pt-table th, body.light-theme .pt-table td { border-bottom-color: #cbd5e1; }
        .pt-table th { color: #8b9bb0; font-weight: normal; }
        body.light-theme .pt-table th { color: #64748b; }
        .pt-section { border-top: 1px dashed #394654; padding-top: 16px; }
        body.light-theme .pt-section { border-top-color: #cbd5e1; }
        .pt-collapsible-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; font-weight: 700; color: #8b9bb0; text-transform: uppercase; font-size: 12px; }
        body.light-theme .pt-collapsible-header { color: #64748b; }
        .pt-collapsible-content { display: none; margin-top: 12px; }
        .pt-collapsible-content.open { display: block; }

        .layout-8 .ticker-change {
            display: none !important;
        }
        .layout-8 .ticker-symbol {
            font-size: 11px !important;
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
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            height: 22px !important;
            padding: 1px 0 !important;
            box-sizing: border-box !important;
            gap: 0px !important;
        }
        .countdown-timer span {
            font-size: 10.5px !important;
            line-height: 1 !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        .countdown-timer .timer-val {
            font-size: 9px !important;
            line-height: 1 !important;
            opacity: 0.85 !important;
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
            pointer-events: none;
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
        .hover-delete-btn:hover, .hover-delete-btn.hovered {
            background: #ef4444;
            color: white;
            border-color: #ef4444;
        }
        .hover-add-alert-btn {
            position: absolute !important;
            width: 18px !important;
            height: 18px !important;
            min-width: 18px !important;
            max-width: 18px !important;
            min-height: 18px !important;
            max-height: 18px !important;
            background: #151b23;
            color: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 100;
            font-size: 14px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.4);
            pointer-events: none;
            border: 1px solid #394654;
            transition: background-color 0.1s ease, color 0.1s ease, border-color 0.1s ease !important;
            box-sizing: border-box;
            padding: 0;
            margin: 0;
            line-height: 1;
            font-weight: bold;
        }
        body.light-theme .hover-add-alert-btn {
            background: #ffffff;
            border-color: #cbd5e1;
        }
        .hover-add-alert-btn:hover, .hover-add-alert-btn.hovered {
            background: #10b981;
            color: white;
            border-color: #10b981;
        }
        .chart-container.hovering-hline,
        .chart-container.hovering-hline * {
            cursor: ns-resize !important;
        }
        .chart-container.hovering-vline,
        .chart-container.hovering-vline * {
            cursor: pointer !important;
        }
        .chart-container.hovering-btn,
        .chart-container.hovering-btn * {
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
            grid-template-columns: 1fr 280px;
            gap: 12px;
            /* Lock grid height to screen view to prevent panel from stretching it */
            height: calc(100vh - 105px) !important;
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
        
        .right-sidebar-wrapper {
            background-color: #151b23;
            border: 1px solid #394654;
            border-radius: 8px;
            display: flex;
            flex-direction: row;
            height: 100%;
            overflow: hidden;
            color: #d8dee8;
            font-family: inherit;
        }
        body.light-theme .right-sidebar-wrapper {
            background-color: #ffffff;
            border-color: #cbd5e1;
            color: #0f172a;
        }
        .sidebar-viewport {
            flex: 1;
            overflow: hidden;
            position: relative;
        }
        .sidebar-slider {
            display: flex;
            width: 200%;
            height: 100%;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .asset-info-panel, .order-book-panel {
            width: 33.3333%;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            height: 100%;
            background: transparent;
            border: none;
            border-radius: 0;
            flex-shrink: 0;
        }
        .ob-toggle-btn {
            width: 18px;
            background: #1e293b;
            color: #8b9bb0;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-left: 1px solid #394654;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 2px;
            writing-mode: vertical-rl;
            text-orientation: mixed;
            user-select: none;
            transition: background 0.2s, color 0.2s;
            flex-shrink: 0;
        }
        body.light-theme .ob-toggle-btn {
            background: #f1f5f9;
            color: #64748b;
            border-left-color: #cbd5e1;
        }
        .ob-toggle-btn:hover {
            background: #334155;
            color: #ffffff;
        }
        body.light-theme .ob-toggle-btn:hover {
            background: #e2e8f0;
            color: #0f172a;
        }
        /* Order Book Styles */
        .ob-header {
            padding: 16px;
            border-bottom: 1px solid #394654;
            text-align: center;
            flex-shrink: 0;
        }
        body.light-theme .ob-header {
            border-bottom-color: #cbd5e1;
        }
        .ob-symbol-name {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 4px;
        }
        .ob-price-row {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
        }
        .ob-current-price {
            font-size: 18px;
            font-weight: 700;
        }
        .ob-24h-change {
            font-size: 13px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 4px;
        }
        .ob-col-headers {
            display: flex;
            justify-content: space-between;
            padding: 8px 16px;
            color: #8b9bb0;
            font-weight: 600;
            border-bottom: 1px solid #394654;
            flex-shrink: 0;
        }
        body.light-theme .ob-col-headers {
            color: #64748b;
            border-bottom-color: #cbd5e1;
        }
        .ob-scroll-container {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            font-size: 12px;
            position: relative;
        }
        .ob-asks, .ob-bids {
            display: flex;
            flex-direction: column;
        }
        .ob-asks {
            justify-content: flex-end;
        }
        .ob-row {
            display: flex;
            justify-content: space-between;
            padding: 2px 16px;
            position: relative;
        }
        .ob-row span {
            z-index: 1;
        }
        .ob-ask-price { color: #ef4444; font-weight: 500; }
        .ob-bid-price { color: #10b981; font-weight: 500; }
        .ob-size { color: #d8dee8; }
        body.light-theme .ob-size { color: #0f172a; }
        .ob-spread {
            text-align: center;
            padding: 6px 0;
            margin: 4px 0;
            border-top: 1px solid #394654;
            border-bottom: 1px solid #394654;
            color: #8b9bb0;
            font-weight: 600;
            flex-shrink: 0;
        }
        body.light-theme .ob-spread {
            border-top-color: #cbd5e1;
            border-bottom-color: #cbd5e1;
            color: #64748b;
        }
        .ob-bg {
            position: absolute;
            top: 0;
            right: 0;
            height: 100%;
            opacity: 0.15;
            z-index: 0;
            transition: width 0.1s;
        }
        .ob-ask-bg { background-color: #ef4444; }
        .ob-bid-bg { background-color: #10b981; }
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
            if (pl && !(pl instanceof HTMLElement) && pl.applyOptions) {
                    pl.applyOptions({ color: lineColor });
                }
            });
        }
        restoreDrawings(chartData);
        chartData.isSyncedCrosshairActive = false;
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
    const wrapper = document.createElement('div');
    wrapper.id = 'right-sidebar-wrapper';
    wrapper.className = 'right-sidebar-wrapper sidebar-tabbed';

    const tabsHeader = document.createElement('div');
    tabsHeader.className = 'sidebar-tabs-header';
    tabsHeader.innerHTML = `
        <div class="sidebar-tab active" data-index="0">INFO</div>
        <div class="sidebar-tab" data-index="1">BOOK</div>
        <div class="sidebar-tab" data-index="2">TRADE</div>
    `;

    const viewport = document.createElement('div');
    viewport.className = 'sidebar-viewport';

    const slider = document.createElement('div');
    slider.id = 'sidebar-slider';
    slider.className = 'sidebar-slider-tabs';

    const panel = document.createElement('aside');
    panel.id = 'asset-info-panel';
    panel.className = 'sidebar-panel asset-info-panel';
    panel.innerHTML = `
        <div class="info-panel-content">
            <div id="info-panel-loading" class="info-panel-message">Loading Asset Info...</div>
            <div id="info-panel-data" style="display: none;"></div>
        </div>
    `;

    const obPanel = document.createElement('aside');
    obPanel.id = 'order-book-panel';
    obPanel.className = 'sidebar-panel order-book-panel';
    obPanel.innerHTML = `
        <div class="ob-header">
            <div id="ob-symbol-name" class="ob-symbol-name">--</div>
            <div class="ob-price-row">
                <span id="ob-current-price" class="ob-current-price">--</span>
                <span id="ob-24h-change" class="ob-24h-change">--</span>
            </div>
        </div>
        <div class="ob-col-headers">
            <span>Price</span>
            <span>Size</span>
        </div>
        <div class="ob-scroll-container">
            <div id="ob-asks" class="ob-asks"></div>
            <div id="ob-spread" class="ob-spread">--</div>
            <div id="ob-bids" class="ob-bids"></div>
        </div>
    `;

    const tradePanel = document.createElement('aside');
    tradePanel.id = 'paper-trade-panel';
    tradePanel.className = 'sidebar-panel paper-trade-panel';

    slider.appendChild(panel);
    slider.appendChild(obPanel);
    slider.appendChild(tradePanel);
    viewport.appendChild(slider);
    
    wrapper.appendChild(tabsHeader);
    wrapper.appendChild(viewport);

    const tabs = tabsHeader.querySelectorAll('.sidebar-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const index = parseInt(tab.getAttribute('data-index'));
            slider.style.transform = `translateX(-${index * 33.333}%)`;
            localStorage.setItem('trading-dashboard-active-tab', index);
            state.obCentered = false;
        });
    });

    const savedTab = localStorage.getItem('trading-dashboard-active-tab') || '0';
    const targetTab = tabs[parseInt(savedTab)];
    if (targetTab) {
        targetTab.click();
    }

    tradePanel.innerHTML = '<div class="pt-container"><div class="info-panel-message">Loading Paper Trading...</div></div>';

    return wrapper;
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
    updateOrderBookHeader(symbol);

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
    const absNum = Math.abs(num);
    if (absNum >= 1) return '$' + num.toFixed(2);
    if (absNum >= 0.01) return '$' + num.toFixed(4);
    if (absNum >= 0.00001) return '$' + num.toFixed(6);
    if (absNum >= 0.0000001) return '$' + num.toFixed(8);
    return '$' + num.toPrecision(4);
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

// --- Order Book Functions ---
function updateOrderBookHeader(symbol) {
    const info = assetInfoCache[symbol];
    if (info) {
        const symbolEl = document.getElementById('ob-symbol-name');
        const priceEl = document.getElementById('ob-current-price');
        const changeEl = document.getElementById('ob-24h-change');

        if (symbolEl) symbolEl.textContent = info.symbol || symbol;
        if (priceEl && info.price !== null) priceEl.textContent = formatCurrency(info.price);
        if (changeEl && info.change24 !== null) {
            changeEl.textContent = formatPercent(info.change24);
            changeEl.className = `ob-24h-change ${getPerfClass(info.change24)}`;
        }
    } else if (symbol === 'none') {
        const symbolEl = document.getElementById('ob-symbol-name');
        const priceEl = document.getElementById('ob-current-price');
        const changeEl = document.getElementById('ob-24h-change');

        if (symbolEl) symbolEl.textContent = '--';
        if (priceEl) priceEl.textContent = '--';
        if (changeEl) {
            changeEl.textContent = '--';
            changeEl.className = 'ob-24h-change';
        }
    }
}

function updateOrderBookPrice(price) {
    const priceEl = document.getElementById('ob-current-price');
    if (priceEl && price !== null) {
        priceEl.textContent = formatCurrency(price);
    }
}

function clearOrderBook() {
    state.obCentered = false;
    const asksContainer = document.getElementById('ob-asks');
    const bidsContainer = document.getElementById('ob-bids');
    const spreadContainer = document.getElementById('ob-spread');
    if (asksContainer) asksContainer.innerHTML = '';
    if (bidsContainer) bidsContainer.innerHTML = '';
    if (spreadContainer) spreadContainer.innerHTML = '--';
}

function renderOrderBook(data) {
    const slider = document.getElementById('sidebar-slider');
    if (!slider || !slider.style.transform.includes('33.333%')) return;

    const bids = data.levels[0];
    const asks = data.levels[1];

    const asksContainer = document.getElementById('ob-asks');
    const bidsContainer = document.getElementById('ob-bids');
    const spreadContainer = document.getElementById('ob-spread');

    if (!asksContainer || !bidsContainer || !spreadContainer) return;

    const displayAsks = asks.slice(0, 20).reverse();
    const displayBids = bids.slice(0, 20);

    let maxAskSize = 0;
    displayAsks.forEach(a => maxAskSize = Math.max(maxAskSize, parseFloat(a.sz)));
    let maxBidSize = 0;
    displayBids.forEach(b => maxBidSize = Math.max(maxBidSize, parseFloat(b.sz)));

    const formatObPrice = (px) => {
        const p = parseFloat(px);
        if (p >= 1) return p.toFixed(2);
        if (p >= 0.01) return p.toFixed(4);
        if (p >= 0.0001) return p.toFixed(6);
        if (p >= 0.000001) return p.toFixed(8);
        return p.toPrecision(4);
    };

    let asksHtml = '';
    displayAsks.forEach(a => {
        const size = parseFloat(a.sz);
        const width = maxAskSize > 0 ? (size / maxAskSize) * 100 : 0;
        asksHtml += `
            <div class="ob-row">
                <div class="ob-bg ob-ask-bg" style="width: ${width}%"></div>
                <span class="ob-ask-price">${formatObPrice(a.px)}</span>
                <span class="ob-size">${size.toFixed(4)}</span>
            </div>
        `;
    });
    asksContainer.innerHTML = asksHtml;

    let bidsHtml = '';
    displayBids.forEach(b => {
        const size = parseFloat(b.sz);
        const width = maxBidSize > 0 ? (size / maxBidSize) * 100 : 0;
        bidsHtml += `
            <div class="ob-row">
                <div class="ob-bg ob-bid-bg" style="width: ${width}%"></div>
                <span class="ob-bid-price">${formatObPrice(b.px)}</span>
                <span class="ob-size">${size.toFixed(4)}</span>
            </div>
        `;
    });
    bidsContainer.innerHTML = bidsHtml;

    if (bids.length > 0 && asks.length > 0) {
        const bestBid = parseFloat(bids[0].px);
        const bestAsk = parseFloat(asks[0].px);
        const spread = bestAsk - bestBid;
        const spreadPercent = (spread / bestAsk) * 100;
        spreadContainer.innerHTML = `${formatObPrice(spread)} (${spreadPercent.toFixed(3)}%)`;
    }

    if (!state.obCentered) {
        const scrollContainer = document.querySelector('.ob-scroll-container');
        if (scrollContainer && spreadContainer && spreadContainer.offsetTop > 0) {
            scrollContainer.scrollTop = spreadContainer.offsetTop - (scrollContainer.clientHeight / 2) + (spreadContainer.clientHeight / 2);
            state.obCentered = true;
        }
    }
}

// --- Market Replay Engine ---

function toggleReplayMode() {
    if (state.replay && state.replay.active) {
        exitReplayMode();
    } else {
        startReplaySelection();
    }
}

function startReplaySelection() {
    const activeChart = state.charts[state.activeChartId];
    if (!activeChart || !activeChart.cachedData || activeChart.cachedData.length === 0) {
        alert("Please load a chart first.");
        return;
    }
    
    document.getElementById("global-replay-btn").textContent = "Cancel Replay";
    
    state.replay = {
        active: true,
        status: 'selecting',
        chartId: state.activeChartId,
        speed: 1, 
        isPlaying: false,
        timer: null,
        fullData: [...activeChart.cachedData],
        currentIndex: -1,
        paper: {
            balance: 100000,
            initialBalance: 100000,
            positions: [],
            history: []
        }
    };
    
    const container = document.getElementById(`${activeChart.id}-container`);
    container.style.cursor = "crosshair";
    
    setPaneMessage(activeChart.id, "Click on any historical candle to start replay from there");
}

function startReplayAt(time) {
    const chartData = state.charts[state.replay.chartId];
    clearPaneMessage(chartData.id);
    
    const container = document.getElementById(`${chartData.id}-container`);
    container.style.cursor = "default";
    
    let msTime = typeof time === 'object' ? TimeUtils._getMs(time) / 1000 : time;
    
    let idx = state.replay.fullData.findIndex(c => c.time === msTime);
    if (idx === -1) {
        idx = state.replay.fullData.findIndex(c => c.time >= msTime);
        if (idx === -1) idx = 0;
    }
    
    state.replay.currentIndex = idx;
    state.replay.status = 'active';
    
    unsubscribeChart(chartData);
    
    buildReplayUI();
    renderReplayFrame();
    document.getElementById("global-replay-btn").textContent = "Exit Replay";
}

function buildReplayUI() {
    let panel = document.getElementById("replay-toolbar");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "replay-toolbar";
        panel.style.cssText = `
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            background: #1e293b;
            border: 1px solid #3b82f6;
            padding: 10px 16px;
            border-radius: 8px;
            display: flex;
            gap: 12px;
            align-items: center;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            color: white;
            font-family: inherit;
        `;
        document.body.appendChild(panel);
    }
    
    panel.innerHTML = `
        <button id="replay-play" class="theme-btn" style="background: #10b981; border: none; padding: 6px 12px;">▶ Play</button>
        <button id="replay-pause" class="theme-btn" style="background: #f59e0b; border: none; padding: 6px 12px; display: none;">⏸ Pause</button>
        <button id="replay-step-back" class="theme-btn" title="Step Back">⏮</button>
        <button id="replay-step-fwd" class="theme-btn" title="Step Forward">⏭</button>
        <button id="replay-jump-back" class="theme-btn" title="Jump Back 10">-10</button>
        <button id="replay-jump-fwd" class="theme-btn" title="Jump Forward 10">+10</button>
        <select id="replay-speed" class="theme-btn" title="Replay Speed">
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="1" selected>1x</option>
            <option value="2">2x</option>
            <option value="5">5x</option>
            <option value="10">10x</option>
            <option value="25">25x</option>
            <option value="50">50x</option>
        </select>
        <div style="border-left: 1px solid #394654; height: 24px; margin: 0 4px;"></div>
        <button id="replay-buy" class="theme-btn" style="background: #10b981; border: none;">Buy / Long</button>
        <button id="replay-sell" class="theme-btn" style="background: #ef4444; border: none;">Sell / Short</button>
        <button id="replay-close" class="theme-btn" style="background: #394654; border: none;">Close Pos</button>
        <div style="border-left: 1px solid #394654; height: 24px; margin: 0 4px;"></div>
        <div style="display: flex; flex-direction: column; font-size: 11px;">
            <span style="color:#8b9bb0">OHM: <span id="replay-bal" style="color:white;font-weight:bold;">100,000</span></span>
            <span style="color:#8b9bb0">PnL: <span id="replay-pnl" style="font-weight:bold;">0.00</span></span>
        </div>
        <div style="border-left: 1px solid #394654; height: 24px; margin: 0 4px;"></div>
        <button id="replay-stats-toggle" class="theme-btn" style="background: #3b82f6; border: none;">📊 Stats</button>
        <button id="replay-exit" class="theme-btn" style="background: #ef4444; border: none;">Exit</button>
    `;
    
    document.getElementById("replay-play").onclick = () => {
        state.replay.isPlaying = true;
        document.getElementById("replay-play").style.display = "none";
        document.getElementById("replay-pause").style.display = "inline-block";
        runReplayLoop();
    };
    
    document.getElementById("replay-pause").onclick = () => {
        state.replay.isPlaying = false;
        document.getElementById("replay-play").style.display = "inline-block";
        document.getElementById("replay-pause").style.display = "none";
        if (state.replay.timer) clearTimeout(state.replay.timer);
    };
    
    document.getElementById("replay-step-back").onclick = () => { stepReplay(-1); };
    document.getElementById("replay-step-fwd").onclick = () => { stepReplay(1); };
    document.getElementById("replay-jump-back").onclick = () => { stepReplay(-10); };
    document.getElementById("replay-jump-fwd").onclick = () => { stepReplay(10); };
    
    document.getElementById("replay-speed").onchange = (e) => {
        state.replay.speed = parseFloat(e.target.value);
    };
    
    document.getElementById("replay-buy").onclick = () => { executeReplayTrade('Long'); };
    document.getElementById("replay-sell").onclick = () => { executeReplayTrade('Short'); };
    document.getElementById("replay-close").onclick = () => { closeAllReplayTrades(); };
    
    document.getElementById("replay-stats-toggle").onclick = () => {
        const p = document.getElementById("replay-analytics-panel");
        if (p) p.style.display = p.style.display === "none" ? "block" : "none";
    };
    
    document.getElementById("replay-exit").onclick = exitReplayMode;
    
    updateReplayAnalyticsPanel();
}

function runReplayLoop() {
    if (!state.replay || !state.replay.isPlaying) return;
    
    if (state.replay.currentIndex >= state.replay.fullData.length - 1) {
        document.getElementById("replay-pause").click();
        alert("End of historical data reached.");
        return;
    }
    
    stepReplay(1);
    
    const interval = 1000 / state.replay.speed;
    state.replay.timer = setTimeout(runReplayLoop, interval);
}

function stepReplay(steps) {
    if (!state.replay) return;
    let newIndex = state.replay.currentIndex + steps;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= state.replay.fullData.length) newIndex = state.replay.fullData.length - 1;
    
    state.replay.currentIndex = newIndex;
    renderReplayFrame();
}

function renderReplayFrame() {
    const chartData = state.charts[state.replay.chartId];
    if (!chartData) return;
    
    const visibleData = state.replay.fullData.slice(0, state.replay.currentIndex + 1);
    
    chartData.cachedData = visibleData;
    chartData.currentCandle = visibleData[visibleData.length - 1];
    
    syncChartWithCache(chartData);
    updateReplayMarkers();
    updateReplayStatsUI();
}

function executeReplayTrade(direction) {
    if (!state.replay) return;
    const currentCandle = state.replay.fullData[state.replay.currentIndex];
    if (!currentCandle) return;
    
    const price = currentCandle.close;
    const size = (state.replay.paper.balance * 0.1) / price; 
    
    const pos = {
        id: Date.now().toString(),
        direction: direction,
        entryPrice: price,
        size: size,
        entryTime: currentCandle.time
    };
    
    state.replay.paper.positions.push(pos);
    updateReplayMarkers();
    updateReplayStatsUI();
}

function closeAllReplayTrades() {
    if (!state.replay || state.replay.paper.positions.length === 0) return;
    
    const currentCandle = state.replay.fullData[state.replay.currentIndex];
    const price = currentCandle.close;
    
    state.replay.paper.positions.forEach(pos => {
        const isLong = pos.direction === 'Long';
        const pnl = isLong ? (price - pos.entryPrice) * pos.size : (pos.entryPrice - price) * pos.size;
        
        state.replay.paper.balance += pnl;
        
        pos.exitPrice = price;
        pos.exitTime = currentCandle.time;
        pos.pnl = pnl;
        
        state.replay.paper.history.push(pos);
        
        const chartData = state.charts[state.replay.chartId];
        if (chartData && chartData.chart) {
            const lineSeries = chartData.chart.addLineSeries({
                color: pnl >= 0 ? '#10b981' : '#ef4444',
                lineWidth: 2,
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false,
                lineStyle: 2
            });
            lineSeries.setData([
                { time: pos.entryTime, value: pos.entryPrice },
                { time: pos.exitTime, value: pos.exitPrice }
            ]);
            if (!chartData.replayLines) chartData.replayLines = [];
            chartData.replayLines.push(lineSeries);
        }
    });
    
    state.replay.paper.positions = [];
    updateReplayMarkers();
    updateReplayStatsUI();
}

function updateReplayMarkers() {
    const chartData = state.charts[state.replay.chartId];
    if (!chartData || !chartData.candleSeries) return;
    
    const markers = [];
    
    const key = chartData.symbol;
    const drawings = state.drawings[key] || [];
    drawings.forEach(d => {
        if (d.type === 'buyMarker') {
            markers.push({ time: d.time, position: 'belowBar', color: '#16a34a', shape: 'arrowUp', text: 'BUY', id: d.id });
        } else if (d.type === 'sellMarker') {
            markers.push({ time: d.time, position: 'aboveBar', color: '#dc2626', shape: 'arrowDown', text: 'SELL', id: d.id });
        }
    });
    
    state.replay.paper.positions.forEach(pos => {
        markers.push({
            time: pos.entryTime,
            position: pos.direction === 'Long' ? 'belowBar' : 'aboveBar',
            color: '#3b82f6',
            shape: pos.direction === 'Long' ? 'arrowUp' : 'arrowDown',
            text: `R-ENTRY (${pos.direction})`
        });
    });
    
    state.replay.paper.history.forEach(pos => {
        markers.push({
            time: pos.entryTime,
            position: pos.direction === 'Long' ? 'belowBar' : 'aboveBar',
            color: '#3b82f6',
            shape: pos.direction === 'Long' ? 'arrowUp' : 'arrowDown',
            text: `R-ENTRY`
        });
        markers.push({
            time: pos.exitTime,
            position: pos.pnl >= 0 ? 'aboveBar' : 'belowBar',
            color: pos.pnl >= 0 ? '#10b981' : '#ef4444',
            shape: pos.pnl >= 0 ? 'arrowUp' : 'arrowDown',
            text: `R-EXIT`
        });
    });
    
    markers.sort((a, b) => a.time - b.time);
    
    const currentCandle = state.replay.fullData[state.replay.currentIndex];
    if (currentCandle) {
        const filteredMarkers = markers.filter(m => m.time <= currentCandle.time);
        chartData.candleSeries.setMarkers(filteredMarkers);
    } else {
        chartData.candleSeries.setMarkers(markers);
    }
}

function updateReplayStatsUI() {
    if (!state.replay) return;
    
    let openPnl = 0;
    const currentCandle = state.replay.fullData[state.replay.currentIndex];
    if (currentCandle) {
        const price = currentCandle.close;
        state.replay.paper.positions.forEach(pos => {
            const pnl = pos.direction === 'Long' ? (price - pos.entryPrice) * pos.size : (pos.entryPrice - price) * pos.size;
            openPnl += pnl;
        });
    }
    
    const balEl = document.getElementById("replay-bal");
    const pnlEl = document.getElementById("replay-pnl");
    
    if (balEl && pnlEl) {
        balEl.textContent = `${state.replay.paper.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        pnlEl.textContent = `${openPnl >= 0 ? '+' : ''}${openPnl.toFixed(2)}`;
        pnlEl.style.color = openPnl >= 0 ? '#10b981' : '#ef4444';
    }
    
    updateReplayAnalyticsPanel(openPnl);
}

function updateReplayAnalyticsPanel(openPnl = 0) {
    let panel = document.getElementById("replay-analytics-panel");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "replay-analytics-panel";
        panel.style.cssText = `
            position: fixed;
            top: 60px;
            right: 20px;
            width: 250px;
            background: #1e293b;
            border: 1px solid #3b82f6;
            border-radius: 8px;
            padding: 16px;
            color: white;
            font-family: inherit;
            z-index: 1000;
            display: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        `;
        document.body.appendChild(panel);
    }
    
    const history = state.replay.paper.history;
    const wins = history.filter(t => t.pnl > 0);
    const losses = history.filter(t => t.pnl <= 0);
    
    const winRate = history.length > 0 ? ((wins.length / history.length) * 100).toFixed(1) : '0.0';
    
    let grossWin = 0;
    let grossLoss = 0;
    let largestWin = 0;
    let largestLoss = 0;
    
    wins.forEach(w => { grossWin += w.pnl; if (w.pnl > largestWin) largestWin = w.pnl; });
    losses.forEach(l => { grossLoss += Math.abs(l.pnl); if (l.pnl < largestLoss) largestLoss = l.pnl; });
    
    const avgWin = wins.length > 0 ? (grossWin / wins.length) : 0;
    const avgLoss = losses.length > 0 ? (grossLoss / losses.length) : 0;
    const profitFactor = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : (grossWin > 0 ? '∞' : '0.00');
    
    const netPnl = (state.replay.paper.balance - state.replay.paper.initialBalance) + openPnl;
    const currentEquity = state.replay.paper.balance + openPnl;
    
    panel.innerHTML = `
        <h3 style="margin-top:0; color:#3b82f6; font-size:14px; border-bottom: 1px solid #394654; padding-bottom:8px;">Replay Statistics</h3>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Starting Balance:</span> <span>${state.replay.paper.initialBalance.toFixed(2)} OHM</span></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Current Equity:</span> <span>${currentEquity.toFixed(2)} OHM</span></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Net PnL:</span> <span style="color:${netPnl>=0?'#10b981':'#ef4444'}">${netPnl>=0?'+':''}${netPnl.toFixed(2)} OHM</span></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Win Rate:</span> <span>${winRate}%</span></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Total Trades:</span> <span>${history.length}</span></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Average Win:</span> <span style="color:#10b981">+${avgWin.toFixed(2)}</span></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Average Loss:</span> <span style="color:#ef4444">-${Math.abs(avgLoss).toFixed(2)}</span></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Largest Win:</span> <span style="color:#10b981">+${largestWin.toFixed(2)}</span></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Largest Loss:</span> <span style="color:#ef4444">-${Math.abs(largestLoss).toFixed(2)}</span></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Profit Factor:</span> <span>${profitFactor}</span></div>
    `;
}

function exitReplayMode() {
    if (!state.replay) return;
    
    if (state.replay.timer) clearTimeout(state.replay.timer);
    
    let chartToUpdate = null;

    if (state.replay.status === 'selecting') {
        const chartData = state.charts[state.replay.chartId];
        if (chartData) {
            const container = document.getElementById(`${chartData.id}-container`);
            container.style.cursor = "default";
            clearPaneMessage(chartData.id);
        }
    } else if (state.replay.status === 'active') {
        const chartData = state.charts[state.replay.chartId];
        if (chartData) {
            chartData.cachedData = state.replay.fullData;
            syncChartWithCache(chartData);
            subscribeChart(chartData);
            
            if (chartData.replayLines) {
                chartData.replayLines.forEach(line => {
                    try { chartData.chart.removeSeries(line); } catch(e){}
                });
            }
            chartData.replayLines = [];
            chartToUpdate = chartData;
        }
    }
    
    const panel = document.getElementById("replay-toolbar");
    if (panel) panel.remove();
    
    const statsPanel = document.getElementById("replay-analytics-panel");
    if (statsPanel) statsPanel.remove();
    
    state.replay = null;
    document.getElementById("global-replay-btn").textContent = "⏪ Replay";

    if (chartToUpdate) {
        updateMarkers(chartToUpdate);
        chartToUpdate.chart.timeScale().scrollToRealTime();
    }
}

// --- Backtesting System ---
function openBacktestModal() {
    let modal = document.getElementById("backtest-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "backtest-modal";
        modal.className = "settings-modal-overlay";
        document.body.appendChild(modal);
    }

    const activeChart = state.charts[state.activeChartId];
    const defaultSymbol = activeChart ? activeChart.symbol : 'BTC';
    const defaultInterval = activeChart ? activeChart.interval : '1h';

    modal.innerHTML = `
        <div class="settings-modal-content" style="width: 400px;">
            <h3>Backtest Strategy</h3>
            <div class="settings-group" style="flex-direction: column; align-items: flex-start;">
                <label style="margin-bottom: 6px;">Strategy</label>
                <select id="backtest-strategy" class="pt-input" style="width: 100%;">
                    <option value="sma_crossover">SMA Crossover</option>
                    <option value="rsi_strategy">RSI Strategy</option>
                    <option value="vwap_ema_trend_pullback">VWAP EMA Trend Pullback</option>
                </select>
            </div>
            <div class="settings-group" style="flex-direction: column; align-items: flex-start;">
                <label style="margin-bottom: 6px;">Symbol</label>
                <select id="backtest-symbol" class="pt-input" style="width: 100%;"></select>
            </div>
            <div class="settings-group" style="flex-direction: column; align-items: flex-start;">
                <label style="margin-bottom: 6px;">Interval</label>
                <select id="backtest-interval" class="pt-input" style="width: 100%;"></select>
            </div>
            <div class="settings-group">
                <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-start;">
                    <label style="margin-bottom: 6px;">Start Date</label>
                    <input type="date" id="backtest-start-date" class="pt-input" style="width: 100%;">
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-start;">
                    <label style="margin-bottom: 6px;">End Date</label>
                    <input type="date" id="backtest-end-date" class="pt-input" style="width: 100%;">
                </div>
            </div>
            
            <div id="sma-parameters" style="margin-top: 16px; border-top: 1px solid #394654; padding-top: 16px;">
                <h4>SMA Crossover Parameters</h4>
                <div class="settings-group">
                    <label>Fast Period</label>
                    <input type="number" id="sma-fast-period" value="10" min="1" class="pt-input" style="width: 80px;">
                </div>
                <div class="settings-group">
                    <label>Slow Period</label>
                    <input type="number" id="sma-slow-period" value="20" min="1" class="pt-input" style="width: 80px;">
                </div>
            </div>

            <div id="rsi-parameters" style="display: none; margin-top: 16px; border-top: 1px solid #394654; padding-top: 16px;">
                <h4>RSI Strategy Parameters</h4>
                <div class="settings-group">
                    <label>RSI Period</label>
                    <input type="number" id="rsi-period" value="14" min="1" class="pt-input" style="width: 80px;">
                </div>
                <div class="settings-group">
                    <label>Overbought</label>
                    <input type="number" id="rsi-overbought" value="70" min="1" class="pt-input" style="width: 80px;">
                </div>
                <div class="settings-group">
                    <label>Oversold</label>
                    <input type="number" id="rsi-oversold" value="30" min="1" class="pt-input" style="width: 80px;">
                </div>
            </div>

            <div class="settings-actions">
                <button id="backtest-cancel" class="pt-close-btn">Cancel</button>
                <button id="backtest-run" class="pt-btn pt-buy-btn">Run Backtest</button>
            </div>
            <div id="backtest-loading" style="display: none; text-align: center; margin-top: 10px; color: #3b82f6;">Running backtest...</div>
            <div id="backtest-error" style="display: none; text-align: center; margin-top: 10px; color: #ef4444;"></div>
        </div>
    `;
    modal.style.display = "flex";

    const symbolSelect = document.getElementById('backtest-symbol');
    const intervalSelect = document.getElementById('backtest-interval');
    const strategySelect = document.getElementById('backtest-strategy');
    const smaParams = document.getElementById('sma-parameters');
    const rsiParams = document.getElementById('rsi-parameters');

    strategySelect.addEventListener('change', () => {
        const strategy = strategySelect.value;
        smaParams.style.display = 'none';
        rsiParams.style.display = 'none';

        if (strategy === 'sma_crossover') {
            smaParams.style.display = 'block';
        } else if (strategy === 'rsi_strategy') {
            rsiParams.style.display = 'block';
        }
    });

    state.instruments.forEach(inst => {
        const option = document.createElement('option');
        option.value = inst.symbol;
        option.textContent = inst.symbol;
        symbolSelect.appendChild(option);
    });
    symbolSelect.value = defaultSymbol;

    const currentInstrument = state.instruments.find(inst => inst.symbol === defaultSymbol);
    if (currentInstrument) {
        currentInstrument.timeframes.forEach(tf => {
            const option = document.createElement('option');
            option.value = tf;
            option.textContent = tf;
            intervalSelect.appendChild(option);
        });
        intervalSelect.value = defaultInterval;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - 3);
    document.getElementById('backtest-start-date').value = startDate.toISOString().split('T')[0];
    document.getElementById('backtest-end-date').value = endDate.toISOString().split('T')[0];

    document.getElementById("backtest-cancel").onclick = () => modal.style.display = "none";

    document.getElementById("backtest-run").onclick = async () => {
        const loadingEl = document.getElementById('backtest-loading');
        const errorEl = document.getElementById('backtest-error');
        loadingEl.style.display = 'block';
        errorEl.style.display = 'none';

        try {
            const strategy = document.getElementById('backtest-strategy').value;
            let parameters = {};
            if (strategy === 'sma_crossover') {
                parameters = {
                    fast_period: parseInt(document.getElementById('sma-fast-period').value),
                    slow_period: parseInt(document.getElementById('sma-slow-period').value),
                };
            } else if (strategy === 'rsi_strategy') {
                parameters = {
                    rsi_period: parseInt(document.getElementById('rsi-period').value),
                    overbought_level: parseInt(document.getElementById('rsi-overbought').value),
                    oversold_level: parseInt(document.getElementById('rsi-oversold').value),
                };
            } else if (strategy === 'vwap_ema_trend_pullback') {
                parameters = {};
            }

            const response = await fetch(`${CONFIG.API_BASE}/backtest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    strategy: strategy,
                    symbol: document.getElementById('backtest-symbol').value,
                    interval: document.getElementById('backtest-interval').value,
                    startTime: new Date(document.getElementById('backtest-start-date').value).getTime() / 1000,
                    endTime: new Date(document.getElementById('backtest-end-date').value).getTime() / 1000,
                    parameters: parameters
                })
            });

            const result = await response.json();
            if (!response.ok || result.error) throw new Error(result.error || 'Backtest failed');

            state.backtest = { 
                ...result, 
                symbol: document.getElementById('backtest-symbol').value,
                interval: document.getElementById('backtest-interval').value
            };
            localStorage.setItem(CONFIG.BACKTEST_STORAGE_KEY, JSON.stringify(state.backtest));
            
            const chartData = state.charts[state.activeChartId];
            if (chartData) {
                if (chartData.symbol !== state.backtest.symbol) {
                    await switchChartSymbol(state.activeChartId, state.backtest.symbol);
                }
                renderBacktestResults(state.charts[state.activeChartId], result);
            }
            if (window.paperTrading) window.paperTrading.renderBacktestSummary(result.summary_stats, result.trades, result.equity_curve);
            modal.style.display = 'none';
        } catch (error) {
            errorEl.textContent = `Error: ${error.message}`;
            errorEl.style.display = 'block';
        } finally {
            loadingEl.style.display = 'none';
        }
    };
}

function renderBacktestResults(chartData, results) {
    if (!chartData || !results || !chartData.chart) return;
    if (results.visible === false) return;

    // Clear previous backtest markers/lines
    if (chartData.backtestMarkers) chartData.backtestMarkers = [];
    if (chartData.backtestTradeLines) {
        chartData.backtestTradeLines.forEach(line => {
            try { chartData.chart.removeSeries(line); } catch(e){}
        });
    }
    chartData.backtestTradeLines = [];

    // Plot trade markers
    const markers = results.trades.flatMap(trade => [
        { time: trade.time, position: trade.direction === 'Long' ? 'belowBar' : 'aboveBar', color: trade.direction === 'Long' ? '#3b82f6' : '#f59e0b', shape: trade.direction === 'Long' ? 'arrowUp' : 'arrowDown', text: trade.direction.toUpperCase() },
        { time: trade.exitTime, position: trade.pnl >= 0 ? 'aboveBar' : 'belowBar', color: trade.pnl >= 0 ? '#10b981' : '#ef4444', shape: 'circle', text: trade.closeReason || 'CLOSE' }
    ]);
    chartData.backtestMarkers = markers;
    updateMarkers(chartData); // Use unified marker update

    // Plot individual trade lines
    results.trades.forEach(trade => {
        const lineSeries = chartData.chart.addLineSeries({
            color: trade.pnl >= 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)',
            lineWidth: 2,
            lineStyle: 0, // Solid
            lastValueVisible: false,
            priceLineVisible: false,
        });
        lineSeries.setData([
            { time: trade.time, value: trade.entryPrice },
            { time: trade.exitTime, value: trade.exitPrice }
        ]);
        chartData.backtestTradeLines.push(lineSeries);
        
        // SL Line Box
        if (trade.slPrice) {
            const slSeries = chartData.chart.addLineSeries({
                color: 'rgba(239, 68, 68, 0.5)',
                lineWidth: 1,
                lineStyle: 2, // Dashed
                lastValueVisible: false,
                priceLineVisible: false,
            });
            slSeries.setData([
                { time: trade.time, value: trade.slPrice },
                { time: trade.exitTime, value: trade.slPrice }
            ]);
            chartData.backtestTradeLines.push(slSeries);
        }
        
        // TP Line Box
        if (trade.tpPrice) {
            const tpSeries = chartData.chart.addLineSeries({
                color: 'rgba(16, 185, 129, 0.5)',
                lineWidth: 1,
                lineStyle: 2, // Dashed
                lastValueVisible: false,
                priceLineVisible: false,
            });
            tpSeries.setData([
                { time: trade.time, value: trade.tpPrice },
                { time: trade.exitTime, value: trade.tpPrice }
            ]);
            chartData.backtestTradeLines.push(tpSeries);
        }
    });

    // Zoom to fit the backtest period
    if (results.trades.length > 0) {
        const from = results.trades[0].time;
        const to = results.trades[results.trades.length - 1].exitTime;
        chartData.chart.timeScale().setVisibleRange({ from, to });
    }
}

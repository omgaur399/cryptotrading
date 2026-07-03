// =============================================================================
//  constants.js  --  Static application constants
//  Phase 1 utility extraction.  No dynamic config, no state references.
// =============================================================================

// ---------------------------------------------------------------------------
//  Application config (storage keys, defaults, API base)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
//  CoinGecko ID lookup map (symbol -> coingecko id)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
//  Grid resize persistence key
// ---------------------------------------------------------------------------
const GRID_SIZES_KEY = 'tdc-grid-sizes';

// ---------------------------------------------------------------------------
//  Volume Profile (VPVR) rendering constants
// ---------------------------------------------------------------------------
const VP_BUCKETS    = 100;   // number of price rows
const VP_WIDTH_PCT  = 0.12;  // fraction of chart width used by bars
const VP_OPACITY    = 0.82;  // overall overlay opacity
const VP_BUY_COLOR  = 'rgba(16, 185, 129, 0.55)';   // green bars
const VP_SELL_COLOR = 'rgba(220, 38, 38, 0.55)';    // red bars
const VP_POC_COLOR  = '#facc15';                     // yellow POC line

// ---------------------------------------------------------------------------
//  Session highlighting -- UTC hour windows
//  Asia: 00:00-09:00  |  London: 07:00-16:00  |  NY: 13:00-22:00
// ---------------------------------------------------------------------------
const SESSIONS = [
    { name: 'Asia',   startH:  0, endH:  9, color: 'rgba(167, 139, 250, 0.06)' },
    { name: 'London', startH:  7, endH: 16, color: 'rgba(56,  189, 248, 0.06)' },
    { name: 'NY',     startH: 13, endH: 22, color: 'rgba(34,  197, 94, 0.06)'  },
];

// Intervals where session bands make sense (all intraday timeframes and 1d)
const SESSION_MIN_INTERVALS = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d'];

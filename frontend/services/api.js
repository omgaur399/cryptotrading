const ApiService = {
    async getExchangeInfo() {
        const res = await fetch("https://api.binance.com/api/v3/exchangeInfo");
        return res.json();
    },

    async getHistory(symbol, timeframe, limit, beforeTimestamp = null) {
        let url = `${CONFIG.API_BASE}/history?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`;
        if (beforeTimestamp) {
            url += `&before_timestamp=${beforeTimestamp}`;
        }
        const response = await fetch(url);
        const payload = await response.json();
        return { response, payload };
    },

    async subscribeLive(symbols) {
        const response = await fetch(`${CONFIG.API_BASE}/live/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbols })
        });
        return response.json();
    },

    async getHyperliquidFunding() {
        const res = await fetch("https://api.hyperliquid.xyz/info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "metaAndAssetCtxs" })
        });
        if (!res.ok) throw new Error("Market data fetch failed");
        return res.json();
    },

    async searchCoinGecko(query) {
        const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${query}`);
        if (!res.ok) throw new Error('Search failed');
        return res.json();
    },

    async getCoinGeckoInfo(coinId) {
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`);
        if (!res.ok) throw new Error('Details failed');
        return res.json();
    },

    async get24hTicker(cleanSymbol) {
        const endpoints = [
            `https://api.binance.com/api/v3/ticker/24hr?symbol=${cleanSymbol}USDT`,
            `https://api.binance.com/api/v3/ticker/24hr?symbol=1000${cleanSymbol}USDT`,
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
        return { data: bData, is1000x };
    },

    async runBacktest(payload) {
        const response = await fetch(`${CONFIG.API_BASE}/backtest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok || result.error) throw new Error(result.error || 'Backtest failed');
        return result;
    }
};

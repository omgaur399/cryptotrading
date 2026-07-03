import os

with open('frontend/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. getExchangeInfo
old_exchange_info = """        const res = await fetch("https://api.binance.com/api/v3/exchangeInfo");
        const data = await res.json();"""
new_exchange_info = """        const data = await ApiService.getExchangeInfo();"""
content = content.replace(old_exchange_info, new_exchange_info)

# 2. getHistory (loadMoreHistory)
old_history_more = """        const response = await fetch(`${CONFIG.API_BASE}/history?symbol=${chartData.symbol}&timeframe=${chartData.interval}&before_timestamp=${beforeTimestamp}&limit=1000`);
        const payload = await response.json();"""
new_history_more = """        const { response, payload } = await ApiService.getHistory(chartData.symbol, chartData.interval, 1000, beforeTimestamp);"""
content = content.replace(old_history_more, new_history_more)

# 3. getHistory (loadChartData)
old_history = """        const response = await fetch(`${CONFIG.API_BASE}/history?symbol=${chartData.symbol}&timeframe=${chartData.interval}&limit=1000`);
        const payload = await response.json();"""
new_history = """        const { response, payload } = await ApiService.getHistory(chartData.symbol, chartData.interval, 1000);"""
content = content.replace(old_history, new_history)

# 4. subscribeLive
old_subscribe = """        fetch(`${CONFIG.API_BASE}/live/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ symbols: [...symbolsToSubscribe] })
        }).catch(err => console.error("Error subscribing to new symbol:", err));"""
new_subscribe = """        ApiService.subscribeLive([...symbolsToSubscribe])
            .catch(err => console.error("Error subscribing to new symbol:", err));"""
content = content.replace(old_subscribe, new_subscribe)

# 5. getHyperliquidFunding
old_funding = """        const res = await fetch("https://api.hyperliquid.xyz/info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type: "metaAndAssetCtxs" })
        });
        if (!res.ok) throw new Error("Market data fetch failed");
        const data = await res.json();"""
new_funding = """        const data = await ApiService.getHyperliquidFunding();"""
content = content.replace(old_funding, new_funding)

# 6. searchCoinGecko
old_cg_search = """                const searchRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${cleanSymbol}`);
                if (!searchRes.ok) throw new Error('Search failed');
                const searchData = await searchRes.json();"""
new_cg_search = """                const searchData = await ApiService.searchCoinGecko(cleanSymbol);"""
content = content.replace(old_cg_search, new_cg_search)

# 7. getCoinGeckoInfo
old_cg_info = """            const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`);
            if (!res.ok) throw new Error('Details failed');
            const data = await res.json();"""
new_cg_info = """            const data = await ApiService.getCoinGeckoInfo(coinId);"""
content = content.replace(old_cg_info, new_cg_info)

# 8. get24hTicker
old_ticker = """                const endpoints = [
                    `https://api.binance.com/api/v3/ticker/24hr?symbol=${cleanSymbol}USDT`,
                    `https://api.binance.com/api/v3/ticker/24hr?symbol=1000${cleanSymbol}USDT`,
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
                
                if (!bData) throw new Error('All fallbacks failed');"""
new_ticker = """                let { data: bData, is1000x } = await ApiService.get24hTicker(cleanSymbol);"""
content = content.replace(old_ticker, new_ticker)


# 9. runBacktest
old_backtest = """            const response = await fetch(`${CONFIG.API_BASE}/backtest`, {
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
            if (!response.ok || result.error) throw new Error(result.error || 'Backtest failed');"""
new_backtest = """            const payload = {
                strategy: strategy,
                symbol: document.getElementById('backtest-symbol').value,
                interval: document.getElementById('backtest-interval').value,
                startTime: new Date(document.getElementById('backtest-start-date').value).getTime() / 1000,
                endTime: new Date(document.getElementById('backtest-end-date').value).getTime() / 1000,
                parameters: parameters
            };
            const result = await ApiService.runBacktest(payload);"""
content = content.replace(old_backtest, new_backtest)

with open('frontend/script.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("done")

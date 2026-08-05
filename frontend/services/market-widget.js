const MarketWidgetService = (function() {
    let fmt = {};
    const assetInfoCache = {};

    function initialize(formatters) {
        fmt = formatters;
    }

    const AssetInfo = {
        clear() {
            const dataContainer = document.getElementById('info-panel-data');
            const loadingContainer = document.getElementById('info-panel-loading');
            if (dataContainer && loadingContainer) {
                dataContainer.style.display = 'none';
                loadingContainer.style.display = 'block';
                loadingContainer.textContent = 'No Chart Selected';
            }
        },

        render(info) {
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
                    <div class="info-price" id="info-panel-price">${fmt.formatCurrency(info.price)}</div>
                    <div class="info-change ${fmt.getPerfClass(info.change24)}">${fmt.formatPercent(info.change24)}</div>
                </div>

                <div class="info-section">
                    <h3>Market Statistics</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <span class="info-label">Market Cap</span>
                            <span class="info-value">${fmt.formatCurrency(info.marketCap)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">24h Volume</span>
                            <span class="info-value">${fmt.formatCurrency(info.vol24)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Circulating Supply</span>
                            <span class="info-value">${fmt.formatNumber(info.circSupply)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Total Supply</span>
                            <span class="info-value">${fmt.formatNumber(info.totalSupply)}</span>
                        </div>
                    </div>
                </div>

                <div class="info-section">
                    <h3>Performance</h3>
                    <div class="perf-grid">
                        ${Object.entries(info.performance).map(([period, val]) => `
                            <div class="perf-card ${fmt.getPerfClass(val)}">
                                <div class="perf-period">${period}</div>
                                <div class="perf-val">${fmt.formatPercent(val)}</div>
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
                            <span class="info-value">${fmt.formatCurrency(info.high24)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">24h Low</span>
                            <span class="info-value">${fmt.formatCurrency(info.low24)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">All Time High</span>
                            <span class="info-value">${fmt.formatCurrency(info.ath)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">All Time Low</span>
                            <span class="info-value">${fmt.formatCurrency(info.atl)}</span>
                        </div>
                    </div>
                </div>
            `;
        },

        updatePrice(price) {
            const priceEl = document.getElementById('info-panel-price');
            if (priceEl && price !== null) {
                priceEl.textContent = fmt.formatCurrency(price);
            }
        },

        getEmpty(symbol) {
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
    };

    let obCentered = false;

    const OrderBook = {
        clear() {
            obCentered = false;
            const asksContainer = document.getElementById('ob-asks');
            const bidsContainer = document.getElementById('ob-bids');
            const spreadContainer = document.getElementById('ob-spread');
            if (asksContainer) asksContainer.innerHTML = '';
            if (bidsContainer) bidsContainer.innerHTML = '';
            if (spreadContainer) spreadContainer.innerHTML = '--';
        },

        render(data) {
            const activeTab = document.querySelector(".global-right-sidebar .sidebar-tab.active");
            if (!activeTab || activeTab.dataset.index !== '1') return;

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

            if (!obCentered) {
                const scrollContainer = document.querySelector('.ob-scroll-container');
                if (scrollContainer && spreadContainer && spreadContainer.offsetTop > 0) {
                    scrollContainer.scrollTop = spreadContainer.offsetTop - (scrollContainer.clientHeight / 2) + (spreadContainer.clientHeight / 2);
                    obCentered = true;
                }
            }
        },

        updateHeader(symbol, info) {
            if (info) {
                const symbolEl = document.getElementById('ob-symbol-name');
                const priceEl = document.getElementById('ob-current-price');
                const changeEl = document.getElementById('ob-24h-change');

                if (symbolEl) symbolEl.textContent = info.symbol || symbol;
                if (priceEl && info.price !== null) priceEl.textContent = fmt.formatCurrency(info.price);
                if (changeEl && info.change24 !== null) {
                    changeEl.textContent = fmt.formatPercent(info.change24);
                    changeEl.className = `ob-24h-change ${fmt.getPerfClass(info.change24)}`;
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
        },

        updatePrice(price) {
            const priceEl = document.getElementById('ob-current-price');
            if (priceEl && price !== null) {
                priceEl.textContent = fmt.formatCurrency(price);
            }
        }
    };

    const MarketTicker = {
        create() {
            if (document.getElementById('market-ticker-container')) return;

            const tickerContainer = document.createElement('div');
            tickerContainer.id = 'market-ticker-container';
            tickerContainer.className = 'market-ticker-container';
            
            tickerContainer.innerHTML = `
                <div class="ticker-row gainers-row">
                    <div class="ticker-label gainers-label">▲ GAINERS</div>
                    <div class="ticker-scroll-wrapper">
                        <div class="ticker-scroll" id="ticker-gainers"></div>
                    </div>
                </div>
                <div class="ticker-row losers-row">
                    <div class="ticker-label losers-label">▼ LOSERS</div>
                    <div class="ticker-scroll-wrapper">
                        <div class="ticker-scroll" id="ticker-losers"></div>
                    </div>
                </div>
            `;

            const grid = document.getElementById('charts-grid');
            const wrapper = document.querySelector('.main-charts-wrapper') || grid;
            if (wrapper && wrapper.parentNode) {
                wrapper.parentNode.insertBefore(tickerContainer, wrapper);
            } else {
                document.body.prepend(tickerContainer);
            }
        },

        render(containerId, data, activeSymbol, watchlistSymbols) {
            const container = document.getElementById(containerId);
            if (!container) return;
            
            let html = '';
            const wlList = watchlistSymbols || [];
            data.forEach(item => {
                const sign = item.change > 0 ? '+' : '';
                const colorClass = item.change >= 0 ? 'up' : 'down';
                const isActive = item.symbol === activeSymbol;
                const activeClass = isActive ? 'active-mover' : '';
                const inWl = wlList.includes(item.symbol);
                html += `
                    <div class="market-ticker-item ${activeClass}" data-symbol="${item.symbol}" title="Click to load ${item.symbol} chart" onclick="switchChartSymbol(state.activeChartId, '${item.symbol}')">
                        <span class="market-ticker-symbol">${item.symbol}</span>
                        <span class="market-ticker-percent ${colorClass}">${sign}${item.change.toFixed(2)}%</span>
                        <button class="ticker-watchlist-btn${inWl ? ' wl-active' : ''}" title="${inWl ? 'Remove from Watchlist' : 'Add to Watchlist'}" data-symbol="${item.symbol}" onclick="event.stopPropagation(); WatchlistService.toggleFavorite('${item.symbol}')">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                    </div>
                `;
            });
            
            if (container.children.length === 2 && container.dataset.initialized === 'true') {
                const contents = container.querySelectorAll('.ticker-content');
                contents.forEach(content => {
                    content.innerHTML = html;
                });
            } else {
                container.innerHTML = `
                    <div class="ticker-content">${html}</div>
                    <div class="ticker-content">${html}</div>
                `;
                container.dataset.initialized = 'true';
            }
        }
    };

    async function fetchMarketMovers() {
        if (document.hidden) return; // Save resources when tab is inactive

        try {
            const data = await ApiService.getHyperliquidFunding();
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
            
            // Cache all prices and changes globally
            state.allMarketPrices = {};
            changes.forEach(item => {
                if (item) {
                    state.allMarketPrices[item.symbol] = {
                        price: item.price,
                        change: item.change
                    };
                }
            });
            if (typeof WatchlistService !== 'undefined' && WatchlistService.updateWatchlistFromMarketCache) {
                WatchlistService.updateWatchlistFromMarketCache();
            }

            const topGainers = changes.slice(0, 10);
            const topLosers = changes.slice().reverse().slice(0, 10);
            
            MarketTicker.render('ticker-gainers', topGainers);
            MarketTicker.render('ticker-losers', topLosers);
        } catch (e) {
            console.warn("Could not fetch market movers:", e);
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
                if (typeof COMMON_IDS !== 'undefined' && COMMON_IDS[upperClean]) {
                    coinId = COMMON_IDS[upperClean];
                } else {
                    const searchData = await ApiService.searchCoinGecko(cleanSymbol);
                    
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
                const data = await ApiService.getCoinGeckoInfo(coinId);
                
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
                    
                    const { data: bData, is1000x } = await ApiService.get24hTicker(cleanSymbol);
                    
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
                    assetInfoCache[symbol] = AssetInfo.getEmpty(symbol);
                }
            }
        }

        const info = assetInfoCache[symbol];
        AssetInfo.render(info);
        OrderBook.updateHeader(symbol);

        loadingContainer.style.display = 'none';
        dataContainer.style.display = 'block';
    }

    window.fetchAndRenderAssetInfo = fetchAndRenderAssetInfo;

    return { initialize, AssetInfo, OrderBook, MarketTicker, fetchMarketMovers, fetchAndRenderAssetInfo };
})();

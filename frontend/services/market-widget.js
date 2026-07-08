const MarketWidgetService = (function() {
    let fmt = {};

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
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
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

    return { initialize, AssetInfo, OrderBook, MarketTicker };
})();

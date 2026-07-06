const WatchlistService = (() => {
    let deps = {};

    function initialize(dependencies) {
        deps = dependencies;
        deps.watchlistState.symbolsList = loadWatchlistFromStorage();
        initWatchlistPanel();
        
        // Start polling for chart price updates
        setInterval(() => {
            const charts = deps.getChartStates();
            if (!charts) return;
            Object.values(charts).forEach(cd => {
                if (!cd.symbol || !deps.watchlistState.symbols[cd.symbol]) return;
                const entry = deps.watchlistState.symbols[cd.symbol];
                const newPrice = cd.lastPrice;
                if (newPrice !== null && newPrice !== undefined && newPrice !== entry.price) {
                    const prev = entry.price;
                    entry.price = newPrice;
                    updateWatchlistRowPrice(cd.symbol, newPrice, prev, true);
                }
            });
            if (deps.onPoll) deps.onPoll();
        }, 500);
    }

    function loadWatchlistFromStorage() {
        let saved = deps.StorageService.getWatchlistSymbols();
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch(e) {}
        }
        return [];
    }

    function saveWatchlistToStorage(symbolsList) {
        deps.StorageService.saveWatchlistSymbols(symbolsList);
    }

    function toggleWatchlistSymbol(symbol) {
        if (!deps.watchlistState || !deps.watchlistState.symbolsList) return;
        const idx = deps.watchlistState.symbolsList.indexOf(symbol);
        if (idx === -1) {
            deps.watchlistState.symbolsList.push(symbol);
        } else {
            deps.watchlistState.symbolsList.splice(idx, 1);
            delete deps.watchlistState.symbols[symbol];
        }
        saveWatchlistToStorage(deps.watchlistState.symbolsList);
        refreshWatchlistFromCharts();
        syncAllWatchlistBtns();
    }

    function syncAllWatchlistBtns() {
        const list = (deps.watchlistState && deps.watchlistState.symbolsList) || [];
        document.querySelectorAll('[data-symbol][class*="watchlist-btn"]').forEach(btn => {
            const sym = btn.dataset.symbol;
            if (!sym) return;
            const inList = list.includes(sym);
            btn.classList.toggle('wl-active', inList);
            btn.title = inList ? 'Remove from Watchlist' : 'Add to Watchlist';
        });
        document.querySelectorAll('.pane-watchlist-btn[data-chart-id]').forEach(btn => {
            const chartId = btn.dataset.chartId;
            const charts = deps.getChartStates();
            const cd = charts && charts[chartId];
            const sym = cd && cd.symbol;
            if (!sym || sym === 'none') return;
            const inList = list.includes(sym);
            btn.classList.toggle('wl-active', inList);
            btn.title = inList ? 'Remove from Watchlist' : 'Add to Watchlist';
        });
    }

    function initWatchlistPanel() {
        const panel  = document.getElementById('watchlist-panel');
        const toggleBtn = document.getElementById('watchlist-toggle-btn');
        const closeBtn  = document.getElementById('watchlist-close-btn');
        const bellBtn   = document.getElementById('notif-bell-btn');
        if (!panel || !toggleBtn) return;

        const savedOpen = deps.StorageService.getWatchlistOpen();
        if (savedOpen) openWatchlist();

        toggleBtn.addEventListener('click', () => {
            if (deps.watchlistState.open) closeWatchlist();
            else openWatchlist();
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', closeWatchlist);
        }

        if (bellBtn) {
            bellBtn.addEventListener('click', () => {
                if (deps.onOpenAlerts) deps.onOpenAlerts();
            });
        }

        const addInput    = document.getElementById('watchlist-add-input');
        const searchDrop  = document.getElementById('wl-search-dropdown');
        let wlHighlight   = -1;

        const addSymbolToWatchlist = (symbol) => {
            const sym = symbol.trim().toUpperCase();
            if (!sym) return;
            if (!deps.watchlistState.symbolsList.includes(sym)) {
                deps.watchlistState.symbolsList.push(sym);
                saveWatchlistToStorage(deps.watchlistState.symbolsList);
                refreshWatchlistFromCharts();
                syncAllWatchlistBtns();
            }
            addInput.value = '';
            searchDrop.innerHTML = '';
            searchDrop.classList.remove('show');
            wlHighlight = -1;
        };

        const renderWlOptions = (filter) => {
            const instruments = deps.getInstruments();
            if (!instruments || instruments.length === 0) return;
            const q = filter.toLowerCase();
            const results = instruments.filter(item =>
                item.symbol.toLowerCase().includes(q) ||
                (item.name && item.name.toLowerCase().includes(q))
            ).slice(0, 40);

            if (results.length === 0) {
                searchDrop.innerHTML = `<div class="wl-search-no-results">No matches for "${filter}"</div>`;
            } else {
                searchDrop.innerHTML = results.map(item => `
                    <div class="wl-search-option" data-symbol="${item.symbol}">
                        <span class="wl-search-option-symbol">${item.symbol}</span>
                        <span class="wl-search-option-name">${item.name || 'USDT Perp'}</span>
                        <button class="wl-search-option-add" data-symbol="${item.symbol}" tabindex="-1">+ Add</button>
                    </div>
                `).join('');
            }
            wlHighlight = -1;

            searchDrop.querySelectorAll('.wl-search-option').forEach(opt => {
                opt.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    const sym = opt.dataset.symbol;
                    if (sym) addSymbolToWatchlist(sym);
                });
            });
            searchDrop.querySelectorAll('.wl-search-option-add').forEach(btn => {
                btn.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const sym = btn.dataset.symbol;
                    if (sym) addSymbolToWatchlist(sym);
                });
            });
        };

        if (addInput) {
            addInput.addEventListener('input', () => {
                const q = addInput.value.trim();
                if (q.length > 0) {
                    renderWlOptions(q);
                    searchDrop.classList.add('show');
                } else {
                    searchDrop.innerHTML = '';
                    searchDrop.classList.remove('show');
                    wlHighlight = -1;
                }
            });

            addInput.addEventListener('focus', () => {
                if (addInput.value.trim().length > 0) {
                    searchDrop.classList.add('show');
                }
            });

            addInput.addEventListener('blur', () => {
                setTimeout(() => {
                    searchDrop.classList.remove('show');
                }, 150);
            });

            addInput.addEventListener('keydown', (e) => {
                const opts = searchDrop.querySelectorAll('.wl-search-option');
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    wlHighlight = Math.min(wlHighlight + 1, opts.length - 1);
                    opts.forEach((o, i) => o.classList.toggle('highlighted', i === wlHighlight));
                    if (opts[wlHighlight]) opts[wlHighlight].scrollIntoView({ block: 'nearest' });
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    wlHighlight = Math.max(wlHighlight - 1, 0);
                    opts.forEach((o, i) => o.classList.toggle('highlighted', i === wlHighlight));
                    if (opts[wlHighlight]) opts[wlHighlight].scrollIntoView({ block: 'nearest' });
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (wlHighlight >= 0 && opts[wlHighlight]) {
                        addSymbolToWatchlist(opts[wlHighlight].dataset.symbol);
                    } else if (addInput.value.trim()) {
                        addSymbolToWatchlist(addInput.value);
                    }
                } else if (e.key === 'Escape') {
                    searchDrop.classList.remove('show');
                    addInput.blur();
                }
            });
        }

        setTimeout(refreshWatchlistFromCharts, 1500);
    }

    function openWatchlist() {
        const panel = document.getElementById('watchlist-panel');
        const btn   = document.getElementById('watchlist-toggle-btn');
        if (!panel || !btn) return;

        panel.classList.add('open');
        btn.classList.add('active');
        deps.watchlistState.open = true;
        deps.StorageService.saveWatchlistOpen(true);
    }

    function closeWatchlist() {
        const panel = document.getElementById('watchlist-panel');
        const btn   = document.getElementById('watchlist-toggle-btn');
        if (!panel || !btn) return;

        panel.classList.remove('open');
        btn.classList.remove('active');
        deps.watchlistState.open = false;
        deps.StorageService.saveWatchlistOpen(false);
    }

    function updateWatchlistFromMarketCache() {
        const cache = deps.getMarketCache();
        if (!cache || !deps.watchlistState || !deps.watchlistState.symbols) return;
        
        Object.keys(deps.watchlistState.symbols).forEach(symbol => {
            const entry = deps.watchlistState.symbols[symbol];
            if (!entry || !entry.el) return;
            
            const cached = cache[symbol];
            if (cached) {
                const prevPrice = entry.price;
                entry.price = cached.price;
                entry.change24h = cached.change;
                
                updateWatchlistRowPrice(symbol, cached.price, prevPrice, true);
                
                const el = entry.el;
                const chEl = el.querySelector('.wl-change');
                if (chEl) {
                    const sign = cached.change >= 0 ? '+' : '';
                    chEl.textContent = `${sign}${cached.change.toFixed(2)}%`;
                    chEl.className = `wl-change ${cached.change >= 0 ? 'up' : 'down'}`;
                }
            }
        });
    }

    function refreshWatchlistFromCharts() {
        const charts = deps.getChartStates();
        if (!charts) return;

        const body = document.getElementById('watchlist-body');
        if (!body) return;
        body.innerHTML = '';

        const symbols = deps.watchlistState.symbolsList;
        if (!symbols || symbols.length === 0) {
            body.innerHTML = `
                <div class="watchlist-empty">
                    <p>Watchlist is empty</p>
                </div>
            `;
            return;
        }

        symbols.forEach(symbol => {
            const row = createWatchlistRow(symbol);
            body.appendChild(row);
            deps.watchlistState.symbols[symbol] = deps.watchlistState.symbols[symbol] || { price: null, change24h: null };
            deps.watchlistState.symbols[symbol].el = row;
        });

        const cache = deps.getMarketCache();
        symbols.forEach(symbol => {
            const entry = deps.watchlistState.symbols[symbol];
            
            if (cache && cache[symbol]) {
                const cached = cache[symbol];
                entry.price = cached.price;
                entry.change24h = cached.change;
                updateWatchlistRowPrice(symbol, cached.price, null, false);
                
                const el = entry.el;
                if (el) {
                    const chEl = el.querySelector('.wl-change');
                    if (chEl) {
                        const sign = cached.change >= 0 ? '+' : '';
                        chEl.textContent = `${sign}${cached.change.toFixed(2)}%`;
                        chEl.className = `wl-change ${cached.change >= 0 ? 'up' : 'down'}`;
                    }
                }
            } else {
                const matchingChart = Object.values(charts).find(cd => cd.symbol === symbol);
                if (matchingChart) {
                    if (matchingChart.lastPrice !== null && matchingChart.lastPrice !== undefined) {
                        entry.price = matchingChart.lastPrice;
                        updateWatchlistRowPrice(symbol, matchingChart.lastPrice, null, false);
                    }
                    if (matchingChart.cachedData && matchingChart.cachedData.length > 0) {
                        const opens = matchingChart.cachedData.find(c => {
                            const now = matchingChart.cachedData[matchingChart.cachedData.length - 1].time;
                            return Math.abs(c.time - (now - 86400)) < 3600;
                        });
                        if (opens && matchingChart.lastPrice) {
                            const change = ((matchingChart.lastPrice - opens.close) / opens.close) * 100;
                            entry.change24h = change;
                            const el = entry.el;
                            if (el) {
                                const chEl = el.querySelector('.wl-change');
                                if (chEl) {
                                    const sign = change >= 0 ? '+' : '';
                                    chEl.textContent = `${sign}${change.toFixed(2)}%`;
                                    chEl.className = `wl-change ${change >= 0 ? 'up' : 'down'}`;
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    function createWatchlistRow(symbol) {
        const row = document.createElement('div');
        row.className = 'watchlist-row';
        row.dataset.symbol = symbol;
        row.setAttribute('title', `Load ${symbol}`);

        const iconHtml = deps.getIconHtml ? deps.getIconHtml(symbol) : '';

        row.innerHTML = `
            <div class="wl-left">
                ${iconHtml}
                <div class="wl-symbol-details">
                    <span class="wl-symbol">${symbol}</span>
                    <span class="wl-name">USDT Perp</span>
                </div>
            </div>
            <div class="wl-right">
                <span class="wl-price" id="wl-price-${symbol}">—</span>
                <span class="wl-change" id="wl-change-${symbol}">—</span>
                <button class="wl-remove-btn" title="Remove from Watchlist">&times;</button>
            </div>
        `;

        row.addEventListener('click', () => {
            const activeId = deps.getActiveChartId();
            if (activeId) {
                deps.onSelectSymbol(activeId, symbol);
            } else {
                const charts = deps.getChartStates();
                if (charts) {
                    const firstId = Object.keys(charts)[0];
                    if (firstId) deps.onSelectSymbol(firstId, symbol);
                }
            }

            document.querySelectorAll('.watchlist-row').forEach(r => r.classList.remove('active-wl'));
            row.classList.add('active-wl');
        });

        const removeBtn = row.querySelector('.wl-remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deps.watchlistState.symbolsList = deps.watchlistState.symbolsList.filter(s => s !== symbol);
                saveWatchlistToStorage(deps.watchlistState.symbolsList);
                delete deps.watchlistState.symbols[symbol];
                refreshWatchlistFromCharts();
                syncAllWatchlistBtns();
            });
        }

        return row;
    }

    function updateWatchlistRowPrice(symbol, price, prevPrice = null, doFlash = true) {
        const entry = deps.watchlistState.symbols[symbol];
        if (!entry || !entry.el) return;

        const priceEl = entry.el.querySelector('.wl-price');
        if (!priceEl) return;

        const fmt = price < 1 ? price.toFixed(4) : price < 1000 ? price.toFixed(2) : price.toFixed(0);
        priceEl.textContent = fmt;

        if (doFlash && prevPrice !== null) {
            const dir = price >= prevPrice ? 'up' : 'down';
            priceEl.classList.remove('flash-up', 'flash-down');
            void priceEl.offsetWidth; // reflow
            priceEl.classList.add(`flash-${dir}`);
        }
    }

    return {
        initialize,
        toggleWatchlistSymbol,
        syncAllWatchlistBtns,
        openWatchlist,
        closeWatchlist,
        updateWatchlistFromMarketCache,
        refreshWatchlistFromCharts,
        updateWatchlistRowPrice
    };
})();

window.PaperTrading = class PaperTrading {
    constructor() {
        this.account = new window.PaperAccount();
        this.positions = new window.PaperPositions();
        this.history = new window.PaperHistory();
        this.currentPrices = {};
        this.activeSymbol = 'BTC';
        this.container = null;
        this.activeTPSLIds = new Set();
        this.historyFilters = null;
        this.currentReplayTrade = null;
        this.replayMarkers = null;
        this.replayPriceLines = [];
        this.startLabelSyncLoop();
    }
    
    formatPrice(p) {
        if (!p) return "0.00";
        const absP = Math.abs(p);
        if (absP < 0.000001) return p.toPrecision(4);
        if (absP < 0.0001) return p.toFixed(8);
        if (absP < 0.01) return p.toFixed(6);
        if (absP < 1) return p.toFixed(4);
        return p.toFixed(2);
    }

    formatOHM(p) {
        return p.toFixed(4);
    }

    formatDate(timestamp) {
        if (!timestamp) return '--';
        return new Date(timestamp * 1000).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            year: "2-digit", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: false
        });
    }

    getAvailableBalance() {
        let usedMargin = 0;
        let openPnL = 0;
        this.positions.positions.forEach(pos => {
            usedMargin += (pos.entryPrice * pos.qty);
            const currentPrice = this.currentPrices[pos.symbol] || pos.entryPrice;
            openPnL += this.calculatePnL(pos, currentPrice);
        });
        return this.account.balance + openPnL - usedMargin;
    }

    setActiveSymbol(symbol) {
        if (symbol === 'none' || symbol === 'No Chart') return;
        this.activeSymbol = symbol;
        const priceInput = document.getElementById('pt-price');
        
        const price = this.currentPrices[symbol];
        if (priceInput && price) {
            if (document.getElementById('pt-order-type').value === 'Market') {
                priceInput.value = this.formatPrice(price);
            }
        }
    }

    updatePrice(symbol, price, time) {
        this.currentPrices[symbol] = price;
        
        if (symbol === this.activeSymbol) {
            const priceInput = document.getElementById('pt-price');
            if (priceInput && document.getElementById('pt-order-type').value === 'Market') {
                priceInput.value = this.formatPrice(price);
            }
        }

        // Process pending orders and auto-TPSL
        const executed = this.positions.checkLimits(symbol, price, time);
        const hitTPSL = this.positions.checkTPSL(symbol, price, time);

        if (executed.length > 0 || hitTPSL.length > 0) {
            hitTPSL.forEach(pos => {
                pos.pnl = this.calculatePnL(pos, pos.exitPrice);
                this.account.addPnL(pos.pnl);
                this.history.addTrade(pos);
            });

            if (window.refreshChartMarkers) window.refreshChartMarkers();
            this.renderPositions();
            this.renderHistory();
            this.renderStats();
        }

        this.updateLivePnL();
    }

    calculatePnL(pos, currentPrice) {
        const diff = pos.direction === 'Long' ? (currentPrice - pos.entryPrice) : (pos.entryPrice - currentPrice);
        return diff * pos.qty;
    }

    updateLivePnL() {
        let totalOpenPnL = 0;
        let usedMargin = 0;
        
        this.positions.positions.forEach(pos => {
            const currentPrice = this.currentPrices[pos.symbol];
            if (currentPrice) {
                const pnl = this.calculatePnL(pos, currentPrice);
                totalOpenPnL += pnl;
                usedMargin += (pos.entryPrice * pos.qty);

                const pnlEl = document.getElementById(`pt-pos-pnl-${pos.id}`);
                if (pnlEl) {
                    pnlEl.textContent = `${pnl >= 0 ? '+' : ''}${this.formatOHM(pnl)} OHM`;
                    pnlEl.className = pnl >= 0 ? 'pt-green' : 'pt-red';
                }
                const priceEl = document.getElementById(`pt-pos-price-${pos.id}`);
                if (priceEl) priceEl.textContent = this.formatPrice(currentPrice);
            } else {
                usedMargin += (pos.entryPrice * pos.qty);
            }
        });

        const equity = this.account.balance + totalOpenPnL;
        const available = equity - usedMargin;
        
        const openPnlEl = document.getElementById('pt-open-pnl');
        if (openPnlEl) {
            openPnlEl.textContent = `${totalOpenPnL >= 0 ? '+' : ''}${this.formatOHM(totalOpenPnL)} OHM`;
            openPnlEl.className = `pt-value ${totalOpenPnL >= 0 ? 'pt-green' : 'pt-red'}`;
        }

        const pnlBox = document.getElementById('pt-pnl-box');
        if (pnlBox) {
            pnlBox.style.display = this.positions.positions.length > 0 ? 'flex' : 'none';
        }
        
        const availableEl = document.getElementById('pt-available');
        if (availableEl) {
            availableEl.textContent = `${this.formatOHM(available)} OHM`;
            availableEl.className = `pt-value ${available >= 0 ? '' : 'pt-red'}`;
        }
    }

    setQtyPercent(pct) {
        const type = document.getElementById('pt-order-type').value;
        const priceInput = document.getElementById('pt-price');
        let price = parseFloat(priceInput.value);
        
        if (type === 'Market' || isNaN(price) || price <= 0) {
            price = this.currentPrices[this.activeSymbol];
        }
        
        if (!price || price <= 0) return alert('Waiting for price data...');
        
        const available = this.getAvailableBalance();
        if (available <= 0) return;
        
        const costToUse = available * pct;
        let qty = costToUse / price;
        qty = Math.floor(qty * 1000000) / 1000000; // Cap at 6 decimal places safely
        
        const qtyInput = document.getElementById('pt-qty');
        if (qtyInput) qtyInput.value = qty;
    }

    buildUI(container) {
        this.container = container;
        container.innerHTML = `
            <div class="pt-container">
                <!-- Replay Panel (Hidden by default) -->
                <div id="pt-replay-panel" style="display: none; background: #151b23; border: 1px solid #3b82f6; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #394654; padding-bottom: 8px; margin-bottom: 8px;">
                        <span style="color: #3b82f6; font-weight: bold; font-size: 13px;">TRADE REPLAY ACTIVE</span>
                        <button class="pt-close-btn" id="pt-exit-replay-btn" style="background: #ef4444; color: white;">Exit Replay</button>
                    </div>
                    <div class="pt-stats-grid" id="pt-replay-stats"></div>
                </div>

                <!-- Account Summary -->
                <div class="pt-header">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <div class="pt-title" style="margin-bottom: 0;">OHM Paper Account</div>
                        <button class="pt-close-btn" id="pt-reset-btn" title="Reset Account to 100,000 OHM">🔄 Reset</button>
                    </div>
                    <div class="pt-stats-grid">
                        <div class="pt-stat-box"><span class="pt-label">Available Balance</span><span class="pt-value" id="pt-available">--</span></div>
                        <div class="pt-stat-box" id="pt-pnl-box" style="display: none;"><span class="pt-label">Open PnL</span><span class="pt-value" id="pt-open-pnl">--</span></div>
                    </div>
                </div>

                <!-- Order Entry -->
                <div class="pt-section">
                    <div class="pt-title">Order Entry</div>
                    <div class="pt-stats-grid">
                        <div class="pt-form-group">
                            <label class="pt-label">Type</label>
                            <select class="pt-input" id="pt-order-type">
                                <option value="Market">Market</option>
                                <option value="Limit">Limit</option>
                            </select>
                        </div>
                        <div class="pt-form-group">
                            <label class="pt-label">Price</label>
                            <input type="number" class="pt-input" id="pt-price" step="any" min="0" value="${this.currentPrices[this.activeSymbol] ? this.formatPrice(this.currentPrices[this.activeSymbol]) : ''}" readonly style="opacity: 0.5; cursor: not-allowed;">
                        </div>
                    </div>
                    <div class="pt-form-group">
                        <label class="pt-label">Quantity</label>
                        <input type="number" class="pt-input" id="pt-qty" placeholder="0.00" step="any" min="0">
                        <div style="display: flex; gap: 6px; margin-top: 6px;">
                            <button class="pt-close-btn" style="flex: 1;" onclick="window.paperTrading.setQtyPercent(0.25)">25%</button>
                            <button class="pt-close-btn" style="flex: 1;" onclick="window.paperTrading.setQtyPercent(0.50)">50%</button>
                            <button class="pt-close-btn" style="flex: 1;" onclick="window.paperTrading.setQtyPercent(0.75)">75%</button>
                            <button class="pt-close-btn" style="flex: 1;" onclick="window.paperTrading.setQtyPercent(1.00)">MAX</button>
                        </div>
                    </div>
                    <div class="pt-stats-grid">
                        <div class="pt-form-group">
                            <label class="pt-label">Take Profit</label>
                            <input type="number" class="pt-input" id="pt-tp" placeholder="Optional" step="any" min="0">
                        </div>
                        <div class="pt-form-group">
                            <label class="pt-label">Stop Loss</label>
                            <input type="number" class="pt-input" id="pt-sl" placeholder="Optional" step="any" min="0">
                        </div>
                    </div>
                    <div class="pt-btn-group">
                        <button class="pt-btn pt-buy-btn" id="pt-buy-btn">BUY / LONG</button>
                        <button class="pt-btn pt-sell-btn" id="pt-sell-btn">SELL / SHORT</button>
                    </div>
                </div>

                <!-- Pending Orders -->
                <div class="pt-section" id="pt-orders-section" style="display: none;">
                    <div class="pt-title">Pending Orders</div>
                    <div id="pt-orders-list"></div>
                </div>

                <!-- Open Positions -->
                <div class="pt-section">
                    <div class="pt-title">Open Positions</div>
                    <div id="pt-positions-list"></div>
                </div>

                <!-- Trade History -->
                <div class="pt-section">
                    <div class="pt-collapsible-header" id="pt-history-toggle">
                        <span>Trade History</span>
                        <span id="pt-history-icon">▼</span>
                    </div>
                    <div class="pt-collapsible-content" id="pt-history-content">
                        <div id="pt-history-list"></div>
                    </div>
                </div>

                <!-- Journal Analytics -->
                <div class="pt-section">
                    <div class="pt-collapsible-header" id="pt-journal-analytics-toggle">
                        <span>Journal Analytics</span>
                        <span id="pt-journal-analytics-icon">▼</span>
                    </div>
                    <div class="pt-collapsible-content" id="pt-journal-analytics-content">
                        <!-- Filters -->
                        <div style="margin-bottom: 12px; display: flex; flex-direction: column; gap: 6px;">
                            <label class="pt-label">History Filters</label>
                            <div style="display: flex; gap: 4px;">
                                <select id="pt-filter-symbol" class="pt-input" style="padding: 4px; font-size: 11px; flex: 1;"><option value="">All Symbols</option></select>
                                <select id="pt-filter-tag" class="pt-input" style="padding: 4px; font-size: 11px; flex: 1;"><option value="">All Tags</option></select>
                            </div>
                            <div style="display: flex; gap: 4px;">
                                <select id="pt-filter-direction" class="pt-input" style="padding: 4px; font-size: 11px; flex: 1;">
                                    <option value="">All Sides</option>
                                    <option value="Long">Long</option>
                                    <option value="Short">Short</option>
                                </select>
                                <select id="pt-filter-pnl" class="pt-input" style="padding: 4px; font-size: 11px; flex: 1;">
                                    <option value="">All PnL</option>
                                    <option value="profit">Profits</option>
                                    <option value="loss">Losses</option>
                                </select>
                            </div>
                            <div style="display: flex; gap: 4px;">
                                <select id="pt-filter-rating" class="pt-input" style="padding: 4px; font-size: 11px; flex: 2;">
                                    <option value="">All Ratings</option>
                                    <option value="5">★★★★★</option>
                                    <option value="4">★★★★☆</option>
                                    <option value="3">★★★☆☆</option>
                                    <option value="2">★★☆☆☆</option>
                                    <option value="1">★☆☆☆☆</option>
                                </select>
                                <button class="pt-close-btn" id="pt-apply-filters-btn" style="flex: 1; background: #3b82f6; color: white;">Apply</button>
                                <button class="pt-close-btn" id="pt-clear-filters-btn" style="flex: 1;">Clear</button>
                            </div>
                        </div>
                        <div id="pt-journal-stats"></div>
                    </div>
                </div>

                <!-- Account Analytics -->
                <div class="pt-section">
                    <div class="pt-collapsible-header" id="pt-analytics-toggle">
                        <span>Account Analytics</span>
                        <span id="pt-analytics-icon">▼</span>
                    </div>
                    <div class="pt-collapsible-content" id="pt-analytics-content">
                        <div style="font-size: 11px; color: #8b9bb0; margin-bottom: 4px; text-transform: uppercase; font-weight: 700;">OHM Equity Curve</div>
                        <div id="pt-equity-chart" style="height: 160px; width: 100%; margin-bottom: 16px; border: 1px solid rgba(57, 70, 84, 0.5); border-radius: 4px; overflow: hidden;"></div>
                        
                        <div style="font-size: 11px; color: #8b9bb0; margin-bottom: 4px; text-transform: uppercase; font-weight: 700;">Daily OHM PnL</div>
                        <div id="pt-daily-pnl-chart" style="height: 120px; width: 100%; margin-bottom: 16px; border: 1px solid rgba(57, 70, 84, 0.5); border-radius: 4px; overflow: hidden;"></div>
                        
                        <div class="pt-stats-grid" id="pt-analytics-stats"></div>
                        <div id="pt-stats-content" style="display: none;"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Bind Event Listeners
        document.getElementById('pt-order-type').addEventListener('change', (e) => {
            const priceInput = document.getElementById('pt-price');
            if (e.target.value === 'Market') {
                priceInput.readOnly = true;
                priceInput.style.opacity = '0.5';
                priceInput.style.cursor = 'not-allowed';
                if (this.currentPrices[this.activeSymbol]) priceInput.value = this.formatPrice(this.currentPrices[this.activeSymbol]);
            } else {
                priceInput.readOnly = false;
                priceInput.style.opacity = '1';
                priceInput.style.cursor = 'text';
            }
        });

        document.getElementById('pt-buy-btn').addEventListener('click', () => this.executeOrder('Long'));
        document.getElementById('pt-sell-btn').addEventListener('click', () => this.executeOrder('Short'));

        document.getElementById('pt-history-toggle').addEventListener('click', () => {
            const content = document.getElementById('pt-history-content');
            const icon = document.getElementById('pt-history-icon');
            if (content.classList.contains('open')) {
                content.classList.remove('open');
                icon.textContent = '▼';
            } else {
                content.classList.add('open');
                icon.textContent = '▲';
            }
        });
        
        document.getElementById('pt-journal-analytics-toggle').addEventListener('click', () => {
            const content = document.getElementById('pt-journal-analytics-content');
            const icon = document.getElementById('pt-journal-analytics-icon');
            if (content.classList.contains('open')) {
                content.classList.remove('open');
                icon.textContent = '▼';
            } else {
                content.classList.add('open');
                icon.textContent = '▲';
                this.renderJournalAnalytics();
            }
        });

        document.getElementById('pt-apply-filters-btn').addEventListener('click', () => {
            this.historyFilters = {
                symbol: document.getElementById('pt-filter-symbol').value,
                tag: document.getElementById('pt-filter-tag').value,
                rating: document.getElementById('pt-filter-rating').value,
                direction: document.getElementById('pt-filter-direction').value,
                pnl: document.getElementById('pt-filter-pnl').value
            };
            this.renderHistory();
        });

        document.getElementById('pt-clear-filters-btn').addEventListener('click', () => {
            document.getElementById('pt-filter-symbol').value = '';
            document.getElementById('pt-filter-tag').value = '';
            document.getElementById('pt-filter-rating').value = '';
            document.getElementById('pt-filter-direction').value = '';
            document.getElementById('pt-filter-pnl').value = '';
            this.historyFilters = null;
            this.renderHistory();
        });

        const exitReplayBtn = document.getElementById('pt-exit-replay-btn');
        if (exitReplayBtn) exitReplayBtn.addEventListener('click', () => this.exitReplay());

        document.getElementById('pt-analytics-toggle').addEventListener('click', () => {
            const content = document.getElementById('pt-analytics-content');
            const icon = document.getElementById('pt-analytics-icon');
            if (content.classList.contains('open')) {
                content.classList.remove('open');
                icon.textContent = '▼';
            } else {
                content.classList.add('open');
                icon.textContent = '▲';
                if (this.equityChart) this.equityChart.timeScale().fitContent();
                if (this.dailyPnlChart) this.dailyPnlChart.timeScale().fitContent();
            }
        });

        document.getElementById('pt-reset-btn').addEventListener('click', () => {
            if(confirm('Reset paper account to 100,000 OHM? All positions and history will be cleared.')) {
                this.account.balance = 100000;
                this.account.save();
                this.positions.positions = [];
                this.positions.orders = [];
                this.positions.save();
                this.history.trades = [];
                this.history.save();
                if (window.refreshChartMarkers) window.refreshChartMarkers();
                this.renderPositions();
                this.renderHistory();
                this.renderStats();
                this.updateLivePnL();
            }
        });

        this.initAnalyticsCharts();
        this.renderPositions();
        this.renderHistory();
        this.renderStats();
        this.updateLivePnL();
    }

    initAnalyticsCharts() {
        const isLight = document.body.classList.contains('light-theme');
        const textColor = isLight ? "#0f172a" : "#d8dee8";
        const gridColor = isLight ? "#f1f5f9" : "#26313d";
        const borderColor = isLight ? "#cbd5e1" : "#394654";

        const commonOptions = {
            autoSize: true,
            layout: { background: { type: 'solid', color: 'transparent' }, textColor: textColor, fontSize: 10 },
            grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
            timeScale: { timeVisible: true, borderVisible: false, borderColor: borderColor },
            rightPriceScale: { borderVisible: false },
            handleScroll: false,
            handleScale: false,
            crosshair: { horzLine: { visible: false }, vertLine: { visible: false } }
        };

        const eqContainer = document.getElementById('pt-equity-chart');
        if (eqContainer) {
            this.equityChart = LightweightCharts.createChart(eqContainer, commonOptions);
            this.equitySeries = this.equityChart.addLineSeries({
                color: '#10b981', lineWidth: 2, crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false
            });
        }

        const dpContainer = document.getElementById('pt-daily-pnl-chart');
        if (dpContainer) {
            this.dailyPnlChart = LightweightCharts.createChart(dpContainer, commonOptions);
            this.dailyPnlSeries = this.dailyPnlChart.addHistogramSeries({
                priceLineVisible: false, lastValueVisible: false
            });
        }
    }

    executeOrder(direction) {
        const symbol = this.activeSymbol;
        const type = document.getElementById('pt-order-type').value;
        const qty = parseFloat(document.getElementById('pt-qty').value);
        const priceInput = parseFloat(document.getElementById('pt-price').value);
        const tp = parseFloat(document.getElementById('pt-tp').value) || null;
        const sl = parseFloat(document.getElementById('pt-sl').value) || null;

        if (!qty || qty <= 0) return alert('Enter a valid quantity.');
        const time = Date.now() / 1000;

        if (type === 'Market') {
            const currentPrice = this.currentPrices[symbol];
            if (!currentPrice) return alert('Waiting for price data...');
            
            const cost = currentPrice * qty;
            const available = this.getAvailableBalance();
            if (cost > available * 1.0001) return alert(`Insufficient Available Balance.\nRequired: ${this.formatOHM(cost)} OHM\nAvailable: ${this.formatOHM(available)} OHM`);
            
            this.positions.openPosition(symbol, direction, currentPrice, qty, tp, sl, time);
            if (window.refreshChartMarkers) window.refreshChartMarkers();
        } else {
            if (!priceInput || priceInput <= 0) return alert('Enter a valid limit price.');
            
            const cost = priceInput * qty;
            const available = this.getAvailableBalance();
            if (cost > available * 1.0001) return alert(`Insufficient Available Balance.\nRequired: ${this.formatOHM(cost)} OHM\nAvailable: ${this.formatOHM(available)} OHM`);
            
            this.positions.addOrder(symbol, direction, type, priceInput, qty, tp, sl, time);
            if (window.refreshChartMarkers) window.refreshChartMarkers();
        }
        this.renderPositions();
    }

    closePosition(id) {
        const pos = this.positions.removePosition(id);
        if (!pos) return;
        const currentPrice = this.currentPrices[pos.symbol] || pos.entryPrice;
        pos.exitPrice = currentPrice;
        pos.exitTime = Date.now() / 1000;
        pos.pnl = this.calculatePnL(pos, currentPrice);
        pos.closeReason = 'Manual';
        this.activeTPSLIds.delete(id);
        
        this.account.addPnL(pos.pnl);
        this.history.addTrade(pos);
        
        if (window.refreshChartMarkers) window.refreshChartMarkers();
        this.renderPositions();
        this.renderHistory();
        this.renderStats();
    }

    toggleTPSL(id, btn) {
        const row = document.getElementById(`pt-tpsl-row-${id}`);
        if (row) {
            if (row.style.display === 'none') {
                row.style.display = 'table-row';
                if (btn) btn.textContent = '▲';
            } else {
                row.style.display = 'none';
                if (btn) btn.textContent = '▼';
            }
        }
    }

    toggleHistoryDetails(id, btn) {
        const row = document.getElementById(`pt-history-details-${id}`);
        if (row) {
            if (row.style.display === 'none') {
                row.style.display = 'table-row';
                if (btn) btn.textContent = '▲';
            } else {
                row.style.display = 'none';
                if (btn) btn.textContent = '▼';
            }
        }
    }

    saveTPSL(id) {
        let isOrder = false;
        let pos = this.positions.positions.find(p => p.id === id);
        if (!pos) {
            pos = this.positions.orders.find(o => o.id === id);
            if (!pos) return;
            isOrder = true;
        }
        const tpInput = document.getElementById(`pt-edit-tp-${id}`);
        const slInput = document.getElementById(`pt-edit-sl-${id}`);
        if (tpInput) pos.tp = parseFloat(tpInput.value) || null;
        if (slInput) pos.sl = parseFloat(slInput.value) || null;
        this.positions.save();
        this.renderPositions(); // Refresh table to display new values
        if (window.refreshChartMarkers) window.refreshChartMarkers();
    }

    cancelOrder(id) {
        const idx = this.positions.orders.findIndex(o => o.id === id);
        if (idx > -1) {
            this.positions.orders.splice(idx, 1);
            this.positions.save();
            this.renderPositions();
            if (window.refreshChartMarkers) window.refreshChartMarkers();
        }
    }

    renderPositions() {
        const container = document.getElementById('pt-positions-list');
        if (container) {
            if (this.positions.positions.length === 0) {
                container.innerHTML = '<div class="pt-label" style="text-align: center; margin-top: 10px;">No Open Positions</div>';
            } else {
                let html = '<table class="pt-table"><tr><th>Sym</th><th>Side</th><th>Qty</th><th>Entry</th><th>Live</th><th>PnL</th><th>TP/SL</th><th></th></tr>';
                this.positions.positions.forEach(pos => {
                    const isLong = pos.direction === 'Long';
                    html += `<tr>
                        <td>${pos.symbol}</td>
                        <td style="color: ${isLong ? '#10b981' : '#ef4444'}">${pos.direction}</td>
                        <td>${pos.qty}</td>
                        <td>${this.formatPrice(pos.entryPrice)}</td>
                        <td id="pt-pos-price-${pos.id}">--</td>
                        <td id="pt-pos-pnl-${pos.id}">--</td>
                        <td style="font-size: 10px;">
                            <span class="pt-green">${pos.tp ? this.formatPrice(pos.tp) : '-'}</span> / 
                            <span class="pt-red">${pos.sl ? this.formatPrice(pos.sl) : '-'}</span>
                        </td>
                        <td style="display: flex; gap: 4px;">
                            <button class="pt-close-btn" onclick="window.paperTrading.toggleTPSL('${pos.id}', this)" title="Edit TP/SL">▼</button>
                            <button class="pt-close-btn" onclick="window.paperTrading.closePosition('${pos.id}')" title="Close Position">X</button>
                        </td>
                    </tr>
                    <tr id="pt-tpsl-row-${pos.id}" style="display: none;">
                        <td colspan="8" style="padding: 8px 4px; border-bottom: 1px dashed #394654;">
                            <div style="display: flex; gap: 8px; align-items: flex-end;">
                                <div style="flex: 1;">
                                    <label class="pt-label">Take Profit</label>
                                    <input type="number" class="pt-input" id="pt-edit-tp-${pos.id}" value="${pos.tp || ''}" step="any" min="0">
                                </div>
                                <div style="flex: 1;">
                                    <label class="pt-label">Stop Loss</label>
                                    <input type="number" class="pt-input" id="pt-edit-sl-${pos.id}" value="${pos.sl || ''}" step="any" min="0">
                                </div>
                                <button class="pt-close-btn" style="padding: 8px; background: #10b981; color: white;" onclick="window.paperTrading.saveTPSL('${pos.id}')">SAVE</button>
                            </div>
                        </td>
                    </tr>`;
                });
                html += '</table>';
                container.innerHTML = html;
            }
        }

        const ordersSection = document.getElementById('pt-orders-section');
        const ordersContainer = document.getElementById('pt-orders-list');
        if (ordersSection && ordersContainer) {
            if (this.positions.orders.length === 0) {
                ordersSection.style.display = 'none';
                ordersContainer.innerHTML = '';
            } else {
                ordersSection.style.display = 'block';
                let html = '<table class="pt-table"><tr><th>Sym</th><th>Side</th><th>Qty</th><th>Price</th><th>TP/SL</th><th></th></tr>';
                this.positions.orders.forEach(order => {
                    const isLong = order.direction === 'Long';
                    html += `<tr>
                        <td>${order.symbol}</td>
                        <td style="color: ${isLong ? '#10b981' : '#ef4444'}">${order.direction}</td>
                        <td>${order.qty}</td>
                        <td>${this.formatPrice(order.price)}</td>
                        <td style="font-size: 10px;">
                            <span class="pt-green">${order.tp ? this.formatPrice(order.tp) : '-'}</span> / 
                            <span class="pt-red">${order.sl ? this.formatPrice(order.sl) : '-'}</span>
                        </td>
                        <td style="display: flex; gap: 4px;">
                            <button class="pt-close-btn" onclick="window.paperTrading.toggleTPSL('${order.id}', this)" title="Edit TP/SL">▼</button>
                            <button class="pt-close-btn" onclick="window.paperTrading.cancelOrder('${order.id}')" title="Cancel Order">X</button>
                        </td>
                    </tr>
                    <tr id="pt-tpsl-row-${order.id}" style="display: none;">
                        <td colspan="6" style="padding: 8px 4px; border-bottom: 1px dashed #394654;">
                            <div style="display: flex; gap: 8px; align-items: flex-end;">
                                <div style="flex: 1;">
                                    <label class="pt-label">Take Profit</label>
                                    <input type="number" class="pt-input" id="pt-edit-tp-${order.id}" value="${order.tp || ''}" step="any" min="0">
                                </div>
                                <div style="flex: 1;">
                                    <label class="pt-label">Stop Loss</label>
                                    <input type="number" class="pt-input" id="pt-edit-sl-${order.id}" value="${order.sl || ''}" step="any" min="0">
                                </div>
                                <button class="pt-close-btn" style="padding: 8px; background: #10b981; color: white;" onclick="window.paperTrading.saveTPSL('${order.id}')">SAVE</button>
                            </div>
                        </td>
                    </tr>`;
                });
                html += '</table>';
                ordersContainer.innerHTML = html;
            }
        }

        this.updateLivePnL();
    }

    renderHistory() {
        const container = document.getElementById('pt-history-list');
        if (!container) return;
        
        let filteredTrades = this.history.trades;
        if (this.historyFilters) {
            if (this.historyFilters.symbol) filteredTrades = filteredTrades.filter(t => t.symbol === this.historyFilters.symbol);
            if (this.historyFilters.direction) filteredTrades = filteredTrades.filter(t => t.direction === this.historyFilters.direction);
            if (this.historyFilters.pnl === 'profit') filteredTrades = filteredTrades.filter(t => t.pnl > 0);
            if (this.historyFilters.pnl === 'loss') filteredTrades = filteredTrades.filter(t => t.pnl <= 0);
            if (this.historyFilters.tag) {
                const searchTag = this.historyFilters.tag.toLowerCase();
                filteredTrades = filteredTrades.filter(t => t.tags && t.tags.some(tag => tag.toLowerCase() === searchTag || ('#' + tag.toLowerCase()) === searchTag));
            }
            if (this.historyFilters.rating) filteredTrades = filteredTrades.filter(t => t.rating === parseInt(this.historyFilters.rating));
        }

        if (filteredTrades.length === 0) {
            container.innerHTML = '<div class="pt-label" style="text-align: center; margin-top: 10px;">No Trade History found</div>';
            return;
        }
        
        let html = '<table class="pt-table"><tr><th>Sym</th><th>Side</th><th>Entry</th><th>Exit</th><th>PnL</th><th></th></tr>';
        filteredTrades.slice(0, 50).forEach(t => {
            const pnlClass = t.pnl >= 0 ? 'pt-green' : 'pt-red';
            const starString = t.rating ? '★'.repeat(t.rating) + '☆'.repeat(5 - t.rating) : 'Unrated';
            html += `<tr>
                <td style="font-size: 11px;">${t.symbol}</td>
                <td style="color: ${t.direction === 'Long' ? '#10b981' : '#ef4444'}">${t.direction}</td>
                <td>${this.formatPrice(t.entryPrice)}</td>
                <td>${this.formatPrice(t.exitPrice)}</td>
                <td class="${pnlClass}">${t.pnl >= 0 ? '+' : ''}${this.formatOHM(t.pnl)}</td>
                <td style="text-align: right; display: flex; gap: 4px; justify-content: flex-end;">
                    <button class="pt-close-btn" style="background: #3b82f6; color: white;" onclick="window.paperTrading.startReplay('${t.id}')" title="Replay Trade">▶️</button>
                    <button class="pt-close-btn" style="background: #f59e0b; color: white;" onclick="window.paperTrading.openJournal('${t.id}')" title="Trade Journal">📝</button>
                    <button class="pt-close-btn" onclick="window.paperTrading.toggleHistoryDetails('${t.id}', this)" title="Trade Details">▼</button>
                </td>
            </tr>
            <tr id="pt-history-details-${t.id}" style="display: none; background: rgba(59, 130, 246, 0.05);">
                <td colspan="6" style="padding: 8px; border-bottom: 1px dashed #394654;">
                    <div style="display: flex; justify-content: space-between; gap: 8px; margin-bottom: 8px;">
                        <div style="flex: 1;"><span class="pt-label">Opened:</span><br><span class="pt-value" style="font-size: 11px;">${this.formatDate(t.time)}</span></div>
                        <div style="flex: 1;"><span class="pt-label">Closed:</span><br><span class="pt-value" style="font-size: 11px;">${this.formatDate(t.exitTime)}</span></div>
                        <div style="flex: 1; text-align: right;"><span class="pt-label">Reason:</span><br><span class="pt-value" style="font-size: 11px;">${t.closeReason || 'Unknown'}</span></div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <div style="flex: 1;"><span class="pt-label">Rating:</span><br><span class="pt-value" style="color: #f59e0b; font-size: 14px;">${starString}</span></div>
                        <div style="flex: 2;"><span class="pt-label">Tags:</span><br><span class="pt-value" style="font-size: 11px; color: #3b82f6;">${(t.tags || []).join(', ') || 'None'}</span></div>
                    </div>
                    ${t.notes ? `<div style="margin-top: 8px;"><span class="pt-label">Notes:</span><br><span class="pt-value" style="font-size: 11px; white-space: pre-wrap;">${t.notes}</span></div>` : ''}
                </td>
            </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    }

    openJournal(tradeId) {
        const trade = this.history.trades.find(t => t.id === tradeId);
        if (!trade) return;
        
        let modal = document.getElementById("pt-journal-modal");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "pt-journal-modal";
            modal.className = "settings-modal-overlay";
            document.body.appendChild(modal);
        }
        
        const starString = (rating) => {
            return [1,2,3,4,5].map(i => `<span class="pt-star" data-val="${i}" style="color: ${i <= rating ? '#f59e0b' : '#394654'}; cursor: pointer;">★</span>`).join('');
        };
        
        modal.innerHTML = `
            <div class="settings-modal-content" style="width: 340px;">
                <h3>Trade Journal</h3>
                <div style="font-size: 12px; margin-bottom: 16px; color: #8b9bb0; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px;">
                    <span style="font-weight: bold; color: ${trade.direction === 'Long' ? '#10b981' : '#ef4444'}">${trade.direction} ${trade.symbol}</span><br>
                    Entry: ${this.formatPrice(trade.entryPrice)}<br>
                    Exit: ${this.formatPrice(trade.exitPrice)}<br>
                    PnL: <span class="${trade.pnl >= 0 ? 'pt-green' : 'pt-red'}">${trade.pnl >= 0 ? '+' : ''}${this.formatOHM(trade.pnl)} OHM</span>
                </div>
                
                <div class="settings-group" style="flex-direction: column; align-items: flex-start; margin-bottom: 16px;">
                    <label style="margin-bottom: 6px; font-weight: bold;">Execution Rating</label>
                    <div id="pt-journal-rating" style="display: flex; gap: 4px; font-size: 24px;">
                        ${starString(trade.rating || 0)}
                    </div>
                </div>
                
                <div class="settings-group" style="flex-direction: column; align-items: flex-start; margin-bottom: 16px;">
                    <label style="margin-bottom: 6px; font-weight: bold;">Tags</label>
                    <input type="text" id="pt-journal-tags" class="pt-input" placeholder="e.g. #Breakout, #FOMO" value="${(trade.tags || []).join(', ')}" style="width: 100%;">
                </div>
                
                <div class="settings-group" style="flex-direction: column; align-items: flex-start; margin-bottom: 16px;">
                    <label style="margin-bottom: 6px; font-weight: bold;">Notes</label>
                    <textarea id="pt-journal-notes" class="pt-input" style="width: 100%; height: 100px; resize: vertical;" placeholder="Why did you take this trade?">${trade.notes || ''}</textarea>
                </div>
                
                <div class="settings-actions">
                    <button id="pt-journal-cancel" class="pt-close-btn" style="padding: 8px 16px;">Cancel</button>
                    <button id="pt-journal-save" class="pt-btn pt-buy-btn" style="padding: 8px 16px; width: auto;">Save Journal</button>
                </div>
            </div>
        `;
        
        modal.style.display = "flex";
        
        let currentRating = trade.rating || 0;
        
        const stars = modal.querySelectorAll('.pt-star');
        stars.forEach(star => {
            star.onclick = (e) => {
                currentRating = parseInt(e.target.dataset.val);
                stars.forEach(s => {
                    const val = parseInt(s.dataset.val);
                    s.style.color = val <= currentRating ? '#f59e0b' : '#394654';
                });
            };
        });
        
        document.getElementById("pt-journal-cancel").onclick = () => {
            modal.style.display = "none";
        };
        
        document.getElementById("pt-journal-save").onclick = () => {
            const tagsStr = document.getElementById("pt-journal-tags").value;
            const notes = document.getElementById("pt-journal-notes").value;
            
            const tags = tagsStr.split(',')
                .map(t => t.trim())
                .filter(t => t)
                .map(t => t.startsWith('#') ? t : '#' + t);
            
            this.history.updateTrade(tradeId, { rating: currentRating, tags, notes });
            
            this.renderHistory();
            this.renderJournalAnalytics();
            modal.style.display = "none";
        };
    }

    renderJournalAnalytics() {
        const tagsData = this.history.getTagsAnalytics();
        let mostProfitable = { tag: '-', pnl: -Infinity };
        let worstPerforming = { tag: '-', pnl: Infinity };
        
        const tagsHtml = Object.keys(tagsData).map(tag => {
            const d = tagsData[tag];
            if (d.pnl > mostProfitable.pnl) mostProfitable = { tag, pnl: d.pnl };
            if (d.pnl < worstPerforming.pnl) worstPerforming = { tag, pnl: d.pnl };
            const wr = d.count > 0 ? (d.wins / d.count * 100).toFixed(1) : 0;
            return `
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(57, 70, 84, 0.3); padding: 4px 0;">
                    <span style="font-weight: bold;">${tag} <span style="font-weight: normal; font-size: 10px; color: #8b9bb0;">(${d.count} trades, ${wr}% WR)</span></span>
                    <span class="${d.pnl >= 0 ? 'pt-green' : 'pt-red'}">${d.pnl >= 0 ? '+' : ''}${this.formatOHM(d.pnl)}</span>
                </div>
            `;
        }).join('');
        
        const container = document.getElementById('pt-journal-stats');
        if (container) {
            container.innerHTML = `
                <div class="pt-stats-grid" style="margin-bottom: 12px;">
                    <div class="pt-stat-box"><span class="pt-label">Best Tag</span><span class="pt-value pt-green">${mostProfitable.pnl !== -Infinity ? mostProfitable.tag : '-'}</span></div>
                    <div class="pt-stat-box"><span class="pt-label">Worst Tag</span><span class="pt-value pt-red">${worstPerforming.pnl !== Infinity ? worstPerforming.tag : '-'}</span></div>
                </div>
                <div style="font-size: 11px; color: #8b9bb0; margin-bottom: 4px; text-transform: uppercase; font-weight: 700;">Performance by Tag</div>
                <div style="font-size: 12px; max-height: 150px; overflow-y: auto;">
                    ${tagsHtml || '<div style="text-align: center; color: #8b9bb0; padding: 10px;">No tags yet</div>'}
                </div>
            `;
        }
        
        // Update Filter Selects dynamically
        const symSelect = document.getElementById('pt-filter-symbol');
        const tagSelect = document.getElementById('pt-filter-tag');
        if (symSelect && symSelect.options.length <= 1) {
            const symbols = new Set(this.history.trades.map(t => t.symbol));
            symbols.forEach(s => symSelect.add(new Option(s, s)));
        }
        
        if (tagSelect) {
            const currentVal = tagSelect.value;
            tagSelect.innerHTML = '<option value="">All Tags</option>';
            Object.keys(tagsData).forEach(t => tagSelect.add(new Option(t, t)));
            tagSelect.value = currentVal;
        }
    }

    startReplay(tradeId) {
        this.exitReplay(); // Clear any existing
        const trade = this.history.trades.find(t => t.id === tradeId);
        if (!trade) return;
        this.currentReplayTrade = trade;
        
        const replayPanel = document.getElementById('pt-replay-panel');
        if (replayPanel) {
            replayPanel.style.display = 'block';
            const duration = ((trade.exitTime - trade.time) / 60).toFixed(1) + ' min';
            const retPct = ((trade.exitPrice - trade.entryPrice) / trade.entryPrice * 100 * (trade.direction === 'Long' ? 1 : -1)).toFixed(2);
            document.getElementById('pt-replay-stats').innerHTML = `
                <div class="pt-stat-box"><span class="pt-label">Symbol</span><span class="pt-value">${trade.symbol}</span></div>
                <div class="pt-stat-box"><span class="pt-label">Direction</span><span class="pt-value ${trade.direction === 'Long' ? 'pt-green' : 'pt-red'}">${trade.direction}</span></div>
                <div class="pt-stat-box"><span class="pt-label">Entry Price</span><span class="pt-value">${this.formatPrice(trade.entryPrice)}</span></div>
                <div class="pt-stat-box"><span class="pt-label">Exit Price</span><span class="pt-value">${this.formatPrice(trade.exitPrice)}</span></div>
                <div class="pt-stat-box"><span class="pt-label">Entry Time</span><span class="pt-value">${this.formatDate(trade.time)}</span></div>
                <div class="pt-stat-box"><span class="pt-label">Exit Time</span><span class="pt-value">${this.formatDate(trade.exitTime)}</span></div>
                <div class="pt-stat-box"><span class="pt-label">Duration</span><span class="pt-value">${duration}</span></div>
                <div class="pt-stat-box"><span class="pt-label">Return %</span><span class="pt-value ${retPct >= 0 ? 'pt-green' : 'pt-red'}">${retPct}%</span></div>
                <div class="pt-stat-box"><span class="pt-label">PnL</span><span class="pt-value ${trade.pnl >= 0 ? 'pt-green' : 'pt-red'}">${this.formatOHM(trade.pnl)} OHM</span></div>
            `;
            if (this.container && this.container.firstElementChild) {
                this.container.firstElementChild.scrollTop = 0;
            }
        }
        
        const activeChartId = (typeof state !== 'undefined' ? state : window.state).activeChartId || 'chart-1';
        const chartData = (typeof state !== 'undefined' ? state : window.state).charts[activeChartId];
        
        if (chartData.symbol !== trade.symbol) {
            if (typeof switchChartSymbol === 'function') switchChartSymbol(activeChartId, trade.symbol);
            else if (window.switchChartSymbol) window.switchChartSymbol(activeChartId, trade.symbol);
        }
        
        const attemptDraw = () => {
            const cData = (typeof state !== 'undefined' ? state : window.state).charts[activeChartId];
            if (!cData || cData.symbol !== trade.symbol || !cData.candleSeries || cData.cachedData.length === 0) {
                if (this.currentReplayTrade === trade) setTimeout(attemptDraw, 200);
                return;
            }
            
            setTimeout(() => {
                if (this.currentReplayTrade !== trade) return;
                
                const getClosestIndex = (tSec) => {
                    let closestIdx = 0;
                    let minDiff = Math.abs(tSec - cData.cachedData[0].time);
                    for (let i = 0; i < cData.cachedData.length; i++) {
                        const diff = Math.abs(tSec - cData.cachedData[i].time);
                        if (diff < minDiff) { minDiff = diff; closestIdx = i; }
                    }
                    return closestIdx;
                };
                
                const eIndex = getClosestIndex(trade.time);
                const xIndex = getClosestIndex(trade.exitTime);
                const eTime = cData.cachedData[eIndex].time;
                const xTime = cData.cachedData[xIndex].time;
                
                this.replayLineSeries = cData.chart.addLineSeries({
                    color: trade.pnl >= 0 ? '#10b981' : '#ef4444', lineWidth: 2, lineStyle: 0,
                    crosshairMarkerVisible: false, priceLineVisible: false, lastValueVisible: false
                });
                
                if (eTime < xTime) {
                    this.replayLineSeries.setData([{ time: eTime, value: trade.entryPrice }, { time: xTime, value: trade.exitPrice }]);
                } else if (eTime === xTime) {
                    this.replayLineSeries.setData([{ time: eTime, value: trade.entryPrice }]);
                } else {
                    this.replayLineSeries.setData([{ time: xTime, value: trade.exitPrice }, { time: eTime, value: trade.entryPrice }]);
                }
                
                const markers = [
                    { time: eTime, position: trade.direction === 'Long' ? 'belowBar' : 'aboveBar', color: '#3b82f6', shape: trade.direction === 'Long' ? 'arrowUp' : 'arrowDown', text: 'ENTRY' },
                    { time: xTime, position: trade.pnl >= 0 ? 'aboveBar' : 'belowBar', color: trade.pnl >= 0 ? '#10b981' : '#ef4444', shape: trade.pnl >= 0 ? 'arrowUp' : 'arrowDown', text: 'EXIT' }
                ];
                markers.sort((a,b) => a.time - b.time);
                
                this.replayMarkers = markers;
                if (window.refreshChartMarkers) window.refreshChartMarkers();
                else cData.candleSeries.setMarkers(markers);
                
                this.replayPriceLines = [];
                const entryLine = cData.candleSeries.createPriceLine({
                    price: trade.entryPrice,
                    color: '#3b82f6', // A neutral blue for the entry line
                    lineWidth: 1,
                    lineStyle: 1, // Dotted line style
                    axisLabelVisible: true,
                    title: 'ENTRY'
                });
                this.replayPriceLines.push(entryLine);

                const exitLine = cData.candleSeries.createPriceLine({
                    price: trade.exitPrice,
                    color: trade.pnl >= 0 ? '#10b981' : '#ef4444', // Color based on trade outcome
                    lineWidth: 1,
                    lineStyle: 1, // Dotted line style
                    axisLabelVisible: true,
                    title: 'EXIT'
                });
                this.replayPriceLines.push(exitLine);

                const ts = cData.chart.timeScale();
                const fromIndex = Math.min(eIndex, xIndex);
                const toIndex = Math.max(eIndex, xIndex);
                const padding = Math.max(20, Math.floor((toIndex - fromIndex) * 0.2));
                
                try {
                    if (typeof ts.setVisibleLogicalRange === 'function') {
                        ts.setVisibleLogicalRange({
                            from: fromIndex - padding,
                            to: toIndex + padding
                        });
                    }
                } catch(e) {
                    console.warn("Replay navigation failed:", e);
                }
            }, 300);
        };
        attemptDraw();
    }
    
    exitReplay() {
        this.currentReplayTrade = null;
        this.replayMarkers = null;
        const replayPanel = document.getElementById('pt-replay-panel');
        if (replayPanel) replayPanel.style.display = 'none';
        
        const activeChartId = (typeof state !== 'undefined' ? state : window.state).activeChartId || 'chart-1';
        const cData = (typeof state !== 'undefined' ? state : window.state).charts[activeChartId];
        
        if (this.replayLineSeries && cData && cData.chart) {
            try { cData.chart.removeSeries(this.replayLineSeries); } catch(e) {}
        }
        this.replayLineSeries = null;

        if (this.replayPriceLines.length > 0 && cData && cData.candleSeries) {
            this.replayPriceLines.forEach(line => {
                try { cData.candleSeries.removePriceLine(line); } catch(e) {}
            });
        }
        this.replayPriceLines = [];
        if (window.refreshChartMarkers) window.refreshChartMarkers();

        // Return to live default view
        if (cData && cData.chart) {
            cData.customPriceOffset = 0;
            if (cData.candleSeries) {
                cData.candleSeries.applyOptions({
                    autoscaleInfoProvider: (baseImplementation) => {
                        const res = baseImplementation();
                        return res !== null ? res : null;
                    }
                });
            }
            
            const forceReset = () => {
                if (!cData || !cData.chart) return;
                try {
                    const ts = cData.chart.timeScale();
                    
                    // Reset to default zoom and margin
                    ts.applyOptions({ rightOffset: 7, barSpacing: 8 });
                    
                    // Natively force the viewport to position the newest candle exactly 7 bars away from the right edge
                    ts.scrollToPosition(7, false);
                    cData.chart.priceScale('right').applyOptions({ autoScale: true });
                } catch(e) {}
            };
            forceReset();
            setTimeout(forceReset, 50);
            setTimeout(forceReset, 150);
            setTimeout(forceReset, 300); // Guarantee we outlast any ResizeObserver layout shifts
        }
    }

    renderStats() {
        const stats = this.history.getStats();
        
        const container = document.getElementById('pt-stats-content');
        if (container) {
            container.innerHTML = `
                <div class="pt-stat-box"><span class="pt-label">Total Trades</span><span class="pt-value">${stats.total}</span></div>
                <div class="pt-stat-box"><span class="pt-label">Win Rate</span><span class="pt-value">${stats.winRate}</span></div>
                <div class="pt-stat-box"><span class="pt-label">Profit Factor</span><span class="pt-value">${stats.profitFactor}</span></div>
                <div class="pt-stat-box"><span class="pt-label">Winning/Losing</span><span class="pt-value"><span class="pt-green">${stats.winning}</span> / <span class="pt-red">${stats.losing}</span></span></div>
                <div class="pt-stat-box"><span class="pt-label">Average Win</span><span class="pt-value pt-green">+${stats.avgWin.toFixed(2)}</span></div>
                <div class="pt-stat-box"><span class="pt-label">Average Loss</span><span class="pt-value pt-red">-${stats.avgLoss.toFixed(2)}</span></div>
            `;
        }
        
        const analyticsContainer = document.getElementById('pt-analytics-stats');
        if (analyticsContainer) {
            const currentDDColor = stats.currentDDVal < 0 ? 'pt-red' : 'pt-green';
            const maxDDColor = stats.maxDDVal < 0 ? 'pt-red' : 'pt-green';
            
            analyticsContainer.innerHTML = `
                <div class="pt-stat-box"><span class="pt-label">Current DD</span><span class="pt-value ${currentDDColor}">${stats.currentDrawdown}</span></div>
                <div class="pt-stat-box"><span class="pt-label">Max DD</span><span class="pt-value ${maxDDColor}">${stats.maxDrawdown}</span></div>
                
                <div class="pt-stat-box" style="margin-top: 8px;"><span class="pt-label">Win Rate</span><span class="pt-value">${stats.winRate}</span></div>
                <div class="pt-stat-box" style="margin-top: 8px;"><span class="pt-label">Profit Factor</span><span class="pt-value">${stats.profitFactor}</span></div>
                
                <div class="pt-stat-box" style="margin-top: 8px;"><span class="pt-label">Best Trade</span><span class="pt-value pt-green">${stats.bestTrade > 0 ? '+' : ''}${stats.bestTrade.toFixed(2)}</span></div>
                <div class="pt-stat-box" style="margin-top: 8px;"><span class="pt-label">Worst Trade</span><span class="pt-value pt-red">${stats.worstTrade.toFixed(2)}</span></div>
            `;
        }

        if (this.equitySeries) {
            if (stats.equityCurve && stats.equityCurve.length > 0) {
                this.equitySeries.setData(stats.equityCurve);
                this.equityChart.timeScale().fitContent();
            } else this.equitySeries.setData([]);
        }

        if (this.dailyPnlSeries) {
            if (stats.dailyPnLData && stats.dailyPnLData.length > 0) {
                this.dailyPnlSeries.setData(stats.dailyPnLData);
                this.dailyPnlChart.timeScale().fitContent();
            } else this.dailyPnlSeries.setData([]);
        }
    }

    getChartMarkers(symbol) {
        if (this.currentReplayTrade && this.currentReplayTrade.symbol === symbol && this.replayMarkers) {
            return this.replayMarkers;
        }
        // Entry and exit indicators disabled per user preference
        return [];
    }
    
    startLabelSyncLoop() {
        if (this._syncRunning) return;
        this._syncRunning = true;
        const loop = () => {
            try {
                const appState = typeof state !== 'undefined' ? state : window.state;
                if (appState && appState.charts) {
                    Object.values(appState.charts).forEach(cd => {
                        // Hook into chart timescale events to eliminate 1-frame lag during rapid panning
                        if (cd.chart && !cd._ptSynced) {
                            const syncFn = () => { try { this.syncPositionLabels(cd); } catch(e) {} };
                            try {
                                cd.chart.timeScale().subscribeVisibleTimeRangeChange(syncFn);
                                cd.chart.timeScale().subscribeVisibleLogicalRangeChange(syncFn);
                            } catch(e) {}
                            cd._ptSynced = true;
                        }
                        this.syncPositionLabels(cd);
                    });
                }
            } catch (err) {} // Keep the loop alive at all costs
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }
    
    syncPositionLabels(chartData) {
        try {
            const container = document.getElementById(`${chartData.id}-container`);
            if (!container || !chartData.candleSeries) return;
            
            this.positions.positions.filter(p => p.symbol === chartData.symbol).forEach(pos => {
                const label = container.querySelector(`.pt-label-${pos.id}`);
                if (label) {
                    let y = null;
                    try { y = chartData.candleSeries.priceToCoordinate(pos.entryPrice); } catch(e) {}
                    
                    if (y !== null) {
                        const isLong = pos.direction === 'Long';
                        // Use transform for instantaneous GPU-accelerated sync without layout engine lag
                        const yPx = Math.round(y);
                        label.style.transform = isLong ? `translateY(${yPx + 3}px)` : `translateY(${yPx - 18}px)`;
                        label.style.display = 'inline-flex';
                        
                        const currentPrice = this.currentPrices[pos.symbol] || pos.entryPrice;
                        const pnl = this.calculatePnL(pos, currentPrice);
                        const pnlSpan = label.querySelector('.pt-label-pnl');
                        if (pnlSpan) {
                            pnlSpan.textContent = `${pnl >= 0 ? '+' : ''}${this.formatOHM(pnl)}`;
                        }
                    } else {
                        label.style.display = 'none';
                    }
                }
            });
            
            this.positions.orders.filter(o => o.symbol === chartData.symbol).forEach(order => {
                const label = container.querySelector(`.pt-label-${order.id}`);
                if (label) {
                    let y = null;
                    try { y = chartData.candleSeries.priceToCoordinate(order.price); } catch(e) {}
                    
                    if (y !== null) {
                        const isLong = order.direction === 'Long';
                        const yPx = Math.round(y);
                        label.style.transform = isLong ? `translateY(${yPx + 3}px)` : `translateY(${yPx - 18}px)`;
                        label.style.display = 'inline-flex';
                    } else {
                        label.style.display = 'none';
                    }
                }
            });
        } catch(e) {}
    }

    updatePositionLines(chartData) {
        if (!chartData.candleSeries) return;
        
        // 1. Remove native LWC price lines
        if (chartData.ptLines) {
            chartData.ptLines.forEach(line => {
                try { chartData.candleSeries.removePriceLine(line); } catch(e) {}
            });
        }
        chartData.ptLines = [];
        
        chartData.ptLineObjects = {};
        // 2. Remove old HTML floating labels
        const container = document.getElementById(`${chartData.id}-container`);
        if (container) {
            container.querySelectorAll('.pt-floating-label').forEach(el => el.remove());
        }
        
        this.positions.positions.filter(p => p.symbol === chartData.symbol).forEach(pos => {
            const isLong = pos.direction === 'Long';
            
            // Draw the naked dashed line via LWC
            const priceLine = chartData.candleSeries.createPriceLine({
                price: pos.entryPrice,
                color: isLong ? '#10b981' : '#ef4444',
                lineWidth: 2,
                lineStyle: 2, // Dashed line
                axisLabelVisible: true,
                title: '' // Explicitly clear native LWC title box
            });
            chartData.ptLines.push(priceLine);
            
            // Draw the floating disconnected box via HTML
            if (container) {
                let rightScaleWidth = 55;
                try { rightScaleWidth = chartData.chart.priceScale('right').width(); } catch(e) {}
                const offset = (Number.isFinite(rightScaleWidth) && rightScaleWidth > 0 ? rightScaleWidth : 55) + 80;
                
                const label = document.createElement('span');
                label.className = `pt-floating-label pt-label-${pos.id}`;
                label.style.position = 'absolute';
                label.style.top = '0px'; // Lock top so transform handles vertical positioning safely
                label.style.right = `${offset}px`;
                label.style.width = 'auto';
                label.style.maxWidth = '200px';
                label.style.height = '14px';
                label.style.lineHeight = '14px';
                label.style.padding = '0 4px';
                label.style.margin = '0px';
                label.style.boxSizing = 'border-box';
                label.style.borderRadius = '3px';
                label.style.fontSize = '8.5px';
                label.style.fontFamily = 'inherit';
                label.style.fontWeight = 'bold';
                label.style.color = '#ffffff';
                label.style.backgroundColor = isLong ? '#10b981' : '#ef4444';
                label.style.pointerEvents = 'auto';
                label.style.cursor = 'pointer';
                label.style.zIndex = '20';
                label.style.whiteSpace = 'nowrap';
                label.style.overflow = 'hidden';
                label.style.textAlign = 'center';
                label.style.display = 'inline-flex';
                label.style.alignItems = 'center';
                label.style.justifyContent = 'center';
                
                label.innerHTML = `
                    <span>${isLong ? 'LONG' : 'SHORT'}</span>
                    <span class="pt-label-pnl" style="margin-left: 4px; padding-left: 4px; border-left: 1px solid rgba(255,255,255,0.4);"></span>
                    <span class="pt-label-close" title="Close Position" style="display: none; margin-left: 4px; padding-left: 4px; border-left: 1px solid rgba(255,255,255,0.4); font-size: 8px; transition: color 0.1s;" onmouseover="this.style.color='rgba(0,0,0,0.5)'" onmouseout="this.style.color='#ffffff'">✖</span>
                `;
                
                label.onmouseenter = () => {
                    const closeBtn = label.querySelector('.pt-label-close');
                    if (closeBtn) closeBtn.style.display = 'inline-block';
                };
                
                label.onmouseleave = () => {
                    const closeBtn = label.querySelector('.pt-label-close');
                    if (closeBtn) closeBtn.style.display = 'none';
                };
                
                label.onclick = (e) => {
                    e.stopPropagation();
                    if (e.target.classList.contains('pt-label-close') || e.target.closest('.pt-label-close')) {
                        this.closePosition(pos.id);
                        return;
                    }
                    if (this.activeTPSLIds.has(pos.id)) {
                        this.activeTPSLIds.delete(pos.id);
                    } else {
                        this.activeTPSLIds.add(pos.id);
                    }
                    this.updatePositionLines(chartData);
                };
                
                container.appendChild(label);
            }
            
            if (this.activeTPSLIds.has(pos.id)) {
                if (pos.tp) {
                    const tpLine = chartData.candleSeries.createPriceLine({
                        price: pos.tp,
                        color: '#10b981',
                        lineWidth: 1,
                        lineStyle: 2,
                        axisLabelVisible: true,
                        title: 'TP'
                    });
                    chartData.ptLines.push(tpLine);
                    chartData.ptLineObjects[`${pos.id}_tp`] = tpLine;
                }
                
                if (pos.sl) {
                    const slLine = chartData.candleSeries.createPriceLine({
                        price: pos.sl,
                        color: '#ef4444',
                        lineWidth: 1,
                        lineStyle: 2,
                        axisLabelVisible: true,
                        title: 'SL'
                    });
                    chartData.ptLines.push(slLine);
                    chartData.ptLineObjects[`${pos.id}_sl`] = slLine;
                }
            }
        });
        
        this.positions.orders.filter(o => o.symbol === chartData.symbol).forEach(order => {
            const isLong = order.direction === 'Long';
            
            const priceLine = chartData.candleSeries.createPriceLine({
                price: order.price,
                color: isLong ? '#10b981' : '#ef4444',
                lineWidth: 1,
                lineStyle: 3, // Dotted line
                axisLabelVisible: true,
                title: '' // Explicitly clear native LWC title box
            });
            chartData.ptLines.push(priceLine);
            chartData.ptLineObjects[`${order.id}_price`] = priceLine;
            
            if (container) {
                let rightScaleWidth = 55;
                try { rightScaleWidth = chartData.chart.priceScale('right').width(); } catch(e) {}
                const offset = (Number.isFinite(rightScaleWidth) && rightScaleWidth > 0 ? rightScaleWidth : 55) + 80;
                
                const label = document.createElement('span');
                label.className = `pt-floating-label pt-label-${order.id}`;
                label.style.position = 'absolute';
                label.style.top = '0px';
                label.style.right = `${offset}px`;
                label.style.width = 'auto';
                label.style.maxWidth = '200px';
                label.style.height = '14px';
                label.style.lineHeight = '14px';
                label.style.padding = '0 4px';
                label.style.margin = '0px';
                label.style.boxSizing = 'border-box';
                label.style.borderRadius = '3px';
                label.style.fontSize = '8.5px';
                label.style.fontFamily = 'inherit';
                label.style.fontWeight = 'bold';
                label.style.color = '#ffffff';
                label.style.backgroundColor = isLong ? '#10b981' : '#ef4444';
                label.style.pointerEvents = 'auto';
                label.style.cursor = 'pointer';
                label.style.zIndex = '20';
                label.style.whiteSpace = 'nowrap';
                label.style.overflow = 'hidden';
                label.style.textAlign = 'center';
                label.style.display = 'inline-flex';
                label.style.alignItems = 'center';
                label.style.justifyContent = 'center';
                
                label.innerHTML = `
                    <span>LIMIT ${isLong ? 'LONG' : 'SHORT'}</span>
                    <span class="pt-label-close" title="Cancel Order" style="display: none; margin-left: 4px; padding-left: 4px; border-left: 1px solid rgba(255,255,255,0.4); font-size: 8px; transition: color 0.1s;" onmouseover="this.style.color='rgba(0,0,0,0.5)'" onmouseout="this.style.color='#ffffff'">✖</span>
                `;
                
                label.onmouseenter = () => {
                    const closeBtn = label.querySelector('.pt-label-close');
                    if (closeBtn) closeBtn.style.display = 'inline-block';
                };
                
                label.onmouseleave = () => {
                    const closeBtn = label.querySelector('.pt-label-close');
                    if (closeBtn) closeBtn.style.display = 'none';
                };
                
                label.onclick = (e) => {
                    e.stopPropagation();
                    if (e.target.classList.contains('pt-label-close') || e.target.closest('.pt-label-close')) {
                        this.cancelOrder(order.id);
                        return;
                    }
                    if (this.activeTPSLIds.has(order.id)) {
                        this.activeTPSLIds.delete(order.id);
                    } else {
                        this.activeTPSLIds.add(order.id);
                    }
                    this.updatePositionLines(chartData);
                };
                
                container.appendChild(label);
            }
            
            if (this.activeTPSLIds.has(order.id)) {
                if (order.tp) {
                    const tpLine = chartData.candleSeries.createPriceLine({
                        price: order.tp,
                        color: '#10b981',
                        lineWidth: 1,
                        lineStyle: 3,
                        axisLabelVisible: true,
                        title: 'TP'
                    });
                    chartData.ptLines.push(tpLine);
                    chartData.ptLineObjects[`${order.id}_tp`] = tpLine;
                }
                
                if (order.sl) {
                    const slLine = chartData.candleSeries.createPriceLine({
                        price: order.sl,
                        color: '#ef4444',
                        lineWidth: 1,
                        lineStyle: 3,
                        axisLabelVisible: true,
                        title: 'SL'
                    });
                    chartData.ptLines.push(slLine);
                    chartData.ptLineObjects[`${order.id}_sl`] = slLine;
                }
            }
        });
        
        this.syncPositionLabels(chartData);
    }
};
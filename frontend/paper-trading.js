window.PaperTrading = class PaperTrading {
    constructor() {
        this.account = new window.PaperAccount();
        this.positions = new window.PaperPositions();
        this.history = new window.PaperHistory();
        this.currentPrices = {};
        this.activeSymbol = 'BTC';
        this.container = null;
        this.activeTPSLIds = new Set();
        this.startLabelSyncLoop();
    }
    
    formatPrice(p) {
        if (!p) return "0.00";
        if (p < 0.001) return p.toFixed(6);
        if (p < 1) return p.toFixed(4);
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

                <!-- Account Stats -->
                <div class="pt-section">
                    <div class="pt-title">Account Stats</div>
                    <div class="pt-stats-grid" id="pt-stats-content"></div>
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

        this.renderPositions();
        this.renderHistory();
        this.renderStats();
        this.updateLivePnL();
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
        if (this.history.trades.length === 0) {
            container.innerHTML = '<div class="pt-label" style="text-align: center; margin-top: 10px;">No Trade History</div>';
            return;
        }
        let html = '<table class="pt-table"><tr><th>Sym</th><th>Side</th><th>Qty</th><th>Entry</th><th>Exit</th><th>PnL</th><th></th></tr>';
        this.history.trades.slice(0, 50).forEach(t => {
            const pnlClass = t.pnl >= 0 ? 'pt-green' : 'pt-red';
            html += `<tr>
                <td>${t.symbol}</td>
                <td>${t.direction}</td>
                <td>${t.qty}</td>
                <td>${this.formatPrice(t.entryPrice)}</td>
                <td>${this.formatPrice(t.exitPrice)}</td>
                <td class="${pnlClass}">${t.pnl >= 0 ? '+' : ''}${this.formatOHM(t.pnl)}</td>
                <td style="text-align: right;">
                    <button class="pt-close-btn" onclick="window.paperTrading.toggleHistoryDetails('${t.id}', this)" title="Trade Details">▼</button>
                </td>
            </tr>
            <tr id="pt-history-details-${t.id}" style="display: none; background: rgba(59, 130, 246, 0.05);">
                <td colspan="7" style="padding: 8px 4px; border-bottom: 1px dashed #394654;">
                    <div style="display: flex; justify-content: space-between; gap: 8px;">
                        <div style="flex: 1;"><span class="pt-label">Opened:</span><br><span class="pt-value" style="font-size: 11px;">${this.formatDate(t.time)}</span></div>
                        <div style="flex: 1;"><span class="pt-label">Closed:</span><br><span class="pt-value" style="font-size: 11px;">${this.formatDate(t.exitTime)}</span></div>
                        <div style="flex: 1; text-align: right;"><span class="pt-label">Reason:</span><br><span class="pt-value" style="font-size: 11px;">${t.closeReason || 'Unknown'}</span></div>
                    </div>
                </td>
            </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    }

    renderStats() {
        const container = document.getElementById('pt-stats-content');
        if (!container) return;
        const stats = this.history.getStats();
        container.innerHTML = `
            <div class="pt-stat-box"><span class="pt-label">Total Trades</span><span class="pt-value">${stats.total}</span></div>
            <div class="pt-stat-box"><span class="pt-label">Win Rate</span><span class="pt-value">${stats.winRate}</span></div>
            <div class="pt-stat-box"><span class="pt-label">Profit Factor</span><span class="pt-value">${stats.profitFactor}</span></div>
            <div class="pt-stat-box"><span class="pt-label">Winning/Losing</span><span class="pt-value"><span class="pt-green">${stats.winning}</span> / <span class="pt-red">${stats.losing}</span></span></div>
            <div class="pt-stat-box"><span class="pt-label">Average Win</span><span class="pt-value pt-green">+${stats.avgWin.toFixed(2)}</span></div>
            <div class="pt-stat-box"><span class="pt-label">Average Loss</span><span class="pt-value pt-red">-${stats.avgLoss.toFixed(2)}</span></div>
        `;
    }

    getChartMarkers(symbol) {
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
                        label.style.display = 'inline-block';
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
                label.style.maxWidth = '120px';
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
                label.textContent = `${isLong ? 'LONG' : 'SHORT'}`;
                
                label.onclick = (e) => {
                    e.stopPropagation();
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
                title: 'LIMIT'
            });
            chartData.ptLines.push(priceLine);
            
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
        });
        
        this.syncPositionLabels(chartData);
    }
};
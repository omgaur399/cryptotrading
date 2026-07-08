const AlertService = (() => {
    let deps = {
        state: null,
        saveDrawings: null,
        DrawingService: null,
        ModalService: null
    };

    function initialize(injectedDependencies) {
        deps = injectedDependencies;
    }

    const NotificationHelper = {
        show(title, body) {
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
        },

        updateBadge() {
            const badge = document.getElementById('notif-badge');
            if (!badge) return;
            let count = 0;
            if (deps.state && deps.state.drawings) {
                Object.values(deps.state.drawings).forEach(lines => {
                    if (Array.isArray(lines)) {
                        count += lines.filter(l => l.type === 'alert').length;
                    }
                });
            }
            if (count > 0) {
                badge.textContent = count > 9 ? '9+' : String(count);
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        }
    };

    const AlertModal = {
        open(chartData, defaultPrice) {
            const formattedPrice = defaultPrice < 1 ? defaultPrice.toPrecision(4) : defaultPrice.toFixed(2);
            
            deps.ModalService.openPriceAlert({
                price: formattedPrice
            }, {
                onSave: (data) => {
                    const price = parseFloat(data.price);
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
                        if (!deps.state.drawings[key]) deps.state.drawings[key] = [];
                        deps.state.drawings[key].push(alertObj);
                        Object.values(deps.state.charts).forEach(cd => {
                            if (cd.symbol === chartData.symbol) AlertRenderer.renderLine(cd, alertObj);
                        });
                        if (deps.saveDrawings) deps.saveDrawings();
                        
                        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
                            Notification.requestPermission();
                        }
                    }
                    deps.ModalService.closeModal("alert-settings-modal");
                },
                onCancel: () => {
                    deps.ModalService.closeModal("alert-settings-modal");
                }
            });
        },

        openSettings(chartData, alertObj, key) {
            deps.ModalService.openAlertSettings({
                price: alertObj.price
            }, {
                onSave: (data) => {
                    const newPrice = parseFloat(data.price);
                    alertObj.price = isNaN(newPrice) ? alertObj.price : newPrice;
                    alertObj.active = true;
                    
                    Object.values(deps.state.charts).forEach(cd => {
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
                    if (deps.saveDrawings) deps.saveDrawings();
                    deps.ModalService.closeModal("alert-edit-modal");
                },
                onDelete: () => {
                    Object.values(deps.state.charts).forEach(cd => {
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
                    const idx = deps.state.drawings[key].findIndex(l => l.id === alertObj.id);
                    if (idx !== -1) deps.state.drawings[key].splice(idx, 1);
                    if (deps.saveDrawings) deps.saveDrawings();
                    deps.ModalService.closeModal("alert-edit-modal");
                },
                onCancel: () => {
                    deps.ModalService.closeModal("alert-edit-modal");
                }
            });
        }
    };

    const AlertRenderer = {
        renderLine(chartData, alertObj) {
            deps.DrawingService.renderAlertLine(chartData, alertObj);
        },

        check(chartData, currentPrice) {
            if (chartData.lastPrice === null) return;
            const prevPrice = chartData.lastPrice;
            
            const key = chartData.symbol;
            const lines = deps.state.drawings[key];
            if (!lines) return;
            
            lines.forEach(line => {
                if (line.type === 'alert' && line.active !== false) {
                    let triggered = false;
                    if ((prevPrice <= line.price && currentPrice > line.price) || (prevPrice >= line.price && currentPrice < line.price)) {
                        triggered = true;
                    }
                    
                    if (triggered) {
                        line.active = false;
                        if (deps.saveDrawings) deps.saveDrawings();
                        NotificationHelper.show(`Alert Triggered: ${chartData.symbol}`, `Price crossed ${line.price}. Current: ${currentPrice}`);
                        
                        Object.values(deps.state.charts).forEach(cd => {
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
    };

    const AlertHub = {
        show() {
            // Collect all active alerts from drawings
            const allAlerts = [];
            if (deps.state && deps.state.drawings) {
                Object.entries(deps.state.drawings).forEach(([symbol, lines]) => {
                    if (!Array.isArray(lines)) return;
                    lines.forEach(line => {
                        if (line.type === 'alert') {
                            allAlerts.push({ symbol, price: line.price, id: line.id, active: line.active });
                        }
                    });
                });
            }

            // Remove existing
            const existing = document.getElementById('alerts-hub-modal');
            if (existing) { existing.remove(); return; }

            const modal = document.createElement('div');
            modal.id = 'alerts-hub-modal';
            modal.style.cssText = `
                position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
                width: 380px; max-height: 75vh;
                background: var(--glass-bg); backdrop-filter: blur(20px) saturate(1.5);
                border: 1px solid var(--glass-border);
                border-radius: 14px;
                box-shadow: var(--glass-shadow);
                z-index: 8000;
                display: flex; flex-direction: column;
                font-family: inherit; color: var(--text);
                overflow: hidden;
                animation: alertsHubIn 180ms var(--ease-out) both;
            `;

            const header = document.createElement('div');
            header.style.cssText = `
                display: flex; align-items: center; justify-content: space-between;
                padding: 14px 18px;
                border-bottom: 1px solid var(--border);
                font-size: 13px; font-weight: 700; letter-spacing: 0.04em;
                text-transform: uppercase; color: var(--blue);
            `;
            header.innerHTML = `
                <span style="display:flex;align-items:center;gap:8px">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    Price Alerts (${allAlerts.length})
                </span>
                <button onclick="this.closest('#alerts-hub-modal').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;line-height:1;padding:0">×</button>
            `;

            const body = document.createElement('div');
            body.style.cssText = 'flex:1; overflow-y:auto; padding:8px;';

            if (allAlerts.length === 0) {
                body.innerHTML = `
                    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:160px;gap:12px;color:var(--muted)">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                        <p style="margin:0;font-size:13px">No active alerts</p>
                        <p style="margin:0;font-size:11px;opacity:0.6">Right-click on a chart to add an alert</p>
                    </div>`;
            } else {
                allAlerts.forEach(alert => {
                    const row = document.createElement('div');
                    row.style.cssText = `
                        display:flex; align-items:center; justify-content:space-between;
                        padding:9px 12px; border-radius:8px; margin-bottom:4px;
                        background: var(--panel-2); border: 1px solid var(--border);
                        font-size:12px;
                    `;
                    const priceStr = alert.price < 1 ? alert.price.toFixed(4) : alert.price.toFixed(2);
                    row.innerHTML = `
                        <div style="display:flex;flex-direction:column;gap:2px">
                            <span style="font-weight:700;color:var(--text)">${alert.symbol}</span>
                            <span style="color:var(--muted);font-size:11px">Alert @ ${priceStr}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px">
                            <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${alert.active ? 'rgba(16,185,129,0.18)' : 'rgba(107,114,128,0.2)'};color:${alert.active ? 'var(--green)' : 'var(--muted)'}">${alert.active ? 'ACTIVE' : 'PENDING'}</span>
                        </div>
                    `;
                    body.appendChild(row);
                });
            }

            modal.appendChild(header);
            modal.appendChild(body);
            document.body.appendChild(modal);

            // Dismiss on click outside
            setTimeout(() => {
                const dismiss = (e) => {
                    if (!modal.contains(e.target)) {
                        modal.remove();
                        document.removeEventListener('mousedown', dismiss);
                    }
                };
                document.addEventListener('mousedown', dismiss);
            }, 10);
        }
    };

    return {
        initialize,
        Notification: NotificationHelper,
        AlertModal,
        AlertRenderer,
        AlertHub
    };
})();

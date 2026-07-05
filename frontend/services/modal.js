window.ModalService = {
    _createOverlay(id) {
        let modal = document.getElementById(id);
        if (!modal) {
            modal = document.createElement("div");
            modal.id = id;
            modal.className = "settings-modal-overlay";
            document.body.appendChild(modal);
        }
        return modal;
    },

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    openLineSettings(config, callbacks) {
        const modal = this._createOverlay("line-settings-modal");
        
        modal.innerHTML = `
            <div class="settings-modal-content" style="width: 280px;">
                <h3>Horizontal Line Settings</h3>
                <div class="settings-group">
                    <label>Price</label>
                    <input type="number" id="line-price-input" value="${config.price}" step="any">
                </div>
                <div class="settings-group">
                    <label>Color</label>
                    <input type="color" id="line-color-input" value="${config.color}">
                </div>
                <div class="settings-group">
                    <label>Thickness</label>
                    <select id="line-width-input">
                        <option value="1" ${config.lineWidth == 1 ? 'selected' : ''}>Thin</option>
                        <option value="2" ${config.lineWidth == 2 ? 'selected' : ''}>Medium</option>
                        <option value="3" ${config.lineWidth == 3 ? 'selected' : ''}>Thick</option>
                        <option value="4" ${config.lineWidth == 4 ? 'selected' : ''}>Extra Thick</option>
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
            if (callbacks.onCancel) callbacks.onCancel();
            this.closeModal("line-settings-modal");
        };

        document.getElementById("line-delete-btn").onclick = () => {
            if (callbacks.onDelete) callbacks.onDelete();
        };

        document.getElementById("line-save-btn").onclick = () => {
            const data = {
                price: parseFloat(document.getElementById("line-price-input").value),
                color: document.getElementById("line-color-input").value,
                lineWidth: parseInt(document.getElementById("line-width-input").value)
            };
            if (callbacks.onSave) callbacks.onSave(data);
        };
    },

    openVLineSettings(config, callbacks) {
        const modal = this._createOverlay("vline-settings-modal");
        
        modal.innerHTML = `
            <div class="settings-modal-content" style="width: 280px;">
                <h3>Vertical Line Settings</h3>
                <div class="settings-group">
                    <label>Color</label>
                    <input type="color" id="vline-color-input" value="${config.color}">
                </div>
                <div class="settings-group">
                    <label>Thickness</label>
                    <select id="vline-width-input">
                        <option value="1" ${config.lineWidth == 1 ? 'selected' : ''}>Thin</option>
                        <option value="2" ${config.lineWidth == 2 ? 'selected' : ''}>Medium</option>
                        <option value="3" ${config.lineWidth == 3 ? 'selected' : ''}>Thick</option>
                        <option value="4" ${config.lineWidth == 4 ? 'selected' : ''}>Extra Thick</option>
                    </select>
                </div>
                <div class="settings-actions">
                    <button id="vline-delete-btn">Delete</button>
                    <button id="vline-cancel-btn">Cancel</button>
                    <button id="vline-save-btn">Save</button>
                </div>
            </div>
        `;
        
        modal.style.display = "flex";

        document.getElementById("vline-cancel-btn").onclick = () => {
            if (callbacks.onCancel) callbacks.onCancel();
            this.closeModal("vline-settings-modal");
        };

        document.getElementById("vline-delete-btn").onclick = () => {
            if (callbacks.onDelete) callbacks.onDelete();
        };

        document.getElementById("vline-save-btn").onclick = () => {
            const data = {
                color: document.getElementById("vline-color-input").value,
                lineWidth: parseInt(document.getElementById("vline-width-input").value)
            };
            if (callbacks.onSave) callbacks.onSave(data);
        };
    },

    openMarkerSettings(config, callbacks) {
        const modal = this._createOverlay("marker-settings-modal");
        
        modal.innerHTML = `
            <div class="settings-modal-content" style="width: 280px; text-align: center;">
                <h3 style="margin-top: 0;">${config.typeLabel}</h3>
                <p style="font-size: 13px; color: #94a3b8; margin-bottom: 20px;">
                    Do you want to delete this marker?
                </p>
                <div class="settings-actions" style="justify-content: center;">
                    <button id="marker-cancel-btn">Cancel</button>
                    <button id="marker-delete-btn" style="background: #ef4444; color: white;">Delete</button>
                </div>
            </div>
        `;
        
        modal.style.display = "flex";

        document.getElementById("marker-cancel-btn").onclick = () => {
            if (callbacks.onCancel) callbacks.onCancel();
            this.closeModal("marker-settings-modal");
        };

        document.getElementById("marker-delete-btn").onclick = () => {
            if (callbacks.onDelete) callbacks.onDelete();
        };
    },

    openPriceAlert(config, callbacks) {
        const modal = this._createOverlay("alert-settings-modal");
        
        modal.innerHTML = `
            <div class="settings-modal-content" style="width: 280px;">
                <h3>Create Price Alert</h3>
                <div class="settings-group">
                    <label>Price</label>
                    <input type="number" id="alert-price-input" value="${config.price}" step="any">
                </div>
                <div class="settings-actions">
                    <button id="alert-cancel-btn" style="background: #394654; color: white;">Cancel</button>
                    <button id="alert-save-btn" style="background: #10b981; color: white;">Create</button>
                </div>
            </div>
        `;
        
        modal.style.display = "flex";

        document.getElementById("alert-cancel-btn").onclick = () => {
            if (callbacks.onCancel) callbacks.onCancel();
            this.closeModal("alert-settings-modal");
        };

        document.getElementById("alert-save-btn").onclick = () => {
            const data = {
                price: parseFloat(document.getElementById("alert-price-input").value)
            };
            if (callbacks.onSave) callbacks.onSave(data);
        };
    },

    openAlertSettings(config, callbacks) {
        const modal = this._createOverlay("alert-edit-modal");
        
        modal.innerHTML = `
            <div class="settings-modal-content" style="width: 280px;">
                <h3>Edit Price Alert</h3>
                <div class="settings-group">
                    <label>Price</label>
                    <input type="number" id="alert-edit-price" value="${config.price}" step="any">
                </div>
                <div class="settings-actions">
                    <button id="alert-edit-delete-btn" style="background: #ef4444; color: white; margin-right: auto;">Delete</button>
                    <button id="alert-edit-cancel-btn" style="background: #394654; color: white;">Cancel</button>
                    <button id="alert-edit-save-btn" style="background: #10b981; color: white;">Save</button>
                </div>
            </div>
        `;
        
        modal.style.display = "flex";

        document.getElementById("alert-edit-cancel-btn").onclick = () => {
            if (callbacks.onCancel) callbacks.onCancel();
            this.closeModal("alert-edit-modal");
        };

        document.getElementById("alert-edit-delete-btn").onclick = () => {
            if (callbacks.onDelete) callbacks.onDelete();
        };

        document.getElementById("alert-edit-save-btn").onclick = () => {
            const data = {
                price: parseFloat(document.getElementById("alert-edit-price").value)
            };
            if (callbacks.onSave) callbacks.onSave(data);
        };
    },

    openChartSettings(config, callbacks) {
        const modal = this._createOverlay("chart-settings-modal");
        
        const showGroup = (groupName) => {
            if (!config.onlyIndicator) return "";
            if (groupName === 'sma' && config.onlyIndicator.startsWith('sma')) return "";
            if (groupName === 'ema' && config.onlyIndicator.startsWith('ema')) return "";
            return config.onlyIndicator === groupName ? "" : "display: none;";
        };

        const titleText = config.onlyIndicator ? 
            `${config.onlyIndicator.toUpperCase().replace('1',' 1').replace('2',' 2').replace('3',' 3')} Settings` : 
            "Chart Settings";

        const val = (group, key) => config.onlyIndicator && config.onlyIndicator.startsWith(group) ? 
            config.indicators[config.onlyIndicator + key] : 
            config.indicators[group + key];

        modal.innerHTML = `
            <div class="settings-modal-content">
                <h3>${titleText}</h3>
                
                <!-- SMA Settings -->
                <div class="settings-group" style="${showGroup('sma')}">
                    <label>${config.onlyIndicator && config.onlyIndicator.startsWith('sma') ? config.onlyIndicator.toUpperCase().replace('SMA', 'SMA ') : 'SMA'} Period</label>
                    <input type="number" id="sma-period-input" value="${val('sma', 'Period')}" min="1">
                </div>
                <div class="settings-group" style="${showGroup('sma')}">
                    <label>SMA Color</label>
                    <input type="color" id="sma-color-input" value="${val('sma', 'Color')}">
                </div>
                <div class="settings-group" style="${showGroup('sma')}">
                    <label>SMA Thickness</label>
                    <select id="sma-width-input">
                        <option value="1" ${val('sma', 'LineWidth') == 1 ? 'selected' : ''}>Thin</option>
                        <option value="2" ${val('sma', 'LineWidth') == 2 ? 'selected' : ''}>Medium</option>
                        <option value="3" ${val('sma', 'LineWidth') == 3 ? 'selected' : ''}>Thick</option>
                    </select>
                </div>
                
                <!-- EMA Settings -->
                <div class="settings-group" style="${showGroup('ema')}">
                    <label>${config.onlyIndicator && config.onlyIndicator.startsWith('ema') ? config.onlyIndicator.toUpperCase().replace('EMA', 'EMA ') : 'EMA'} Period</label>
                    <input type="number" id="ema-period-input" value="${val('ema', 'Period')}" min="1">
                </div>
                <div class="settings-group" style="${showGroup('ema')}">
                    <label>EMA Color</label>
                    <input type="color" id="ema-color-input" value="${val('ema', 'Color')}">
                </div>
                <div class="settings-group" style="${showGroup('ema')}">
                    <label>EMA Thickness</label>
                    <select id="ema-width-input">
                        <option value="1" ${val('ema', 'LineWidth') == 1 ? 'selected' : ''}>Thin</option>
                        <option value="2" ${val('ema', 'LineWidth') == 2 ? 'selected' : ''}>Medium</option>
                        <option value="3" ${val('ema', 'LineWidth') == 3 ? 'selected' : ''}>Thick</option>
                    </select>
                </div>
                
                <!-- BB Settings -->
                <div class="settings-group" style="${showGroup('bb')}">
                    <label>BB Period</label>
                    <input type="number" id="bb-period-input" value="${config.indicators.bbPeriod}" min="1">
                </div>
                <div class="settings-group" style="${showGroup('bb')}">
                    <label>BB Std Dev</label>
                    <input type="number" id="bb-stddev-input" value="${config.indicators.bbStdDev}" min="0.1" step="0.1">
                </div>
                <div class="settings-group" style="${showGroup('bb')}">
                    <label>BB Color</label>
                    <input type="color" id="bb-color-input" value="${config.indicators.bbColor}">
                </div>
                <div class="settings-group" style="${showGroup('bb')}">
                    <label>BB Thickness</label>
                    <select id="bb-width-input">
                        <option value="1" ${config.indicators.bbLineWidth == 1 ? 'selected' : ''}>Thin</option>
                        <option value="2" ${config.indicators.bbLineWidth == 2 ? 'selected' : ''}>Medium</option>
                        <option value="3" ${config.indicators.bbLineWidth == 3 ? 'selected' : ''}>Thick</option>
                    </select>
                </div>
                
                <!-- RSI Settings -->
                <div class="settings-group" style="${showGroup('rsi')}">
                    <label>RSI Period</label>
                    <input type="number" id="rsi-period-input" value="${config.indicators.rsiPeriod}" min="1">
                </div>
                <div class="settings-group" style="${showGroup('rsi')}">
                    <label>RSI Color</label>
                    <input type="color" id="rsi-color-input" value="${config.indicators.rsiColor}">
                </div>
                <div class="settings-group" style="${showGroup('rsi')}">
                    <label>RSI Thickness</label>
                    <select id="rsi-width-input">
                        <option value="1" ${config.indicators.rsiLineWidth == 1 ? 'selected' : ''}>Thin</option>
                        <option value="2" ${config.indicators.rsiLineWidth == 2 ? 'selected' : ''}>Medium</option>
                        <option value="3" ${config.indicators.rsiLineWidth == 3 ? 'selected' : ''}>Thick</option>
                    </select>
                </div>

                <!-- MACD Settings -->
                <div class="settings-group" style="${showGroup('macd')}">
                    <label>MACD Fast Period</label>
                    <input type="number" id="macd-fast-period-input" value="${config.indicators.macdFastPeriod}" min="1">
                </div>
                <div class="settings-group" style="${showGroup('macd')}">
                    <label>MACD Slow Period</label>
                    <input type="number" id="macd-slow-period-input" value="${config.indicators.macdSlowPeriod}" min="1">
                </div>
                <div class="settings-group" style="${showGroup('macd')}">
                    <label>MACD Signal Period</label>
                    <input type="number" id="macd-signal-period-input" value="${config.indicators.macdSignalPeriod}" min="1">
                </div>

                <!-- VWAP Settings -->
                <div class="settings-group" style="${showGroup('vwap')}">
                    <label>VWAP Color</label>
                    <input type="color" id="vwap-color-input" value="${config.indicators.vwapColor}">
                </div>
                <div class="settings-group" style="${showGroup('vwap')}">
                    <label>VWAP Thickness</label>
                    <select id="vwap-width-input">
                        <option value="1" ${config.indicators.vwapLineWidth == 1 ? 'selected' : ''}>Thin</option>
                        <option value="2" ${config.indicators.vwapLineWidth == 2 ? 'selected' : ''}>Medium</option>
                        <option value="3" ${config.indicators.vwapLineWidth == 3 ? 'selected' : ''}>Thick</option>
                    </select>
                </div>
                
                <!-- ATR Settings -->
                <div class="settings-group" style="${showGroup('atr')}">
                    <label>ATR Period</label>
                    <input type="number" id="atr-period-input" value="${config.indicators.atrPeriod}" min="1">
                </div>
                <div class="settings-group" style="${showGroup('atr')}">
                    <label>ATR Color</label>
                    <input type="color" id="atr-color-input" value="${config.indicators.atrColor}">
                </div>
                
                <div class="settings-actions">
                    <button id="settings-cancel-btn">Cancel</button>
                    <button id="settings-save-btn">Save</button>
                </div>
            </div>
        `;

        modal.style.display = "flex";

        document.getElementById("settings-cancel-btn").onclick = () => {
            if (callbacks.onCancel) callbacks.onCancel();
            this.closeModal("chart-settings-modal");
        };

        document.getElementById("settings-save-btn").onclick = () => {
            const data = {};
            if (!config.onlyIndicator || config.onlyIndicator.startsWith('sma')) {
                const p = config.onlyIndicator && config.onlyIndicator.startsWith('sma') ? config.onlyIndicator + 'Period' : 'smaPeriod';
                const c = config.onlyIndicator && config.onlyIndicator.startsWith('sma') ? config.onlyIndicator + 'Color' : 'smaColor';
                const w = config.onlyIndicator && config.onlyIndicator.startsWith('sma') ? config.onlyIndicator + 'LineWidth' : 'smaLineWidth';
                data[p] = parseInt(document.getElementById("sma-period-input").value);
                data[c] = document.getElementById("sma-color-input").value;
                data[w] = parseInt(document.getElementById("sma-width-input").value);
            }
            if (!config.onlyIndicator || config.onlyIndicator.startsWith('ema')) {
                const p = config.onlyIndicator && config.onlyIndicator.startsWith('ema') ? config.onlyIndicator + 'Period' : 'emaPeriod';
                const c = config.onlyIndicator && config.onlyIndicator.startsWith('ema') ? config.onlyIndicator + 'Color' : 'emaColor';
                const w = config.onlyIndicator && config.onlyIndicator.startsWith('ema') ? config.onlyIndicator + 'LineWidth' : 'emaLineWidth';
                data[p] = parseInt(document.getElementById("ema-period-input").value);
                data[c] = document.getElementById("ema-color-input").value;
                data[w] = parseInt(document.getElementById("ema-width-input").value);
            }
            if (!config.onlyIndicator || config.onlyIndicator === 'bb') {
                data.bbPeriod = parseInt(document.getElementById("bb-period-input").value);
                data.bbStdDev = parseFloat(document.getElementById("bb-stddev-input").value);
                data.bbColor = document.getElementById("bb-color-input").value;
                data.bbLineWidth = parseInt(document.getElementById("bb-width-input").value);
            }
            if (!config.onlyIndicator || config.onlyIndicator === 'rsi') {
                data.rsiPeriod = parseInt(document.getElementById("rsi-period-input").value);
                data.rsiColor = document.getElementById("rsi-color-input").value;
                data.rsiLineWidth = parseInt(document.getElementById("rsi-width-input").value);
            }
            if (!config.onlyIndicator || config.onlyIndicator === 'macd') {
                data.macdFastPeriod = parseInt(document.getElementById("macd-fast-period-input").value);
                data.macdSlowPeriod = parseInt(document.getElementById("macd-slow-period-input").value);
                data.macdSignalPeriod = parseInt(document.getElementById("macd-signal-period-input").value);
            }
            if (!config.onlyIndicator || config.onlyIndicator === 'vwap') {
                data.vwapColor = document.getElementById("vwap-color-input").value;
                data.vwapLineWidth = parseInt(document.getElementById("vwap-width-input").value);
            }
            if (!config.onlyIndicator || config.onlyIndicator === 'atr') {
                data.atrPeriod = parseInt(document.getElementById("atr-period-input").value);
                data.atrColor = document.getElementById("atr-color-input").value;
            }

            if (callbacks.onSave) callbacks.onSave(data);
        };
    },

    openBacktestConfig(config, callbacks) {
        const modal = this._createOverlay("backtest-modal");
        
        modal.innerHTML = `
            <div class="settings-modal-content" style="width: 320px;">
                <h3>Run Backtest</h3>
                
                <div class="settings-group">
                    <label>Strategy</label>
                    <select id="backtest-strategy" style="width: 100%; padding: 4px;">
                        <option value="sma_crossover">SMA Crossover</option>
                        <option value="rsi_strategy">RSI Reversion</option>
                        <option value="vwap_ema_trend_pullback">VWAP EMA Pullback</option>
                    </select>
                </div>
                
                <div id="bt-params-sma" style="margin-left: 10px; border-left: 2px solid #3b82f6; padding-left: 10px;">
                    <div class="settings-group">
                        <label style="font-size: 11px;">Fast Period</label>
                        <input type="number" id="sma-fast-period" value="10" min="1">
                    </div>
                    <div class="settings-group">
                        <label style="font-size: 11px;">Slow Period</label>
                        <input type="number" id="sma-slow-period" value="50" min="2">
                    </div>
                </div>

                <div id="bt-params-rsi" style="display: none; margin-left: 10px; border-left: 2px solid #3b82f6; padding-left: 10px;">
                    <div class="settings-group">
                        <label style="font-size: 11px;">RSI Period</label>
                        <input type="number" id="rsi-period" value="14" min="2">
                    </div>
                    <div class="settings-group">
                        <label style="font-size: 11px;">Overbought</label>
                        <input type="number" id="rsi-overbought" value="70" min="50" max="100">
                    </div>
                    <div class="settings-group">
                        <label style="font-size: 11px;">Oversold</label>
                        <input type="number" id="rsi-oversold" value="30" min="0" max="50">
                    </div>
                </div>
                
                <div class="settings-group" style="margin-top: 15px;">
                    <label>Symbol</label>
                    <select id="backtest-symbol" style="width: 100%; padding: 4px;"></select>
                </div>
                
                <div class="settings-group">
                    <label>Interval</label>
                    <select id="backtest-interval" style="width: 100%; padding: 4px;"></select>
                </div>
                
                <div class="settings-group">
                    <label>Start Date</label>
                    <input type="date" id="backtest-start-date" style="width: 100%; padding: 4px; background: rgba(0,0,0,0.1); border: 1px solid #394654; color: inherit; border-radius: 3px;">
                </div>
                
                <div class="settings-group">
                    <label>End Date</label>
                    <input type="date" id="backtest-end-date" style="width: 100%; padding: 4px; background: rgba(0,0,0,0.1); border: 1px solid #394654; color: inherit; border-radius: 3px;">
                </div>

                <div id="backtest-error" style="color: #ef4444; font-size: 12px; margin-top: 10px; display: none;"></div>
                <div id="backtest-loading" style="color: #3b82f6; font-size: 12px; margin-top: 10px; display: none;">Running backtest...</div>
                
                <div class="settings-actions" style="margin-top: 20px;">
                    <button id="backtest-cancel">Cancel</button>
                    <button id="backtest-run" style="background: #3b82f6; color: white;">Run Backtest</button>
                </div>
            </div>
        `;
        
        modal.style.display = "flex";

        document.getElementById('backtest-strategy').onchange = (e) => {
            const s = e.target.value;
            document.getElementById('bt-params-sma').style.display = (s === 'sma_crossover') ? 'block' : 'none';
            document.getElementById('bt-params-rsi').style.display = (s === 'rsi_strategy') ? 'block' : 'none';
        };

        const symbolSelect = document.getElementById('backtest-symbol');
        config.symbols.forEach(s => {
            const option = document.createElement('option');
            option.value = s;
            option.textContent = s;
            symbolSelect.appendChild(option);
        });
        symbolSelect.value = config.defaultSymbol;

        const intervalSelect = document.getElementById('backtest-interval');
        config.timeframes.forEach(tf => {
            const option = document.createElement('option');
            option.value = tf;
            option.textContent = tf;
            intervalSelect.appendChild(option);
        });
        intervalSelect.value = config.defaultInterval;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(endDate.getMonth() - 3);
        document.getElementById('backtest-start-date').value = startDate.toISOString().split('T')[0];
        document.getElementById('backtest-end-date').value = endDate.toISOString().split('T')[0];

        document.getElementById("backtest-cancel").onclick = () => {
            if (callbacks.onCancel) callbacks.onCancel();
            this.closeModal("backtest-modal");
        };

        document.getElementById("backtest-run").onclick = async () => {
            const loadingEl = document.getElementById('backtest-loading');
            const errorEl = document.getElementById('backtest-error');
            loadingEl.style.display = 'block';
            errorEl.style.display = 'none';

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
            }

            const payload = {
                strategy: strategy,
                symbol: document.getElementById('backtest-symbol').value,
                interval: document.getElementById('backtest-interval').value,
                startTime: new Date(document.getElementById('backtest-start-date').value).getTime() / 1000,
                endTime: new Date(document.getElementById('backtest-end-date').value).getTime() / 1000,
                parameters: parameters
            };

            if (callbacks.onRun) {
                try {
                    await callbacks.onRun(payload);
                    this.closeModal("backtest-modal");
                } catch (error) {
                    errorEl.textContent = `Error: ${error.message}`;
                    errorEl.style.display = 'block';
                    loadingEl.style.display = 'none';
                }
            }
        };
    },

    renderReplayAnalyticsPanel(container, config) {
        let panel = document.getElementById(config.panelId);
        if (!panel) {
            panel = document.createElement("div");
            panel.id = config.panelId;
            panel.className = "replay-analytics-panel-embedded";
            panel.style.cssText = `
                position: absolute;
                top: 20px;
                right: 20px;
                bottom: auto !important;
                height: fit-content !important;
                min-height: unset !important;
                width: 250px;
                transform: scale(0.8);
                transform-origin: top right;
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
            if (container) {
                container.appendChild(panel);
            } else {
                document.body.appendChild(panel);
            }
        }
        
        panel.innerHTML = `
            <h3 style="margin-top:0; color:#3b82f6; font-size:14px; border-bottom: 1px solid #394654; padding-bottom:8px;">Replay Statistics</h3>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Starting Balance:</span> <span>${config.initialBalance.toFixed(2)} OHM</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Current Equity:</span> <span>${config.currentEquity.toFixed(2)} OHM</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Net PnL:</span> <span style="color:${config.netPnl>=0?'#10b981':'#ef4444'}">${config.netPnl>=0?'+':''}${config.netPnl.toFixed(2)} OHM</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Win Rate:</span> <span>${config.winRate}%</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Total Trades:</span> <span>${config.totalTrades}</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Average Win:</span> <span style="color:#10b981">+${config.avgWin.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Average Loss:</span> <span style="color:#ef4444">-${Math.abs(config.avgLoss).toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Largest Win:</span> <span style="color:#10b981">+${config.largestWin.toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Largest Loss:</span> <span style="color:#ef4444">-${Math.abs(config.largestLoss).toFixed(2)}</span></div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:12px;"><span>Profit Factor:</span> <span>${config.profitFactor}</span></div>
        `;
    }
};

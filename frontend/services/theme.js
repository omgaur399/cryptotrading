const ThemeService = (() => {
function injectThemeStyles() {
    const style = document.createElement('style');
    style.id = "theme-styles";
    style.textContent = `
        body.light-theme {
            --primary-bg: #f8fafc;
            --secondary-bg: #ffffff;
            --text-primary: #0f172a;
            --border-color: #cbd5e1;
        }
        body.light-theme .chart-pane {
            background-color: var(--secondary-bg);
            border-color: var(--border-color);
        }
        body.light-theme .pane-header {
            border-bottom-color: var(--border-color);
        }
        body.light-theme .symbol-select-input, 
        body.light-theme .pane-select {
            background-color: #f1f5f9;
            color: #0f172a;
            border-color: #cbd5e1;
        }
        body.light-theme .custom-select-dropdown {
            background-color: #ffffff;
            border-color: #cbd5e1;
        }
        body.light-theme .custom-select-option:hover {
            background-color: #f1f5f9;
        }
        body.light-theme .chart-message,
        body.light-theme .ticker-symbol {
            color: var(--text-primary);
        }
        .chart-message {
            pointer-events: none;
        }
        .theme-btn, #chart-count {
            background-color: transparent !important;
            color: #d8dee8 !important;
            border: 1px solid #394654 !important;
            padding: 4px 10px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            font-family: inherit;
            transition: background-color 150ms ease, border-color 150ms ease;
        }
        .theme-btn:hover, #chart-count:hover {
            background-color: rgba(255, 255, 255, 0.08) !important;
            border-color: #64748b !important;
        }
        .theme-btn option, #chart-count option {
            background-color: #151b23;
            color: #d8dee8;
        }
        body.light-theme .theme-btn, body.light-theme #chart-count {
            background-color: transparent !important;
            color: #0f172a !important;
            border-color: #cbd5e1 !important;
        }
        body.light-theme .theme-btn:hover, body.light-theme #chart-count:hover {
            background-color: rgba(15, 23, 42, 0.06) !important;
            border-color: #94a3b8 !important;
        }
        body.light-theme .theme-btn option, body.light-theme #chart-count option {
            background-color: #ffffff;
            color: #0f172a;
        }
        
        .symbol-select-container {
            position: relative;
            display: inline-flex;
            align-items: center;
        }
        .symbol-select-input {
            width: 65px !important;
            padding-left: 4px !important;
            padding-right: 16px !important;
            box-sizing: border-box !important;
            cursor: pointer;
            font-size: 12px !important;
            margin: 0 !important;
        }
        .dropdown-arrow {
            position: absolute;
            right: 4px;
            pointer-events: none;
            color: #8b9bb0;
        }
        .layout-6 .symbol-select-input,
        .layout-8 .symbol-select-input {
            width: 52px !important;
            padding-left: 4px !important;
            padding-right: 16px !important;
            font-size: 11px !important;
        }
        .layout-6 .dropdown-arrow,
        .layout-8 .dropdown-arrow {
            width: 10px;
            height: 10px;
        }
        .layout-6 .pane-controls,
        .layout-8 .pane-controls {
            gap: 2px !important;
        }
        
        /* Sidebar Tabs Implementation */
        .sidebar-tabbed { flex-direction: column !important; }
        .sidebar-tabs-header { display: flex; background: #1e293b; border-bottom: 1px solid #394654; flex-shrink: 0; }
        body.light-theme .sidebar-tabs-header { background: #f1f5f9; border-bottom-color: #cbd5e1; }
        .sidebar-tab { flex: 1; text-align: center; padding: 10px 0; font-size: 12px; font-weight: 600; cursor: pointer; color: #8b9bb0; border-bottom: 2px solid transparent; transition: all 0.2s; }
        body.light-theme .sidebar-tab { color: #64748b; }
        .sidebar-tab.active { color: #3b82f6; border-bottom-color: #3b82f6; background: rgba(59, 130, 246, 0.1); }
        .sidebar-slider-tabs { display: flex; width: 300%; height: 100%; transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .sidebar-panel { width: 33.3333%; height: 100%; overflow-y: auto; flex-shrink: 0; }

        /* Paper Trading Module CSS */
        .pt-container { padding: 16px; font-family: inherit; font-size: 13px; color: #d8dee8; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; }
        body.light-theme .pt-container { color: #0f172a; }
        .pt-header { background: #151b23; border: 1px solid #394654; padding: 12px; border-radius: 6px; }
        body.light-theme .pt-header { background: #ffffff; border-color: #cbd5e1; }
        .pt-title { font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #3b82f6; letter-spacing: 1px; }
        .pt-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .pt-stat-box { display: flex; flex-direction: column; }
        .pt-label { font-size: 11px; color: #8b9bb0; text-transform: uppercase; }
        body.light-theme .pt-label { color: #64748b; }
        .pt-value { font-size: 14px; font-weight: 600; }
        .pt-green { color: #10b981 !important; }
        .pt-red { color: #ef4444 !important; }
        .pt-form-group { margin-bottom: 10px; display: flex; flex-direction: column; gap: 4px; }
        .pt-input { background: #0f1419; color: #d8dee8; border: 1px solid #394654; padding: 8px; border-radius: 4px; font-size: 13px; width: 100%; box-sizing: border-box;}
        body.light-theme .pt-input { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
        .pt-btn-group { display: flex; gap: 8px; margin-top: 12px; }
        .pt-btn { flex: 1; padding: 10px; font-weight: 700; border: none; border-radius: 4px; cursor: pointer; color: white; transition: opacity 0.2s; }
        .pt-btn:hover { opacity: 0.9; }
        .pt-buy-btn { background: #10b981; }
        .pt-sell-btn { background: #ef4444; }
        .pt-close-btn { background: #394654; color: white; padding: 4px 8px; border: none; border-radius: 4px; cursor: pointer; font-size: 11px;}
        body.light-theme .pt-close-btn { background: #e2e8f0; color: #0f172a; }
        .pt-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .pt-table th, .pt-table td { padding: 6px 4px; text-align: left; border-bottom: 1px solid #394654; }
        body.light-theme .pt-table th, body.light-theme .pt-table td { border-bottom-color: #cbd5e1; }
        .pt-table th { color: #8b9bb0; font-weight: normal; }
        body.light-theme .pt-table th { color: #64748b; }
        .pt-section { border-top: 1px dashed #394654; padding-top: 16px; }
        body.light-theme .pt-section { border-top-color: #cbd5e1; }
        .pt-collapsible-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; font-weight: 700; color: #8b9bb0; text-transform: uppercase; font-size: 12px; }
        body.light-theme .pt-collapsible-header { color: #64748b; }
        .pt-collapsible-content { display: none; margin-top: 12px; }
        .pt-collapsible-content.open { display: block; }

        .layout-8 .ticker-change {
            display: none !important;
        }
        .layout-8 .ticker-symbol {
            font-size: 11px !important;
        }
        .pane-controls {
            display: flex !important;
            align-items: center !important;
            gap: 4px !important;
            flex-wrap: nowrap !important;
        }
        /* CRITICAL FIX: Ensure dropdown is not hidden by header overflow clipping */
        .chart-pane, .pane-header, .pane-controls {
            overflow: visible !important;
        }
        .custom-select-dropdown {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            min-width: 100%;
            z-index: 1000;
            background-color: #151b23;
            border: 1px solid #394654;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            margin-top: 4px;
            max-height: 300px !important;
            overflow-y: auto !important;
        }
        .custom-select-dropdown.show {
            display: block;
        }
        .custom-select-option {
            display: flex !important;
            align-items: center !important;
            transition: background-color 0.15s ease !important;
            cursor: pointer;
            padding: 6px 10px;
        }
        .custom-select-option.highlighted, .custom-select-option:hover {
            background-color: rgba(59, 130, 246, 0.2) !important;
        }
        body.light-theme .custom-select-option.highlighted, body.light-theme .custom-select-option:hover {
            background-color: rgba(59, 130, 246, 0.1) !important;
        }
        .option-symbol {
            font-weight: 600;
        }

        /* Compact top header to maximize chart area */
        header, .header, .dashboard-header {
            padding: 6px 16px !important;
            min-height: unset !important;
            display: flex !important;
            align-items: center !important;
        }
        header h1, .header h1, .dashboard-header h1 {
            font-size: 18px !important;
            margin: 0 !important;
            line-height: 1 !important;
        }
        #chart-count, .theme-btn {
            padding-top: 2px !important;
            padding-bottom: 2px !important;
            height: 26px !important;
        }

        /* Compact footer to prevent scrolling */
        footer, .footer, .status-bar, #status-bar {
            height: 24px !important;
            min-height: 24px !important;
            padding: 0 16px !important;
            display: flex !important;
            align-items: center !important;
        }
        .status-indicator, #timestamp, #data-status {
            font-size: 11px !important;
        }

        /* Lock body to screen and prevent scrolling completely */
        html, body {
            overflow: hidden !important;
        }

        /* Ensure grid expands dynamically */
        .charts-grid {
            height: 100% !important;
            min-height: 0 !important;
        }
        .chart-pane, .chart-container {
            min-height: 0 !important;
        }
        .chart-container {
            overflow: hidden !important;
        }

        /* Prevent countdown timer from blocking mouse events on the chart */
        .countdown-timer {
            pointer-events: none;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            height: 22px !important;
            padding: 1px 0 !important;
            box-sizing: border-box !important;
            gap: 0px !important;
        }
        .countdown-timer span {
            font-size: 10.5px !important;
            line-height: 1 !important;
            margin: 0 !important;
            padding: 0 !important;
        }
        .countdown-timer .timer-val {
            font-size: 9px !important;
            line-height: 1 !important;
            opacity: 0.85 !important;
        }

        /* Market Ticker Styles */
        .market-ticker-container {
            display: flex;
            flex-direction: column;
            background-color: #151b23;
            border-bottom: 1px solid #394654;
            font-family: inherit;
            overflow: hidden;
            flex-shrink: 0;
        }
        .ticker-row {
            display: flex;
            align-items: center;
            height: 18px;
            border-bottom: 1px solid rgba(57, 70, 84, 0.3);
        }
        .ticker-row:last-child {
            border-bottom: none;
        }
        .ticker-label {
            padding: 0 8px;
            font-weight: 700;
            font-size: 9px;
            letter-spacing: 0.5px;
            white-space: nowrap;
            z-index: 10;
            background-color: #151b23;
            box-shadow: 5px 0 5px -2px #151b23;
            display: flex;
            align-items: center;
            height: 100%;
        }
        .gainers-label { color: #10b981; }
        .losers-label { color: #ef4444; }
        .ticker-scroll-wrapper {
            flex: 1;
            overflow: hidden;
            position: relative;
            display: flex;
            align-items: center;
            height: 100%;
            mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent);
            -webkit-mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent);
        }
        .ticker-scroll {
            display: flex;
            width: max-content;
            animation: ticker-scroll 45s linear infinite;
        }
        .ticker-content {
            display: flex;
        }
        .market-ticker-item {
            display: inline-flex;
            align-items: center;
            margin-right: 16px;
            gap: 4px;
            cursor: pointer;
            padding: 1px 4px;
            border-radius: 3px;
            transition: background-color 0.2s ease;
            border: 1px solid transparent;
        }
        .market-ticker-item.active-mover {
            border-color: #3b82f6;
            background-color: rgba(59, 130, 246, 0.1);
        }
        .market-ticker-symbol {
            font-weight: 600;
            color: #d8dee8;
            font-size: 10.5px;
        }
        .market-ticker-percent {
            font-weight: 700;
            font-size: 10.5px;
        }
        .market-ticker-percent.up { color: #10b981; }
        .market-ticker-percent.down { color: #ef4444; }
        @keyframes ticker-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        body.light-theme .market-ticker-container,
        body.light-theme .ticker-label {
            background-color: #f8fafc;
            box-shadow: 5px 0 5px -2px #f8fafc;
        }
        body.light-theme .market-ticker-container { border-color: #cbd5e1; }
        body.light-theme .ticker-row { border-bottom: 1px solid rgba(203, 213, 225, 0.5); }
        body.light-theme .market-ticker-symbol { color: #0f172a; }
        body.light-theme .market-ticker-item.active-mover {
            background-color: rgba(59, 130, 246, 0.15);
        }

        /* Hover Icon & Drag Interactions */
        .hover-delete-btn {
            position: absolute !important;
            width: 18px !important;
            height: 18px !important;
            min-width: 18px !important;
            max-width: 18px !important;
            min-height: 18px !important;
            max-height: 18px !important;
            background: #151b23;
            color: #ef4444;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 100;
            font-size: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.4);
            pointer-events: none;
            border: 1px solid #394654;
            transition: background-color 0.1s ease, color 0.1s ease, border-color 0.1s ease !important;
            box-sizing: border-box;
            padding: 0;
            margin: 0;
            line-height: 1;
        }
        body.light-theme .hover-delete-btn {
            background: #ffffff;
            border-color: #cbd5e1;
        }
        .hover-delete-btn:hover, .hover-delete-btn.hovered {
            background: #ef4444;
            color: white;
            border-color: #ef4444;
        }
        .hover-add-alert-btn {
            position: absolute !important;
            width: 18px !important;
            height: 18px !important;
            min-width: 18px !important;
            max-width: 18px !important;
            min-height: 18px !important;
            max-height: 18px !important;
            background: #151b23;
            color: #10b981;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 100;
            font-size: 14px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.4);
            pointer-events: none;
            border: 1px solid #394654;
            transition: background-color 0.1s ease, color 0.1s ease, border-color 0.1s ease !important;
            box-sizing: border-box;
            padding: 0;
            margin: 0;
            line-height: 1;
            font-weight: bold;
        }
        body.light-theme .hover-add-alert-btn {
            background: #ffffff;
            border-color: #cbd5e1;
        }
        .hover-add-alert-btn:hover, .hover-add-alert-btn.hovered {
            background: #10b981;
            color: white;
            border-color: #10b981;
        }
        .chart-container.hovering-hline,
        .chart-container.hovering-hline * {
            cursor: ns-resize !important;
        }
        .chart-container.hovering-vline,
        .chart-container.hovering-vline * {
            cursor: pointer !important;
        }
        .chart-container.hovering-btn,
        .chart-container.hovering-btn * {
            cursor: pointer !important;
        }
        .vertical-line-drawing {
            cursor: pointer;
        }
        .vertical-line-drawing:hover {
            box-shadow: 0 0 4px 1px rgba(0,0,0,0.5);
            opacity: 0.8;
        }
        body.light-theme .vertical-line-drawing:hover {
            box-shadow: 0 0 4px 1px rgba(255,255,255,0.5);
        }
        .alert-popup {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #f59e0b;
            color: #fff;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 9999;
            transition: opacity 0.3s ease;
            font-family: inherit;
            pointer-events: none;
        }

        .settings-modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        .settings-modal-content {
            background: #151b23;
            padding: 24px;
            border-radius: 8px;
            border: 1px solid #394654;
            width: 320px;
            max-height: 85vh;
            overflow-y: auto;
            color: #d8dee8;
            font-family: inherit;
        }
        body.light-theme .settings-modal-content {
            background: #ffffff;
            border-color: #cbd5e1;
            color: #0f172a;
        }
        .settings-modal-content h3 {
            margin-top: 0;
            margin-bottom: 16px;
            font-size: 16px;
        }
        .settings-group {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
        }
        .settings-group label {
            font-size: 13px;
        }
        .settings-group input[type="number"], .settings-group select {
            width: 80px;
            background: #0f1419;
            color: #d8dee8;
            border: 1px solid #394654;
            border-radius: 4px;
            padding: 4px;
            font-size: 13px;
        }
        body.light-theme .settings-group input[type="number"], body.light-theme .settings-group select {
            background: #f1f5f9;
            color: #0f172a;
            border-color: #cbd5e1;
        }
        .settings-group input[type="color"] {
            width: 40px;
            height: 24px;
            padding: 0;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            background: transparent;
        }
        .settings-actions {
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 20px;
        }
        .settings-actions button {
            padding: 6px 16px;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            font-family: inherit;
            font-size: 13px;
        }
        #settings-cancel-btn {
            background: #394654;
            color: white;
        }
        body.light-theme #settings-cancel-btn {
            background: #e2e8f0;
            color: #0f172a;
        }
        #settings-save-btn {
            background: #10b981;
            color: white;
        }
        #line-cancel-btn { background: #394654; color: white; }
        body.light-theme #line-cancel-btn { background: #e2e8f0; color: #0f172a; }
        #line-save-btn { background: #10b981; color: white; }
        #line-delete-btn { background: #ef4444; color: white; margin-right: auto; }
        .settings-btn {
            background: transparent;
            border: none;
            cursor: pointer;
            font-size: 16px;
            padding: 4px;
            margin-left: 4px;
            opacity: 0.7;
        }
        .settings-btn:hover {
            opacity: 1;
        }
        /* Active Chart Pane Highlight */
        .chart-pane.active-chart {
            border: 1px solid #3b82f6;
            box-shadow: 0 0 8px -2px rgba(59, 130, 246, 0.5);
        }
        body.light-theme .chart-pane.active-chart {
            border: 1px solid #3b82f6;
            box-shadow: 0 0 8px -1px rgba(59, 130, 246, 0.4);
        }
        
        /* Asset Info Panel Styles */
        .charts-grid.layout-1.with-info-panel {
            display: grid;
            grid-template-columns: 1fr 280px;
            gap: 12px;
            /* Lock grid height to screen view to prevent panel from stretching it */
            height: calc(100vh - 105px) !important;
        }
        /* Force children to respect grid height so overflow scrolling kicks in */
        .charts-grid.layout-1.with-info-panel > * {
            min-height: 0;
        }
        .charts-grid.layout-1.with-info-panel .chart-pane {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        .charts-grid.layout-1.with-info-panel .chart-container {
            flex: 1;
            min-height: 0;
        }
        @media (max-width: 1024px) {
            .charts-grid.layout-1.with-info-panel {
                grid-template-columns: 1fr;
                height: auto;
            }
            .charts-grid.layout-1.with-info-panel .chart-pane {
                height: 60vh;
            }
        }
        
        .right-sidebar-wrapper {
            background-color: #151b23;
            border: 1px solid #394654;
            border-radius: 8px;
            display: flex;
            flex-direction: row;
            height: 100%;
            overflow: hidden;
            color: #d8dee8;
            font-family: inherit;
        }
        body.light-theme .right-sidebar-wrapper {
            background-color: #ffffff;
            border-color: #cbd5e1;
            color: #0f172a;
        }
        .sidebar-viewport {
            flex: 1;
            overflow: hidden;
            position: relative;
        }
        .sidebar-slider {
            display: flex;
            width: 200%;
            height: 100%;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .asset-info-panel, .order-book-panel {
            width: 33.3333%;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            height: 100%;
            background: transparent;
            border: none;
            border-radius: 0;
            flex-shrink: 0;
        }
        .ob-toggle-btn {
            width: 18px;
            background: #1e293b;
            color: #8b9bb0;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-left: 1px solid #394654;
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 2px;
            writing-mode: vertical-rl;
            text-orientation: mixed;
            user-select: none;
            transition: background 0.2s, color 0.2s;
            flex-shrink: 0;
        }
        body.light-theme .ob-toggle-btn {
            background: #f1f5f9;
            color: #64748b;
            border-left-color: #cbd5e1;
        }
        .ob-toggle-btn:hover {
            background: #334155;
            color: #ffffff;
        }
        body.light-theme .ob-toggle-btn:hover {
            background: #e2e8f0;
            color: #0f172a;
        }
        /* Order Book Styles */
        .ob-header {
            padding: 16px;
            border-bottom: 1px solid #394654;
            text-align: center;
            flex-shrink: 0;
        }
        body.light-theme .ob-header {
            border-bottom-color: #cbd5e1;
        }
        .ob-symbol-name {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 4px;
        }
        .ob-price-row {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
        }
        .ob-current-price {
            font-size: 18px;
            font-weight: 700;
        }
        .ob-24h-change {
            font-size: 13px;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 4px;
        }
        .ob-col-headers {
            display: flex;
            justify-content: space-between;
            padding: 8px 16px;
            color: #8b9bb0;
            font-weight: 600;
            border-bottom: 1px solid #394654;
            flex-shrink: 0;
        }
        body.light-theme .ob-col-headers {
            color: #64748b;
            border-bottom-color: #cbd5e1;
        }
        .ob-scroll-container {
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            font-size: 12px;
            position: relative;
        }
        .ob-asks, .ob-bids {
            display: flex;
            flex-direction: column;
        }
        .ob-asks {
            justify-content: flex-end;
        }
        .ob-row {
            display: flex;
            justify-content: space-between;
            padding: 2px 16px;
            position: relative;
        }
        .ob-row span {
            z-index: 1;
        }
        .ob-ask-price { color: #ef4444; font-weight: 500; }
        .ob-bid-price { color: #10b981; font-weight: 500; }
        .ob-size { color: #d8dee8; }
        body.light-theme .ob-size { color: #0f172a; }
        .ob-spread {
            text-align: center;
            padding: 6px 0;
            margin: 4px 0;
            border-top: 1px solid #394654;
            border-bottom: 1px solid #394654;
            color: #8b9bb0;
            font-weight: 600;
            flex-shrink: 0;
        }
        body.light-theme .ob-spread {
            border-top-color: #cbd5e1;
            border-bottom-color: #cbd5e1;
            color: #64748b;
        }
        .ob-bg {
            position: absolute;
            top: 0;
            right: 0;
            height: 100%;
            opacity: 0.15;
            z-index: 0;
            transition: width 0.1s;
        }
        .ob-ask-bg { background-color: #ef4444; }
        .ob-bid-bg { background-color: #10b981; }
        .info-panel-content {
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .info-panel-message {
            text-align: center;
            padding: 40px 20px;
            color: #8b9bb0;
            font-size: 14px;
        }
        .info-header {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .info-logo {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 18px;
            color: #fff;
        }
        .info-title h2 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }
        .info-symbol {
            font-size: 13px;
            color: #8b9bb0;
            text-transform: uppercase;
        }
        .info-price-section {
            display: flex;
            align-items: baseline;
            gap: 12px;
        }
        .info-price {
            font-size: 28px;
            font-weight: 700;
        }
        .info-change {
            font-size: 14px;
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 4px;
        }
        .perf-up {
            color: #10b981;
            background: rgba(16, 185, 129, 0.1);
        }
        .perf-down {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
        }
        .info-section h3 {
            margin: 0 0 12px 0;
            font-size: 14px;
            color: #8b9bb0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #394654;
            padding-bottom: 6px;
        }
        body.light-theme .info-section h3 {
            color: #64748b;
            border-bottom-color: #cbd5e1;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px 16px;
        }
        .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .info-label {
            font-size: 12px;
            color: #8b9bb0;
        }
        body.light-theme .info-label {
            color: #64748b;
        }
        .info-value {
            font-size: 14px;
            font-weight: 500;
        }
        .perf-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
            gap: 8px;
        }
        .perf-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 8px 4px;
            border-radius: 6px;
            gap: 4px;
        }
        .perf-period {
            font-size: 11px;
            opacity: 0.8;
            font-weight: 600;
        }
        .perf-val {
            font-size: 13px;
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);
}

function getChartThemeOptions(isLight) {
    return {
        layout: {
            background: { color: isLight ? "#ffffff" : "#11161d" },
            textColor: isLight ? "#1e293b" : "#d8dee8",
            fontSize: 10, // Reduce native chart text size to shrink axis width
        },
        grid: {
            vertLines: { color: isLight ? "#f1f5f9" : "#26313d" },
            horzLines: { color: isLight ? "#f1f5f9" : "#26313d" },
        },
        timeScale: { borderColor: isLight ? "#cbd5e1" : "#394654" },
        rightPriceScale: { borderColor: isLight ? "#cbd5e1" : "#394654" },
        crosshair: {
            mode: 0, // CrosshairMode.Normal - free moving crosshair instead of magnet snapping
            horzLine: { color: isLight ? "#64748b" : "#8b9bb0", style: 1, labelBackgroundColor: isLight ? "#334155" : "#151b23" },
            vertLine: { color: isLight ? "#64748b" : "#8b9bb0", style: 1, labelBackgroundColor: isLight ? "#334155" : "#151b23" }
        }
    };
}

    return {
        injectThemeStyles,
        getChartThemeOptions
    };
})();

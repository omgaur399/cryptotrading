const ContextMenuService = (() => {
    let deps = {};

    const state = {
        el: null,
        chartData: null,
        price: null,
        visible: false,
    };

    function initialize(injected) {
        deps = injected;
    }

    function init() {
        state.el = document.getElementById('chart-context-menu');
        if (!state.el) return;

        // Wire buttons
        document.getElementById('ctx-add-alert').addEventListener('click', () => {
            hide();
            if (state.chartData && state.price !== null) {
                if (deps.AlertService && typeof deps.AlertService.AlertModal.open === 'function') {
                    deps.AlertService.AlertModal.open(state.chartData, state.price);
                }
            }
        });

        document.getElementById('ctx-draw-hline').addEventListener('click', () => {
            hide();
            if (state.chartData && state.price !== null) {
                addHLine(state.chartData, state.price);
            }
        });

        document.getElementById('ctx-copy-price').addEventListener('click', () => {
            hide();
            if (state.price !== null) {
                const str = state.price < 1 ? state.price.toFixed(4) : state.price.toFixed(2);
                navigator.clipboard.writeText(str).catch(() => {});
            }
        });

        document.getElementById('ctx-copy-symbol').addEventListener('click', () => {
            hide();
            if (state.chartData) {
                navigator.clipboard.writeText(state.chartData.symbol).catch(() => {});
            }
        });

        // Dismiss on outside click
        document.addEventListener('mousedown', (e) => {
            if (state.visible && state.el && !state.el.contains(e.target)) {
                hide();
            }
        });

        // Dismiss on scroll
        document.addEventListener('scroll', hide, true);

        // Dismiss on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && state.visible) hide();
        });
    }

    function show(chartData, x, y, price) {
        if (!state.el) return;

        state.chartData = chartData;
        state.price = price;

        // Update header
        const header = document.getElementById('ctx-menu-header');
        if (header) {
            const sym = chartData ? chartData.symbol : '—';
            const priceStr = price !== null ? (price < 1 ? price.toFixed(4) : price.toFixed(2)) : '—';
            header.textContent = `${sym}  ·  ${priceStr}`;
        }

        // Position — keep within viewport
        state.el.style.display = 'flex';
        state.el.style.opacity = '0';
        state.el.style.transform = 'scale(0.95) translateY(-4px)';
        state.el.style.pointerEvents = 'none';

        const rect = state.el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const mx = Math.min(x, vw - rect.width - 8);
        const my = Math.min(y, vh - rect.height - 8);

        state.el.style.left = `${mx}px`;
        state.el.style.top  = `${my}px`;
        state.el.style.transformOrigin = 'top left';

        // Animate in via rAF
        requestAnimationFrame(() => {
            state.el.classList.add('visible');
            state.visible = true;
        });
    }

    function hide() {
        if (!state.el) return;
        state.el.classList.remove('visible');
        state.visible = false;

        // After transition, set display:none
        setTimeout(() => {
            if (!state.visible && state.el) {
                state.el.style.display = 'none';
            }
        }, 150);
    }

    function addHLine(chartData, price) {
        if (!chartData || price === null || !chartData.candleSeries) return;

        const key = chartData.symbol;
        if (!deps.state) return;
        if (!deps.state.drawings[key]) deps.state.drawings[key] = [];

        const id = Date.now().toString() + Math.random().toString().slice(2, 6);
        const isLight = deps.state.theme === 'light';
        const color = isLight ? '#3b82f6' : '#60a5fa';
        const lineObj = {
            type: 'horizontalLine',
            symbol: chartData.symbol,
            price: price,
            id: id,
            color: color,
            lineWidth: 1,
            lineStyle: 2, // dashed
        };
        deps.state.drawings[key].push(lineObj);

        // Render on all charts showing this symbol
        Object.values(deps.state.charts).forEach(cd => {
            if (cd.symbol === chartData.symbol && cd.candleSeries) {
                if (!cd.renderedDrawings) cd.renderedDrawings = {};
                try {
                    const pl = cd.candleSeries.createPriceLine({
                        price: lineObj.price,
                        color: lineObj.color,
                        lineWidth: lineObj.lineWidth,
                        lineStyle: lineObj.lineStyle,
                        axisLabelVisible: true,
                        title: '',
                    });
                    cd.renderedDrawings[id] = pl;
                } catch(e) {
                    console.warn('Could not create price line:', e);
                }
            }
        });

        if (typeof deps.saveDrawings === 'function') deps.saveDrawings();
    }

    function attach(chartData) {
        const container = document.getElementById(`${chartData.id}-container`);
        if (!container) return;

        container.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (!chartData.candleSeries) return;

            const rect = container.getBoundingClientRect();
            const y = e.clientY - rect.top;
            const price = chartData.candleSeries.coordinateToPrice(y);

            show(chartData, e.clientX, e.clientY, price);
        });
    }

    return {
        initialize,
        init,
        show,
        hide,
        attach
    };
})();

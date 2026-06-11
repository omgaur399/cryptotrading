// Lightweight Charts SVG fallback.
// Used only when the CDN bundle is unavailable.

if (!window.LightweightCharts) {
    const SVG_NS = "http://www.w3.org/2000/svg";

    const LightweightCharts = (() => {
        class ChartImpl {
            constructor(container, options = {}) {
                this.container = container;
                this.options = options;
                this.width = Math.max(container.clientWidth || 800, 240);
                this.height = Math.max(container.clientHeight || 360, 220);
                this.series = [];

                container.innerHTML = "";
                this.svg = document.createElementNS(SVG_NS, "svg");
                this.svg.setAttribute("class", "fallback-chart");
                this.svg.setAttribute("width", this.width);
                this.svg.setAttribute("height", this.height);
                this.svg.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`);
                container.appendChild(this.svg);

                this.gridGroup = document.createElementNS(SVG_NS, "g");
                this.plotGroup = document.createElementNS(SVG_NS, "g");
                this.axisGroup = document.createElementNS(SVG_NS, "g");
                this.svg.appendChild(this.gridGroup);
                this.svg.appendChild(this.plotGroup);
                this.svg.appendChild(this.axisGroup);
                this._drawGrid();

                // Prevent the scrollable parent (main.dashboard-main) from scrolling
                // when the user accidentally scrolls over the fallback chart.
                this.container.addEventListener('wheel', (e) => {
                    e.preventDefault();
                }, { passive: false });

                this.resizeObserver = new ResizeObserver(() => {
                    this.width = Math.max(container.clientWidth || 800, 240);
                    this.height = Math.max(container.clientHeight || 360, 220);
                    this.svg.setAttribute("width", this.width);
                    this.svg.setAttribute("height", this.height);
                    this.svg.setAttribute("viewBox", `0 0 ${this.width} ${this.height}`);
                    this._redraw();
                });
                this.resizeObserver.observe(container);
            }

            applyOptions(options) {
                this.options = {
                    ...this.options,
                    ...options,
                    layout: { ...(this.options.layout || {}), ...(options.layout || {}) },
                    grid: { ...(this.options.grid || {}), ...(options.grid || {}) },
                    timeScale: { ...(this.options.timeScale || {}), ...(options.timeScale || {}) }
                };
                this.svg.style.backgroundColor = this.options.layout?.background?.color || 'transparent';
                this._redraw();
            }

            _clear(group) {
                while (group.lastChild) group.removeChild(group.lastChild);
            }

            _drawGrid() {
                this._clear(this.gridGroup);
                const verticals = 8;
                const horizontals = 5;
                const gridColor = this.options.grid?.vertLines?.color || "#1f3347";

                for (let i = 0; i <= verticals; i += 1) {
                    const x = (this.width / verticals) * i;
                    this.gridGroup.appendChild(line(x, 0, x, this.height, gridColor, 0.8));
                }

                for (let i = 0; i <= horizontals; i += 1) {
                    const y = (this.height / horizontals) * i;
                    this.gridGroup.appendChild(line(0, y, this.width, y, gridColor, 0.8));
                }
            }

            addCandlestickSeries(options = {}) {
                const series = new CandlestickSeriesImpl(this, options);
                this.series.push(series);
                return series;
            }

            addHistogramSeries(options = {}) {
                const series = {
                    options: options,
                    setData: () => {}, // Handled directly inside CandlestickSeriesImpl for the fallback
                    update: () => {},
                    priceScale: () => ({ applyOptions: () => {} }),
                    applyOptions: (newOpts) => {
                        Object.assign(options, newOpts);
                        this._redraw();
                    }
                };
                this.volumeSeries = series;
                return series;
            }

            addLineSeries(options = {}) {
                const series = new LineSeriesImpl(this, options);
                this.series.push(series);
                return series;
            }

            priceScale(id) {
                return { applyOptions: () => {} };
            }

            timeScale() {
                return { 
                    fitContent: () => {},
                    scrollToRealTime: () => {},
                    applyOptions: () => {},
                };
            }

            _redraw() {
                this._drawGrid();
                this.series.forEach(series => series._draw());
            }

            remove() {
                if (this.resizeObserver) this.resizeObserver.disconnect();
                this.container.innerHTML = "";
                this.series = [];
            }
        }

        class CandlestickSeriesImpl {
            constructor(chart, options = {}) {
                this.chart = chart;
                this.options = options;
                this.candles = [];
                this.group = document.createElementNS(SVG_NS, "g");
                this.chart.plotGroup.appendChild(this.group);
            }

            applyOptions(options) {
                Object.assign(this.options, options);
            }

            priceToCoordinate(price) {
                return this.scaleY ? this.scaleY(price) : null;
            }

            setData(data) {
                this.candles = Array.isArray(data) ? data.slice() : [];
                this._draw();
            }

            update(candle) {
                const last = this.candles[this.candles.length - 1];
                if (last && last.time === candle.time) {
                    this.candles[this.candles.length - 1] = candle;
                } else {
                    this.candles.push(candle);
                }
                this._draw();
            }

            _draw() {
                clear(this.group);
                clear(this.chart.axisGroup);
                if (!this.candles.length) return;

                const plot = {
                    left: 10,
                    right: 68,
                    top: 12,
                    bottom: 24,
                };
                const plotWidth = Math.max(this.chart.width - plot.left - plot.right, 120);
                const plotHeight = Math.max(this.chart.height - plot.top - plot.bottom, 120);
                const targetWidth = this.chart.width >= 700 ? 7 : 5;
                const visibleCount = Math.max(24, Math.floor(plotWidth / targetWidth));
                const visible = this.candles.slice(-visibleCount);

                let minPrice = Infinity;
                let maxPrice = -Infinity;
                let maxVolume = 0;
                visible.forEach(candle => {
                    minPrice = Math.min(minPrice, candle.low);
                    maxPrice = Math.max(maxPrice, candle.high);
                    maxVolume = Math.max(maxVolume, candle.volume || 0);
                });

                const range = maxPrice - minPrice || Math.max(maxPrice * 0.002, 1);
                minPrice -= range * 0.08;
                maxPrice += range * 0.08;

                // Reserve bottom 25% of the plot for volume
                const candlePlotHeight = plotHeight * 0.75;
                const scaleY = price => plot.top + ((maxPrice - price) / (maxPrice - minPrice)) * candlePlotHeight;
                this.scaleY = scaleY; // Store for priceToCoordinate calculations
                
                const volumeScaleY = vol => plot.top + plotHeight - (vol / (maxVolume || 1)) * (plotHeight * 0.25);

                const slot = plotWidth / visible.length;
                this.visibleCandles = visible; // Expose for line series overlays
                this.slot = slot;
                this.plot = plot;
                const bodyWidth = Math.max(2, Math.min(9, slot * 0.64));

                visible.forEach((candle, index) => {
                    const x = plot.left + slot * index + slot / 2;
                    const openY = scaleY(candle.open);
                    const closeY = scaleY(candle.close);
                    const highY = scaleY(candle.high);
                    const lowY = scaleY(candle.low);
                    const up = candle.close >= candle.open;
                    const color = up ? "#16a34a" : "#dc2626";

                    // Draw volume
                    const volumeVisible = !this.chart.volumeSeries || this.chart.volumeSeries.options.visible !== false;
                    if (candle.volume && volumeVisible) {
                        const volY = volumeScaleY(candle.volume);
                        const volHeight = Math.max(1, (plot.top + plotHeight) - volY);
                        const volBody = document.createElementNS(SVG_NS, "rect");
                        volBody.setAttribute("x", x - bodyWidth / 2);
                        volBody.setAttribute("y", volY);
                        volBody.setAttribute("width", bodyWidth);
                        volBody.setAttribute("height", volHeight);
                        volBody.setAttribute("fill", up ? "rgba(22, 163, 74, 0.4)" : "rgba(220, 38, 38, 0.4)");
                        this.group.appendChild(volBody);
                    }

                    this.group.appendChild(line(x, highY, x, lowY, color, 1.2));

                    const bodyY = Math.min(openY, closeY);
                    const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
                    const body = document.createElementNS(SVG_NS, "rect");
                    body.setAttribute("x", x - bodyWidth / 2);
                    body.setAttribute("y", bodyY);
                    body.setAttribute("width", bodyWidth);
                    body.setAttribute("height", bodyHeight);
                    body.setAttribute("rx", "1");
                    body.setAttribute("fill", color);
                    this.group.appendChild(body);
                });

                this._drawPriceAxis(plot, plotHeight, minPrice, maxPrice, scaleY);
                this._drawTimeAxis(plot, plotWidth, visible, slot);

                // Draw live price marker, dotted line, and box overlay
                const lastCandle = visible[visible.length - 1];
                if (lastCandle) {
                    const currentPrice = lastCandle.close;
                    const currentY = scaleY(currentPrice);
                    const color = this.options.priceLineColor || (currentPrice >= lastCandle.open ? "#16a34a" : "#dc2626");

                    const priceLine = line(plot.left, currentY, this.chart.width, currentY, color, 1);
                    priceLine.setAttribute("stroke-dasharray", "2,2");
                    this.chart.axisGroup.appendChild(priceLine);
                }
            }

            _drawPriceAxis(plot, plotHeight, minPrice, maxPrice, scaleY) {
                const ticks = 5;
                const textColor = this.chart.options?.layout?.textColor || "#8b9bb0";
                for (let i = 0; i <= ticks; i += 1) {
                    const price = minPrice + ((maxPrice - minPrice) / ticks) * i;
                    const y = scaleY(price);
                    const text = document.createElementNS(SVG_NS, "text");
                    text.setAttribute("x", this.chart.width - 6);
                    text.setAttribute("y", y + 4);
                    text.setAttribute("fill", textColor);
                    text.setAttribute("font-size", "11");
                    text.setAttribute("text-anchor", "end");
                    text.textContent = formatAxisPrice(price);
                    this.chart.axisGroup.appendChild(text);
                }
            }

            _drawTimeAxis(plot, plotWidth, visible, slot) {
                const axisY = this.chart.height - plot.bottom;
                
                const borderColor = this.chart.options?.timeScale?.borderColor || "#394654";
                const textColor = this.chart.options?.layout?.textColor || "#8b9bb0";

                // Thin dashed horizontal line above labels
                const topBorder = line(plot.left, axisY, this.chart.width - plot.right, axisY, borderColor, 1);
                topBorder.setAttribute("stroke-dasharray", "4,4");
                this.chart.axisGroup.appendChild(topBorder);

                if (!visible.length) return;

                // Dynamically calculate evenly spaced tick marks
                const tickSpacing = 80;
                const tickCount = Math.max(2, Math.floor(plotWidth / tickSpacing));
                const step = Math.max(1, Math.floor(visible.length / tickCount));

                for (let i = 0; i < visible.length; i += step) {
                    const candle = visible[i];
                    const x = plot.left + slot * i + slot / 2;
                    
                    this.chart.axisGroup.appendChild(line(x, axisY, x, axisY + 4, borderColor, 1));

                    const date = new Date(candle.time * 1000);
                    const timeStr = date.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false });
                    
                    const text = document.createElementNS(SVG_NS, "text");
                    text.setAttribute("x", x);
                    text.setAttribute("y", axisY + 16);
                    text.setAttribute("fill", textColor);
                    text.setAttribute("font-size", "10");
                    text.setAttribute("text-anchor", "middle");
                    text.textContent = timeStr;
                    this.chart.axisGroup.appendChild(text);
                }
            }
        }

        class LineSeriesImpl {
            constructor(chart, options = {}) {
                this.chart = chart;
                this.options = options;
                this.data = [];
                this.group = document.createElementNS(SVG_NS, "g");
                this.priceLines = [];
                this.chart.plotGroup.appendChild(this.group);
            }

            applyOptions(options) {
                Object.assign(this.options, options);
                this.chart._redraw();
            }

            setData(data) {
                this.data = Array.isArray(data) ? data.slice() : [];
                this.chart._redraw();
            }

            update(point) {
                const last = this.data[this.data.length - 1];
                if (last && last.time === point.time) {
                    this.data[this.data.length - 1] = point;
                } else {
                    this.data.push(point);
                }
                this.chart._redraw();
            }

            createPriceLine(options) {
                const pl = { options, applyOptions: () => {} };
                this.priceLines.push(pl);
                this.chart._redraw();
                return pl;
            }

            _draw() {
                clear(this.group);
                if (!this.data.length || this.options.visible === false) return;

                const candleSeries = this.chart.series.find(s => s instanceof CandlestickSeriesImpl);
                if (!candleSeries || !candleSeries.visibleCandles || !candleSeries.scaleY) return;

                const { visibleCandles, plot, slot, scaleY } = candleSeries;
                let seriesScaleY = scaleY;
                
                if (this.options.priceScaleId === 'rsi') {
                    const plotHeight = Math.max(this.chart.height - plot.top - plot.bottom, 120);
                    const rsiTop = plot.top + plotHeight * 0.8;
                    const rsiBottom = plot.top + plotHeight;
                    seriesScaleY = val => rsiBottom - ((val / 100) * (rsiBottom - rsiTop));
                }
                
                if (this.priceLines && this.priceLines.length > 0) {
                    this.priceLines.forEach(pl => {
                        const y = seriesScaleY(pl.options.price);
                        const plLine = document.createElementNS(SVG_NS, "line");
                        plLine.setAttribute("x1", plot.left);
                        plLine.setAttribute("y1", y);
                        plLine.setAttribute("x2", this.chart.width);
                        plLine.setAttribute("y2", y);
                        plLine.setAttribute("stroke", pl.options.color || "#ffffff");
                        plLine.setAttribute("stroke-width", pl.options.lineWidth || 1);
                        if (pl.options.lineStyle === 2) plLine.setAttribute("stroke-dasharray", "4,4");
                        this.group.appendChild(plLine);
                        
                        if (pl.options.axisLabelVisible) {
                            const text = document.createElementNS(SVG_NS, "text");
                            text.setAttribute("x", this.chart.width - 6);
                            text.setAttribute("y", y + 4);
                            text.setAttribute("fill", pl.options.color || "#ffffff");
                            text.setAttribute("font-size", "10");
                            text.setAttribute("text-anchor", "end");
                            text.textContent = pl.options.title || pl.options.price;
                            this.chart.axisGroup.appendChild(text);
                        }
                    });
                }

                let pathD = "";
                
                visibleCandles.forEach((candle, index) => {
                    const point = this.data.find(p => p.time === candle.time);
                    if (point) {
                        const x = plot.left + slot * index + slot / 2;
                        const y = seriesScaleY(point.value);
                        if (!pathD) pathD = `M ${x} ${y}`;
                        else pathD += ` L ${x} ${y}`;
                    }
                });

                if (pathD) {
                    const path = document.createElementNS(SVG_NS, "path");
                    path.setAttribute("d", pathD);
                    path.setAttribute("fill", "none");
                    path.setAttribute("stroke", this.options.color || "#ffffff");
                    path.setAttribute("stroke-width", this.options.lineWidth || 1);
                    this.group.appendChild(path);
                }
            }
        }

        return {
            createChart: (container, options) => new ChartImpl(container, options),
            ColorType: { Solid: "solid" },
        };
    })();

    function line(x1, y1, x2, y2, stroke, strokeWidth) {
        const item = document.createElementNS(SVG_NS, "line");
        item.setAttribute("x1", x1);
        item.setAttribute("y1", y1);
        item.setAttribute("x2", x2);
        item.setAttribute("y2", y2);
        item.setAttribute("stroke", stroke);
        item.setAttribute("stroke-width", strokeWidth);
        return item;
    }

    function clear(group) {
        while (group.lastChild) group.removeChild(group.lastChild);
    }

    function formatAxisPrice(price) {
        if (price >= 1000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
        if (price >= 1) return price.toFixed(2);
        return price.toPrecision(4);
    }

    window.LightweightCharts = LightweightCharts;
}

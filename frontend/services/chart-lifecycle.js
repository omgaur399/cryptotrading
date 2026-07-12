const ChartLifecycleService = (() => {
    let deps = {};

    function initialize(injectedDeps) {
        deps = injectedDeps;
    }

    function attach(chartData, handlers) {
        if (!chartData || !chartData.chart) return;
        
        if (!chartData._lcSubscriptions) {
            chartData._lcSubscriptions = [];
        }

        if (handlers.click) {
            chartData._lcSubscriptions.push({ type: 'click', callback: handlers.click });
            chartData.chart.subscribeClick(handlers.click);
        }

        if (handlers.crosshairMove && typeof chartData.chart.subscribeCrosshairMove === "function") {
            chartData._lcSubscriptions.push({ type: 'crosshairMove', callback: handlers.crosshairMove });
            chartData.chart.subscribeCrosshairMove(handlers.crosshairMove);
        }

        if (handlers.visibleLogicalRangeChange && typeof chartData.chart.timeScale().subscribeVisibleLogicalRangeChange === "function") {
            chartData._lcSubscriptions.push({ type: 'visibleLogicalRangeChange', callback: handlers.visibleLogicalRangeChange });
            chartData.chart.timeScale().subscribeVisibleLogicalRangeChange(handlers.visibleLogicalRangeChange);
        }

        if (handlers.visibleTimeRangeChange && typeof chartData.chart.timeScale().subscribeVisibleTimeRangeChange === "function") {
            chartData._lcSubscriptions.push({ type: 'visibleTimeRangeChange', callback: handlers.visibleTimeRangeChange });
            chartData.chart.timeScale().subscribeVisibleTimeRangeChange(handlers.visibleTimeRangeChange);
        }
    }

    function detach(chartData) {
        if (!chartData || !chartData._lcSubscriptions || !chartData.chart) return;

        chartData._lcSubscriptions.forEach(sub => {
            try {
                if (sub.type === 'click' && typeof chartData.chart.unsubscribeClick === "function") {
                    chartData.chart.unsubscribeClick(sub.callback);
                } else if (sub.type === 'crosshairMove' && typeof chartData.chart.unsubscribeCrosshairMove === "function") {
                    chartData.chart.unsubscribeCrosshairMove(sub.callback);
                } else if (sub.type === 'visibleLogicalRangeChange' && typeof chartData.chart.timeScale().unsubscribeVisibleLogicalRangeChange === "function") {
                    chartData.chart.timeScale().unsubscribeVisibleLogicalRangeChange(sub.callback);
                } else if (sub.type === 'visibleTimeRangeChange' && typeof chartData.chart.timeScale().unsubscribeVisibleTimeRangeChange === "function") {
                    chartData.chart.timeScale().unsubscribeVisibleTimeRangeChange(sub.callback);
                }
            } catch (err) {
                console.warn(`ChartLifecycleService: Failed to unsubscribe ${sub.type}`, err);
            }
        });

        chartData._lcSubscriptions = [];
    }

    return {
        initialize,
        attach,
        detach
    };
})();

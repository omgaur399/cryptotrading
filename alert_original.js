renderAlertLine(chartData, alertObj) {
        if (!chartData.candleSeries || !chartData.candleSeries.createPriceLine) return;
        
        const price = parseFloat(alertObj.price);
        if (isNaN(price)) return;
        
        try {
            const pl = chartData.candleSeries.createPriceLine({
                price: price,
                color: alertObj.active ? 'rgba(0, 0, 0, 0)' : '#9ca3af',
                lineWidth: 1,
                lineStyle: 0,
                axisLabelVisible: true,
                title: alertObj.active ? '🔔' : '🔕',
            });
            
            if (!chartData.renderedDrawings) chartData.renderedDrawings = {};
            chartData.renderedDrawings[alertObj.id] = pl;
        } catch (e) {
            console.warn("Failed to render alert line:", e);
        }
    }
window.PaperHistory = class PaperHistory {
    constructor() {
        this.trades = StorageService.getPaperTradingHistory();
        // Ensure all trades have journal properties initialized
        this.trades.forEach(t => {
            if (!t.tags) t.tags = [];
            if (t.rating === undefined) t.rating = 0;
            if (!t.notes) t.notes = '';
        });
    }
    
    save() {
        StorageService.savePaperTradingHistory(this.trades);
    }
    
    addTrade(trade) {
        trade.tags = [];
        trade.rating = 0;
        trade.notes = '';
        this.trades.unshift(trade);
        this.save();
    }
    
    updateTrade(id, data) {
        const trade = this.trades.find(t => t.id === id);
        if (trade) {
            if (data.notes !== undefined) trade.notes = data.notes;
            if (data.tags !== undefined) trade.tags = data.tags;
            if (data.rating !== undefined) trade.rating = data.rating;
            this.save();
        }
    }

    getTagsAnalytics() {
        const tags = {};
        this.trades.forEach(t => {
            if (t.tags) {
                t.tags.forEach(tag => {
                    const finalTag = tag.trim();
                    if (!finalTag) return;
                    if (!tags[finalTag]) tags[finalTag] = { count: 0, wins: 0, pnl: 0 };
                    tags[finalTag].count++;
                    tags[finalTag].pnl += t.pnl;
                    if (t.pnl > 0) tags[finalTag].wins++;
                });
            }
        });
        return tags;
    }

    getStats() {
        const total = this.trades.length;
        const wins = this.trades.filter(t => t.pnl > 0);
        const losses = this.trades.filter(t => t.pnl <= 0);
        const winRate = total > 0 ? (wins.length / total * 100).toFixed(1) : 0;
        
        const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
        const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
        const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? '∞' : '0.00');
        
        const avgWin = wins.length > 0 ? (grossProfit / wins.length) : 0;
        const avgLoss = losses.length > 0 ? (grossLoss / losses.length) : 0;
        
        let equity = 100000;
        let peak = 100000;
        let maxDrawdown = 0;
        let currentDrawdown = 0;
        let bestTrade = 0;
        let worstTrade = 0;

        const chronoTrades = [...this.trades].reverse();
        const equityCurve = [];
        const dailyPnL = {};
        
        let lastTime = 0;

        chronoTrades.forEach((t, i) => {
            equity += t.pnl;
            if (equity > peak) peak = equity;
            
            const dd = (peak - equity) / peak * 100;
            if (dd > maxDrawdown) maxDrawdown = dd;
            currentDrawdown = dd;

            if (t.pnl > bestTrade) bestTrade = t.pnl;
            if (t.pnl < worstTrade) worstTrade = t.pnl;

            let timeVal = Math.floor(t.exitTime);
            if (timeVal <= lastTime) timeVal = lastTime + 1; // Preserve ascending time requirement
            lastTime = timeVal;

            if (i === 0) {
                equityCurve.push({ time: timeVal - 60, value: 100000 }); // Inject baseline
            }

            equityCurve.push({ time: timeVal, value: equity });

            const dateObj = new Date(timeVal * 1000);
            const dateStr = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
            
            if (!dailyPnL[dateStr]) dailyPnL[dateStr] = 0;
            dailyPnL[dateStr] += t.pnl;
        });

        const dailyPnLData = Object.keys(dailyPnL).sort().map(date => {
            return {
                time: date,
                value: dailyPnL[date],
                color: dailyPnL[date] >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'
            };
        });

        return {
            total,
            winning: wins.length,
            losing: losses.length,
            winRate: `${winRate}%`,
            avgWin,
            avgLoss,
            profitFactor,
            bestTrade,
            worstTrade,
            currentDDVal: -currentDrawdown,
            maxDDVal: -maxDrawdown,
            currentDrawdown: `-${currentDrawdown.toFixed(2)}%`,
            maxDrawdown: `-${maxDrawdown.toFixed(2)}%`,
            equityCurve,
            dailyPnLData
        };
    }
};
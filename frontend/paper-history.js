window.PaperHistory = class PaperHistory {
    constructor() {
        this.trades = JSON.parse(localStorage.getItem('pt_history') || '[]');
    }
    
    save() {
        localStorage.setItem('pt_history', JSON.stringify(this.trades));
    }
    
    addTrade(trade) {
        this.trades.unshift(trade);
        this.save();
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
        
        return {
            total,
            winning: wins.length,
            losing: losses.length,
            winRate: `${winRate}%`,
            avgWin,
            avgLoss,
            profitFactor,
        };
    }
};
window.PaperAccount = class PaperAccount {
    constructor() {
        this.balance = 100000; // Starting Balance
        this.currency = "OHM";
        this.load();
    }
    
    load() {
        const saved = StorageService.getPaperTradingBalance();
        if (saved !== null) this.balance = parseFloat(saved);
    }
    
    save() {
        StorageService.savePaperTradingBalance(this.balance);
    }
    
    addPnL(amount) {
        this.balance += amount;
        this.save();
    }
};
window.PaperAccount = class PaperAccount {
    constructor() {
        this.balance = 100000; // Starting Balance
        this.currency = "OHM";
        this.load();
    }
    
    load() {
        const saved = localStorage.getItem('pt_balance');
        if (saved !== null) this.balance = parseFloat(saved);
    }
    
    save() {
        localStorage.setItem('pt_balance', this.balance.toFixed(4));
    }
    
    addPnL(amount) {
        this.balance += amount;
        this.save();
    }
};
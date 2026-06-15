window.PaperPositions = class PaperPositions {
    constructor() {
        this.positions = JSON.parse(localStorage.getItem('pt_positions') || '[]');
        this.orders = JSON.parse(localStorage.getItem('pt_orders') || '[]');
    }

    save() {
        localStorage.setItem('pt_positions', JSON.stringify(this.positions));
        localStorage.setItem('pt_orders', JSON.stringify(this.orders));
    }

    openPosition(symbol, direction, price, qty, tp, sl, time) {
        const pos = {
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            symbol, direction, entryPrice: price, qty, tp, sl, time,
            status: 'open'
        };
        this.positions.push(pos);
        this.save();
        return pos;
    }

    addOrder(symbol, direction, type, price, qty, tp, sl, time) {
        const order = {
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            symbol, direction, type, price, qty, tp, sl, time,
            status: 'pending'
        };
        this.orders.push(order);
        this.save();
        return order;
    }

    removePosition(id) {
        const idx = this.positions.findIndex(p => p.id === id);
        if (idx > -1) {
            const pos = this.positions[idx];
            this.positions.splice(idx, 1);
            this.save();
            return pos;
        }
        return null;
    }

    checkLimits(symbol, currentPrice, time) {
        let executed = [];
        this.orders = this.orders.filter(order => {
            if (order.symbol !== symbol) return true;
            if ((order.direction === 'Long' && currentPrice <= order.price) ||
                (order.direction === 'Short' && currentPrice >= order.price)) {
                this.openPosition(symbol, order.direction, order.price, order.qty, order.tp, order.sl, time);
                executed.push(order);
                return false;
            }
            return true;
        });
        if (executed.length > 0) this.save();
        return executed;
    }

    checkTPSL(symbol, currentPrice, time) {
        let hit = [];
        this.positions = this.positions.filter(pos => {
            if (pos.symbol !== symbol) return true;
            
            const isLong = pos.direction === 'Long';
            const hitTP = pos.tp && ((isLong && currentPrice >= pos.tp) || (!isLong && currentPrice <= pos.tp));
            const hitSL = pos.sl && ((isLong && currentPrice <= pos.sl) || (!isLong && currentPrice >= pos.sl));
            
            if (hitTP || hitSL) {
                hit.push({ ...pos, closeReason: hitTP ? 'TP' : 'SL', exitPrice: hitTP ? pos.tp : pos.sl, exitTime: time });
                return false;
            }
            return true;
        });
        if (hit.length > 0) this.save();
        return hit;
    }
};
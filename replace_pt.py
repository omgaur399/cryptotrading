import os

# paper-trading.js
with open('frontend/paper-trading.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('localStorage.removeItem(CONFIG.BACKTEST_STORAGE_KEY)', 'StorageService.clearBacktest()')

with open('frontend/paper-trading.js', 'w', encoding='utf-8') as f:
    f.write(content)

# paper-positions.js
with open('frontend/paper-positions.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("JSON.parse(localStorage.getItem('pt_positions') || '[]')", "StorageService.getPaperTradingPositions()")
content = content.replace("JSON.parse(localStorage.getItem('pt_orders') || '[]')", "StorageService.getPaperTradingOrders()")
content = content.replace("localStorage.setItem('pt_positions', JSON.stringify(this.positions))", "StorageService.savePaperTradingPositions(this.positions)")
content = content.replace("localStorage.setItem('pt_orders', JSON.stringify(this.orders))", "StorageService.savePaperTradingOrders(this.orders)")

with open('frontend/paper-positions.js', 'w', encoding='utf-8') as f:
    f.write(content)

# paper-history.js
with open('frontend/paper-history.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("JSON.parse(localStorage.getItem('pt_history') || '[]')", "StorageService.getPaperTradingHistory()")
content = content.replace("localStorage.setItem('pt_history', JSON.stringify(this.trades))", "StorageService.savePaperTradingHistory(this.trades)")

with open('frontend/paper-history.js', 'w', encoding='utf-8') as f:
    f.write(content)

# paper-account.js
with open('frontend/paper-account.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("localStorage.getItem('pt_balance')", "StorageService.getPaperTradingBalance()")
content = content.replace("localStorage.setItem('pt_balance', this.balance.toFixed(4))", "StorageService.savePaperTradingBalance(this.balance)")

with open('frontend/paper-account.js', 'w', encoding='utf-8') as f:
    f.write(content)

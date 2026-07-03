import os

with open('frontend/script.js', 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    ('localStorage.getItem("trading-dashboard-tz")', 'StorageService.getTimeZone(null)'),
    ('localStorage.getItem(CONFIG.THEME_STORAGE_KEY)', 'StorageService.getTheme()'),
    ('localStorage.getItem(CONFIG.DRAWINGS_STORAGE_KEY)', 'StorageService.getDrawings()'),
    ('localStorage.getItem(CONFIG.BACKTEST_STORAGE_KEY)', 'StorageService.getBacktest()'),
    ('localStorage.setItem("trading-dashboard-tz", e.target.value)', 'StorageService.saveTimeZone(e.target.value)'),
    ('localStorage.getItem(GRID_SIZES_KEY)', 'StorageService.getGridSizes()'),
    ('localStorage.setItem(GRID_SIZES_KEY, JSON.stringify(all))', 'StorageService.saveGridSizes(all)'),
    ('localStorage.getItem("trading-sidebar-collapsed") === "true"', 'StorageService.getSidebarCollapsed()'),
    ('localStorage.setItem("trading-sidebar-collapsed", String(willCollapse))', 'StorageService.saveSidebarCollapsed(willCollapse)'),
    ('localStorage.getItem("trading-sync-charts") === "true"', 'StorageService.getSyncCharts()'),
    ('localStorage.setItem("trading-sync-charts", String(state.syncCharts))', 'StorageService.saveSyncCharts(state.syncCharts)'),
    ('Number(localStorage.getItem(CONFIG.STORAGE_KEY))', 'StorageService.getChartCount(0)'),
    ('localStorage.setItem(CONFIG.LAYOUT_STORAGE_KEY, JSON.stringify(layout))', 'StorageService.saveLayout(layout)'),
    ('localStorage.setItem(CONFIG.STORAGE_KEY, String(safeCount))', 'StorageService.saveChartCount(safeCount)'),
    ('localStorage.setItem(CONFIG.DRAWINGS_STORAGE_KEY, JSON.stringify(state.drawings))', 'StorageService.saveDrawings(state.drawings)'),
    ('localStorage.setItem(CONFIG.THEME_STORAGE_KEY, state.theme)', 'StorageService.saveTheme(state.theme)'),
    ('localStorage.setItem(\'trading-dashboard-active-tab\', index)', 'StorageService.saveActiveTab(index)'),
    ('localStorage.getItem(\'trading-dashboard-active-tab\')', 'StorageService.getActiveTab()'),
    ('localStorage.setItem(CONFIG.BACKTEST_STORAGE_KEY, JSON.stringify(state.backtest))', 'StorageService.saveBacktest(state.backtest)'),
    ('localStorage.getItem(\'watchlist_symbols\')', 'StorageService.getWatchlistSymbols()'),
    ('localStorage.setItem(\'watchlist_symbols\', JSON.stringify(symbolsList))', 'StorageService.saveWatchlistSymbols(symbolsList)'),
    ('localStorage.getItem(\'watchlist_open\') === \'true\'', 'StorageService.getWatchlistOpen()'),
    ('localStorage.setItem(\'watchlist_open\', \'true\')', 'StorageService.saveWatchlistOpen(true)'),
    ('localStorage.setItem(\'watchlist_open\', \'false\')', 'StorageService.saveWatchlistOpen(false)')
]

for old, new in replacements:
    content = content.replace(old, new)

with open('frontend/script.js', 'w', encoding='utf-8') as f:
    f.write(content)

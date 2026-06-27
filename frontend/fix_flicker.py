import sys

with open('script.js', 'r', encoding='utf-8') as f:
    content = f.read()

target = """        indRows.push({ type: 'atr', label: `ATR ${ind.atrPeriod}`, value: atrVal != null ? formatPrice(atrVal) : '—', color: ind.atrColor, visible: chartData.atrSeries.options().visible !== false });
    }

    // SVG icon strings"""

replacement = """        indRows.push({ type: 'atr', label: `ATR ${ind.atrPeriod}`, value: atrVal != null ? formatPrice(atrVal) : '—', color: ind.atrColor, visible: chartData.atrSeries.options().visible !== false });
    }

    const structKey = chartData.symbol + '_' + chartData.interval + '_' + (ohlc !== null) + '_' + JSON.stringify(indRows.map(r => r.type + r.visible + r.color + r.label));
    if (legendEl.dataset.structKey === structKey) {
        // Just update values to avoid DOM rebuild and button flicker
        if (ohlc) {
            const diff = ohlc.close - ohlc.open;
            const pct = ohlc.open ? (diff / ohlc.open) * 100 : 0;
            const colorClass = diff >= 0 ? "legend-up" : "legend-down";
            const sign = diff >= 0 ? "+" : "";
            
            const ohlcVals = legendEl.querySelectorAll('.legend-ohlc-val');
            if (ohlcVals.length === 5) {
                ohlcVals[0].textContent = formatPrice(ohlc.open);
                ohlcVals[1].textContent = formatPrice(ohlc.high);
                ohlcVals[2].textContent = formatPrice(ohlc.low);
                ohlcVals[3].textContent = formatPrice(ohlc.close);
                ohlcVals[4].textContent = `${sign}${formatPrice(diff)} (${sign}${pct.toFixed(2)}%)`;
                ohlcVals.forEach(el => el.className = `legend-ohlc-val ${colorClass}`);
            }
        }
        indRows.forEach(row => {
            const valEl = legendEl.querySelector(`.legend-ind-row[data-ind="${row.type}"] .legend-ind-val`);
            if (valEl) valEl.textContent = row.value;
        });
        return;
    }
    legendEl.dataset.structKey = structKey;

    // SVG icon strings"""

if target in content:
    content = content.replace(target, replacement)
    with open('script.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Target not found")

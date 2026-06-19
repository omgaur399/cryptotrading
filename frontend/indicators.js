function calculateHeikinAshi(data) {
    if (!data || data.length === 0) return [];
    const ha = [];
    ha.push({
        time: data[0].time, open: data[0].open, high: data[0].high, low: data[0].low,
        close: (data[0].open + data[0].high + data[0].low + data[0].close) / 4
    });
    for (let i = 1; i < data.length; i++) {
        const c = data[i];
        const haClose = (c.open + c.high + c.low + c.close) / 4;
        const haOpen = (ha[i-1].open + ha[i-1].close) / 2;
        const haHigh = Math.max(c.high, haOpen, haClose);
        const haLow = Math.min(c.low, haOpen, haClose);
        ha.push({
            time: c.time, open: haOpen, high: haHigh, low: haLow, close: haClose
        });
    }
    return ha;
}

function calculateSMA(data, period) {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        sma.push({ time: data[i].time, value: sum / period });
    }
    return sma;
}

function calculateLatestSMA(data, period) {
    if (data.length < period) return null;
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += data[data.length - 1 - i].close;
    }
    return { time: data[data.length - 1].time, value: sum / period };
}

function calculateLatestEMA(data, period) {
    if (data.length < period) return null;
    
    const multiplier = 2 / (period + 1);
    let ema = 0;
    for (let i = 0; i < period; i++) ema += data[i].close;
    ema /= period;

    for (let i = period; i < data.length; i++) {
        ema = (data[i].close - ema) * multiplier + ema;
    }
    return { time: data[data.length - 1].time, value: ema };
}

function calculateEMA(data, period) {
    const ema = [];
    if (data.length < period) return ema;
    
    const multiplier = 2 / (period + 1);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[i].close;
    let prevEMA = sum / period;
    ema.push({ time: data[period - 1].time, value: prevEMA });

    for (let i = period; i < data.length; i++) {
        const currentEMA = (data[i].close - prevEMA) * multiplier + prevEMA;
        ema.push({ time: data[i].time, value: currentEMA });
        prevEMA = currentEMA;
    }
    return ema;
}

function calculateBB(data, period, stdDevMult) {
    const upper = [], middle = [], lower = [];
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += data[i - j].close;
        const sma = sum / period;
        
        let varianceSum = 0;
        for (let j = 0; j < period; j++) {
            varianceSum += Math.pow(data[i - j].close - sma, 2);
        }
        const stdDev = Math.sqrt(varianceSum / period);
        
        const time = data[i].time;
        upper.push({ time, value: sma + stdDevMult * stdDev });
        middle.push({ time, value: sma });
        lower.push({ time, value: sma - stdDevMult * stdDev });
    }
    return { upper, middle, lower };
}

function calculateLatestBB(data, period, stdDevMult) {
    if (data.length < period) return null;
    let sum = 0;
    for (let i = 0; i < period; i++) sum += data[data.length - 1 - i].close;
    const sma = sum / period;
    
    let varianceSum = 0;
    for (let i = 0; i < period; i++) varianceSum += Math.pow(data[data.length - 1 - i].close - sma, 2);
    const stdDev = Math.sqrt(varianceSum / period);
    
    const time = data[data.length - 1].time;
    return { upper: { time, value: sma + stdDevMult * stdDev }, middle: { time, value: sma }, lower: { time, value: sma - stdDevMult * stdDev } };
}

function calculateRSI(data, period) {
    const rsi = [];
    if (data.length < period + 1) return rsi;

    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
        const change = data[i].close - data[i - 1].close;
        if (change >= 0) gains += change;
        else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    let rsiValue = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    if (avgGain === 0 && avgLoss === 0) rsiValue = 50;
    rsi.push({ time: data[period].time, value: rsiValue });

    for (let i = period + 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        const gain = change >= 0 ? change : 0;
        const loss = change < 0 ? -change : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        rsiValue = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
        if (avgGain === 0 && avgLoss === 0) rsiValue = 50;
        rsi.push({ time: data[i].time, value: rsiValue });
    }
    return rsi;
}

function calculateLatestRSI(data, period) {
    const lookback = Math.min(data.length, period * 5);
    if (lookback < period + 1) return null;
    
    const startIdx = data.length - lookback;
    let gains = 0, losses = 0;
    for (let i = startIdx + 1; i <= startIdx + period; i++) {
        const change = data[i].close - data[i - 1].close;
        if (change >= 0) gains += change;
        else losses -= change;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;
    let rsiValue = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    if (avgGain === 0 && avgLoss === 0) rsiValue = 50;

    for (let i = startIdx + period + 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close;
        const gain = change >= 0 ? change : 0;
        const loss = change < 0 ? -change : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        rsiValue = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
        if (avgGain === 0 && avgLoss === 0) rsiValue = 50;
    }
    return { time: data[data.length - 1].time, value: rsiValue };
}

function getVWAPAnchor(candleDate, interval) {
    const isIntraday = !interval || ['1m', '3m', '5m', '15m', '30m', '1h', '4h'].includes(interval);
    if (isIntraday) {
        return candleDate.getUTCFullYear() + '-' + candleDate.getUTCMonth() + '-' + candleDate.getUTCDate();
    } else if (interval === '1d') {
        return candleDate.getUTCFullYear() + '-' + candleDate.getUTCMonth();
    } else {
        return candleDate.getUTCFullYear();
    }
}

function calculateVWAP(data, interval) {
    const vwap = [];
    let cumulativePriceVolume = 0;
    let cumulativeVolume = 0;
    let lastAnchor = null;

    for (let i = 0; i < data.length; i++) {
        const candle = data[i];
        const candleDate = new Date(candle.time * 1000);
        const currentAnchor = getVWAPAnchor(candleDate, interval);

        if (lastAnchor !== null && currentAnchor !== lastAnchor) {
            cumulativePriceVolume = 0;
            cumulativeVolume = 0;
        }

        const typicalPrice = (candle.high + candle.low + candle.close) / 3;
        const priceVolume = typicalPrice * candle.volume;

        cumulativePriceVolume += priceVolume;
        cumulativeVolume += candle.volume;

        let vwapValue = typicalPrice;
        if (cumulativeVolume > 0) {
            vwapValue = cumulativePriceVolume / cumulativeVolume;
        } else if (vwap.length > 0) {
            vwapValue = vwap[vwap.length - 1].value;
        }
        
        vwap.push({ time: candle.time, value: vwapValue });
        lastAnchor = currentAnchor;
        
        if (i === data.length - 1) {
            console.log("VWAP Audit [Historical]:", { time: candleDate.toISOString(), close: candle.close, volume: candle.volume, typicalPrice, cumulativePV: cumulativePriceVolume, cumulativeVolume, vwap: vwapValue, anchor: currentAnchor });
        }
    }
    return vwap;
}

function calculateLatestVWAP(data, interval) {
    if (data.length === 0) return null;

    const lastCandle = data[data.length - 1];
    const lastCandleDate = new Date(lastCandle.time * 1000);
    const lastAnchor = getVWAPAnchor(lastCandleDate, interval);

    let cumulativePriceVolume = 0;
    let cumulativeVolume = 0;
    
    for (let i = data.length - 1; i >= 0; i--) {
        const candle = data[i];
        const candleDate = new Date(candle.time * 1000);
        if (getVWAPAnchor(candleDate, interval) !== lastAnchor) break;
        
        const typicalPrice = (candle.high + candle.low + candle.close) / 3;
        cumulativePriceVolume += typicalPrice * candle.volume;
        cumulativeVolume += candle.volume;
    }

    let vwapValue = (lastCandle.high + lastCandle.low + lastCandle.close) / 3;
    if (cumulativeVolume > 0) {
        vwapValue = cumulativePriceVolume / cumulativeVolume;
    }

    console.log("VWAP Audit [Live Update]:", { close: lastCandle.close, volume: lastCandle.volume, typicalPrice: (lastCandle.high + lastCandle.low + lastCandle.close) / 3, cumulativePV: cumulativePriceVolume, cumulativeVolume, vwap: vwapValue, anchor: lastAnchor });

    return { time: lastCandle.time, value: vwapValue };
}

function calculateATR(data, period) {
    const atr = [];
    if (data.length < period) return atr;

    const trueRanges = [];
    for (let i = 1; i < data.length; i++) {
        const c = data[i];
        const p = data[i - 1];
        const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
        trueRanges.push({ time: c.time, value: tr });
    }

    if (trueRanges.length < period) return atr;

    let sumTR = 0;
    for (let i = 0; i < period; i++) sumTR += trueRanges[i].value;
    let prevATR = sumTR / period;
    atr.push({ time: trueRanges[period - 1].time, value: prevATR });

    for (let i = period; i < trueRanges.length; i++) {
        const currentATR = (prevATR * (period - 1) + trueRanges[i].value) / period;
        atr.push({ time: trueRanges[i].time, value: currentATR });
        prevATR = currentATR;
    }
    return atr;
}

function calculateLatestATR(data, period) {
    const lookback = Math.min(data.length, period * 5);
    if (lookback < period + 1) return null;
    
    const relevantData = data.slice(data.length - lookback);
    const atrValues = calculateATR(relevantData, period);
    return atrValues.length > 0 ? atrValues[atrValues.length - 1] : null;
}
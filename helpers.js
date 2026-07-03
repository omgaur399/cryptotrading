function getAssetName(sym) {
    if (COMMON_IDS[sym]) {
        return COMMON_IDS[sym].split('-').map(w => w === '2' ? '' : w.charAt(0).toUpperCase() + w.slice(1)).join(' ').trim();
    }
    return sym;
}

function formatPrice(price) {
    if (price === null || price === undefined) return "--";
    const absPrice = Math.abs(price);
    if (absPrice >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (absPrice >= 1) return price.toFixed(2);
    if (absPrice >= 0.01) return price.toFixed(4);
    if (absPrice >= 0.00001) return price.toFixed(6);
    if (absPrice >= 0.0000001) return price.toFixed(8);
    return price.toPrecision(4);
}

function getIntervalSeconds(interval) {
    const map = { "1m": 60, "3m": 180, "5m": 300, "15m": 900, "30m": 1800, "1h": 3600, "4h": 14400, "1d": 86400, "1wk": 604800, "1mo": 2592000 };
    return map[interval] || 60;
}

function bucketTime(time, interval) {
    const seconds = getIntervalSeconds(interval);
    return Math.floor(time / seconds) * seconds;
}

function getCountdownMs(interval, now) {
    const seconds = getIntervalSeconds(interval);
    if (!seconds || seconds > 86400) return null;

    const ms = seconds * 1000;
    const next = Math.ceil(now / ms) * ms;
    return next === now ? ms : next - now;
}

function formatCountdown(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    const minSec = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return h > 0 ? `${h.toString().padStart(2, "0")}:${minSec}` : minSec;
}

function formatCurrency(num) {
    if (typeof num !== 'number' || isNaN(num)) return '-';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K';
    const absNum = Math.abs(num);
    if (absNum >= 1) return '$' + num.toFixed(2);
    if (absNum >= 0.01) return '$' + num.toFixed(4);
    if (absNum >= 0.00001) return '$' + num.toFixed(6);
    if (absNum >= 0.0000001) return '$' + num.toFixed(8);
    return '$' + num.toPrecision(4);
}

function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '-';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatPercent(num) {
    if (typeof num !== 'number' || isNaN(num)) return '-';
    const sign = num > 0 ? '+' : '';
    return sign + num.toFixed(2) + '%';
}

function getPerfClass(num) {
    if (typeof num !== 'number' || isNaN(num)) return '';
    return num >= 0 ? 'perf-up' : 'perf-down';
}

function formatOHM(p) {
    return (p || 0).toFixed(4);
}

function formatDate(timestamp) {
    if (!timestamp) return '--';
    return new Date(timestamp * 1000).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "2-digit", month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false
    });
}
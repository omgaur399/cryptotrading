// =============================================================================
//  helpers.js  --  Generic utility / formatting functions
//  Phase 1 utility extraction.  No references to: state, chart, series,
//  paperTrading, drawingManager, replay, toolbar, indicatorManager.
// =============================================================================

// ---------------------------------------------------------------------------
//  Symbol helpers
// ---------------------------------------------------------------------------

/**
 * Convert a raw ticker symbol to a human-readable asset name via COMMON_IDS.
 * @param {string} sym  e.g. "BTC"
 * @returns {string}    e.g. "Bitcoin"
 */
function getAssetName(sym) {
    if (COMMON_IDS[sym]) {
        return COMMON_IDS[sym].split('-').map(w => w === '2' ? '' : w.charAt(0).toUpperCase() + w.slice(1)).join(' ').trim();
    }
    return sym;
}

// ---------------------------------------------------------------------------
//  Interval / time utilities
// ---------------------------------------------------------------------------

/**
 * Return the number of seconds in a candle interval string.
 * @param {string} interval  e.g. "1m", "4h", "1d"
 * @returns {number}
 */
function getIntervalSeconds(interval) {
    const map = { "1m": 60, "3m": 180, "5m": 300, "15m": 900, "30m": 1800, "1h": 3600, "4h": 14400, "1d": 86400, "1wk": 604800, "1mo": 2592000 };
    return map[interval] || 60;
}

// Alias used by DrawingManager for backward compatibility
const intervalToSeconds = getIntervalSeconds;

/**
 * Snap a Unix timestamp (seconds) to the start of its candle bucket.
 * @param {number} time      Unix timestamp in seconds
 * @param {string} interval  Candle interval string
 * @returns {number}
 */
function bucketTime(time, interval) {
    const seconds = getIntervalSeconds(interval);
    return Math.floor(time / seconds) * seconds;
}

/**
 * Return the number of milliseconds until the next candle closes.
 * Returns null for intervals > 1 day (week/month) where countdown is impractical.
 * @param {string} interval  Candle interval string
 * @param {number} now       Current time in ms (Date.now())
 * @returns {number|null}
 */
function getCountdownMs(interval, now) {
    const secondsMap = { "1m": 60, "3m": 180, "5m": 300, "15m": 900, "30m": 1800, "1h": 3600, "4h": 14400, "1d": 86400 };
    const seconds = secondsMap[interval];
    if (!seconds) return null; // Skip complex intervals like 1wk, 1mo

    const ms = seconds * 1000;
    const next = Math.ceil(now / ms) * ms;
    return next === now ? ms : next - now;
}

// ---------------------------------------------------------------------------
//  Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format a countdown in milliseconds as "mm:ss" or "hh:mm:ss".
 * @param {number} ms
 * @returns {string}
 */
function formatCountdown(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    const minSec = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return h > 0 ? `${h.toString().padStart(2, "0")}:${minSec}` : minSec;
}

/**
 * Format a raw price number for display.  Adapts decimal places based on magnitude.
 * @param {number|null|undefined} price
 * @returns {string}
 */
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

/**
 * Format a number as a USD currency string with automatic unit suffix (K/M/B).
 * @param {number} num
 * @returns {string}
 */
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

/**
 * Format a large number with automatic unit suffix (K/M/B), no currency symbol.
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
    if (typeof num !== 'number' || isNaN(num)) return '-';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/**
 * Format a number as a signed percentage string.
 * @param {number} num
 * @returns {string}  e.g. "+3.45%" or "-1.20%"
 */
function formatPercent(num) {
    if (typeof num !== 'number' || isNaN(num)) return '-';
    const sign = num > 0 ? '+' : '';
    return sign + num.toFixed(2) + '%';
}

/**
 * Return the CSS class for a positive/negative performance value.
 * @param {number} num
 * @returns {string}  "perf-up" | "perf-down" | ""
 */
function getPerfClass(num) {
    if (typeof num !== 'number' || isNaN(num)) return '';
    return num >= 0 ? 'perf-up' : 'perf-down';
}

// ---------------------------------------------------------------------------
//  Data utilities
// ---------------------------------------------------------------------------

/**
 * Normalise a raw candle object — coerce all fields to numbers and validate.
 * Returns null if any field is non-finite (filters out bad data from the API).
 * @param {{ time, open, high, low, close, volume? }} candle
 * @returns {{ time, open, high, low, close, volume }|null}
 */
function normalizeCandle(candle) {
    const normalized = {
        time:   Number(candle.time),
        open:   Number(candle.open),
        high:   Number(candle.high),
        low:    Number(candle.low),
        close:  Number(candle.close),
        volume: Number(candle.volume || 0),
    };
    return Object.values(normalized).every(Number.isFinite) ? normalized : null;
}

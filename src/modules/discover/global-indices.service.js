import { sql } from "../../db/mysql.js";
import { cacheGet, cacheSet } from "../../db/redis.js";
import { yahooProvider, providerManager } from "./provider.service.js";

// Standard Global Indices Configuration
export const GLOBAL_INDICES_CONFIG = [
  // Indian Indices
  {
    symbol: "NIFTY_50",
    yahooSymbol: "^NSEI",
    name: "NIFTY 50",
    category: "INDIA",
    country: "India",
    exchange: "NSE",
    currency: "INR",
    marketOpenTime: "09:15",
    marketCloseTime: "15:30",
    timezone: "Asia/Kolkata"
  },
  {
    symbol: "BANK_NIFTY",
    yahooSymbol: "^NSEBANK",
    name: "NIFTY BANK",
    category: "INDIA",
    country: "India",
    exchange: "NSE",
    currency: "INR",
    marketOpenTime: "09:15",
    marketCloseTime: "15:30",
    timezone: "Asia/Kolkata"
  },
  {
    symbol: "NIFTY_FIN_SERVICE",
    yahooSymbol: "NIFTY_FIN_SERVICE.NS",
    name: "NIFTY FINANCIAL SERVICES",
    category: "INDIA",
    country: "India",
    exchange: "NSE",
    currency: "INR",
    marketOpenTime: "09:15",
    marketCloseTime: "15:30",
    timezone: "Asia/Kolkata"
  },
  {
    symbol: "NIFTY_IT",
    yahooSymbol: "^CNXIT",
    name: "NIFTY IT",
    category: "INDIA",
    country: "India",
    exchange: "NSE",
    currency: "INR",
    marketOpenTime: "09:15",
    marketCloseTime: "15:30",
    timezone: "Asia/Kolkata"
  },
  {
    symbol: "NIFTY_MIDCAP_50",
    yahooSymbol: "^NSEMDCP50",
    name: "NIFTY MIDCAP 50",
    category: "INDIA",
    country: "India",
    exchange: "NSE",
    currency: "INR",
    marketOpenTime: "09:15",
    marketCloseTime: "15:30",
    timezone: "Asia/Kolkata"
  },
  {
    symbol: "SENSEX",
    yahooSymbol: "^BSESN",
    name: "S&P BSE SENSEX",
    category: "INDIA",
    country: "India",
    exchange: "BSE",
    currency: "INR",
    marketOpenTime: "09:15",
    marketCloseTime: "15:30",
    timezone: "Asia/Kolkata"
  },
  {
    symbol: "BANKEX",
    yahooSymbol: "BSE-BANK.BO",
    name: "BSE BANKEX",
    category: "INDIA",
    country: "India",
    exchange: "BSE",
    currency: "INR",
    marketOpenTime: "09:15",
    marketCloseTime: "15:30",
    timezone: "Asia/Kolkata"
  },
  // International Indices
  {
    symbol: "NASDAQ",
    yahooSymbol: "^IXIC",
    name: "NASDAQ Composite",
    category: "INTERNATIONAL",
    country: "USA",
    exchange: "NASDAQ",
    currency: "USD",
    marketOpenTime: "09:30",
    marketCloseTime: "16:00",
    timezone: "America/New_York"
  },
  {
    symbol: "NASDAQ_100",
    yahooSymbol: "^NDX",
    name: "NASDAQ 100",
    category: "INTERNATIONAL",
    country: "USA",
    exchange: "NASDAQ",
    currency: "USD",
    marketOpenTime: "09:30",
    marketCloseTime: "16:00",
    timezone: "America/New_York"
  },
  {
    symbol: "SPX",
    yahooSymbol: "^GSPC",
    name: "S&P 500",
    category: "INTERNATIONAL",
    country: "USA",
    exchange: "S&P",
    currency: "USD",
    marketOpenTime: "09:30",
    marketCloseTime: "16:00",
    timezone: "America/New_York"
  },
  {
    symbol: "DJI",
    yahooSymbol: "^DJI",
    name: "Dow Jones Industrial Average",
    category: "INTERNATIONAL",
    country: "USA",
    exchange: "NYSE",
    currency: "USD",
    marketOpenTime: "09:30",
    marketCloseTime: "16:00",
    timezone: "America/New_York"
  },
  {
    symbol: "FTSE_100",
    yahooSymbol: "^FTSE",
    name: "FTSE 100",
    category: "INTERNATIONAL",
    country: "UK",
    exchange: "LSE",
    currency: "GBP",
    marketOpenTime: "08:00",
    marketCloseTime: "16:30",
    timezone: "Europe/London"
  },
  {
    symbol: "DAX",
    yahooSymbol: "^GDAXI",
    name: "DAX Performance Index",
    category: "INTERNATIONAL",
    country: "Germany",
    exchange: "XETRA",
    currency: "EUR",
    marketOpenTime: "09:00",
    marketCloseTime: "17:30",
    timezone: "Europe/Berlin"
  },
  {
    symbol: "NIKKEI_225",
    yahooSymbol: "^N225",
    name: "Nikkei 225",
    category: "INTERNATIONAL",
    country: "Japan",
    exchange: "TSE",
    currency: "JPY",
    marketOpenTime: "09:00",
    marketCloseTime: "15:00",
    timezone: "Asia/Tokyo"
  },
  {
    symbol: "HANG_SENG",
    yahooSymbol: "^HSI",
    name: "Hang Seng Index",
    category: "INTERNATIONAL",
    country: "Hong Kong",
    exchange: "HKEX",
    currency: "HKD",
    marketOpenTime: "09:30",
    marketCloseTime: "16:00",
    timezone: "Asia/Hong_Kong"
  },
  {
    symbol: "SHANGHAI",
    yahooSymbol: "000001.SS",
    name: "Shanghai Composite",
    category: "INTERNATIONAL",
    country: "China",
    exchange: "SSE",
    currency: "CNY",
    marketOpenTime: "09:30",
    marketCloseTime: "15:00",
    timezone: "Asia/Shanghai"
  },
  {
    symbol: "CAC_40",
    yahooSymbol: "^FCHI",
    name: "CAC 40",
    category: "INTERNATIONAL",
    country: "France",
    exchange: "Euronext Paris",
    currency: "EUR",
    marketOpenTime: "09:00",
    marketCloseTime: "17:30",
    timezone: "Europe/Paris"
  }
];

/**
 * Determine market status based on timezone and hours
 */
export function calculateMarketStatus(timeZone, openStr, closeStr) {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      weekday: "short",
      hour: "numeric",
      minute: "numeric"
    });
    const parts = formatter.formatToParts(now);
    const weekday = parts.find(p => p.type === "weekday")?.value;
    const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
    const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);

    if (weekday === "Sat" || weekday === "Sun") {
      return "CLOSED";
    }

    const currentMinutes = hour * 60 + minute;
    const [openH, openM] = openStr.split(":").map(Number);
    const [closeH, closeM] = closeStr.split(":").map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    if (currentMinutes >= openMinutes - 15 && currentMinutes < openMinutes) {
      return "PRE_MARKET";
    }
    if (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) {
      return "OPEN";
    }
    if (currentMinutes > closeMinutes && currentMinutes <= closeMinutes + 30) {
      return "POST_MARKET";
    }
    return "CLOSED";
  } catch (e) {
    return "CLOSED";
  }
}

/**
 * Fetch and sync a single index quote from Yahoo Finance
 */
export async function syncSingleIndex(config) {
  try {
    const { result, durationMs } = await yahooProvider.fetchChart(config.yahooSymbol, "1d", "1d");
    const meta = result?.meta;
    if (!meta) return null;

    const currentValue = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? currentValue;
    const priceChange = meta.fulldayChange ?? +(currentValue - previousClose).toFixed(4);
    const changePercent = meta.regularMarketChangePercent ?? +(previousClose > 0 ? ((currentValue - previousClose) / previousClose) * 100 : 0).toFixed(4);
    const dayHigh = meta.regularMarketDayHigh ?? currentValue;
    const dayLow = meta.regularMarketDayLow ?? currentValue;
    const marketStatus = calculateMarketStatus(config.timezone, config.marketOpenTime, config.marketCloseTime);

    // Upsert into MySQL market_indices
    await sql(
      `INSERT INTO market_indices 
       (symbol, name, category, country, exchange, currency, current_value, previous_close, price_change, change_percent, day_high, day_low, market_open_time, market_close_time, timezone, market_status, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE 
         current_value = VALUES(current_value),
         previous_close = VALUES(previous_close),
         price_change = VALUES(price_change),
         change_percent = VALUES(change_percent),
         day_high = VALUES(day_high),
         day_low = VALUES(day_low),
         market_status = VALUES(market_status),
         last_updated = CURRENT_TIMESTAMP`,
      [
        config.symbol,
        config.name,
        config.category,
        config.country,
        config.exchange,
        config.currency,
        currentValue,
        previousClose,
        priceChange,
        changePercent,
        dayHigh,
        dayLow,
        config.marketOpenTime,
        config.marketCloseTime,
        config.timezone,
        marketStatus
      ]
    );

    const record = {
      symbol: config.symbol,
      name: config.name,
      category: config.category,
      country: config.country,
      exchange: config.exchange,
      currency: config.currency,
      currentValue: Number(currentValue),
      previousClose: Number(previousClose),
      change: Number(priceChange),
      percentageChange: Number(changePercent),
      dayHigh: Number(dayHigh),
      dayLow: Number(dayLow),
      marketOpenTime: config.marketOpenTime,
      marketCloseTime: config.marketCloseTime,
      timezone: config.timezone,
      marketStatus,
      lastUpdated: new Date().toISOString()
    };

    return record;
  } catch (err) {
    console.warn(`[GlobalIndices] Failed to fetch ${config.symbol} (${config.yahooSymbol}):`, err.message);
    // Fallback to reading last known value from database
    const rows = await sql(`SELECT * FROM market_indices WHERE symbol = $1`, [config.symbol]);
    if (rows.length > 0) {
      const r = rows[0];
      return {
        symbol: r.symbol,
        name: r.name,
        category: r.category,
        country: r.country,
        exchange: r.exchange,
        currency: r.currency,
        currentValue: Number(r.current_value),
        previousClose: Number(r.previous_close),
        change: Number(r.price_change),
        percentageChange: Number(r.change_percent),
        dayHigh: Number(r.day_high),
        dayLow: Number(r.day_low),
        marketOpenTime: r.market_open_time,
        marketCloseTime: r.market_close_time,
        timezone: r.timezone,
        marketStatus: r.market_status,
        lastUpdated: r.last_updated
      };
    }
    return null;
  }
}

/**
 * Fetch and return all global indices with caching
 */
export async function getGlobalIndices(categoryFilter = null) {
  const cacheKey = `discover:indices:${categoryFilter || "ALL"}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) {}

  const filteredConfig = categoryFilter
    ? GLOBAL_INDICES_CONFIG.filter(c => c.category === categoryFilter.toUpperCase())
    : GLOBAL_INDICES_CONFIG;

  const results = [];
  const promises = filteredConfig.map(c => syncSingleIndex(c));
  const settled = await Promise.allSettled(promises);

  for (const s of settled) {
    if (s.status === "fulfilled" && s.value) {
      results.push(s.value);
    }
  }

  // Cache for 30 seconds
  try {
    await cacheSet(cacheKey, JSON.stringify(results), 30);
  } catch (e) {}

  return results;
}

/**
 * Fetch index history (candles)
 */
export async function getIndexHistory(symbol, interval = "15m", range = "5d") {
  const cfg = GLOBAL_INDICES_CONFIG.find(c => c.symbol === symbol.toUpperCase() || c.name.toUpperCase() === symbol.toUpperCase());
  if (!cfg) {
    throw new Error(`Unsupported index symbol: ${symbol}`);
  }

  const cacheKey = `discover:index_history:${cfg.symbol}:${interval}:${range}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) {}

  const { result } = await yahooProvider.fetchChart(cfg.yahooSymbol, interval, range);
  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];

  const history = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] !== null && closes[i] !== undefined) {
      history.push({
        timestamp: new Date(timestamps[i] * 1000).toISOString(),
        open: Number(opens[i]?.toFixed(2) ?? closes[i].toFixed(2)),
        high: Number(highs[i]?.toFixed(2) ?? closes[i].toFixed(2)),
        low: Number(lows[i]?.toFixed(2) ?? closes[i].toFixed(2)),
        close: Number(closes[i].toFixed(2)),
        volume: volumes[i] || 0
      });
    }
  }

  const response = {
    symbol: cfg.symbol,
    name: cfg.name,
    category: cfg.category,
    interval,
    range,
    history
  };

  try {
    await cacheSet(cacheKey, JSON.stringify(response), 60);
  } catch (e) {}

  return response;
}

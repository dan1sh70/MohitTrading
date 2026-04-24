import { cacheSet, redis } from "../db/redis.js";

const BINANCE_REST_API = "https://api.binance.com/api/v3";

// Supported cryptocurrencies - 10 top cryptos by market cap
const SUPPORTED_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "TRXUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "LTCUSDT",
  "MATICUSDT"
];

const POLLING_INTERVAL = 2000; // 2 seconds
const CACHE_TTL = 30; // 30 seconds
const STATS_CACHE_TTL = 300; // 5 minutes for stats

let isPolling = false;
let pollingIntervalId = null;

/**
 * Fetch all crypto prices from Binance API
 */
async function fetchAllPricesFromBinance() {
  try {
    const symbols = SUPPORTED_SYMBOLS.join(",");
    const response = await fetch(
      `${BINANCE_REST_API}/ticker/price?symbols=[${symbols.split(",").map(s => `"${s}"`).join(",")}]`
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching all prices from Binance:", error.message);
    return null;
  }
}

/**
 * Fetch 24h stats for all supported cryptos from Binance
 */
async function fetchAllStatsFromBinance() {
  try {
    const stats = [];

    // Fetch stats for each symbol
    for (const symbol of SUPPORTED_SYMBOLS) {
      try {
        const response = await fetch(`${BINANCE_REST_API}/ticker/24hr?symbol=${symbol}`);

        if (response.ok) {
          const data = await response.json();
          stats.push({
            symbol: data.symbol,
            price: parseFloat(data.lastPrice),
            priceChange: parseFloat(data.priceChange),
            priceChangePercent: parseFloat(data.priceChangePercent),
            highPrice: parseFloat(data.highPrice),
            lowPrice: parseFloat(data.lowPrice),
            volume: parseFloat(data.volume),
            quoteAssetVolume: parseFloat(data.quoteAssetVolume),
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch stats for ${symbol}:`, error.message);
      }
    }

    return stats;
  } catch (error) {
    console.error("Error fetching all stats from Binance:", error.message);
    return null;
  }
}

/**
 * Cache all prices in Redis
 */
async function cacheAllPrices(prices) {
  try {
    if (!Array.isArray(prices)) {
      prices = [prices];
    }

    // Cache individual prices
    for (const priceData of prices) {
      const cacheKey = `crypto:price:${priceData.symbol}`;
      const priceObj = {
        symbol: priceData.symbol,
        price: parseFloat(priceData.price),
        timestamp: Date.now()
      };
      await cacheSet(cacheKey, JSON.stringify(priceObj), CACHE_TTL);
    }

    // Cache all prices together
    const allPricesObj = {
      data: prices.map(p => ({
        symbol: p.symbol,
        price: parseFloat(p.price),
        timestamp: Date.now()
      })),
      count: prices.length,
      timestamp: Date.now()
    };
    await cacheSet("crypto:prices:all", JSON.stringify(allPricesObj), CACHE_TTL);

    console.log(`[Polling] Cached ${prices.length} crypto prices`);
  } catch (error) {
    console.error("Error caching prices:", error.message);
  }
}

/**
 * Cache all stats in Redis and get top 10 ranked by price change
 */
async function cacheAllStats(statsArray) {
  try {
    if (!statsArray || statsArray.length === 0) {
      return;
    }

    // Cache individual stats
    for (const stats of statsArray) {
      const cacheKey = `crypto:stats:${stats.symbol}`;
      await cacheSet(cacheKey, JSON.stringify(stats), STATS_CACHE_TTL);
    }

    // Sort by price change percent (descending - winners first)
    const top10 = statsArray
      .sort((a, b) => parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent))
      .slice(0, 10)
      .map(s => ({
        symbol: s.symbol,
        price: parseFloat(s.price),
        priceChange: parseFloat(s.priceChange),
        priceChangePercent: parseFloat(s.priceChangePercent),
        highPrice: parseFloat(s.highPrice),
        lowPrice: parseFloat(s.lowPrice),
        volume: parseFloat(s.volume),
        quoteAssetVolume: parseFloat(s.quoteAssetVolume),
        timestamp: s.timestamp
      }));

    // Cache top 10
    const top10Obj = {
      data: top10,
      count: top10.length,
      timestamp: Date.now()
    };
    await cacheSet("crypto:top10:ranked", JSON.stringify(top10Obj), STATS_CACHE_TTL);

    // Cache all stats together
    const allStatsObj = {
      data: statsArray,
      count: statsArray.length,
      timestamp: Date.now()
    };
    await cacheSet("crypto:stats:all", JSON.stringify(allStatsObj), STATS_CACHE_TTL);

    console.log(`[Polling] Cached top 10 ranked cryptos`);
  } catch (error) {
    console.error("Error caching stats:", error.message);
  }
}

/**
 * Main polling function - runs every 2 seconds
 */
async function pollCryptoData() {
  try {
    // Fetch prices
    const prices = await fetchAllPricesFromBinance();
    if (prices) {
      await cacheAllPrices(prices);
    }

    // Fetch stats
    const stats = await fetchAllStatsFromBinance();
    if (stats && stats.length > 0) {
      await cacheAllStats(stats);
    }
  } catch (error) {
    console.error("Error in polling cycle:", error);
  }
}

/**
 * Start the polling service
 */
export function startPollingService() {
  if (isPolling) {
    console.warn("[Polling] Service is already running");
    return;
  }

  console.log("[Polling] Starting crypto data polling service (2-second interval)");
  isPolling = true;

  // Run immediately on start
  pollCryptoData();

  // Then set interval for every 2 seconds
  pollingIntervalId = setInterval(() => {
    pollCryptoData();
  }, POLLING_INTERVAL);
}

/**
 * Stop the polling service
 */
export function stopPollingService() {
  if (!isPolling) {
    console.warn("[Polling] Service is not running");
    return;
  }

  console.log("[Polling] Stopping crypto data polling service");
  isPolling = false;

  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
}

/**
 * Check if polling is active
 */
export function isPollingActive() {
  return isPolling;
}

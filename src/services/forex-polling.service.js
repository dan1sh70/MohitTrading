import { cacheSet, cacheGet, redis } from "../db/redis.js";
import { getForexRate, getTestedForexPairs } from "./alpha-vantage.service.js";

const POLLING_INTERVAL = 60000; // 60 seconds (1 minute) to avoid API rate limits
const CACHE_TTL = 120; // 2 minutes for live forex data

let isPolling = false;
let pollingIntervalId = null;

/**
 * Fetch and cache all tested forex pairs with live rates
 */
async function pollForexData() {
  try {
    const pairs = getTestedForexPairs();
    
    if (!pairs || pairs.length === 0) {
      console.log("[Forex Polling] No tested forex pairs found");
      return;
    }

    console.log(`[Forex Polling] Fetching rates for ${pairs.length} pairs at ${new Date().toISOString()}`);

    const pairsWithRates = await Promise.all(
      pairs.map(async (pair) => {
        try {
          const [fromCurrency, toCurrency] = pair.pair.split('/');
          const rateData = await getForexRate(fromCurrency, toCurrency);
          
          return {
            ...pair,
            currentPrice: rateData.exchangeRate || rateData.rate,
            priceChange: rateData.change || 0,
            priceChangePercent: rateData.changePercent || 0,
            lastUpdate: rateData.timestamp || new Date().toISOString(),
            source: rateData.source || "Alpha Vantage"
          };
        } catch (error) {
          console.warn(`[Forex Polling] Failed to fetch rate for ${pair.pair}:`, error.message);
          return pair; // Return pair without updated rates on error
        }
      })
    );

    // Cache all pairs together
    const cacheData = {
      data: pairsWithRates,
      count: pairsWithRates.length,
      timestamp: Date.now(),
      refreshedAt: new Date().toISOString()
    };

    await cacheSet("forex:tested:all", JSON.stringify(cacheData), CACHE_TTL);
    console.log(`[Forex Polling] Cached ${pairsWithRates.length} forex pairs with rates`);

  } catch (error) {
    console.error("[Forex Polling] Error in polling cycle:", error.message);
  }
}

/**
 * Start the forex polling service
 */
export function startForexPollingService() {
  if (isPolling) {
    console.warn("[Forex Polling] Service is already running");
    return;
  }

  console.log("[Forex Polling] Starting forex data polling service (60-second interval)");
  isPolling = true;

  // Run immediately on start
  pollForexData();

  // Then set interval for every 60 seconds
  pollingIntervalId = setInterval(() => {
    pollForexData();
  }, POLLING_INTERVAL);
}

/**
 * Stop the forex polling service
 */
export function stopForexPollingService() {
  if (!isPolling) {
    console.warn("[Forex Polling] Service is not running");
    return;
  }

  console.log("[Forex Polling] Stopping forex data polling service");
  isPolling = false;

  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = null;
  }
}

/**
 * Check if polling is active
 */
export function isForexPollingActive() {
  return isPolling;
}

/**
 * Get cached tested forex pairs
 */
export async function getCachedTestedForex() {
  try {
    const cached = await cacheGet("forex:tested:all");
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    console.error("[Forex Polling] Error getting cached forex:", error.message);
    return null;
  }
}

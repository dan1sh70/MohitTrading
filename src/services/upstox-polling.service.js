import { getSupportedIndianStocks } from "./upstox.service.js";
import { getLiveQuote } from "./upstox-market-engine.js";
import { broadcastToSymbol } from "./socketio.service.js";
import { setJson, CacheKey } from "../cache/index.js";
import { canRequest } from "./rate-limit.service.js";
import { getUpstoxTokenStatus } from "./upstox-token-manager.js";

const DEFAULT_POLLING_INTERVAL_MS = 5000;
const DEFAULT_SYMBOLS = ["INFY", "TCS", "RELIANCE", "HDFC", "ICICIBANK"];
const CACHE_TTL = 10;
let intervalId = null;
let isPolling = false;

function normalizeSymbol(symbol) {
  return String(symbol || "").toUpperCase().trim();
}

function getPollingSymbols() {
  try {
    const supported = getSupportedIndianStocks();
    if (Array.isArray(supported) && supported.length > 0) {
      return supported.slice(0, 10).map((entry) => normalizeSymbol(entry.symbol));
    }
  } catch (error) {
    // ignore and fallback
  }
  return DEFAULT_SYMBOLS;
}

async function cacheQuote(symbol, data) {
  const key = CacheKey.livePrice(symbol);
  return setJson(key, data, CACHE_TTL);
}

export async function pollUpstoxQuotes(symbols = [], userId = "default") {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    symbols = getPollingSymbols();
  }

  const tokenStatus = await getUpstoxTokenStatus(userId);
  if (!tokenStatus.exists || !tokenStatus.hasAccessToken) {
    console.warn(`[Upstox Poller] Skipping quote polling for ${userId}: no Upstox token available`);
    return [];
  }

  const results = [];
  for (const rawSymbol of symbols) {
    const symbol = normalizeSymbol(rawSymbol);
    if (!symbol) continue;

    try {
      // Pre-check rate-limit to avoid spamming logs when limit exceeded
      if (!(await canRequest())) {
        console.warn(`[Upstox Poller] Skipping remaining symbols, rate limit reached`);
        break;
      }
      const quote = await getLiveQuote(symbol, userId);
      const payload = {
        symbol,
        quote,
        timestamp: Date.now()
      };
      await cacheQuote(symbol, payload);
      broadcastToSymbol(symbol, "UPSTOX_QUOTE_UPDATE", payload);
      results.push(payload);
    } catch (error) {
      console.warn(`[Upstox Poller] Failed quote for ${symbol}:`, error.message);
    }
  }
  return results;
}

export function startUpstoxPolling(intervalMs = DEFAULT_POLLING_INTERVAL_MS, symbols = []) {
  if (isPolling) return;
  isPolling = true;

  const pollingSymbols = Array.isArray(symbols) && symbols.length > 0 ? symbols : getPollingSymbols();
  console.log(`[Upstox Poller] Starting with symbols: ${pollingSymbols.join(", ")}`);

  intervalId = setInterval(async () => {
    try {
      await pollUpstoxQuotes(pollingSymbols);
    } catch (error) {
      console.error("[Upstox Poller] Error during poll cycle:", error.message);
    }
  }, intervalMs);
}

export function stopUpstoxPolling() {
  if (!isPolling) return;
  clearInterval(intervalId);
  intervalId = null;
  isPolling = false;
}

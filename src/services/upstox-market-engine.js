import { CacheKey, getJson, setJson } from "../cache/index.js";
import { fetchWithAuth, getAccessToken } from "./upstox-token-manager.js";
import { canRequest, recordRequest } from "./rate-limit.service.js";
import { getInstrumentKey } from "../data/upstox-instruments.js";

const QUOTE_ENDPOINT = "https://api.upstox.com/v2/quotes";
const OHLC_ENDPOINT = "https://api.upstox.com/v2/ohlc";
const OPTION_CHAIN_ENDPOINT = "https://api.upstox.com/v2/option-chain";
const CACHE_TTLS = {
  quote: 5,
  ohlc: 20,
  optionChain: 60,
  historical: 120
};

function buildQuery(params) {
  return new URLSearchParams(params).toString();
}

async function requestUpstox(url, options) {
  if (!(await canRequest())) {
    const error = new Error("Upstox rate limit exceeded");
    error.statusCode = 429;
    throw error;
  }

  await recordRequest();
  return fetchWithAuth(url, options);
}

export async function getLiveQuote(symbol, userId = "default") {
  const cacheKey = CacheKey.livePrice(symbol);
  const cached = await getJson(cacheKey);
  if (cached) {
    return cached;
  }

  // Convert trading symbol to Upstox instrument key (e.g., INFY → NSE_EQ|INE009A01021)
  const instrumentKey = getInstrumentKey(symbol);
  if (!instrumentKey) {
    console.warn(`[Upstox] No instrument key mapping for symbol ${symbol}`);
    throw new Error(`Upstox: Unknown symbol ${symbol}`);
  }

  // Try multiple query parameter formats in case Upstox expects different formats
  const queryFormats = [
    { key: instrumentKey }, // ?key=NSE_EQ|INE009A01021
    { instrument_key: instrumentKey }, // ?instrument_key=NSE_EQ|INE009A01021
    { symbol: instrumentKey }, // ?symbol=NSE_EQ|INE009A01021
  ];

  let lastError = null;
  for (const queryParams of queryFormats) {
    try {
      const url = `${QUOTE_ENDPOINT}?${buildQuery(queryParams)}`;
      console.log(`[Upstox Quote] Trying: ${url.replace(/[A-Z0-9|]+/, "***")}`);
      
      const response = await requestUpstox(url, { method: "GET" });
      const data = await response.json();
      
      if (response.ok) {
        console.log(`[Upstox Quote] Success for ${symbol}`);
        await setJson(cacheKey, data, CACHE_TTLS.quote);
        return data;
      }
      
      const message = data.error || data.message || JSON.stringify(data);
      lastError = new Error(`Upstox quote fetch failed for ${symbol}: ${message}`);
      console.warn(`[Upstox Quote] Query format failed (${Object.keys(queryParams)[0]}):`, message.substring(0, 100));
    } catch (err) {
      lastError = err;
      console.warn(`[Upstox Quote] Request failed:`, err.message.substring(0, 100));
    }
  }

  throw lastError || new Error(`Failed to fetch quote for ${symbol}`);
}

export async function getOHLC(symbol, interval = "1m", userId = "default") {
  const cacheKey = CacheKey.ohlc(symbol, interval);
  const cached = await getJson(cacheKey);
  if (cached) {
    return cached;
  }

  // Convert trading symbol to Upstox instrument key
  const instrumentKey = getInstrumentKey(symbol);
  if (!instrumentKey) {
    throw new Error(`Upstox: Unknown symbol ${symbol}`);
  }

  // Try multiple query parameter formats
  const queryFormats = [
    { key: instrumentKey, interval },
    { instrument_key: instrumentKey, interval },
    { symbol: instrumentKey, interval },
  ];

  let lastError = null;
  for (const queryParams of queryFormats) {
    try {
      const url = `${OHLC_ENDPOINT}?${buildQuery(queryParams)}`;
      const response = await requestUpstox(url, { method: "GET" });
      const data = await response.json();
      
      if (response.ok) {
        await setJson(cacheKey, data, CACHE_TTLS.ohlc);
        return data;
      }
      
      const message = data.error || data.message || JSON.stringify(data);
      lastError = new Error(`Upstox OHLC fetch failed for ${symbol}: ${message}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error(`Failed to fetch OHLC for ${symbol}`);
}

export async function getOptionChain(symbol, userId = "default") {
  const cacheKey = CacheKey.optionChain(symbol);
  const cached = await getJson(cacheKey);
  if (cached) {
    return cached;
  }

  // Convert trading symbol to Upstox instrument key
  const instrumentKey = getInstrumentKey(symbol);
  if (!instrumentKey) {
    throw new Error(`Upstox: Unknown symbol ${symbol}`);
  }

  // Try multiple query parameter formats
  const queryFormats = [
    { key: instrumentKey },
    { instrument_key: instrumentKey },
    { symbol: instrumentKey },
  ];

  let lastError = null;
  for (const queryParams of queryFormats) {
    try {
      const url = `${OPTION_CHAIN_ENDPOINT}?${buildQuery(queryParams)}`;
      const response = await requestUpstox(url, { method: "GET" });
      const data = await response.json();
      
      if (response.ok) {
        await setJson(cacheKey, data, CACHE_TTLS.optionChain);
        return data;
      }
      
      const message = data.error || data.message || JSON.stringify(data);
      lastError = new Error(`Upstox option chain fetch failed for ${symbol}: ${message}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error(`Failed to fetch option chain for ${symbol}`);
}

export async function getTokenStatus(userId = "default") {
  return await getAccessToken(userId).then(() => ({ available: true })).catch((error) => ({ available: false, message: error.message }));
}

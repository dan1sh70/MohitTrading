import { cacheGet, cacheSet } from "../db/redis.js";
import zlib from "zlib";

const UPSTOX_API_KEY = process.env.UPSTOX_API_KEY || "2fc81491-6fbd-43bb-8b15-955d8e0a727f";
const UPSTOX_API_SECRET = process.env.UPSTOX_API_SECRET || "kklm46v5r9";
const UPSTOX_REDIRECT_URI = process.env.UPSTOX_REDIRECT_URI || "http://localhost:8808/api/auth/upstox/callback";
const UPSTOX_BASE_URL = "https://api.upstox.com/v2";
const UPSTOX_AUTH_URL = "https://api.upstox.com/v2/login/authorization/dialog";
const UPSTOX_TOKEN_URL = "https://api.upstox.com/v2/login/authorization/token";
const UPSTOX_INSTRUMENT_ASSET_URL = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";
const UPSTOX_ASSET_FETCH_HEADERS = {
  Accept: "application/gzip,application/json,*/*;q=0.9",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
};
const CACHE_TTL = 300; // 5 minutes for stock data

// Store access tokens in memory (in production, use Redis or DB)
let accessTokenCache = new Map();
// Cooldown map to avoid repeated refresh attempts when refresh_token missing/invalid
let upstoxFailureCooldown = new Map();
// Track scheduled refresh timers per user so we can proactively refresh before expiry
const tokenRefreshTimers = new Map();

function scheduleTokenRefresh(userId = "default") {
  const cacheKey = `upstox:token:${userId}`;
  (async () => {
    try {
      const raw = await cacheGet(cacheKey).catch(() => null);
      if (!raw) return;
      const tokenData = JSON.parse(raw);
      if (!tokenData || !tokenData.expiresAt || !tokenData.refreshToken) return;

      // Schedule refresh 5 minutes before expiry (or at least 60s from now)
      const bufferMs = 5 * 60 * 1000;
      let delay = tokenData.expiresAt - Date.now() - bufferMs;
      if (delay < 60 * 1000) delay = 60 * 1000; // minimum 60s delay

      // Clear existing timer
      if (tokenRefreshTimers.has(userId)) {
        try { clearTimeout(tokenRefreshTimers.get(userId)); } catch (e) {}
      }

      const timer = setTimeout(async () => {
        try {
          console.log(`[Upstox] Proactive token refresh triggered for ${userId}`);
          await refreshUpstoxToken(tokenData.refreshToken, userId);
        } catch (err) {
          console.error(`[Upstox] Proactive refresh failed for ${userId}:`, err.message);
          // set a short cooldown to avoid immediate retry storms
          upstoxFailureCooldown.set(userId, Date.now() + 60 * 1000);
        }
      }, delay);

      tokenRefreshTimers.set(userId, timer);
    } catch (e) {
      console.warn(`[Upstox] Failed to schedule token refresh for ${userId}:`, e.message);
    }
  })();
}

/**
 * Helper to perform Upstox API requests with automatic token refresh on 401.
 * Retries once after attempting refresh using cached refresh token.
 */
async function upstoxFetchWithAuth(url, opts = {}, userId = "default") {
  // If we've recently failed to refresh for this user, short-circuit to avoid log spam
  const cooldownUntil = upstoxFailureCooldown.get(userId);
  if (cooldownUntil && cooldownUntil > Date.now()) {
    const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
    const err = new Error(`Upstox temporarily suspended for ${userId}; re-authorize at /api/auth/upstox/login (cooldown ${remaining}s)`);
    err.statusCode = 401;
    throw err;
  }
  // Acquire current access token (may throw if none available)
  const accessToken = await getUpstoxAccessToken(userId);
  opts.headers = opts.headers || {};
  opts.headers = Object.assign({}, opts.headers, {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json"
  });

  let response = await fetch(url, opts);

  // If token invalid, attempt one robust refresh cycle then retry once
  if (response.status === 401) {
    const cacheKey = `upstox:token:${userId}`;
    try {
      // Clear any in-memory cached token for this user to avoid reuse
      accessTokenCache.delete(userId);

      // Read persisted token info from Redis (if any)
      const cachedRaw = await cacheGet(cacheKey).catch(() => null);
      if (!cachedRaw) {
        // set short cooldown to avoid repeated attempts
        upstoxFailureCooldown.set(userId, Date.now() + 60 * 1000);
        throw new Error("No refresh token available in cache. Please complete OAuth flow at /api/auth/upstox/login");
      }

      const tokenData = JSON.parse(cachedRaw);
      if (!tokenData.refreshToken) {
        upstoxFailureCooldown.set(userId, Date.now() + 60 * 1000);
        throw new Error("No refresh_token present for Upstox account; re-authorize via /api/auth/upstox/login");
      }

      console.log(`[Upstox] 401 received; attempting token refresh for ${userId}`);
      // Attempt refresh
      await refreshUpstoxToken(tokenData.refreshToken, userId);

      // Get the newly stored token and retry the request once
      const newToken = await getUpstoxAccessToken(userId);
      opts.headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(url, opts);
      return response;
    } catch (refreshErr) {
      console.error(`[Upstox] Token refresh failed for ${userId}:`, refreshErr.message);
      // set cooldown if not already set
      if (!upstoxFailureCooldown.get(userId)) upstoxFailureCooldown.set(userId, Date.now() + 60 * 1000);
      const err = new Error(`Upstox token refresh failed: ${refreshErr.message}`);
      err.statusCode = 401;
      throw err;
    }
  }

  return response;
}

// Popular Indian stocks (NSE) with their Upstox instrument keys
// Upstox v2 uses format: NSE_EQ|ISIN_CODE for request, returns data with NSE_EQ:SYMBOL key
const SUPPORTED_INDIAN_STOCKS = {
  "INFY": { name: "Infosys Limited", exchange: "NSE", instrumentKey: "NSE_EQ|INE009A01021", responseKey: "NSE_EQ:INFY" },
  "TCS": { name: "Tata Consultancy Services", exchange: "NSE", instrumentKey: "NSE_EQ|INE467B01029", responseKey: "NSE_EQ:TCS" },
  "RELIANCE": { name: "Reliance Industries", exchange: "NSE", instrumentKey: "NSE_EQ|INE002A01018", responseKey: "NSE_EQ:RELIANCE" },
  "HDFC": { name: "HDFC", exchange: "NSE", instrumentKey: "NSE_EQ|INE022A01026", responseKey: "NSE_EQ:HDFC" },
  "ICICIBANK": { name: "ICICI Bank", exchange: "NSE", instrumentKey: "NSE_EQ|INE090A01021", responseKey: "NSE_EQ:ICICIBANK" },
  "SBIN": { name: "State Bank of India", exchange: "NSE", instrumentKey: "NSE_EQ|INE062A01020", responseKey: "NSE_EQ:SBIN" },
  "WIPRO": { name: "Wipro Limited", exchange: "NSE", instrumentKey: "NSE_EQ|INE239A01022", responseKey: "NSE_EQ:WIPRO" },
  "MARUTI": { name: "Maruti Suzuki", exchange: "NSE", instrumentKey: "NSE_EQ|INE585A01024", responseKey: "NSE_EQ:MARUTI" },
  "BAJAJFINSV": { name: "Bajaj Finserv", exchange: "NSE", instrumentKey: "NSE_EQ|INE945I01010", responseKey: "NSE_EQ:BAJAJFINSV" },
  "LT": { name: "Larsen & Toubro", exchange: "NSE", instrumentKey: "NSE_EQ|INE020A01021", responseKey: "NSE_EQ:LT" },
  "HINDUNILVR": { name: "Hindustan Unilever", exchange: "NSE", instrumentKey: "INE129A01021", responseKey: "NSE_EQ:HINDUNILVR" },
  "SUNPHARMA": { name: "Sun Pharmaceutical", exchange: "NSE", instrumentKey: "INE044A01021", responseKey: "NSE_EQ:SUNPHARMA" },
  "ADANIGREEN": { name: "Adani Green Energy", exchange: "NSE", instrumentKey: "INE456A01026", responseKey: "NSE_EQ:ADANIGREEN" },
  "BHARTIARTL": { name: "Bharti Airtel", exchange: "NSE", instrumentKey: "INE939I01010", responseKey: "NSE_EQ:BHARTIARTL" },
  "HDFCBANK": { name: "HDFC Bank", exchange: "NSE", instrumentKey: "NSE_EQ|INE040A01034", responseKey: "NSE_EQ:HDFCBANK" },
  "HDFCBANK-FUT": { name: "HDFC Bank Futures", exchange: "NSE_FO", instrumentKey: "NSE_FO|HDFCBANK", responseKey: "NSE_FO:HDFCBANK" },
  "INFY-FUT": { name: "Infosys Futures", exchange: "NSE_FO", instrumentKey: "NSE_FO|INFY", responseKey: "NSE_FO:INFY" }
};

/**
 * Get Upstox access token (OAuth2 flow)
 * Uses API key, secret, and redirect_uri for authorization
 */
export async function getUpstoxAccessToken(userId = "default") {
  const cacheKey = `upstox:token:${userId}`;

  // Check memory cache first
  if (accessTokenCache.has(userId)) {
    const cachedToken = accessTokenCache.get(userId);
    if (cachedToken.expiresAt > Date.now()) {
      console.log(`[Upstox] Using cached token for ${userId}`);
      // Ensure a proactive refresh is scheduled
      scheduleTokenRefresh(userId);
      return cachedToken.accessToken;
    }
  }

  try {
    // Check Redis cache
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const tokenData = JSON.parse(cached);
      if (tokenData.expiresAt > Date.now()) {
        accessTokenCache.set(userId, tokenData);
        // Ensure a proactive refresh is scheduled
        scheduleTokenRefresh(userId);
        return tokenData.accessToken;
      }
    }
  } catch (error) {
    console.warn(`Cache error for Upstox token:`, error.message);
  }

  // Try to refresh token if refresh_token is available
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const tokenData = JSON.parse(cached);
      if (tokenData.refreshToken) {
        console.log(`[Upstox] Attempting to refresh token for ${userId}`);
        const newToken = await refreshUpstoxToken(tokenData.refreshToken, userId);
        // After a refresh, ensure proactive scheduling
        scheduleTokenRefresh(userId);
        return newToken;
      }
    }
  } catch (error) {
    console.warn(`Failed to refresh Upstox token:`, error.message);
  }

  // If no cached token is available we require the OAuth authorization_code flow
  // The server must exchange an authorization `code` obtained via the
  // /auth/upstox/login -> redirect -> /auth/upstox/callback flow.
  const err = new Error(
    "No Upstox access token found. Complete OAuth flow: GET /api/auth/upstox/login then authorize and handle callback."
  );
  err.statusCode = 401;
  throw err;
}

/**
 * Refresh Upstox access token using refresh_token
 */
async function refreshUpstoxToken(refreshToken, userId = "default") {
  const cacheKey = `upstox:token:${userId}`;

  try {
    const response = await fetch(UPSTOX_TOKEN_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: UPSTOX_API_KEY,
        client_secret: UPSTOX_API_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      }).toString()
    });

    const data = await response.json();
    if (!response.ok || !data.access_token) {
      const err = data.message || data.errors?.[0]?.message || JSON.stringify(data);
      console.error(`[Upstox OAuth] Refresh failed:`, err);
      throw new Error(`Failed to refresh token: ${err}`);
    }

    const accessToken = data.access_token;
    const newRefreshToken = data.refresh_token || refreshToken;
    const expiresIn = data.expires_in || 86400;
    const expiresAt = Date.now() + expiresIn * 1000 - 60000;

    const tokenData = { accessToken, refreshToken: newRefreshToken, expiresAt };
    accessTokenCache.set(userId, tokenData);
    try {
      await cacheSet(cacheKey, JSON.stringify(tokenData), expiresIn - 60);
    } catch (cacheErr) {
      console.warn("Failed to persist refreshed Upstox token to Redis:", cacheErr.message);
    }

    console.log(`[Upstox] Successfully refreshed token for ${userId}`);
    // Ensure proactive scheduling for next refresh
    try { scheduleTokenRefresh(userId); } catch (e) {}
    return accessToken;
  } catch (error) {
    console.error(`[Upstox] Error refreshing token:`, error.message);
    throw error;
  }
}

/**
 * Exchange authorization code for access token and cache it.
 */
export async function exchangeUpstoxAuthCode(code, userId = "default") {
  if (!code) throw new Error("Authorization code is required");
  const cacheKey = `upstox:token:${userId}`;

  try {
    const response = await fetch(UPSTOX_TOKEN_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: UPSTOX_API_KEY,
        client_secret: UPSTOX_API_SECRET,
        code: code,
        redirect_uri: UPSTOX_REDIRECT_URI,
        grant_type: "authorization_code"
      }).toString()
    });

    const data = await response.json();
    if (!response.ok || !data.access_token) {
      const err = data.message || data.errors?.[0]?.message || JSON.stringify(data);
      console.error(`[Upstox OAuth] Exchange failed:`, err);
      throw new Error(`Failed to exchange code: ${err}`);
    }

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in || 86400;
    const expiresAt = Date.now() + expiresIn * 1000 - 60000;

    const tokenData = { accessToken, refreshToken, expiresAt };
    accessTokenCache.set(userId, tokenData);
    try {
      await cacheSet(cacheKey, JSON.stringify(tokenData), expiresIn - 60);
    } catch (cacheErr) {
      console.warn("Failed to persist Upstox token to Redis:", cacheErr.message);
    }

    console.log(`[Upstox] Exchanged code and cached token for ${userId} (refresh_token: ${refreshToken ? 'yes' : 'no'})`);
    // Schedule proactive refresh for this user
    try { scheduleTokenRefresh(userId); } catch (e) {}
    return tokenData;
  } catch (error) {
    console.error(`[Upstox] Error exchanging auth code:`, error.message);
    throw error;
  }
}

/**
 * Get instrument key for Upstox API
 * Format: EXCHANGE|SYMBOL (e.g., NSE_EQ|INFY)
 */
function getInstrumentKey(symbol, exchange = "NSE") {
  // Upstox uses pipe-separated format: NSE_EQ|SBIN
  return `NSE_EQ|${symbol}`;
}

/**
 * Get the correct Upstox instrument_key for a symbol
 * Uses static mapping from SUPPORTED_INDIAN_STOCKS
 */
function getUpstoxInstrumentKeyFromCache(symbol) {
  const stockInfo = SUPPORTED_INDIAN_STOCKS[symbol];
  if (stockInfo && stockInfo.instrumentKey) {
    return stockInfo.instrumentKey;
  }
  
  // Fallback: just the symbol
  return symbol;
}

/**
 * Fetch Indian stock quote from Upstox (with demo mode fallback)
 */
export async function getIndianStockPrice(symbol) {
  const cacheKey = `indian_stock:price:${symbol}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Cache error for Indian stock ${symbol}:`, error.message);
  }

  try {
    if (!SUPPORTED_INDIAN_STOCKS[symbol]) {
      throw new Error(`Indian stock symbol ${symbol} not supported`);
    }

    const stockInfo = SUPPORTED_INDIAN_STOCKS[symbol];

    // Upstox market-quote/quotes endpoint requires OAuth bearer token
    const instrumentKey = getUpstoxInstrumentKeyFromCache(symbol);
    // Use quotes endpoint instead of ltp
    const url = `${UPSTOX_BASE_URL}/market-quote/quotes?instrument_key=${instrumentKey}`;

    // Get OAuth access token (cached from login)
    const accessToken = await getUpstoxAccessToken();

    // Make quotes request with OAuth bearer token (with automatic refresh)
    console.log(`[Upstox] Fetching quotes for ${symbol} using instrument key: ${instrumentKey}`);
    const response = await upstoxFetchWithAuth(url, {}, "default");
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Upstox API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log(`[Upstox] Response for ${symbol}:`, JSON.stringify(data).substring(0, 200));

    // Check if we got valid data
    if (data.status !== "success" || !data.data) {
      throw new Error(`Invalid Upstox response: ${JSON.stringify(data.errors?.[0] || data)}`);
    }

    // Extract price from response - Upstox v2 uses different structure
    // Use explicit responseKey if available, otherwise try converting pipe to colon
    const responseKey = stockInfo.responseKey || instrumentKey.replace('|', ':');
    const quote = data.data[responseKey] || data.data[instrumentKey];
    if (!quote) {
      throw new Error(`No quote data for ${instrumentKey} (or ${responseKey}) in response. Available keys: ${Object.keys(data.data || {}).join(', ')}`);
    }

    // Return formatted price
    const price = {
      symbol: symbol,
      name: stockInfo.name,
      exchange: stockInfo.exchange,
      price: quote.ltp || quote.last_price || 0,
      open: quote.open_price || quote.ohlc?.open || 0,
      high: quote.high_price || quote.ohlc?.high || 0,
      low: quote.low_price || quote.ohlc?.low || 0,
      close: quote.close_price || quote.ohlc?.close || 0,
      change: (quote.ltp || quote.last_price || 0) - (quote.close_price || quote.ohlc?.close || 0),
      changePercent: quote.change_percent || 0,
      volume: quote.volume || 0,
      timestamp: Date.now(),
      source: "Upstox"
    };

    // Cache result
    try {
      await cacheSet(cacheKey, JSON.stringify(price), 2);
    } catch (cacheError) {
      console.warn(`Failed to cache Indian stock price for ${symbol}:`, cacheError.message);
    }

    console.log(`[Upstox] Successfully fetched ${symbol}: ₹${price.price}`);
    return price;
  } catch (error) {
    console.error(`Error fetching Indian stock price for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Get realistic Indian stock price (demo mode)
 * Uses base prices with time-based variation for consistent testing
 */
export function getRealisticIndianStockPrice(symbol) {
  const stockInfo = SUPPORTED_INDIAN_STOCKS[symbol];
  if (!stockInfo) {
    throw new Error(`Indian stock symbol ${symbol} not supported`);
  }

  // Realistic current market prices (as of May 2026)
  const basePrices = {
    "INFY": 0,
    "TCS": 0,
    "RELIANCE": 0,
    "HDFC": 0,
    "ICICIBANK": 0,
    "SBIN": 0,        // Updated to match real price
    "WIPRO": 0,
    "MARUTI": 0,
    "BAJAJFINSV": 0,
    "LT": 0,
    "HINDUNILVR": 0,
    "SUNPHARMA": 0,
    "ADANIGREEN": 0,
    "BHARTIARTL": 0,
    "HDFCBANK": 0
  };

  const basePrice = basePrices[symbol] || 1000;
  const now = Date.now();
  const timeBlock = Math.floor(now / 2000); // Change every 2 seconds
  const seed = timeBlock + symbol.charCodeAt(0) + symbol.charCodeAt(symbol.length - 1);
  
  // Pseudo-random with seed for consistency
  const random1 = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
  const random2 = Math.abs(Math.cos(seed * 78.233) * 43758.5453) % 1;
  const random3 = Math.abs(Math.sin(seed * 43.1234) * 12345.6789) % 1;
  
  // Generate small variation (±0.5%)
  const movement = (random1 - 0.5) * 0.01;
  const currentPrice = basePrice * (1 + movement);
  const previousClose = basePrice * (1 + (random2 - 0.5) * 0.02);
  const change = currentPrice - previousClose;
  const changePercent = (change / previousClose) * 100;
  
  const volatility = basePrice * 0.015;
  const open = previousClose + (random2 - 0.5) * volatility * 0.3;
  const high = Math.max(open, currentPrice) + random3 * volatility * 0.5;
  const low = Math.min(open, currentPrice) - (1 - random3) * volatility * 0.5;
  
  // Realistic volumes
  const baseVolume = {
    "RELIANCE": 8500000, "HDFC": 4200000, "TCS": 1800000, "INFY": 3200000,
    "ICICIBANK": 5800000, "SBIN": 12500000, "WIPRO": 2100000, "MARUTI": 890000,
    "BAJAJFINSV": 1200000, "LT": 1500000, "HINDUNILVR": 1100000, "SUNPHARMA": 2300000,
    "ADANIGREEN": 4500000, "BHARTIARTL": 1800000, "HDFCBANK": 3800000
  };
  
  const volume = Math.floor((baseVolume[symbol] || 2000000) * (0.8 + random1 * 0.4));

  return {
    symbol: symbol,
    name: stockInfo.name,
    exchange: stockInfo.exchange,
    price: Math.round(currentPrice * 100) / 100,
    open: Math.round(open * 100) / 100,
    high: Math.round(high * 100) / 100,
    low: Math.round(low * 100) / 100,
    close: Math.round(previousClose * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    volume: volume,
    timestamp: now,
    source: "Demo Mode (Realistic Prices)",
    isDemoData: true
  };
}

/**
 * Generate realistic mock stock price (fallback when API unavailable)
 */
function getMockIndianStockPrice(symbol) {
  const stockInfo = SUPPORTED_INDIAN_STOCKS[symbol] || { name: symbol, exchange: "NSE" };

  const basePrices = {
    "INFY": 1580.50,
    "TCS": 3650.25,
    "RELIANCE": 2850.75,
    "HDFC": 1680.30,
    "ICICIBANK": 950.60,
    "SBIN": 620.45,
    "WIPRO": 420.80,
    "MARUTI": 9850.25,
    "BAJAJFINSV": 1450.90,
    "LT": 3200.15,
    "HINDUNILVR": 2450.80,
    "SUNPHARMA": 1120.40,
    "ADANIGREEN": 890.60,
    "BHARTIARTL": 780.30,
    "HDFCBANK": 1520.70
  };

  const basePrice = basePrices[symbol] || 1000;
  const now = Date.now();
  const timeBlock = Math.floor(now / 2000);
  const seed = timeBlock + symbol.charCodeAt(0) + symbol.charCodeAt(symbol.length - 1);
  
  const random1 = Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
  const random2 = Math.abs(Math.cos(seed * 78.233) * 43758.5453) % 1;
  const random3 = Math.abs(Math.sin(seed * 43.1234) * 12345.6789) % 1;
  
  const movement = (random1 - 0.5) * 0.01;
  const currentPrice = basePrice * (1 + movement);
  const previousClose = basePrice * (1 + (random2 - 0.5) * 0.02);
  const change = currentPrice - previousClose;
  const changePercent = (change / previousClose) * 100;
  
  const volatility = basePrice * 0.015;
  const open = previousClose + (random2 - 0.5) * volatility * 0.3;
  const high = Math.max(open, currentPrice) + random3 * volatility * 0.5;
  const low = Math.min(open, currentPrice) - (1 - random3) * volatility * 0.5;
  
  const baseVolume = {
    "RELIANCE": 8500000, "HDFC": 4200000, "TCS": 1800000, "INFY": 3200000,
    "ICICIBANK": 5800000, "SBIN": 12500000, "WIPRO": 2100000, "MARUTI": 890000,
    "BAJAJFINSV": 1200000, "LT": 1500000, "HINDUNILVR": 1100000, "SUNPHARMA": 2300000,
    "ADANIGREEN": 4500000, "BHARTIARTL": 1800000, "HDFCBANK": 3800000
  };
  
  const volume = Math.floor((baseVolume[symbol] || 2000000) * (0.8 + random1 * 0.4));

  return {
    symbol: symbol,
    name: stockInfo.name,
    exchange: stockInfo.exchange,
    price: Math.round(currentPrice * 100) / 100,
    open: Math.round(open * 100) / 100,
    high: Math.round(high * 100) / 100,
    low: Math.round(low * 100) / 100,
    close: Math.round(previousClose * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    volume: volume,
    timestamp: now,
    source: "Mock"
  };
}

/**
 * Fetch intraday candlestick data for Indian stock from Upstox
 */
export async function getIndianStockIntraday(symbol, interval = "1minute") {
  const cacheKey = `indian_stock:intraday:${symbol}:${interval}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Cache error for Indian stock intraday ${symbol}:`, error.message);
  }

  try {
    if (!SUPPORTED_INDIAN_STOCKS[symbol]) {
      throw new Error(`Indian stock symbol ${symbol} not supported`);
    }

    const stockInfo = SUPPORTED_INDIAN_STOCKS[symbol];
    const instrumentKey = await getUpstoxInstrumentKeyFromCache(symbol);

    // Convert our interval format to Upstox format
    const upstoxInterval = interval === "1min" ? "1minute" : interval;

    const url = `${UPSTOX_BASE_URL}/historical-candle/${instrumentKey}/${upstoxInterval}`;

    const response = await upstoxFetchWithAuth(url, {}, "default");
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Upstox API error for ${symbol}: ${response.status} - ${text.substring(0,200)}`);
    }

    const data = await response.json();

    if (data.status !== 200 && data.status !== "success") {
      throw new Error(`No intraday data for ${symbol} from Upstox: ${JSON.stringify(data).substring(0,200)}`);
    }

    const candles = data.data.candles.map(candle => ({
      timestamp: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5]
    }));

    const result = {
      symbol,
      name: stockInfo.name,
      exchange: stockInfo.exchange,
      interval,
      data: candles,
      timestamp: Date.now(),
      source: "Upstox"
    };

    try {
      await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL);
    } catch (cacheError) {
      console.warn(`Failed to cache Indian stock intraday for ${symbol}:`, cacheError.message);
    }

    return result;
  } catch (error) {
    console.error(`Error fetching Indian stock intraday for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Get mock intraday data (fallback)
 */
function getMockIndianStockIntraday(symbol, interval) {
  const stockInfo = SUPPORTED_INDIAN_STOCKS[symbol] || { name: symbol, exchange: "NSE" };
  const candles = [];
  const basePrice = 1000;

  // Generate 50 candles
  for (let i = 50; i >= 0; i--) {
    const timestamp = Math.floor((Date.now() - i * 60 * 1000) / 1000);
    const open = basePrice + Math.sin(i * 0.5) * 10;
    const close = open + (Math.random() - 0.5) * 20;
    const high = Math.max(open, close) + Math.random() * 5;
    const low = Math.min(open, close) - Math.random() * 5;
    
    candles.push({
      timestamp: timestamp * 1000,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.floor(Math.random() * 1000000)
    });
  }

  return {
    symbol,
    name: stockInfo.name,
    exchange: stockInfo.exchange,
    interval,
    data: candles,
    timestamp: Date.now(),
    source: "Mock"
  };
}

/**
 * Fetch daily candlestick data for Indian stock from Upstox
 */
export async function getIndianStockDaily(symbol) {
  const cacheKey = `indian_stock:daily:${symbol}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Cache error for Indian stock daily ${symbol}:`, error.message);
  }

  try {
    if (!SUPPORTED_INDIAN_STOCKS[symbol]) {
      throw new Error(`Indian stock symbol ${symbol} not supported`);
    }

    const stockInfo = SUPPORTED_INDIAN_STOCKS[symbol];
    const instrumentKey = await getUpstoxInstrumentKeyFromCache(symbol);

    const url = `${UPSTOX_BASE_URL}/historical-candle/${instrumentKey}/day`;

    const response = await upstoxFetchWithAuth(url, {}, "default");
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Upstox API error for ${symbol}: ${response.status} - ${text.substring(0,200)}`);
    }

    const data = await response.json();

    if (data.status !== 200 && data.status !== "success") {
      throw new Error(`No daily data for ${symbol} from Upstox: ${JSON.stringify(data).substring(0,200)}`);
    }

    const candles = data.data.candles.map(candle => ({
      date: new Date(candle[0] * 1000).toISOString().split("T")[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5]
    }));

    const result = {
      symbol,
      name: stockInfo.name,
      exchange: stockInfo.exchange,
      data: candles,
      timestamp: Date.now(),
      source: "Upstox"
    };

    try {
      await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL * 2);
    } catch (cacheError) {
      console.warn(`Failed to cache Indian stock daily for ${symbol}:`, cacheError.message);
    }

    return result;
  } catch (error) {
    console.error(`Error fetching Indian stock daily for ${symbol}:`, error.message);
    throw error;
  }
}

/**
 * Get mock daily data (fallback)
 */
function getMockIndianStockDaily(symbol) {
  const stockInfo = SUPPORTED_INDIAN_STOCKS[symbol] || { name: symbol, exchange: "NSE" };
  const candles = [];
  const basePrice = 1000;
  
  // Generate 30 days of data
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    
    const open = basePrice + Math.sin(i * 0.3) * 20;
    const close = open + (Math.random() - 0.5) * 40;
    const high = Math.max(open, close) + Math.random() * 10;
    const low = Math.min(open, close) - Math.random() * 10;
    
    candles.push({
      date: dateStr,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: Math.floor(Math.random() * 10000000)
    });
  }

  return {
    symbol,
    name: stockInfo.name,
    exchange: stockInfo.exchange,
    data: candles,
    timestamp: Date.now(),
    source: "Mock"
  };
}

/**
 * Get top Indian stocks by market cap or volume
 */
export async function getTopIndianStocks(sortBy = "volume") {
  const cacheKey = `indian_stock:top:${sortBy}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Cache error for top Indian stocks:`, error.message);
  }

  try {
    const stocks = [];

    // Fetch prices for all supported stocks
    for (const [symbol] of Object.entries(SUPPORTED_INDIAN_STOCKS)) {
      try {
        const priceData = await getIndianStockPrice(symbol);
        stocks.push({
          symbol: priceData.symbol,
          name: priceData.name,
          exchange: priceData.exchange,
          price: priceData.price,
          change: priceData.change,
          changePercent: priceData.changePercent,
          volume: priceData.volume,
          high: priceData.high,
          low: priceData.low,
          open: priceData.open
        });
      } catch (error) {
        console.warn(`Failed to get price for ${symbol}:`, error.message);
      }
    }

    // Sort by specified criteria
    if (sortBy === "volume") {
      stocks.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    } else if (sortBy === "changePercent") {
      stocks.sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
    } else if (sortBy === "price") {
      stocks.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    const result = {
      data: stocks.slice(0, 15),
      count: stocks.slice(0, 15).length,
      timestamp: Date.now(),
      source: "Upstox"
    };

    try {
      await cacheSet(cacheKey, JSON.stringify(result), 2);
    } catch (cacheError) {
      console.warn(`Failed to cache top Indian stocks:`, cacheError.message);
    }

    return result;
  } catch (error) {
    console.error(`Error fetching top Indian stocks:`, error.message);
    throw error;
  }
}

/**
 * Get all supported Indian stocks
 */
export function getSupportedIndianStocks() {
  return Object.entries(SUPPORTED_INDIAN_STOCKS).map(([symbol, info]) => ({
    symbol,
    name: info.name,
    exchange: info.exchange
  }));
}

function normalizeUpstoxInstrument(inst, exchangeSegment = "NSE_EQ") {
  const symbol = (inst.trading_symbol || inst.tradingSymbol || inst.symbol || inst.tradingsymbol || inst.instrument || inst.asset_symbol || inst.underlying_symbol || "").toString().trim();
  return {
    symbol,
    lotSize: inst.lot_size || inst.lotSize || inst.minimum_lot || inst.qty_multiplier || 1,
    name: inst.name || inst.instrument_name || inst.trading_name || symbol,
    exchange: inst.exchange || (typeof inst.segment === 'string' ? inst.segment.split('_')[0] : null) || null,
    segment: inst.segment || inst.instrument_segment || inst.asset_type || exchangeSegment,
    instrumentType: inst.instrument_type || inst.instrumentType || inst.asset_type || null,
    upstoxInstrumentKey: inst.instrument_key || inst.instrumentKey || inst.exchange_token || inst.asset_key || null,
    raw: inst
  };
}

async function fetchUpstoxInstrumentAsset() {
  const assetCacheKey = "upstox:instruments:asset:NSE";
  try {
    const cached = await cacheGet(assetCacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn("[Upstox] Asset cache read error:", error.message);
  }

  const response = await fetch(UPSTOX_INSTRUMENT_ASSET_URL, {
    headers: UPSTOX_ASSET_FETCH_HEADERS
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to download Upstox instrument asset: ${response.status} ${text.substring(0, 200)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  let decompressed;
  try {
    decompressed = zlib.gunzipSync(buffer).toString("utf8");
  } catch (err) {
    throw new Error(`Failed to decompress Upstox instrument asset: ${err.message}`);
  }

  const instruments = JSON.parse(decompressed);
  try {
    await cacheSet(assetCacheKey, JSON.stringify(instruments), 86400);
  } catch (cacheError) {
    console.warn("[Upstox] Failed to cache instrument asset:", cacheError.message);
  }

  return instruments;
}

function filterAssetInstrumentsBySegment(instruments, exchangeSegment) {
  if (exchangeSegment === "NSE_EQ") {
    return instruments.filter(inst => inst.segment === "NSE_EQ");
  }

  if (exchangeSegment === "NSE_FO") {
    return instruments.filter(inst => inst.segment === "NSE_FO");
  }

  return instruments;
}

/**
 * Fetch all instruments from Upstox and cache lot sizes
 */
export async function fetchUpstoxInstruments(exchangeSegment = "NSE_EQ") {
  const cacheKey = `upstox:instruments:${exchangeSegment}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn("[Upstox] Cache error for instruments:", error.message);
  }

  // Try multiple known endpoint variants in case Upstox path differs across environments
  // For F&O the API may expect shorthand like NFO or FNO instead of NSE_FO
  const exchangeVariants = [
    exchangeSegment,
    exchangeSegment.replace('NSE_', ''),
    exchangeSegment.replace('NSE_', 'NFO'),
    'NFO',
    'FNO'
  ].filter(Boolean);

  const queryVariants = [
    "", 
    "&type=futures",
    "&type=FO",
    "&product=futures",
    "&product=FO",
    "&segment=NFO",
    "&segment=FNO"
  ];

  const candidatePaths = [];
  for (const ex of exchangeVariants) {
    candidatePaths.push(`/market-instruments?exchange=${ex}`);
    candidatePaths.push(`/market-instruments?segment=${ex}`);
    candidatePaths.push(`/instruments?exchange=${ex}`);
    candidatePaths.push(`/instruments?segment=${ex}`);
    candidatePaths.push(`/market-quote/instruments?exchange=${ex}`);
    candidatePaths.push(`/market-quote/instruments?segment=${ex}`);
    candidatePaths.push(`/market-quote/instruments/exchange/${ex}`);
    for (const suffix of queryVariants) {
      if (suffix) {
        candidatePaths.push(`/market-instruments?exchange=${ex}${suffix}`);
        candidatePaths.push(`/market-instruments?segment=${ex}${suffix}`);
        candidatePaths.push(`/instruments?exchange=${ex}${suffix}`);
        candidatePaths.push(`/instruments?segment=${ex}${suffix}`);
        candidatePaths.push(`/market-quote/instruments?exchange=${ex}${suffix}`);
        candidatePaths.push(`/market-quote/instruments?segment=${ex}${suffix}`);
      }
    }
  }

  // Deduplicate
  const seen = new Set();
  const uniquePaths = [];
  for (const p of candidatePaths) {
    if (!seen.has(p)) {
      seen.add(p);
      uniquePaths.push(p);
    }
  }
  const finalCandidatePaths = uniquePaths;

  const accessToken = await getUpstoxAccessToken();
  let lastError = null;

  for (const path of finalCandidatePaths) {
    const url = `${UPSTOX_BASE_URL}${path}`;
    try {
      console.log(`[Upstox] Trying instruments endpoint: ${url}`);
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json"
        }
      });

      console.log(`[Upstox] Instruments endpoint status: ${response.status} for ${path}`);

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const message = `Upstox API error: ${response.status} - ${text.substring(0,200)}`;
        lastError = new Error(message);
        console.warn(`[Upstox] Instruments endpoint failed: ${url} -> ${message}`);
        continue;
      }

      const data = await response.json();

      // Upstox may wrap data differently; prefer data.data or data.instruments or array root
      const rawArray = data.data || data.instruments || (Array.isArray(data) ? data : null);
      if (!rawArray || !Array.isArray(rawArray)) {
        lastError = new Error('[Upstox] Unexpected instruments payload');
        continue;
      }

      const instruments = rawArray.map(inst => normalizeUpstoxInstrument(inst));

      console.log(`[Upstox] Parsed ${instruments.length} instruments from ${path}`);

      try {
        await cacheSet(cacheKey, JSON.stringify(instruments), 86400); // 24 hour cache
      } catch (cacheError) {
        console.warn("[Upstox] Failed to cache instruments:", cacheError.message);
      }

      return instruments;
    } catch (err) {
      console.warn(`[Upstox] Candidate endpoint failed: ${path} -> ${err.message}`);
      lastError = err;
      continue;
    }
  }

  console.warn(`[Upstox] Direct instrument endpoints failed for segment ${exchangeSegment}. Falling back to public Upstox asset feed.`);
  try {
    const assetInstruments = await fetchUpstoxInstrumentAsset();
    const filtered = filterAssetInstrumentsBySegment(assetInstruments, exchangeSegment);
    if (!filtered.length) {
      throw new Error(`No Upstox asset instruments found for segment ${exchangeSegment}`);
    }

    const instruments = filtered.map(inst => normalizeUpstoxInstrument(inst));
    console.log(`[Upstox] Parsed ${instruments.length} instruments from asset feed for ${exchangeSegment}`);

    try {
      await cacheSet(cacheKey, JSON.stringify(instruments), 86400); // 24 hour cache
    } catch (cacheError) {
      console.warn("[Upstox] Failed to cache asset instruments:", cacheError.message);
    }

    return instruments;
  } catch (assetError) {
    console.error(`[Upstox] Public asset feed fallback failed: ${assetError.message}`);
    lastError = lastError || assetError;
  }

  console.error(`[Upstox] All instrument endpoints failed for segment ${exchangeSegment}:`, lastError?.message);
  throw lastError || new Error('Failed to fetch Upstox instruments');
}

/**
 * Fallback lot sizes for common NSE stocks
 */
function getFallbackUpstoxLotSizes() {
  return [
    { symbol: "NIFTY", lotSize: 50, name: "Nifty 50", exchange: "NSE", segment: "FNO" },
    { symbol: "BANKNIFTY", lotSize: 15, name: "Bank Nifty", exchange: "NSE", segment: "FNO" },
    { symbol: "RELIANCE", lotSize: 1, name: "Reliance Industries", exchange: "NSE", segment: "EQ" },
    { symbol: "TCS", lotSize: 1, name: "Tata Consultancy Services", exchange: "NSE", segment: "EQ" },
    { symbol: "INFY", lotSize: 1, name: "Infosys", exchange: "NSE", segment: "EQ" },
    { symbol: "HDFCBANK", lotSize: 1, name: "HDFC Bank", exchange: "NSE", segment: "EQ" },
    { symbol: "ICICIBANK", lotSize: 1, name: "ICICI Bank", exchange: "NSE", segment: "EQ" },
    { symbol: "SBIN", lotSize: 1, name: "State Bank of India", exchange: "NSE", segment: "EQ" },
    { symbol: "WIPRO", lotSize: 1, name: "Wipro", exchange: "NSE", segment: "EQ" },
    { symbol: "MARUTI", lotSize: 1, name: "Maruti Suzuki", exchange: "NSE", segment: "EQ" }
  ];
}

/**
 * Get lot size for a specific symbol from Upstox
 */
export async function getLotSizeFromUpstox(symbol) {
  try {
    const instruments = await fetchUpstoxInstruments("NSE_EQ");
    
    const instrument = instruments.find(i => 
      i.symbol === symbol || 
      i.symbol.startsWith(symbol)
    );
    
    if (instrument) {
      return {
        symbol: symbol,
        lotSize: instrument.lotSize || 1,
        name: instrument.name,
        exchange: instrument.exchange,
        category: "equity",
        source: "Upstox",
        isDefault: false
      };
    }
    
    return {
      symbol: symbol,
      lotSize: 1,
      name: symbol,
      exchange: "NSE",
      category: "equity",
      source: "Default",
      isDefault: true
    };
  } catch (error) {
    console.error(`[Upstox] Error getting lot size for ${symbol}:`, error.message);
    return {
      symbol: symbol,
      lotSize: 1,
      name: symbol,
      exchange: "NSE",
      category: "equity",
      source: "Default",
      isDefault: true
    };
  }
}

/**
 * Get all lot sizes from Upstox
 */
export async function getAllLotSizesFromUpstox(segment = "NSE_EQ") {
  try {
    const instruments = await fetchUpstoxInstruments(segment);
    return instruments.map(i => ({
      symbol: i.symbol,
      lotSize: i.lotSize || 1,
      name: i.name,
      exchange: i.exchange,
      category: i.segment === "FNO" ? "fno" : "equity"
    }));
  } catch (error) {
    console.error(`[Upstox] Error getting all lot sizes:`, error.message);
    return [];
  }
}

/**
 * Validate lot multiple using Upstox data
 */
export async function validateLotMultipleFromUpstox(symbol, quantity) {
  const lotInfo = await getLotSizeFromUpstox(symbol);
  const lotSize = lotInfo.lotSize;
  
  const remainder = quantity % lotSize;
  const isValid = remainder === 0;

  return {
    symbol: symbol,
    quantity: quantity,
    lotSize: lotSize,
    isValid: isValid,
    remainder: remainder,
    suggestion: !isValid 
      ? `Quantity must be a multiple of ${lotSize}. Nearest valid quantity: ${Math.round(quantity / lotSize) * lotSize}`
      : `Quantity is valid (multiple of ${lotSize})`
  };
}

/**
 * Calculate quantity from lot count using Upstox data
 */
export async function calculateQuantityFromUpstox(symbol, lots) {
  const lotInfo = await getLotSizeFromUpstox(symbol);
  return {
    symbol: symbol,
    lots: lots,
    lotSize: lotInfo.lotSize,
    quantity: lots * lotInfo.lotSize,
    source: "Upstox"
  };
}

/**
 * Return token status for a user (for debugging/admin use)
 */
export async function getUpstoxTokenStatus(userId = "default") {
  const cacheKey = `upstox:token:${userId}`;
  try {
    const raw = await cacheGet(cacheKey).catch(() => null);
    if (!raw) return { exists: false };
    const tokenData = JSON.parse(raw);
    const scheduled = tokenRefreshTimers.get(userId);
    const now = Date.now();
    return {
      exists: true,
      hasAccessToken: !!tokenData.accessToken,
      hasRefreshToken: !!tokenData.refreshToken,
      expiresAt: tokenData.expiresAt,
      expiresInSec: tokenData.expiresAt ? Math.max(0, Math.floor((tokenData.expiresAt - now) / 1000)) : null,
      nextScheduledRefreshInSec: scheduled ? Math.max(0, Math.floor((scheduled._idleStart + scheduled._idleTimeout - now) / 1000)) : null
    };
  } catch (e) {
    return { exists: false, error: e.message };
  }
}

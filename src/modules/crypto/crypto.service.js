import { cacheGet, cacheSet } from "../../db/redis.js";

// Binance WebSocket streams for real-time prices
// Extended list of popular cryptocurrencies for unlimited search capabilities
const SUPPORTED_SYMBOLS = [
  // Top tier coins
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "TRXUSDT",
  "ADAUSDT",
  // Layer 2 & scaling solutions
  "MATICUSDT",
  "ARBUSDT",
  "OPUSDT",
  "AVAXUSDT",
  // Smart contract platforms
  "DOTUSDT",
  "ATOMUSDT",
  "NEARUSDT",
  // DeFi protocols
  "UNIUSDT",
  "LINKUSDT",
  "AAVEUSDT",
  "MKRUSDT",
  "SNXUSDT",
  "GRTUSDT",
  // Alt Layer 1s
  "FILUSDT",
  "FLOWUSDT",
  "ALGOUSDT",
  "EGLDUSDT",
  "VETUSDT",
  "THETAUSDT",
  "FTMUSDT",
  "HARMONYUSDT",
  // Meme & community coins
  "DOGEUSDT",
  "SHIBUSDT",
  // Misc popular alts
  "LITUSDT",
  "BCHUSDT",
  "IOTAUSDT",
  "MANAUSDT",
  "SANDUSDT",
  "ENUSDT",
  "WAVEUSDT",
  "ZILUSDT",
  // Gaming & NFT
  "AXSUSDT",
  "GALAUSDT",
  // 2024+ Projects
  "APTUSDT",
  "SUIUSDT",
  "INJUSDT",
  "JUPUSDT",
  "AIUSDT"
];

const BINANCE_REST_API = "https://api.binance.com/api/v3";
const CACHE_TTL = 30; // 30 seconds for crypto prices

/**
 * Fetch current crypto price from Binance or cache
 */
export async function getCryptoPrice(symbol) {
  const cacheKey = `crypto:price:${symbol}`;

  try {
    // Try to fetch from cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Cache error for ${symbol}:`, error.message);
  }

  try {
    // Fetch from Binance API
    const response = await fetch(`${BINANCE_REST_API}/ticker/price?symbol=${symbol}`);

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();
    const price = {
      symbol: data.symbol,
      price: parseFloat(data.price),
      timestamp: Date.now()
    };

    // Cache the price
    try {
      await cacheSet(cacheKey, JSON.stringify(price), CACHE_TTL);
    } catch (cacheError) {
      console.warn(`Failed to cache price for ${symbol}:`, cacheError.message);
    }

    return price;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error.message);
    throw new Error(`Unable to fetch price for ${symbol}`);
  }
}

/**
 * Fetch 24h price data from Binance
 */
export async function getCryptoStats(symbol) {
  const cacheKey = `crypto:stats:${symbol}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Cache error for stats ${symbol}:`, error.message);
  }

  try {
    const response = await fetch(`${BINANCE_REST_API}/ticker/24hr?symbol=${symbol}`);

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();
    const stats = {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      priceChange: parseFloat(data.priceChange),
      priceChangePercent: parseFloat(data.priceChangePercent),
      highPrice: parseFloat(data.highPrice),
      lowPrice: parseFloat(data.lowPrice),
      volume: parseFloat(data.volume),
      quoteAssetVolume: parseFloat(data.quoteAssetVolume),
      timestamp: Date.now()
    };

    try {
      await cacheSet(cacheKey, JSON.stringify(stats), CACHE_TTL);
    } catch (cacheError) {
      console.warn(`Failed to cache stats for ${symbol}:`, cacheError.message);
    }

    return stats;
  } catch (error) {
    console.error(`Error fetching stats for ${symbol}:`, error.message);
    throw new Error(`Unable to fetch stats for ${symbol}`);
  }
}

/**
 * Fetch all supported crypto prices
 */
export async function getAllCryptoPrices() {
  const cacheKey = "crypto:prices:all";

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn("Cache error for all prices:", error.message);
  }

  try {
    const prices = await Promise.all(
      SUPPORTED_SYMBOLS.map((symbol) => getCryptoPrice(symbol).catch(() => null))
    );

    const validPrices = prices.filter((price) => price !== null);

    try {
      await cacheSet(cacheKey, JSON.stringify(validPrices), CACHE_TTL);
    } catch (cacheError) {
      console.warn("Failed to cache all prices:", cacheError.message);
    }

    return validPrices;
  } catch (error) {
    console.error("Error fetching all crypto prices:", error.message);
    throw new Error("Unable to fetch crypto prices");
  }
}

/**
 * Get supported symbols
 */
export function getSupportedSymbols() {
  return SUPPORTED_SYMBOLS;
}

/**
 * Validate if symbol is supported
 */
export function isSymbolSupported(symbol) {
  return SUPPORTED_SYMBOLS.includes(symbol);
}

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
const COINGECKO_API = "https://api.coingecko.com/api/v3";
const CACHE_TTL = 30; // 30 seconds for crypto prices

// Mapping of Binance symbols to CoinGecko IDs
const SYMBOL_TO_COINGECKO = {
  "BTCUSDT": "bitcoin",
  "ETHUSDT": "ethereum",
  "BNBUSDT": "binancecoin",
  "SOLUSDT": "solana",
  "XRPUSDT": "ripple",
  "TRXUSDT": "tron",
  "ADAUSDT": "cardano",
  "MATICUSDT": "matic-network",
  "ARBUSDT": "arbitrum",
  "OPUSDT": "optimism",
  "AVAXUSDT": "avalanche-2",
  "DOTUSDT": "polkadot",
  "ATOMUSDT": "cosmos",
  "NEARUSDT": "near",
  "UNIUSDT": "uniswap",
  "LINKUSDT": "chainlink",
  "AAVEUSDT": "aave",
  "MKRUSDT": "maker",
  "SNXUSDT": "synthetix-network-token",
  "GRTUSDT": "the-graph",
  "FILUSDT": "filecoin",
  "FLOWUSDT": "flow",
  "ALGOUSDT": "algorand",
  "EGLDUSDT": "elrond",
  "VETUSDT": "vechain",
  "THETAUSDT": "theta-token",
  "FTMUSDT": "fantom",
  "HARMONYUSDT": "harmony",
  "DOGEUSDT": "dogecoin",
  "SHIBUSDT": "shiba-inu",
  "LITUSDT": "litecoin",
  "BCHUSDT": "bitcoin-cash",
  "IOTAUSDT": "iota",
  "MANAUSDT": "decentraland",
  "SANDUSDT": "the-sandbox",
  "ENUSDT": "e-netgem",
  "WAVEUSDT": "waves",
  "ZILUSDT": "zilliqa",
  "AXSUSDT": "axie-infinity",
  "GALAUSDT": "project-galaxy",
  "APTUSDT": "aptos",
  "SUIUSDT": "sui",
  "INJUSDT": "injective-protocol",
  "JUPUSDT": "jupiter",
  "AIUSDT": "ai-core"
};

/**
 * Fetch current crypto price from CoinGecko (with Binance fallback) or cache
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
    // Try CoinGecko first (more reliable, no IP blocking)
    const coingeckoId = SYMBOL_TO_COINGECKO[symbol];
    if (coingeckoId) {
      try {
        const response = await fetch(
          `${COINGECKO_API}/simple/price?ids=${coingeckoId}&vs_currencies=usd`,
          { timeout: 5000 }
        );

        if (response.ok) {
          const data = await response.json();
          if (data[coingeckoId]?.usd) {
            const price = {
              symbol,
              price: parseFloat(data[coingeckoId].usd),
              timestamp: Date.now()
            };

            // Cache the price
            try {
              await cacheSet(cacheKey, JSON.stringify(price), CACHE_TTL);
            } catch (cacheError) {
              console.warn(`Failed to cache price for ${symbol}:`, cacheError.message);
            }

            return price;
          }
        }
      } catch (coingeckoError) {
        console.warn(`CoinGecko fallback for ${symbol}:`, coingeckoError.message);
      }
    }

    // Fallback to Binance API
    const response = await fetch(`${BINANCE_REST_API}/ticker/price?symbol=${symbol}`, {
      timeout: 5000
    });

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
 * Fetch 24h price data from CoinGecko (with Binance fallback) or cache
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
    // Try CoinGecko first
    const coingeckoId = SYMBOL_TO_COINGECKO[symbol];
    if (coingeckoId) {
      try {
        const response = await fetch(
          `${COINGECKO_API}/simple/price?ids=${coingeckoId}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
          { timeout: 5000 }
        );

        if (response.ok) {
          const data = await response.json();
          if (data[coingeckoId]?.usd) {
            const stats = {
              symbol,
              price: parseFloat(data[coingeckoId].usd),
              priceChange: null,
              priceChangePercent: data[coingeckoId].usd_24h_change ?? null,
              highPrice: null,
              lowPrice: null,
              volume: data[coingeckoId].usd_24h_vol ?? null,
              quoteAssetVolume: null,
              timestamp: Date.now()
            };

            // Cache the stats
            try {
              await cacheSet(cacheKey, JSON.stringify(stats), CACHE_TTL);\n            } catch (cacheError) {\n              console.warn(`Failed to cache stats for ${symbol}:`, cacheError.message);\n            }\n\n            return stats;\n          }\n        }\n      } catch (coingeckoError) {\n        console.warn(`CoinGecko stats fallback for ${symbol}:`, coingeckoError.message);\n      }\n    }\n\n    // Fallback to Binance API\n    const response = await fetch(`${BINANCE_REST_API}/ticker/24hr?symbol=${symbol}`, {\n      timeout: 5000\n    });\n\n    if (!response.ok) {\n      throw new Error(`Binance API error: ${response.status}`);\n    }\n\n    const data = await response.json();\n    const stats = {\n      symbol: data.symbol,\n      price: parseFloat(data.lastPrice),\n      priceChange: parseFloat(data.priceChange),\n      priceChangePercent: parseFloat(data.priceChangePercent),\n      highPrice: parseFloat(data.highPrice),\n      lowPrice: parseFloat(data.lowPrice),\n      volume: parseFloat(data.volume),\n      quoteAssetVolume: parseFloat(data.quoteAssetVolume),\n      timestamp: Date.now()\n    };\n\n    try {\n      await cacheSet(cacheKey, JSON.stringify(stats), CACHE_TTL);\n    } catch (cacheError) {\n      console.warn(`Failed to cache stats for ${symbol}:`, cacheError.message);\n    }\n\n    return stats;\n  } catch (error) {\n    console.error(`Error fetching stats for ${symbol}:`, error.message);\n    throw new Error(`Unable to fetch stats for ${symbol}`);\n  }\n}

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

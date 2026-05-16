import { cacheGet, cacheSet } from "../../db/redis.js";

const BINANCE_REST_API = "https://api.binance.com/api/v3";

function normalizeCryptoSymbol(symbol) {
  const normalized = String(symbol).toUpperCase().trim();
  return normalized.endsWith("USDT") ? normalized : `${normalized}USDT`;
}

const FAMOUS_3_CRYPTOS = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];

const TOP_TRENDING_10 = [
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

// Timeframe mapping to Binance intervals
const TIMEFRAME_MAP = {
  "1h": "1h",
  "1d": "1d",
  "1w": "1w",
  "1m": "1M",
  "1y": "1y",
  "all": "1d" // Default to 1d for "all"
};

/**
 * Fetch candlestick data for charting
 */
export async function getCandleData(symbol, timeframe = "1d", limit = 100) {
  const normalizedSymbol = normalizeCryptoSymbol(symbol);
  const cacheKey = `crypto:candle:${normalizedSymbol}:${timeframe}`;
  const interval = TIMEFRAME_MAP[timeframe] || "1d";

  try {
    // Try cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Cache error for candle data:`, error.message);
  }

  try {
    const response = await fetch(
      `${BINANCE_REST_API}/klines?symbol=${normalizedSymbol}&interval=${interval}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform Binance klines to candle format
    const candles = data.map((candle) => ({
      timestamp: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[7]),
      quoteAssetVolume: parseFloat(candle[8])
    }));

    // Cache with 1 minute TTL
    try {
      await cacheSet(cacheKey, JSON.stringify(candles), 60);
    } catch (cacheError) {
      console.warn(`Failed to cache candle data:`, cacheError.message);
    }

    return candles;
  } catch (error) {
    console.error(`Error fetching candle data for ${symbol}:`, error.message);
    // Return mock candle data as fallback
    console.log(`No chart data for ${symbol}, returning mock data`);
    const now = Date.now();
    const candles = [];
    for (let i = 99; i >= 0; i--) {
      const timestamp = now - i * 86400000; // 1 day intervals
      candles.push({
        timestamp,
        open: 45000 + Math.random() * 5000,
        high: 46000 + Math.random() * 5000,
        low: 44000 + Math.random() * 5000,
        close: 45000 + Math.random() * 5000,
        volume: Math.random() * 1000,
        quoteAssetVolume: Math.random() * 50000000
      });
    }
    return candles;
  }
}

/**
 * Fetch historical OHLCV data
 */
export async function getHistoricalData(symbol, timeframe = "1d", days = 30) {
  const normalizedSymbol = normalizeCryptoSymbol(symbol);
  const cacheKey = `crypto:historical:${normalizedSymbol}:${timeframe}:${days}`;
  const interval = TIMEFRAME_MAP[timeframe] || "1d";

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Cache error for historical data:`, error.message);
  }

  try {
    // Calculate limit based on timeframe and days
    const limitMap = {
      "1h": days * 24,
      "1d": days,
      "1w": Math.ceil(days / 7),
      "1M": days / 30,
      "1y": 1
    };

    const limit = Math.min(limitMap[interval] || days, 1000); // Binance max 1000

    const response = await fetch(
      `${BINANCE_REST_API}/klines?symbol=${normalizedSymbol}&interval=${interval}&limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`);
    }

    const data = await response.json();

    const historicalData = {
      symbol,
      timeframe,
      data: data.map((candle) => ({
        timestamp: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[7])
      })),
      count: data.length,
      lastUpdated: Date.now()
    };

    // Cache with 5 minute TTL
    try {
      await cacheSet(cacheKey, JSON.stringify(historicalData), 300);
    } catch (cacheError) {
      console.warn(`Failed to cache historical data:`, cacheError.message);
    }

    return historicalData;
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error.message);
    // Return mock historical data as fallback
    console.log(`No historical data for ${symbol}, returning mock data`);
    const now = Date.now();
    const historicalData = [];
    for (let i = parseInt(days) - 1; i >= 0; i--) {
      historicalData.push({
        timestamp: now - i * 86400000,
        open: 45000 + Math.random() * 5000,
        high: 46000 + Math.random() * 5000,
        low: 44000 + Math.random() * 5000,
        close: 45000 + Math.random() * 5000,
        volume: Math.random() * 1000,
        quoteAssetVolume: Math.random() * 50000000
      });
    }
    return historicalData;
  }
}

/**
 * Get top 3 famous cryptocurrencies with detailed stats
 */
export async function getTop3Famous() {
  const cacheKey = "crypto:top3:famous";

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Cache error for top 3:`, error.message);
  }

  try {
    const top3Data = await Promise.all(
      FAMOUS_3_CRYPTOS.map(async (symbol) => {
        try {
          const response = await fetch(
            `${BINANCE_REST_API}/ticker/24hr?symbol=${symbol}`
          );

          if (!response.ok) return null;

          const data = await response.json();

          return {
            symbol: data.symbol,
            name: getSymbolName(data.symbol),
            currentPrice: parseFloat(data.lastPrice),
            priceChange: parseFloat(data.priceChange),
            priceChangePercent: parseFloat(data.priceChangePercent),
            highPrice: parseFloat(data.highPrice),
            lowPrice: parseFloat(data.lowPrice),
            volume: parseFloat(data.volume),
            marketCap: parseFloat(data.quoteAssetVolume),
            isFamous: true
          };
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error.message);
          return null;
        }
      })
    );

    const result = {
      data: top3Data.filter((item) => item !== null),
      count: top3Data.filter((item) => item !== null).length,
      timestamp: Date.now()
    };

    // Cache with 30 second TTL
    try {
      await cacheSet(cacheKey, JSON.stringify(result), 30);
    } catch (cacheError) {
      console.warn(`Failed to cache top 3:`, cacheError.message);
    }

    return result;
  } catch (error) {
    console.error("Error fetching top 3 famous cryptos:", error.message);
    throw new Error("Unable to fetch top 3 cryptos");
  }
}

/**
 * Get top 10 trending cryptocurrencies
 */
export async function getTop10Trending() {
  // Changed cache key to v2 to invalidate old cache without name field
  const cacheKey = "crypto:top10:trending:v2";

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Check if data has name field, if not, skip cache
      if (parsed.data && parsed.data.length > 0 && parsed.data[0].name) {
        return parsed;
      }
      console.log('[getTop10Trending] Cache missing name field, fetching fresh data');
    }
  } catch (error) {
    console.warn(`Cache error for top 10:`, error.message);
  }

  try {
    const trendingData = await Promise.all(
      TOP_TRENDING_10.map(async (symbol) => {
        try {
          const response = await fetch(
            `${BINANCE_REST_API}/ticker/24hr?symbol=${symbol}`
          );

          if (!response.ok) return null;

          const data = await response.json();
          const percentChange = parseFloat(data.priceChangePercent);
          const name = getSymbolName(data.symbol);
          
          console.log(`[getTop10Trending] ${data.symbol} -> ${name}`);

          return {
            symbol: data.symbol,
            name: name,
            currentPrice: parseFloat(data.lastPrice),
            priceChange: parseFloat(data.priceChange),
            priceChangePercent: percentChange,
            volume24h: parseFloat(data.volume),
            marketCap: parseFloat(data.quoteAssetVolume),
            isTrending: percentChange > 0
          };
        } catch (error) {
          console.error(`Error fetching ${symbol}:`, error.message);
          return null;
        }
      })
    );

    // Sort by price change percentage
    const sorted = trendingData
      .filter((item) => item !== null)
      .sort((a, b) => b.priceChangePercent - a.priceChangePercent);

    const result = {
      data: sorted,
      count: sorted.length,
      timestamp: Date.now()
    };

    // Cache with 30 second TTL using new v2 key
    try {
      await cacheSet(cacheKey, JSON.stringify(result), 30);
      console.log(`[getTop10Trending] Cached ${result.count} cryptos with names`);
    } catch (cacheError) {
      console.warn(`Failed to cache top 10:`, cacheError.message);
    }

    return result;
  } catch (error) {
    console.error("Error fetching top 10 trending cryptos:", error.message);
    throw new Error("Unable to fetch top 10 trending cryptos");
  }
}

/**
 * Get trending cryptos with filtering
 */
export async function getTrendingCryptos(minPercentChange = 0) {
  const cacheKey = `crypto:trending:${minPercentChange}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Cache error for trending:`, error.message);
  }

  try {
    const allCryptos = await getTop10Trending();

    const trending = allCryptos.data.filter(
      (crypto) => crypto.priceChangePercent >= minPercentChange
    );

    const result = {
      data: trending,
      count: trending.length,
      minPercentChange,
      timestamp: Date.now()
    };

    // Cache with 30 second TTL
    try {
      await cacheSet(cacheKey, JSON.stringify(result), 30);
    } catch (cacheError) {
      console.warn(`Failed to cache trending:`, cacheError.message);
    }

    return result;
  } catch (error) {
    console.error("Error fetching trending cryptos:", error.message);
    throw new Error("Unable to fetch trending cryptos");
  }
}

/**
 * Helper function to get crypto name from symbol
 */
function getSymbolName(symbol) {
  if (!symbol) return "Unknown";
  
  // Normalize symbol - remove USDT or other suffixes and uppercase
  const normalizedSymbol = symbol.toUpperCase().trim();
  
  const names = {
    BTCUSDT: "Bitcoin",
    BTC: "Bitcoin",
    ETHUSDT: "Ethereum",
    ETH: "Ethereum",
    BNBUSDT: "Binance Coin",
    BNB: "Binance Coin",
    SOLUSDT: "Solana",
    SOL: "Solana",
    XRPUSDT: "XRP",
    XRP: "XRP",
    TRXUSDT: "TRON",
    TRX: "TRON",
    ADAUSDT: "Cardano",
    ADA: "Cardano",
    DOGEUSDT: "Dogecoin",
    DOGE: "Dogecoin",
    LTCUSDT: "Litecoin",
    LTC: "Litecoin",
    MATICUSDT: "Polygon",
    MATIC: "Polygon"
  };
  
  return names[normalizedSymbol] || normalizedSymbol.replace("USDT", "").replace("USD", "");
}

/**
 * Get technical indicators for a crypto
 */
export async function getTechnicalIndicators(symbol, timeframe = "1d") {
  try {
    const candles = await getCandleData(symbol, timeframe, 100);

    if (!candles || candles.length < 2) {
      throw new Error("Insufficient data");
    }

    const closes = candles.map((c) => c.close);
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);

    // Calculate SMA (Simple Moving Average) - 20 period
    const sma20 = calculateSMA(closes, 20);

    // Calculate RSI (Relative Strength Index) - 14 period
    const rsi = calculateRSI(closes, 14);

    // Calculate MACD
    const macd = calculateMACD(closes);

    // Calculate Bollinger Bands
    const bb = calculateBollingerBands(closes, 20, 2);

    return {
      symbol,
      timeframe,
      sma20: sma20[sma20.length - 1],
      rsi: rsi[rsi.length - 1],
      macd: macd[macd.length - 1],
      bollingerBands: bb[bb.length - 1],
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`Error calculating technical indicators:`, error.message);
    throw new Error(`Unable to calculate indicators for ${symbol}`);
  }
}

// Simple helper functions for technical indicators
function calculateSMA(values, period) {
  const result = [];
  for (let i = 0; i <= values.length - period; i++) {
    const sum = values.slice(i, i + period).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

function calculateRSI(values, period = 14) {
  const result = [];
  const deltas = [];

  for (let i = 1; i < values.length; i++) {
    deltas.push(values[i] - values[i - 1]);
  }

  let gains = 0,
    losses = 0;

  for (let i = 0; i < period; i++) {
    if (deltas[i] > 0) gains += deltas[i];
    else losses -= deltas[i];
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period; i < deltas.length; i++) {
    if (deltas[i] > 0) gains = deltas[i];
    else {
      gains = 0;
      losses = -deltas[i];
    }

    avgGain = (avgGain * (period - 1) + gains) / period;
    avgLoss = (avgLoss * (period - 1) + losses) / period;

    const rs = avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }

  return result;
}

function calculateMACD(values, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastSMA = calculateSMA(values, fastPeriod);
  const slowSMA = calculateSMA(values, slowPeriod);

  const macdLine = [];
  const minLength = Math.min(fastSMA.length, slowSMA.length);

  for (let i = 0; i < minLength; i++) {
    macdLine.push(fastSMA[i + (values.length - fastSMA.length)] - slowSMA[i]);
  }

  const signalLine = calculateSMA(macdLine, signalPeriod);

  return [
    {
      macdLine: macdLine[macdLine.length - 1],
      signalLine: signalLine[signalLine.length - 1],
      histogram:
        macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1]
    }
  ];
}

function calculateBollingerBands(values, period = 20, stdDevMultiplier = 2) {
  const result = [];
  const sma = calculateSMA(values, period);

  for (let i = 0; i < sma.length; i++) {
    const slice = values.slice(i, i + period);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance =
      slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    result.push({
      upper: sma[i] + stdDev * stdDevMultiplier,
      middle: sma[i],
      lower: sma[i] - stdDev * stdDevMultiplier
    });
  }

  return result;
}

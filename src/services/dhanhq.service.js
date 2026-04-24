import { cacheGet, cacheSet } from "../db/redis.js";

const DHANHQ_API_KEY = process.env.DHANHQ_API_KEY || "demo";
const DHANHQ_BASE_URL = "https://api.dhan.co/v2";
const CACHE_TTL = 300; // 5 minutes for stock data

// Popular Indian stocks (BSE/NSE)
const SUPPORTED_INDIAN_STOCKS = {
  "INFY": { name: "Infosys Limited", exchange: "NSE" },
  "TCS": { name: "Tata Consultancy Services", exchange: "NSE" },
  "RELIANCE": { name: "Reliance Industries", exchange: "NSE" },
  "HDFC": { name: "HDFC Bank", exchange: "NSE" },
  "ICICIBANK": { name: "ICICI Bank", exchange: "NSE" },
  "SBIN": { name: "State Bank of India", exchange: "NSE" },
  "WIPRO": { name: "Wipro Limited", exchange: "NSE" },
  "MARUTI": { name: "Maruti Suzuki", exchange: "NSE" },
  "BAJAJFINSV": { name: "Bajaj Finserv", exchange: "NSE" },
  "LT": { name: "Larsen & Toubro", exchange: "NSE" },
  "HINDUNILVR": { name: "Hindustan Unilever", exchange: "NSE" },
  "SUNPHARMA": { name: "Sun Pharmaceutical", exchange: "NSE" },
  "ADANIGREEN": { name: "Adani Green Energy", exchange: "NSE" },
  "BHARTIARTL": { name: "Bharti Airtel", exchange: "NSE" },
  "HDFCBANK": { name: "HDFC Bank", exchange: "NSE" }
};

/**
 * Fetch Indian stock quote from DhanHQ or cache
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
    // Check if symbol is supported
    if (!SUPPORTED_INDIAN_STOCKS[symbol]) {
      throw new Error(`Indian stock symbol ${symbol} not supported`);
    }

    const stockInfo = SUPPORTED_INDIAN_STOCKS[symbol];
    
    // DhanHQ API endpoint for quote
    const url = `${DHANHQ_BASE_URL}/quote/?token=${symbol}&exchange=${stockInfo.exchange}`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${DHANHQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`DhanHQ API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "success" || !data.data) {
      console.warn(`No price data for ${symbol}, returning mock data`);
      return getMockIndianStockPrice(symbol);
    }

    const quote = data.data;
    const price = {
      symbol: symbol,
      name: stockInfo.name,
      exchange: stockInfo.exchange,
      price: quote.ltp || quote.close,
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.close,
      change: quote.change || 0,
      changePercent: quote.changePercent || 0,
      volume: quote.volume || 0,
      timestamp: Date.now(),
      source: "DhanHQ"
    };

    try {
      await cacheSet(cacheKey, JSON.stringify(price), CACHE_TTL);
    } catch (cacheError) {
      console.warn(`Failed to cache Indian stock price for ${symbol}:`, cacheError.message);
    }

    return price;
  } catch (error) {
    console.error(`Error fetching Indian stock price for ${symbol}:`, error.message);
    // Return mock data if real API fails
    return getMockIndianStockPrice(symbol);
  }
}

/**
 * Fetch intraday candlestick data for Indian stock
 */
export async function getIndianStockIntraday(symbol, interval = "1min") {
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
    
    // DhanHQ API endpoint for intraday data
    const url = `${DHANHQ_BASE_URL}/candlestick/?token=${symbol}&exchange=${stockInfo.exchange}&interval=${interval}`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${DHANHQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`DhanHQ API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "success" || !data.data) {
      console.warn(`No intraday data for ${symbol}, returning mock data`);
      return getMockIndianStockIntraday(symbol, interval);
    }

    const candles = data.data.candles.map(candle => ({
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    }));

    const result = {
      symbol,
      name: stockInfo.name,
      exchange: stockInfo.exchange,
      interval,
      data: candles,
      timestamp: Date.now(),
      source: "DhanHQ"
    };

    try {
      await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL);
    } catch (cacheError) {
      console.warn(`Failed to cache Indian stock intraday for ${symbol}:`, cacheError.message);
    }

    return result;
  } catch (error) {
    console.error(`Error fetching Indian stock intraday for ${symbol}:`, error.message);
    return getMockIndianStockIntraday(symbol, interval);
  }
}

/**
 * Fetch daily candlestick data for Indian stock
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
    
    // DhanHQ API endpoint for daily data
    const url = `${DHANHQ_BASE_URL}/candlestick/?token=${symbol}&exchange=${stockInfo.exchange}&interval=day`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${DHANHQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`DhanHQ API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "success" || !data.data) {
      console.warn(`No daily data for ${symbol}, returning mock data`);
      return getMockIndianStockDaily(symbol);
    }

    const candles = data.data.candles.map(candle => ({
      date: new Date(candle.timestamp).toISOString().split("T")[0],
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    }));

    const result = {
      symbol,
      name: stockInfo.name,
      exchange: stockInfo.exchange,
      data: candles,
      timestamp: Date.now(),
      source: "DhanHQ"
    };

    try {
      await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL * 2);
    } catch (cacheError) {
      console.warn(`Failed to cache Indian stock daily for ${symbol}:`, cacheError.message);
    }

    return result;
  } catch (error) {
    console.error(`Error fetching Indian stock daily for ${symbol}:`, error.message);
    return getMockIndianStockDaily(symbol);
  }
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
    for (const [symbol, info] of Object.entries(SUPPORTED_INDIAN_STOCKS)) {
      try {
        const url = `${DHANHQ_BASE_URL}/quote/?token=${symbol}&exchange=${info.exchange}`;
        
        const response = await fetch(url, {
          headers: {
            "Authorization": `Bearer ${DHANHQ_API_KEY}`,
            "Content-Type": "application/json"
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === "success" && data.data) {
            stocks.push({
              symbol,
              name: info.name,
              exchange: info.exchange,
              price: data.data.ltp || data.data.close,
              change: data.data.change,
              changePercent: data.data.changePercent,
              volume: data.data.volume
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch ${symbol}:`, error.message);
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
      source: "DhanHQ"
    };

    try {
      await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL * 2);
    } catch (cacheError) {
      console.warn(`Failed to cache top Indian stocks:`, cacheError.message);
    }

    return result;
  } catch (error) {
    console.error(`Error fetching top Indian stocks:`, error.message);
    return getMockTopIndianStocks();
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

// ===== MOCK DATA FUNCTIONS =====

function getMockIndianStockPrice(symbol) {
  const basePrices = {
    "INFY": 1850.50,
    "TCS": 3950.75,
    "RELIANCE": 2750.25,
    "HDFC": 2580.00,
    "ICICIBANK": 920.50,
    "SBIN": 580.25,
    "WIPRO": 420.75,
    "MARUTI": 9250.00,
    "BAJAJFINSV": 1680.50,
    "LT": 2850.25,
    "HINDUNILVR": 2380.50,
    "SUNPHARMA": 680.75,
    "ADANIGREEN": 2250.25,
    "BHARTIARTL": 1280.50,
    "HDFCBANK": 1920.75
  };

  const price = basePrices[symbol] || 1000;
  const change = (Math.random() - 0.5) * 50;
  const changePercent = (change / price) * 100;

  return {
    symbol,
    name: SUPPORTED_INDIAN_STOCKS[symbol]?.name,
    exchange: SUPPORTED_INDIAN_STOCKS[symbol]?.exchange,
    price: parseFloat((price + change).toFixed(2)),
    open: price,
    high: price + Math.abs(change) + 50,
    low: price - Math.abs(change) - 50,
    close: price + change,
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    volume: Math.floor(Math.random() * 10000000),
    timestamp: Date.now(),
    source: "DhanHQ (Mock)",
    isMock: true
  };
}

function getMockIndianStockIntraday(symbol, interval) {
  const data = [];
  let currentPrice = {
    "INFY": 1850.50,
    "TCS": 3950.75,
    "RELIANCE": 2750.25,
    "HDFC": 2580.00,
    "ICICIBANK": 920.50,
    "SBIN": 580.25,
    "WIPRO": 420.75,
    "MARUTI": 9250.00,
    "BAJAJFINSV": 1680.50,
    "LT": 2850.25,
    "HINDUNILVR": 2380.50,
    "SUNPHARMA": 680.75,
    "ADANIGREEN": 2250.25,
    "BHARTIARTL": 1280.50,
    "HDFCBANK": 1920.75
  }[symbol] || 1000;

  const intervalMs = interval === "1min" ? 60000 : interval === "5min" ? 300000 : 900000;

  for (let i = 0; i < 50; i++) {
    const timestamp = Date.now() - (i * intervalMs);
    const change = (Math.random() - 0.5) * 10;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * 5;
    const low = Math.min(open, close) - Math.random() * 5;

    data.push({
      timestamp,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000)
    });

    currentPrice = close;
  }

  return {
    symbol,
    name: SUPPORTED_INDIAN_STOCKS[symbol]?.name,
    exchange: SUPPORTED_INDIAN_STOCKS[symbol]?.exchange,
    interval,
    data: data.reverse(),
    timestamp: Date.now(),
    source: "DhanHQ (Mock)",
    isMock: true
  };
}

function getMockIndianStockDaily(symbol) {
  const data = [];
  let currentPrice = {
    "INFY": 1850.50,
    "TCS": 3950.75,
    "RELIANCE": 2750.25,
    "HDFC": 2580.00,
    "ICICIBANK": 920.50,
    "SBIN": 580.25,
    "WIPRO": 420.75,
    "MARUTI": 9250.00,
    "BAJAJFINSV": 1680.50,
    "LT": 2850.25,
    "HINDUNILVR": 2380.50,
    "SUNPHARMA": 680.75,
    "ADANIGREEN": 2250.25,
    "BHARTIARTL": 1280.50,
    "HDFCBANK": 1920.75
  }[symbol] || 1000;

  for (let i = 0; i < 100; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const change = (Math.random() - 0.5) * 50;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * 50;
    const low = Math.min(open, close) - Math.random() * 50;

    data.push({
      date: dateStr,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 10000000)
    });

    currentPrice = close;
  }

  return {
    symbol,
    name: SUPPORTED_INDIAN_STOCKS[symbol]?.name,
    exchange: SUPPORTED_INDIAN_STOCKS[symbol]?.exchange,
    data: data.reverse(),
    timestamp: Date.now(),
    source: "DhanHQ (Mock)",
    isMock: true
  };
}

function getMockTopIndianStocks() {
  const stocks = Object.entries(SUPPORTED_INDIAN_STOCKS).map(([symbol, info]) => ({
    symbol,
    name: info.name,
    exchange: info.exchange,
    price: Math.random() * 10000,
    change: (Math.random() - 0.5) * 100,
    changePercent: (Math.random() - 0.5) * 5,
    volume: Math.floor(Math.random() * 10000000)
  }));

  stocks.sort((a, b) => (b.volume || 0) - (a.volume || 0));

  return {
    data: stocks.slice(0, 15),
    count: 15,
    timestamp: Date.now(),
    source: "DhanHQ (Mock)",
    isMock: true
  };
}

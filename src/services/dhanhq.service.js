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
      console.warn(`No price data for ${symbol} from DhanHQ API`);
      throw new Error(`No price data available for ${symbol}`);
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
    throw error; // Propagate error instead of returning mock data
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
    throw error; // Propagate error instead of returning mock data
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

// ═══════════════════════════════════════════════════════════════════════════
// LOT SIZE API - DhanHQ Instrument List
// ═══════════════════════════════════════════════════════════════════════════

// Cache for instrument data (24 hours - lot sizes don't change frequently)
const LOT_SIZE_CACHE_TTL = 86400;
let instrumentCache = null;
let instrumentCacheTime = 0;

/**
 * Fetch all instruments from DhanHQ and cache lot sizes
 * Endpoint: GET /v2/instrument/{exchangeSegment}
 */
export async function fetchDhanHQInstruments(exchangeSegment = "NSE_FNO") {
  const cacheKey = `dhanhq:instruments:${exchangeSegment}`;
  
  try {
    // Check memory cache first
    const now = Date.now();
    if (instrumentCache && (now - instrumentCacheTime) < LOT_SIZE_CACHE_TTL * 1000) {
      return instrumentCache;
    }
    
    // Check Redis cache
    const cached = await cacheGet(cacheKey);
    if (cached) {
      instrumentCache = JSON.parse(cached);
      instrumentCacheTime = now;
      return instrumentCache;
    }
  } catch (error) {
    console.warn("[DhanHQ] Cache error for instruments:", error.message);
  }

  try {
    // DhanHQ Instrument API - returns CSV data
    const url = `${DHANHQ_BASE_URL}/instrument/${exchangeSegment}`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${DHANHQ_API_KEY}`,
        "Accept": "text/csv"
      }
    });

    if (!response.ok) {
      throw new Error(`DhanHQ API error: ${response.status}`);
    }

    const csvData = await response.text();
    
    // Parse CSV and extract lot sizes
    const instruments = parseDhanHQInstrumentCSV(csvData);
    
    // Cache the results
    try {
      await cacheSet(cacheKey, JSON.stringify(instruments), LOT_SIZE_CACHE_TTL);
      instrumentCache = instruments;
      instrumentCacheTime = Date.now();
    } catch (cacheError) {
      console.warn("[DhanHQ] Failed to cache instruments:", cacheError.message);
    }

    return instruments;
  } catch (error) {
    console.error(`[DhanHQ] Error fetching instruments:`, error.message);
    return [];
  }
}

/**
 * Parse DhanHQ instrument CSV data
 * Columns: SEM_TRADING_SYMBOL, SEM_LOT_UNITS, SEM_INSTRUMENT_NAME, etc.
 */
function parseDhanHQInstrumentCSV(csvData) {
  const instruments = [];
  const lines = csvData.trim().split("\n");
  
  if (lines.length < 2) return instruments;
  
  // Parse header
  const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
  const symbolIdx = headers.indexOf("SEM_TRADING_SYMBOL");
  const lotSizeIdx = headers.indexOf("SEM_LOT_UNITS");
  const nameIdx = headers.indexOf("SEM_INSTRUMENT_NAME");
  const exchangeIdx = headers.indexOf("SEM_EXM_EXCH_ID");
  const segmentIdx = headers.indexOf("SEM_SEGMENT");
  
  if (symbolIdx === -1 || lotSizeIdx === -1) {
    console.warn("[DhanHQ] CSV missing required columns");
    return instruments;
  }
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/"/g, ""));
    if (values.length > Math.max(symbolIdx, lotSizeIdx)) {
      const lotSize = parseInt(values[lotSizeIdx], 10);
      if (lotSize && lotSize > 0) {
        instruments.push({
          symbol: values[symbolIdx],
          lotSize: lotSize,
          name: nameIdx !== -1 ? values[nameIdx] : values[symbolIdx],
          exchange: exchangeIdx !== -1 ? values[exchangeIdx] : "NSE",
          segment: segmentIdx !== -1 ? values[segmentIdx] : "FNO"
        });
      }
    }
  }
  
  console.log(`[DhanHQ] Parsed ${instruments.length} instruments with lot sizes`);
  return instruments;
}

/**
 * Get lot size for a specific symbol from DhanHQ
 */
export async function getLotSizeFromDhanHQ(symbol) {
  try {
    // Fetch instruments if not cached
    const instruments = await fetchDhanHQInstruments("NSE_FNO");
    
    // Find matching instrument
    const instrument = instruments.find(i => 
      i.symbol === symbol || 
      i.symbol === `${symbol}-EQ` ||
      i.symbol.startsWith(symbol)
    );
    
    if (instrument) {
      return {
        symbol: symbol,
        lotSize: instrument.lotSize,
        name: instrument.name,
        exchange: instrument.exchange,
        category: instrument.segment === "FNO" ? "fno" : "equity",
        source: "DhanHQ",
        isDefault: false
      };
    }
    
    // If not found in FNO segment, check equity segment
    const equityInstruments = await fetchDhanHQInstruments("NSE_EQ");
    const equityInstrument = equityInstruments.find(i => 
      i.symbol === symbol || 
      i.symbol === `${symbol}-EQ` ||
      i.symbol.startsWith(symbol)
    );
    
    if (equityInstrument) {
      return {
        symbol: symbol,
        lotSize: equityInstrument.lotSize || 1,
        name: equityInstrument.name,
        exchange: equityInstrument.exchange,
        category: "equity_delivery",
        source: "DhanHQ",
        isDefault: equityInstrument.lotSize === 1
      };
    }
    
    // Return default for unknown symbols
    return {
      symbol: symbol,
      lotSize: 1,
      name: symbol,
      exchange: "NSE",
      category: "equity_delivery",
      source: "Default",
      isDefault: true
    };
  } catch (error) {
    console.error(`[DhanHQ] Error getting lot size for ${symbol}:`, error.message);
    return {
      symbol: symbol,
      lotSize: 1,
      name: symbol,
      exchange: "NSE",
      category: "equity_delivery",
      source: "Default",
      isDefault: true
    };
  }
}

/**
 * Get all lot sizes from DhanHQ
 */
export async function getAllLotSizesFromDhanHQ(segment = "NSE_FNO") {
  try {
    const instruments = await fetchDhanHQInstruments(segment);
    return instruments.map(i => ({
      symbol: i.symbol,
      lotSize: i.lotSize,
      name: i.name,
      exchange: i.exchange,
      category: i.segment === "FNO" ? "fno" : "equity"
    }));
  } catch (error) {
    console.error(`[DhanHQ] Error getting all lot sizes:`, error.message);
    return [];
  }
}

/**
 * Validate lot multiple using DhanHQ data
 */
export async function validateLotMultipleFromDhanHQ(symbol, quantity) {
  const lotInfo = await getLotSizeFromDhanHQ(symbol);
  const lotSize = lotInfo.lotSize;
  
  const remainder = quantity % lotSize;
  const isValid = remainder === 0;
  
  return {
    isValid,
    symbol,
    quantity,
    lotSize,
    lots: Math.floor(quantity / lotSize),
    remainder,
    message: isValid 
      ? `${quantity} shares = ${quantity / lotSize} lot(s) of ${lotSize} shares each`
      : `Invalid quantity. Must be multiple of ${lotSize}. Remainder: ${remainder}`
  };
}

/**
 * Calculate quantity from lots using DhanHQ data
 */
export async function calculateQuantityFromDhanHQ(symbol, lots) {
  const lotInfo = await getLotSizeFromDhanHQ(symbol);
  return lotInfo.lotSize * lots;
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

import { cacheGet, cacheSet } from "../db/redis.js";

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY || "demo";
const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query";
const CACHE_TTL = 300; // 5 minutes for stock data

// Supported stocks - Popular US stocks
const SUPPORTED_STOCKS = {
  "AAPL": "Apple Inc.",
  "MSFT": "Microsoft Corporation",
  "GOOGL": "Alphabet Inc.",
  "AMZN": "Amazon.com Inc.",
  "NVDA": "NVIDIA Corporation",
  "META": "Meta Platforms Inc.",
  "TSLA": "Tesla Inc.",
  "JPM": "JPMorgan Chase",
  "V": "Visa Inc.",
  "JNJ": "Johnson & Johnson"
};

// Supported forex pairs - ALL major & minor pairs
// Status: "tested" = available in free tier, "upcoming" = future support
const SUPPORTED_FOREX = {
  // MAJOR PAIRS (tested)
  "EUR/USD": { name: "Euro / US Dollar", status: "tested" },
  "GBP/USD": { name: "British Pound / US Dollar", status: "tested" },
  "USD/JPY": { name: "US Dollar / Japanese Yen", status: "tested" },
  "USD/CHF": { name: "US Dollar / Swiss Franc", status: "tested" },
  "USD/CAD": { name: "US Dollar / Canadian Dollar", status: "tested" },
  
  // EMERGING MARKETS (upcoming)
  "USD/INR": { name: "US Dollar / Indian Rupee", status: "upcoming" },
  "USD/CNY": { name: "US Dollar / Chinese Yuan", status: "upcoming" },
  "USD/RUB": { name: "US Dollar / Russian Ruble", status: "upcoming" },
  "USD/BRL": { name: "US Dollar / Brazilian Real", status: "upcoming" },
  "USD/MXN": { name: "US Dollar / Mexican Peso", status: "upcoming" },
  "USD/ZAR": { name: "US Dollar / South African Rand", status: "upcoming" },
  "USD/AED": { name: "US Dollar / Emirati Dirham", status: "upcoming" },
  "USD/SGD": { name: "US Dollar / Singapore Dollar", status: "upcoming" },
  "USD/HKD": { name: "US Dollar / Hong Kong Dollar", status: "upcoming" },
  "USD/THB": { name: "US Dollar / Thai Baht", status: "upcoming" },
  
  // CROSS PAIRS (upcoming)
  "EUR/GBP": { name: "Euro / British Pound", status: "upcoming" },
  "EUR/JPY": { name: "Euro / Japanese Yen", status: "upcoming" },
  "EUR/CHF": { name: "Euro / Swiss Franc", status: "upcoming" },
  "EUR/AUD": { name: "Euro / Australian Dollar", status: "upcoming" },
  "GBP/JPY": { name: "British Pound / Japanese Yen", status: "upcoming" },
  "GBP/CHF": { name: "British Pound / Swiss Franc", status: "upcoming" },
  "AUD/USD": { name: "Australian Dollar / US Dollar", status: "upcoming" },
  "NZD/USD": { name: "New Zealand Dollar / US Dollar", status: "upcoming" },
  "CAD/JPY": { name: "Canadian Dollar / Japanese Yen", status: "upcoming" },
  "CHF/JPY": { name: "Swiss Franc / Japanese Yen", status: "upcoming" },
  
  // EXOTIC PAIRS (upcoming)
  "USD/TRY": { name: "US Dollar / Turkish Lira", status: "upcoming" },
  "USD/KRW": { name: "US Dollar / South Korean Won", status: "upcoming" },
  "USD/SEK": { name: "US Dollar / Swedish Krona", status: "upcoming" },
  "USD/NOK": { name: "US Dollar / Norwegian Krone", status: "upcoming" },
  "USD/DKK": { name: "US Dollar / Danish Krone", status: "upcoming" },
  "USD/PLN": { name: "US Dollar / Polish Zloty", status: "upcoming" },
  "USD/CZK": { name: "US Dollar / Czech Koruna", status: "upcoming" },
  "USD/HUF": { name: "US Dollar / Hungarian Forint", status: "upcoming" },
  "USD/RON": { name: "US Dollar / Romanian Leu", status: "upcoming" },
  "USD/BGN": { name: "US Dollar / Bulgarian Lev", status: "upcoming" }
};

/**
 * Fetch stock quote from Alpha Vantage or cache
 */
export async function getStockPrice(symbol) {
  const cacheKey = `stock:price:${symbol}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Cache error for stock ${symbol}:`, error.message);
  }

  try {
    // Check if symbol is supported
    if (!SUPPORTED_STOCKS[symbol]) {
      throw new Error(`Stock symbol ${symbol} not supported`);
    }

    const url = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();

    // Check for API rate limit or error
    if (data["Note"] || data["Error Message"]) {
      console.warn("Alpha Vantage API limit reached, returning mock data");
      return getMockStockPrice(symbol);
    }

    if (!data["Global Quote"] || !data["Global Quote"]["05. price"]) {
      console.warn(`No price data for ${symbol}, returning mock data`);
      return getMockStockPrice(symbol);
    }

    const quote = data["Global Quote"];
    const price = {
      symbol: symbol,
      name: SUPPORTED_STOCKS[symbol],
      price: parseFloat(quote["05. price"]),
      change: parseFloat(quote["09. change"] || 0),
      changePercent: parseFloat(quote["10. change percent"]?.replace("%", "") || 0),
      volume: parseInt(quote["06. volume"] || 0),
      timestamp: Date.now(),
      source: "Alpha Vantage"
    };

    // Cache the price
    try {
      await cacheSet(cacheKey, JSON.stringify(price), CACHE_TTL);
    } catch (cacheError) {
      console.warn(`Failed to cache stock price for ${symbol}:`, cacheError.message);
    }

    return price;
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error.message);
    // Return mock data if real API fails
    return getMockStockPrice(symbol);
  }
}

/**
 * Fetch daily stock data (OHLCV)
 */
export async function getStockDaily(symbol, outputSize = "compact") {
  const cacheKey = `stock:daily:${symbol}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Cache error for stock daily ${symbol}:`, error.message);
  }

  try {
    if (!SUPPORTED_STOCKS[symbol]) {
      throw new Error(`Stock symbol ${symbol} not supported`);
    }

    const url = `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=${outputSize}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();

    if (data["Note"] || data["Error Message"]) {
      console.warn("Alpha Vantage API limit reached, returning mock data");
      return getMockStockDaily(symbol);
    }

    if (!data["Time Series (Daily)"]) {
      console.warn(`No daily data for ${symbol}, returning mock data`);
      return getMockStockDaily(symbol);
    }

    const timeSeries = data["Time Series (Daily)"];
    const dailyData = Object.entries(timeSeries).slice(0, 100).map(([date, values]) => ({
      date,
      open: parseFloat(values["1. open"]),
      high: parseFloat(values["2. high"]),
      low: parseFloat(values["3. low"]),
      close: parseFloat(values["4. close"]),
      volume: parseInt(values["5. volume"])
    }));

    const result = {
      symbol,
      name: SUPPORTED_STOCKS[symbol],
      data: dailyData,
      timestamp: Date.now(),
      source: "Alpha Vantage"
    };

    try {
      await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL * 2);
    } catch (cacheError) {
      console.warn(`Failed to cache stock daily for ${symbol}:`, cacheError.message);
    }

    return result;
  } catch (error) {
    console.error(`Error fetching stock daily for ${symbol}:`, error.message);
    return getMockStockDaily(symbol);
  }
}

/**
 * Fetch SMA (Simple Moving Average) indicator
 */
export async function getStockSMA(symbol, interval = "daily", timePeriod = 20) {
  const cacheKey = `stock:sma:${symbol}:${timePeriod}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Cache error for SMA ${symbol}:`, error.message);
  }

  try {
    if (!SUPPORTED_STOCKS[symbol]) {
      throw new Error(`Stock symbol ${symbol} not supported`);
    }

    const url = `${ALPHA_VANTAGE_BASE_URL}?function=SMA&symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&series_type=close&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();

    if (data["Note"] || data["Error Message"]) {
      console.warn("Alpha Vantage API limit reached, returning mock SMA");
      return getMockStockSMA(symbol, timePeriod);
    }

    if (!data["Technical Analysis: SMA"]) {
      console.warn(`No SMA data for ${symbol}, returning mock data`);
      return getMockStockSMA(symbol, timePeriod);
    }

    const smaData = data["Technical Analysis: SMA"];
    const smaValues = Object.entries(smaData).slice(0, 50).map(([date, values]) => ({
      date,
      sma: parseFloat(values["SMA"])
    }));

    const result = {
      symbol,
      name: SUPPORTED_STOCKS[symbol],
      timePeriod,
      data: smaValues,
      timestamp: Date.now(),
      source: "Alpha Vantage"
    };

    try {
      await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL * 3);
    } catch (cacheError) {
      console.warn(`Failed to cache SMA for ${symbol}:`, cacheError.message);
    }

    return result;
  } catch (error) {
    console.error(`Error fetching SMA for ${symbol}:`, error.message);
    return getMockStockSMA(symbol, timePeriod);
  }
}

/**
 * Fetch RSI (Relative Strength Index) indicator
 */
export async function getStockRSI(symbol, interval = "daily", timePeriod = 14) {
  const cacheKey = `stock:rsi:${symbol}:${timePeriod}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Cache error for RSI ${symbol}:`, error.message);
  }

  try {
    if (!SUPPORTED_STOCKS[symbol]) {
      throw new Error(`Stock symbol ${symbol} not supported`);
    }

    const url = `${ALPHA_VANTAGE_BASE_URL}?function=RSI&symbol=${symbol}&interval=${interval}&time_period=${timePeriod}&series_type=close&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();

    if (data["Note"] || data["Error Message"]) {
      console.warn("Alpha Vantage API limit reached, returning mock RSI");
      return getMockStockRSI(symbol, timePeriod);
    }

    if (!data["Technical Analysis: RSI"]) {
      console.warn(`No RSI data for ${symbol}, returning mock data`);
      return getMockStockRSI(symbol, timePeriod);
    }

    const rsiData = data["Technical Analysis: RSI"];
    const rsiValues = Object.entries(rsiData).slice(0, 50).map(([date, values]) => ({
      date,
      rsi: parseFloat(values["RSI"])
    }));

    const result = {
      symbol,
      name: SUPPORTED_STOCKS[symbol],
      timePeriod,
      data: rsiValues,
      timestamp: Date.now(),
      source: "Alpha Vantage"
    };

    try {
      await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL * 3);
    } catch (cacheError) {
      console.warn(`Failed to cache RSI for ${symbol}:`, cacheError.message);
    }

    return result;
  } catch (error) {
    console.error(`Error fetching RSI for ${symbol}:`, error.message);
    return getMockStockRSI(symbol, timePeriod);
  }
}

/**
 * Fetch forex exchange rate
 */
export async function getForexRate(fromCurrency, toCurrency) {
  const pair = `${fromCurrency}/${toCurrency}`;
  const cacheKey = `forex:rate:${pair}`;

  try {
    // Check if pair exists and its status
    if (!SUPPORTED_FOREX[pair]) {
      const error = new Error(`Forex pair ${pair} not found`);
      error.statusCode = 400;
      throw error;
    }

    const pairStatus = SUPPORTED_FOREX[pair].status;
    if (pairStatus === "upcoming") {
      return {
        fromCurrency,
        toCurrency,
        pair,
        status: "upcoming",
        message: "This pair is available for testing in the next phase",
        timestamp: Date.now(),
        source: "Alpha Vantage"
      };
    }

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    if (error.statusCode === 400) throw error;
    console.warn(`Cache error for forex ${pair}:`, error.message);
  }

  try {
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=CURRENCY_EXCHANGE_RATE&from_currency=${fromCurrency}&to_currency=${toCurrency}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();

    if (data["Note"] || data["Error Message"]) {
      console.warn("Alpha Vantage API limit reached, returning mock forex");
      return getMockForexRate(fromCurrency, toCurrency);
    }

    if (!data["Realtime Currency Exchange Rate"]) {
      console.warn(`No forex data for ${pair}, returning mock data`);
      return getMockForexRate(fromCurrency, toCurrency);
    }

    const rate = data["Realtime Currency Exchange Rate"];
    const result = {
      fromCurrency,
      toCurrency,
      pair,
      exchangeRate: parseFloat(rate["5. Exchange Rate"]),
      bid: parseFloat(rate["8. Bid Price"]),
      ask: parseFloat(rate["9. Ask Price"]),
      status: "tested",
      timestamp: Date.now(),
      source: "Alpha Vantage"
    };

    try {
      await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL);
    } catch (cacheError) {
      console.warn(`Failed to cache forex ${pair}:`, cacheError.message);
    }

    return result;
  } catch (error) {
    console.error(`Error fetching forex for ${pair}:`, error.message);
    return getMockForexRate(fromCurrency, toCurrency);
  }
}

/**
 * Fetch forex chart data for a currency pair
 */
export async function getForexChart(fromCurrency, toCurrency, interval = "daily", limit = 100) {
  const pair = `${fromCurrency}/${toCurrency}`;
  const cacheKey = `forex:chart:${pair}:${interval}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) {
      const cachedData = JSON.parse(cached);
      cachedData.data = cachedData.data.slice(0, limit);
      return cachedData;
    }
  } catch (error) {
    console.warn(`Cache error for forex chart ${pair}:`, error.message);
  }

  try {
    let url;
    let timeSeriesKey;
    if (interval === "60min" || interval === "30min" || interval === "15min" || interval === "5min") {
      url = `${ALPHA_VANTAGE_BASE_URL}?function=FX_INTRADAY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&interval=${interval}&outputsize=compact&apikey=${ALPHA_VANTAGE_API_KEY}`;
      timeSeriesKey = `Time Series FX (${interval})`;
    } else {
      url = `${ALPHA_VANTAGE_BASE_URL}?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&outputsize=compact&apikey=${ALPHA_VANTAGE_API_KEY}`;
      timeSeriesKey = "Time Series FX (Daily)";
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json();
    if (data["Note"] || data["Error Message"]) {
      console.warn("Alpha Vantage API limit reached, returning mock forex chart");
      return getMockForexChart(fromCurrency, toCurrency, interval, limit);
    }

    if (!data[timeSeriesKey]) {
      console.warn(`No forex chart data for ${pair} (${interval}), returning mock data`);
      return getMockForexChart(fromCurrency, toCurrency, interval, limit);
    }

    const timeSeries = data[timeSeriesKey];
    const chartData = Object.entries(timeSeries)
      .slice(0, limit)
      .map(([datetime, values]) => ({
        timestamp: Date.parse(datetime),
        open: parseFloat(values["1. open"]),
        high: parseFloat(values["2. high"]),
        low: parseFloat(values["3. low"]),
        close: parseFloat(values["4. close"])
      }))
      .reverse();

    const result = {
      fromCurrency,
      toCurrency,
      pair,
      interval,
      data: chartData,
      timestamp: Date.now(),
      source: "Alpha Vantage"
    };

    try {
      await cacheSet(cacheKey, JSON.stringify(result), CACHE_TTL * 2);
    } catch (cacheError) {
      console.warn(`Failed to cache forex chart for ${pair}:`, cacheError.message);
    }

    return result;
  } catch (error) {
    console.error(`Error fetching forex chart for ${pair}:`, error.message);
    return getMockForexChart(fromCurrency, toCurrency, interval, limit);
  }
}

function getMockForexChart(fromCurrency, toCurrency, interval, limit = 100) {
  const basePrice = 1.0 + Math.random() * 0.5;
  const now = Date.now();
  const candles = [];
  const step = interval === "60min" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  let price = basePrice;

  for (let i = limit - 1; i >= 0; i--) {
    const timestamp = now - i * step;
    const open = price;
    const close = price * (1 + (Math.random() - 0.5) * 0.01);
    const high = Math.max(open, close) * (1 + Math.random() * 0.003);
    const low = Math.min(open, close) * (1 - Math.random() * 0.003);
    candles.push({ timestamp, open, high, low, close });
    price = close;
  }

  return {
    fromCurrency,
    toCurrency,
    pair: `${fromCurrency}/${toCurrency}`,
    interval,
    data: candles,
    timestamp: Date.now(),
    source: "Mock Forex"
  };
}

/**
 * Get all supported stocks
 */
export function getSupportedStocks() {
  return Object.entries(SUPPORTED_STOCKS).map(([symbol, name]) => ({
    symbol,
    name
  }));
}

/**
 * Get all supported forex pairs
 */
export function getSupportedForex() {
  return Object.entries(SUPPORTED_FOREX).map(([pair, info]) => ({
    pair,
    name: info.name,
    status: info.status
  }));
}

/**
 * Get tested (available) forex pairs only
 */
export function getTestedForexPairs() {
  return Object.entries(SUPPORTED_FOREX)
    .filter(([, info]) => info.status === "tested")
    .map(([pair, info]) => ({
      pair,
      name: info.name,
      status: info.status
    }));
}

/**
 * Get upcoming (not yet tested) forex pairs
 */
export function getUpcomingForexPairs() {
  return Object.entries(SUPPORTED_FOREX)
    .filter(([, info]) => info.status === "upcoming")
    .map(([pair, info]) => ({
      pair,
      name: info.name,
      status: info.status
    }));
}

// ===== MOCK DATA FUNCTIONS (for when API is unavailable or rate limited) =====

function getMockStockPrice(symbol) {
  const basePrice = {
    "AAPL": 150.25,
    "MSFT": 380.50,
    "GOOGL": 140.75,
    "AMZN": 180.30,
    "NVDA": 875.00,
    "META": 350.00,
    "TSLA": 245.50,
    "JPM": 190.25,
    "V": 265.75,
    "JNJ": 156.50
  };

  const price = basePrice[symbol] || 100;
  const change = (Math.random() - 0.5) * 5;
  const changePercent = (change / price) * 100;

  return {
    symbol,
    name: SUPPORTED_STOCKS[symbol],
    price: parseFloat((price + change).toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat(changePercent.toFixed(2)),
    volume: Math.floor(Math.random() * 100000000),
    timestamp: Date.now(),
    source: "Alpha Vantage (Mock)",
    isMock: true
  };
}

function getMockStockDaily(symbol) {
  const data = [];
  let currentPrice = {
    "AAPL": 150.25,
    "MSFT": 380.50,
    "GOOGL": 140.75,
    "AMZN": 180.30,
    "NVDA": 875.00,
    "META": 350.00,
    "TSLA": 245.50,
    "JPM": 190.25,
    "V": 265.75,
    "JNJ": 156.50
  }[symbol] || 100;

  for (let i = 0; i < 50; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const change = (Math.random() - 0.5) * 10;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * 5;
    const low = Math.min(open, close) - Math.random() * 5;

    data.push({
      date: dateStr,
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: Math.floor(Math.random() * 100000000)
    });

    currentPrice = close;
  }

  return {
    symbol,
    name: SUPPORTED_STOCKS[symbol],
    data,
    timestamp: Date.now(),
    source: "Alpha Vantage (Mock)",
    isMock: true
  };
}

function getMockStockSMA(symbol, timePeriod) {
  const data = [];
  for (let i = 0; i < 50; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    data.push({
      date: dateStr,
      sma: parseFloat((150 + Math.random() * 50).toFixed(2))
    });
  }

  return {
    symbol,
    name: SUPPORTED_STOCKS[symbol],
    timePeriod,
    data,
    timestamp: Date.now(),
    source: "Alpha Vantage (Mock)",
    isMock: true
  };
}

function getMockStockRSI(symbol, timePeriod) {
  const data = [];
  for (let i = 0; i < 50; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    data.push({
      date: dateStr,
      rsi: parseFloat((30 + Math.random() * 40).toFixed(2))
    });
  }

  return {
    symbol,
    name: SUPPORTED_STOCKS[symbol],
    timePeriod,
    data,
    timestamp: Date.now(),
    source: "Alpha Vantage (Mock)",
    isMock: true
  };
}

function getMockForexRate(fromCurrency, toCurrency) {
  const baseRates = {
    "EUR/USD": 1.0850,
    "GBP/USD": 1.2650,
    "USD/JPY": 145.50,
    "USD/INR": 83.25,
    "USD/CAD": 1.3650
  };

  const pair = `${fromCurrency}/${toCurrency}`;
  const rate = baseRates[pair] || 1.0;
  const variance = rate * 0.01 * (Math.random() - 0.5);

  return {
    fromCurrency,
    toCurrency,
    pair,
    exchangeRate: parseFloat((rate + variance).toFixed(4)),
    bid: parseFloat((rate + variance - 0.0001).toFixed(4)),
    ask: parseFloat((rate + variance + 0.0001).toFixed(4)),
    timestamp: Date.now(),
    source: "Alpha Vantage (Mock)",
    isMock: true
  };
}

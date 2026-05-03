import {
  getStockPrice,
  getStockDaily,
  getStockSMA,
  getStockRSI,
  getForexRate,
  getSupportedStocks,
  getSupportedForex,
  getTestedForexPairs,
  getUpcomingForexPairs
} from "../../services/alpha-vantage.service.js";

/**
 * Get US stock price
 */
export async function getUSStockPrice(req, res) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({ message: "Stock symbol is required" });
    }

    const price = await getStockPrice(symbol.toUpperCase());
    res.json(price);
  } catch (error) {
    console.error("Error fetching stock price:", error.message);
    res.status(500).json({ message: "Failed to fetch stock price" });
  }
}

/**
 * Get all supported US stocks / Global Indices with real prices
 */
export async function getStocks(req, res) {
  try {
    const stocks = getSupportedStocks();
    
    // Fetch real prices for each stock/index
    const stocksWithPrices = await Promise.all(
      stocks.map(async (stock) => {
        try {
          const priceData = await getStockPrice(stock.symbol);
          
          return {
            ...stock,
            currentPrice: priceData.price || priceData.currentPrice,
            priceChange: priceData.change || 0,
            priceChangePercent: priceData.changePercent || 0,
            lastUpdate: priceData.timestamp || new Date().toISOString(),
            source: "Alpha Vantage"
          };
        } catch (error) {
          console.warn(`Failed to fetch price for ${stock.symbol}:`, error.message);
          // Fallback to mock data
          return {
            ...stock,
            currentPrice: _getMockIndexPrice(stock.symbol),
            priceChange: _getMockIndexChange(stock.symbol),
            priceChangePercent: _getMockIndexChangePercent(stock.symbol),
            lastUpdate: new Date().toISOString(),
            source: "Mock Data"
          };
        }
      })
    );
    
    res.json({
      data: stocksWithPrices,
      count: stocksWithPrices.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error fetching stocks:", error.message);
    res.status(500).json({ message: "Failed to fetch stocks" });
  }
}

// Mock global indices price functions
function _getMockIndexPrice(symbol) {
  const basePrices = {
    'SPX': 4521.85,
    'NDX': 14285.30,
    'DJI': 35678.45,
    'FTSE': 7521.85,
    'N225': 33245.80,
    'DAX': 16850.20,
    'CAC': 7320.50,
    'SHANGHAI': 3125.80,
    'NIKKEI': 33245.80,
    'TSX': 19850.75
  };
  const random = Date.now() % 100;
  const basePrice = basePrices[symbol] || 1000.0;
  return basePrice + (random * 0.5);
}

function _getMockIndexChange(symbol) {
  const random = Date.now() % 100;
  return (random - 50) * 1.0;
}

function _getMockIndexChangePercent(symbol) {
  const random = Date.now() % 100;
  return (random - 50) * 0.01;
}

// Commodity symbols for Alpha Vantage
const COMMODITY_SYMBOLS = {
  'GOLD': 'GC=F', // Gold Futures
  'SILVER': 'SI=F', // Silver Futures
  'OIL': 'CL=F', // Crude Oil Futures
  'COPPER': 'HG=F', // Copper Futures
  'NATURAL_GAS': 'NG=F', // Natural Gas Futures
  'WHEAT': 'ZW=F', // Wheat Futures
  'CORN': 'ZC=F', // Corn Futures
  'COFFEE': 'KC=F', // Coffee Futures
  'SUGAR': 'SB=F', // Sugar Futures
  'COTTON': 'CT=F' // Cotton Futures
};

/**
 * Get commodities data with real prices
 */
export async function getCommodities(req, res) {
  try {
    const commodities = Object.entries(COMMODITY_SYMBOLS).map(([name, symbol]) => ({
      symbol,
      name: name.charAt(0) + name.slice(1).toLowerCase(), // Capitalize first letter
      category: 'Commodity'
    }));
    
    // Fetch real prices for each commodity
    const commoditiesWithPrices = await Promise.all(
      commodities.map(async (commodity) => {
        try {
          const priceData = await getStockPrice(commodity.symbol);
          
          return {
            ...commodity,
            currentPrice: priceData.price || priceData.currentPrice,
            priceChange: priceData.change || 0,
            priceChangePercent: priceData.changePercent || 0,
            lastUpdate: priceData.timestamp || new Date().toISOString(),
            source: "Alpha Vantage"
          };
        } catch (error) {
          console.warn(`Failed to fetch price for ${commodity.symbol}:`, error.message);
          // Fallback to mock data
          const mockPrice = _getMockCommodityPrice(commodity.name);
          return {
            ...commodity,
            currentPrice: mockPrice,
            priceChange: _getMockCommodityChange(commodity.name),
            priceChangePercent: _getMockCommodityChangePercent(commodity.name),
            lastUpdate: new Date().toISOString(),
            source: "Mock Data"
          };
        }
      })
    );
    
    res.json({
      data: commoditiesWithPrices,
      count: commoditiesWithPrices.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error fetching commodities:", error.message);
    res.status(500).json({ message: "Failed to fetch commodities" });
  }
}

// Mock commodity price functions
function _getMockCommodityPrice(name) {
  const basePrices = {
    'Gold': 1850.75,
    'Silver': 24.85,
    'Oil': 78.92,
    'Copper': 3.85,
    'Natural_gas': 3.25,
    'Wheat': 6.45,
    'Corn': 4.85,
    'Coffee': 1.95,
    'Sugar': 0.21,
    'Cotton': 0.82
  };
  const random = Date.now() % 100;
  const basePrice = basePrices[name] || 100.0;
  return basePrice + (random * 0.1);
}

function _getMockCommodityChange(name) {
  const random = Date.now() % 100;
  return (random - 50) * 0.05;
}

function _getMockCommodityChangePercent(name) {
  const random = Date.now() % 100;
  return (random - 50) * 0.02;
}

/**
 * Get daily stock data
 */
export async function getStockDailyData(req, res) {
  try {
    const { symbol } = req.params;
    const { outputSize = "compact" } = req.query;

    if (!symbol) {
      return res.status(400).json({ message: "Stock symbol is required" });
    }

    const data = await getStockDaily(symbol.toUpperCase(), outputSize);
    res.json(data);
  } catch (error) {
    console.error("Error fetching stock daily data:", error.message);
    res.status(500).json({ message: "Failed to fetch daily data" });
  }
}

/**
 * Get SMA (Simple Moving Average) indicator
 */
export async function getStockSMAIndicator(req, res) {
  try {
    const { symbol } = req.params;
    const { interval = "daily", timePeriod = "20" } = req.query;

    if (!symbol) {
      return res.status(400).json({ message: "Stock symbol is required" });
    }

    const data = await getStockSMA(
      symbol.toUpperCase(),
      interval,
      parseInt(timePeriod)
    );
    res.json(data);
  } catch (error) {
    console.error("Error fetching SMA:", error.message);
    res.status(500).json({ message: "Failed to fetch SMA data" });
  }
}

/**
 * Get RSI (Relative Strength Index) indicator
 */
export async function getStockRSIIndicator(req, res) {
  try {
    const { symbol } = req.params;
    const { interval = "daily", timePeriod = "14" } = req.query;

    if (!symbol) {
      return res.status(400).json({ message: "Stock symbol is required" });
    }

    const data = await getStockRSI(
      symbol.toUpperCase(),
      interval,
      parseInt(timePeriod)
    );
    res.json(data);
  } catch (error) {
    console.error("Error fetching RSI:", error.message);
    res.status(500).json({ message: "Failed to fetch RSI data" });
  }
}

/**
 * Get forex exchange rate
 */
export async function getExchangeRate(req, res) {
  try {
    const { from, to } = req.params;

    if (!from || !to) {
      return res.status(400).json({ message: "From and to currencies are required" });
    }

    const rate = await getForexRate(from.toUpperCase(), to.toUpperCase());
    res.json(rate);
  } catch (error) {
    console.error("Error fetching forex rate:", error.message);
    res.status(500).json({ message: "Failed to fetch forex rate" });
  }
}

/**
 * Get all supported forex pairs
 */
export function getForexPairs(req, res) {
  try {
    const pairs = getSupportedForex();
    res.json({
      data: pairs,
      total: pairs.length,
      testedCount: pairs.filter(p => p.status === "tested").length,
      upcomingCount: pairs.filter(p => p.status === "upcoming").length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error fetching forex pairs:", error.message);
    res.status(500).json({ message: "Failed to fetch forex pairs" });
  }
}

/**
 * Get tested (available) forex pairs only - FREE TIER with real prices
 */
export async function getTestedForex(req, res) {
  try {
    const pairs = getTestedForexPairs();
    
    // Fetch real prices for each forex pair
    const pairsWithPrices = await Promise.all(
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
          console.warn(`Failed to fetch rate for ${pair.pair}:`, error.message);
          // Fallback to mock data
          return {
            ...pair,
            currentPrice: _getMockForexPrice(pair.pair),
            priceChange: _getMockForexChange(pair.pair),
            priceChangePercent: _getMockForexChangePercent(pair.pair),
            lastUpdate: new Date().toISOString(),
            source: "Mock Data"
          };
        }
      })
    );
    
    res.json({
      data: pairsWithPrices,
      count: pairsWithPrices.length,
      tier: "free (tested)",
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error fetching tested forex pairs:", error.message);
    res.status(500).json({ message: "Failed to fetch tested forex pairs" });
  }
}

// Mock forex price functions
function _getMockForexPrice(pair) {
  const basePrices = {
    'EUR/USD': 1.0856,
    'GBP/USD': 1.2745,
    'USD/JPY': 148.25,
    'USD/CHF': 0.8956,
    'AUD/USD': 0.6584,
    'USD/CAD': 1.3650,
    'NZD/USD': 0.6150,
    'EUR/GBP': 0.8520
  };
  const random = Date.now() % 100;
  const basePrice = basePrices[pair] || 1.0;
  return basePrice + (random * 0.001);
}

function _getMockForexChange(pair) {
  const random = Date.now() % 100;
  return (random - 50) * 0.0001;
}

function _getMockForexChangePercent(pair) {
  const random = Date.now() % 100;
  return (random - 50) * 0.01;
}

/**
 * Get upcoming (not yet tested) forex pairs - FUTURE
 */
export function getUpcomingForex(req, res) {
  try {
    const pairs = getUpcomingForexPairs();
    res.json({
      data: pairs,
      count: pairs.length,
      tier: "upcoming (coming soon)",
      message: "These pairs will be available in the next testing phase",
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error fetching upcoming forex pairs:", error.message);
    res.status(500).json({ message: "Failed to fetch upcoming forex pairs" });
  }
}

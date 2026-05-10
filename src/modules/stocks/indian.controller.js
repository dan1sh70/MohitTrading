import {
  getIndianStockPrice,
  getIndianStockIntraday,
  getIndianStockDaily,
  getTopIndianStocks,
  getSupportedIndianStocks,
  getLotSizeFromDhanHQ,
  getAllLotSizesFromDhanHQ,
  validateLotMultipleFromDhanHQ,
  calculateQuantityFromDhanHQ
} from "../../services/dhanhq.service.js";

/**
 * Get Indian stock price
 */
export async function getIndianStock(req, res) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({ message: "Stock symbol is required" });
    }

    try {
      const price = await getIndianStockPrice(symbol.toUpperCase());
      res.json(price);
    } catch (dhanError) {
      console.warn("DhanHQ API failed for individual stock, using static data:", dhanError.message);
      // Return static realistic data when DhanHQ fails
      const staticData = getStaticIndianStockPrice(symbol.toUpperCase());
      res.json(staticData);
    }
  } catch (error) {
    console.error("Error fetching Indian stock price:", error.message);
    res.status(500).json({ message: "Failed to fetch Indian stock price" });
  }
}

/**
 * Get all supported Indian stocks
 */
export function getIndianStocks(req, res) {
  try {
    const stocks = getSupportedIndianStocks();
    res.json({
      data: stocks,
      count: stocks.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error fetching Indian stocks:", error.message);
    res.status(500).json({ message: "Failed to fetch Indian stocks" });
  }
}

/**
 * Get batch Indian stocks with prices
 */
export async function getIndianStocksBatch(req, res) {
  try {
    const stocks = getSupportedIndianStocks();
    const limit = parseInt(req.query.limit) || 10; // Default to 10 stocks
    const limitedStocks = stocks.slice(0, limit);
    
    // Fetch prices for all stocks in parallel
    const stocksWithPrices = await Promise.allSettled(
      limitedStocks.map(async (stock) => {
        try {
          const priceData = await getIndianStockPrice(stock.symbol);
          return {
            ...stock,
            ...priceData
          };
        } catch (error) {
          console.error(`Error fetching price for ${stock.symbol}:`, error.message);
          // Return stock without price data
          return stock;
        }
      })
    );
    
    const results = stocksWithPrices
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
    
    res.json({
      data: results,
      count: results.length,
      timestamp: Date.now(),
      source: "DhanHQ"
    });
  } catch (error) {
    console.error("Error fetching batch Indian stocks:", error.message);
    res.status(500).json({ message: "Failed to fetch batch Indian stocks" });
  }
}

/**
 * Get intraday candlestick data for Indian stock
 */
export async function getIndianStockIntradayData(req, res) {
  try {
    const { symbol } = req.params;
    const { interval = "1min" } = req.query;

    if (!symbol) {
      return res.status(400).json({ message: "Stock symbol is required" });
    }

    // Validate interval
    const validIntervals = ["1min", "5min", "15min"];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({ message: `Invalid interval. Must be one of: ${validIntervals.join(", ")}` });
    }

    const data = await getIndianStockIntraday(symbol.toUpperCase(), interval);
    res.json(data);
  } catch (error) {
    console.error("Error fetching Indian stock intraday data:", error.message);
    res.status(500).json({ message: "Failed to fetch intraday data" });
  }
}

/**
 * Get daily candlestick data for Indian stock
 */
export async function getIndianStockDailyData(req, res) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({ message: "Stock symbol is required" });
    }

    const data = await getIndianStockDaily(symbol.toUpperCase());
    res.json(data);
  } catch (error) {
    console.error("Error fetching Indian stock daily data:", error.message);
    res.status(500).json({ message: "Failed to fetch daily data" });
  }
}

/**
 * Get top Indian stocks by various criteria
 */
/**
 * Get top Indian stocks by various criteria
 */
export async function getTopIndian(req, res) {
  try {
    const { sortBy = "volume" } = req.query;

    const validSortBy = ["volume", "changePercent", "price"];
    if (!validSortBy.includes(sortBy)) {
      return res.status(400).json({ message: `Invalid sortBy. Must be one of: ${validSortBy.join(", ")}` });
    }

    try {
      const data = await getTopIndianStocks(sortBy);
      res.json(data);
    } catch (dhanError) {
      console.warn("DhanHQ API failed, using static data:", dhanError.message);
      // Return static realistic data when DhanHQ fails
      const staticData = getStaticTopIndianStocks(sortBy);
      res.json(staticData);
    }
  } catch (error) {
    console.error("Error fetching top Indian stocks:", error.message);
    res.status(500).json({ message: "Failed to fetch top Indian stocks" });
  }
}

/**
 * Check if Indian stock market is currently open
 */
function isIndianMarketOpen() {
  const now = new Date();
  const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const day = istTime.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Weekend check
  if (day === 0 || day === 6) return false;
  
  // Market hours: 9:15 AM - 3:30 PM IST
  const marketOpen = hours * 60 + minutes >= 9 * 60 + 15;  // 9:15
  const marketClose = hours * 60 + minutes <= 15 * 60 + 30; // 15:30
  
  return marketOpen && marketClose;
}

/**
 * Static fallback data for individual Indian stock price (no random values)
 */
function getStaticIndianStockPrice(symbol) {
  const marketOpen = isIndianMarketOpen();
  const staticPrices = {
    "INFY": { symbol: "INFY", name: "Infosys Limited", exchange: "NSE", price: 1580.50, change: 15.25, changePercent: 0.97, volume: 8500000, timestamp: Date.now(), source: marketOpen ? "Static (API Error)" : "Static (Market Closed)", marketOpen: marketOpen, isStale: true, lastUpdated: "Previous close" },
    "TCS": { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", price: 3650.25, change: -22.50, changePercent: -0.61, volume: 12000000, timestamp: Date.now(), source: marketOpen ? "Static (API Error)" : "Static (Market Closed)", marketOpen: marketOpen, isStale: true, lastUpdated: "Previous close" },
    "RELIANCE": { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", price: 2850.75, change: 35.80, changePercent: 1.27, volume: 15000000, timestamp: Date.now(), source: marketOpen ? "Static (API Error)" : "Static (Market Closed)", marketOpen: marketOpen, isStale: true, lastUpdated: "Previous close" },
    "HDFC": { symbol: "HDFC", name: "HDFC Bank", exchange: "NSE", price: 1680.30, change: 8.45, changePercent: 0.51, volume: 9800000, timestamp: Date.now(), source: marketOpen ? "Static (API Error)" : "Static (Market Closed)", marketOpen: marketOpen, isStale: true, lastUpdated: "Previous close" },
    "ICICIBANK": { symbol: "ICICIBANK", name: "ICICI Bank", exchange: "NSE", price: 950.60, change: -5.20, changePercent: -0.54, volume: 11200000, timestamp: Date.now(), source: marketOpen ? "Static (API Error)" : "Static (Market Closed)", marketOpen: marketOpen, isStale: true, lastUpdated: "Previous close" },
    "SBIN": { symbol: "SBIN", name: "State Bank of India", exchange: "NSE", price: 620.45, change: 12.30, changePercent: 2.02, volume: 18500000, timestamp: Date.now(), source: marketOpen ? "Static (API Error)" : "Static (Market Closed)", marketOpen: marketOpen, isStale: true, lastUpdated: "Previous close" },
    "WIPRO": { symbol: "WIPRO", name: "Wipro Limited", exchange: "NSE", price: 420.80, change: -3.15, changePercent: -0.74, volume: 6500000, timestamp: Date.now(), source: marketOpen ? "Static (API Error)" : "Static (Market Closed)", marketOpen: marketOpen, isStale: true, lastUpdated: "Previous close" },
    "MARUTI": { symbol: "MARUTI", name: "Maruti Suzuki", exchange: "NSE", price: 9850.25, change: 125.50, changePercent: 1.29, volume: 3200000, timestamp: Date.now(), source: marketOpen ? "Static (API Error)" : "Static (Market Closed)", marketOpen: marketOpen, isStale: true, lastUpdated: "Previous close" },
    "BAJAJFINSV": { symbol: "BAJAJFINSV", name: "Bajaj Finserv", exchange: "NSE", price: 1450.90, change: 18.75, changePercent: 1.31, volume: 2800000, timestamp: Date.now(), source: marketOpen ? "Static (API Error)" : "Static (Market Closed)", marketOpen: marketOpen, isStale: true, lastUpdated: "Previous close" },
    "LT": { symbol: "LT", name: "Larsen & Toubro", exchange: "NSE", price: 3200.15, change: -28.90, changePercent: -0.89, volume: 4500000, timestamp: Date.now(), source: marketOpen ? "Static (API Error)" : "Static (Market Closed)", marketOpen: marketOpen, isStale: true, lastUpdated: "Previous close" },
    "HINDUNILVR": { symbol: "HINDUNILVR", name: "Hindustan Unilever", exchange: "NSE", price: 2650.40, change: 22.80, changePercent: 0.87, volume: 2100000, timestamp: Date.now(), source: marketOpen ? "Static (API Error)" : "Static (Market Closed)", marketOpen: marketOpen, isStale: true, lastUpdated: "Previous close" },
    "SUNPHARMA": { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", exchange: "NSE", price: 980.75, change: -8.30, changePercent: -0.84, volume: 5600000, timestamp: Date.now(), source: marketOpen ? "Static (API Error)" : "Static (Market Closed)", marketOpen: marketOpen, isStale: true, lastUpdated: "Previous close" },
    "ADANIGREEN": { symbol: "ADANIGREEN", name: "Adani Green Energy", exchange: "NSE", price: 1850.60, change: 45.20, changePercent: 2.51, volume: 3900000, timestamp: Date.now(), source: marketOpen ? "Static (API Error)" : "Static (Market Closed)", marketOpen: marketOpen, isStale: true, lastUpdated: "Previous close" },
    "BHARTIARTL": { symbol: "BHARTIARTL", name: "Bharti Airtel", exchange: "NSE", price: 890.30, change: 6.70, changePercent: 0.76, volume: 8700000, timestamp: Date.now(), source: marketOpen ? "Static (API Error)" : "Static (Market Closed)", marketOpen: marketOpen, isStale: true, lastUpdated: "Previous close" },
    "HDFCBANK": { symbol: "HDFCBANK", name: "HDFC Bank", exchange: "NSE", price: 1920.75, change: 15.60, changePercent: 0.82, volume: 10500000, timestamp: Date.now(), source: marketOpen ? "Static (API Error)" : "Static (Market Closed)", marketOpen: marketOpen, isStale: true, lastUpdated: "Previous close" }
  };

  return staticPrices[symbol] || {
    symbol: symbol,
    name: `${symbol} Limited`,
    exchange: "NSE",
    price: 1000.00,
    change: 0.00,
    changePercent: 0.00,
    volume: 1000000,
    timestamp: Date.now(),
    source: marketOpen ? "Static (API Error)" : "Static (Market Closed)",
    marketOpen: marketOpen,
    isStale: true,
    lastUpdated: "Previous close"
  };
}

/**
 * Static fallback data for Indian stocks (no random values)
 */
function getStaticTopIndianStocks(sortBy = "volume") {
  const stocks = [
    { symbol: "INFY", name: "Infosys Limited", exchange: "NSE", price: 1580.50, change: 15.25, changePercent: 0.97, volume: 8500000 },
    { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", price: 3650.25, change: -22.50, changePercent: -0.61, volume: 12000000 },
    { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", price: 2850.75, change: 35.80, changePercent: 1.27, volume: 15000000 },
    { symbol: "HDFC", name: "HDFC Bank", exchange: "NSE", price: 1680.30, change: 8.45, changePercent: 0.51, volume: 9800000 },
    { symbol: "ICICIBANK", name: "ICICI Bank", exchange: "NSE", price: 950.60, change: -5.20, changePercent: -0.54, volume: 11200000 },
    { symbol: "SBIN", name: "State Bank of India", exchange: "NSE", price: 620.45, change: 12.30, changePercent: 2.02, volume: 18500000 },
    { symbol: "WIPRO", name: "Wipro Limited", exchange: "NSE", price: 420.80, change: -3.15, changePercent: -0.74, volume: 6500000 },
    { symbol: "MARUTI", name: "Maruti Suzuki", exchange: "NSE", price: 9850.25, change: 125.50, changePercent: 1.29, volume: 3200000 },
    { symbol: "BAJAJFINSV", name: "Bajaj Finserv", exchange: "NSE", price: 1450.90, change: 18.75, changePercent: 1.31, volume: 2800000 },
    { symbol: "LT", name: "Larsen & Toubro", exchange: "NSE", price: 3200.15, change: -28.90, changePercent: -0.89, volume: 4500000 },
    { symbol: "HINDUNILVR", name: "Hindustan Unilever", exchange: "NSE", price: 2650.40, change: 22.80, changePercent: 0.87, volume: 2100000 },
    { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", exchange: "NSE", price: 980.75, change: -8.30, changePercent: -0.84, volume: 5600000 },
    { symbol: "ADANIGREEN", name: "Adani Green Energy", exchange: "NSE", price: 1850.60, change: 45.20, changePercent: 2.51, volume: 3900000 },
    { symbol: "BHARTIARTL", name: "Bharti Airtel", exchange: "NSE", price: 890.30, change: 6.70, changePercent: 0.76, volume: 8700000 },
    { symbol: "HDFCBANK", name: "HDFC Bank", exchange: "NSE", price: 1920.75, change: 15.60, changePercent: 0.82, volume: 10500000 }
  ];

  // Sort by specified criteria
  if (sortBy === "volume") {
    stocks.sort((a, b) => (b.volume || 0) - (a.volume || 0));
  } else if (sortBy === "changePercent") {
    stocks.sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
  } else if (sortBy === "price") {
    stocks.sort((a, b) => (b.price || 0) - (a.price || 0));
  }

  const marketOpen = isIndianMarketOpen();

  return {
    data: stocks.slice(0, 15),
    count: stocks.slice(0, 15).length,
    timestamp: Date.now(),
    source: marketOpen ? "Static (API Error)" : "Static (Market Closed)",
    marketOpen: marketOpen,
    isStale: true,
    message: marketOpen
      ? "Real-time data unavailable. Showing last known prices."
      : "Market is closed. Showing previous close prices.",
    lastUpdated: "Previous close"
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// LOT SIZE API CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get lot size for a specific symbol
 * GET /stocks/in/lot-size/:symbol
 */
export async function getLotSizeForSymbol(req, res) {
  try {
    const { symbol } = req.params;
    const { lots } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required"
      });
    }

    const lotInfo = await getLotSizeFromDhanHQ(symbol.toUpperCase());

    // If lots parameter provided, calculate quantity
    if (lots && !isNaN(parseInt(lots))) {
      const numLots = parseInt(lots);
      lotInfo.calculatedQuantity = lotInfo.lotSize * numLots;
      lotInfo.requestedLots = numLots;
      lotInfo.totalValue = lotInfo.calculatedQuantity * (req.query.price || 0);
    }

    res.json({
      success: true,
      data: lotInfo,
      timestamp: Date.now(),
      source: lotInfo.source
    });
  } catch (error) {
    console.error("[LotSize] Error getting lot size:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get lot size",
      error: error.message
    });
  }
}

/**
 * Get all lot sizes
 * GET /stocks/in/lot-sizes/all
 */
export async function getAllLotSizes(req, res) {
  try {
    const { segment } = req.query;
    
    // Default to NSE_FNO segment, or use NSE_EQ for equity
    const exchangeSegment = segment || "NSE_FNO";
    const lotSizes = await getAllLotSizesFromDhanHQ(exchangeSegment);

    res.json({
      success: true,
      data: lotSizes,
      count: lotSizes.length,
      timestamp: Date.now(),
      source: "DhanHQ API"
    });
  } catch (error) {
    console.error("[LotSize] Error getting all lot sizes:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get lot sizes",
      error: error.message
    });
  }
}

/**
 * Validate lot size for trading
 * GET /stocks/in/lot-sizes/validate?symbol=RELIANCE&quantity=500
 */
export async function validateLotSize(req, res) {
  try {
    const { symbol, quantity, lots } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required"
      });
    }

    if (!quantity && !lots) {
      return res.status(400).json({
        success: false,
        message: "Either quantity or lots parameter is required"
      });
    }

    const lotInfo = await getLotSizeFromDhanHQ(symbol.toUpperCase());

    let validation;
    if (quantity) {
      validation = await validateLotMultipleFromDhanHQ(symbol.toUpperCase(), parseInt(quantity));
    } else {
      const numLots = parseInt(lots);
      const calcQuantity = lotInfo.lotSize * numLots;
      validation = {
        isValid: true,
        symbol: symbol.toUpperCase(),
        quantity: calcQuantity,
        lotSize: lotInfo.lotSize,
        lots: numLots,
        remainder: 0,
        message: `${calcQuantity} shares = ${numLots} lot(s) of ${lotInfo.lotSize} shares each`
      };
    }

    res.json({
      success: true,
      data: {
        ...validation,
        lotInfo
      },
      timestamp: Date.now(),
      source: lotInfo.source
    });
  } catch (error) {
    console.error("[LotSize] Error validating lot size:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to validate lot size",
      error: error.message
    });
  }
}

/**
 * Get lot size statistics
 * GET /stocks/in/lot-sizes/stats
 */
export async function getLotSizeStats(req, res) {
  try {
    // Fetch all FNO instruments for statistics
    const fnoInstruments = await getAllLotSizesFromDhanHQ("NSE_FNO");
    
    // Calculate statistics
    const lotSizes = fnoInstruments.map(i => i.lotSize);
    const stats = {
      totalCount: fnoInstruments.length,
      uniqueLotSizes: [...new Set(lotSizes)].sort((a, b) => a - b),
      averageLotSize: lotSizes.length > 0 
        ? Math.round(lotSizes.reduce((a, b) => a + b, 0) / lotSizes.length) 
        : 0,
      minLotSize: lotSizes.length > 0 ? Math.min(...lotSizes) : 0,
      maxLotSize: lotSizes.length > 0 ? Math.max(...lotSizes) : 0,
      categories: {
        fno: fnoInstruments.length
      },
      source: "DhanHQ API"
    };

    res.json({
      success: true,
      data: stats,
      timestamp: Date.now(),
      source: "DhanHQ API"
    });
  } catch (error) {
    console.error("[LotSize] Error getting lot size stats:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to get lot size statistics",
      error: error.message
    });
  }
}

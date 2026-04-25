import {
  getIndianStockPrice,
  getIndianStockIntraday,
  getIndianStockDaily,
  getTopIndianStocks,
  getSupportedIndianStocks
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

    const price = await getIndianStockPrice(symbol.toUpperCase());
    res.json(price);
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
export async function getTopIndian(req, res) {
  try {
    const { sortBy = "volume" } = req.query;

    const validSortBy = ["volume", "changePercent", "price"];
    if (!validSortBy.includes(sortBy)) {
      return res.status(400).json({ message: `Invalid sortBy. Must be one of: ${validSortBy.join(", ")}` });
    }

    const data = await getTopIndianStocks(sortBy);
    res.json(data);
  } catch (error) {
    console.error("Error fetching top Indian stocks:", error.message);
    res.status(500).json({ message: "Failed to fetch top Indian stocks" });
  }
}

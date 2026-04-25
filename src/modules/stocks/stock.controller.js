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
 * Get all supported US stocks
 */
export function getStocks(req, res) {
  try {
    const stocks = getSupportedStocks();
    res.json({
      data: stocks,
      count: stocks.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error fetching stocks:", error.message);
    res.status(500).json({ message: "Failed to fetch stocks" });
  }
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
 * Get tested (available) forex pairs only - FREE TIER
 */
export function getTestedForex(req, res) {
  try {
    const pairs = getTestedForexPairs();
    res.json({
      data: pairs,
      count: pairs.length,
      tier: "free (tested)",
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error fetching tested forex pairs:", error.message);
    res.status(500).json({ message: "Failed to fetch tested forex pairs" });
  }
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

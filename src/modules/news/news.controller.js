import {
  getFinancialNews,
  getLatestNews,
  searchNews,
  getNewsForSymbols,
  getTrendingNews,
  getNewsByDateRange,
  getCryptoNews,
  getStockMarketNews
} from "../../services/marketaux.service.js";

/**
 * Get latest financial news
 * Query params: limit (1-100, default 20), page (default 1)
 */
export async function getLatestNewsHandler(req, res) {
  try {
    const limit =100;
    const result = await getLatestNews(limit);

    if (!result.success) {
      return res.status(500).json({
        message: "Failed to fetch news",
        error: result.error
      });
    }

    res.json({
      success: true,
      meta: result.meta,
      data: result.data,
      timestamp: result.timestamp
    });
  } catch (error) {
    console.error("Error fetching latest news:", error.message);
    res.status(500).json({ message: "Failed to fetch latest news" });
  }
}

/**
 * Search news by keyword
 * Query params: q (required), page, limit
 */
export async function searchNewsHandler(req, res) {
  try {
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ message: "Search query (q) is required" });
    }

    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 10, 100);

    const result = await searchNews(q, { page, limit });

    if (!result.success) {
      return res.status(500).json({
        message: "Failed to search news",
        error: result.error
      });
    }

    res.json({
      success: true,
      meta: result.meta,
      data: result.data,
      timestamp: result.timestamp
    });
  } catch (error) {
    console.error("Error searching news:", error.message);
    res.status(500).json({ message: "Failed to search news" });
  }
}

/**
 * Get news for specific symbols
 * Query params: symbols (required, comma-separated), page, limit
 */
export async function getNewsBySymbolsHandler(req, res) {
  try {
    const { symbols } = req.query;

    if (!symbols) {
      return res.status(400).json({
        message: "Symbols parameter is required (comma-separated)"
      });
    }

    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 10, 100);

    const result = await getNewsForSymbols(symbols, { page, limit });

    if (!result.success) {
      return res.status(500).json({
        message: "Failed to fetch news for symbols",
        error: result.error
      });
    }

    res.json({
      success: true,
      meta: result.meta,
      data: result.data,
      timestamp: result.timestamp
    });
  } catch (error) {
    console.error("Error fetching news by symbols:", error.message);
    res.status(500).json({ message: "Failed to fetch news for symbols" });
  }
}

/**
 * Get trending news
 */
export async function getTrendingNewsHandler(req, res) {
  try {
    const result = await getTrendingNews();

    if (!result.success) {
      return res.status(500).json({
        message: "Failed to fetch trending news",
        error: result.error
      });
    }

    res.json({
      success: true,
      meta: result.meta,
      data: result.data,
      timestamp: result.timestamp
    });
  } catch (error) {
    console.error("Error fetching trending news:", error.message);
    res.status(500).json({ message: "Failed to fetch trending news" });
  }
}

/**
 * Get news within date range
 * Query params: startDate (ISO), endDate (ISO), page, limit
 */
export async function getNewsByDateRangeHandler(req, res) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Both startDate and endDate are required (ISO format)"
      });
    }

    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 10, 100);

    const result = await getNewsByDateRange(startDate, endDate, { page, limit });

    if (!result.success) {
      return res.status(500).json({
        message: "Failed to fetch news",
        error: result.error
      });
    }

    res.json({
      success: true,
      meta: result.meta,
      data: result.data,
      timestamp: result.timestamp
    });
  } catch (error) {
    console.error("Error fetching news by date range:", error.message);
    res.status(500).json({ message: "Failed to fetch news by date range" });
  }
}

/**
 * Get cryptocurrency news
 * Query params: page, limit
 */
export async function getCryptoNewsHandler(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const result = await getCryptoNews({ page, limit });

    if (!result.success) {
      return res.status(500).json({
        message: "Failed to fetch crypto news",
        error: result.error
      });
    }

    res.json({
      success: true,
      meta: result.meta,
      data: result.data,
      timestamp: result.timestamp
    });
  } catch (error) {
    console.error("Error fetching crypto news:", error.message);
    res.status(500).json({ message: "Failed to fetch crypto news" });
  }
}

/**
 * Get stock market news (major US stocks)
 * Query params: page, limit
 */
export async function getStockNewsHandler(req, res) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const result = await getStockMarketNews({ page, limit });

    if (!result.success) {
      return res.status(500).json({
        message: "Failed to fetch stock market news",
        error: result.error
      });
    }

    res.json({
      success: true,
      meta: result.meta,
      data: result.data,
      timestamp: result.timestamp
    });
  } catch (error) {
    console.error("Error fetching stock news:", error.message);
    res.status(500).json({ message: "Failed to fetch stock market news" });
  }
}

/**
 * Get advanced news search with multiple filters
 * Query params: query, symbols, startDate, endDate, page, limit
 */
export async function getAdvancedNewsHandler(req, res) {
  try {
    const { query, symbols, startDate, endDate } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 10, 100);

    const result = await getFinancialNews({
      query,
      symbols,
      startDate,
      endDate,
      page,
      limit
    });

    if (!result.success) {
      return res.status(500).json({
        message: "Failed to fetch news",
        error: result.error
      });
    }

    res.json({
      success: true,
      meta: result.meta,
      data: result.data,
      timestamp: result.timestamp
    });
  } catch (error) {
    console.error("Error fetching advanced news:", error.message);
    res.status(500).json({ message: "Failed to fetch news" });
  }
}

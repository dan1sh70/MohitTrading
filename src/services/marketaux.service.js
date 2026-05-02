/**
 * MarketAux News Service
 * Free stock market and finance news API
 * API Docs: https://www.marketaux.com/documentation
 */

const BASE_URL = "https://api.marketaux.com/v1/news";
const API_KEY = process.env.MARKETAUX_API_KEY || "demo";

/**
 * Fetch financial news with optional filters
 * @param {Object} options - Query options
 * @param {string} options.query - Search query (optional)
 * @param {string} options.symbols - Comma-separated stock symbols (optional)
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Results per page (default: 10, max: 100)
 * @param {string} options.startDate - Publication date start (ISO format, optional)
 * @param {string} options.endDate - Publication date end (ISO format, optional)
 * @param {string} options.language - Language code (default: 'en')
 * @returns {Promise<Object>} News data with metadata
 */
export async function getFinancialNews(options = {}) {
  try {
    const params = new URLSearchParams({
      api_token: API_KEY,
      limit: Math.min(Number(options.limit) || 10, 100),
      page: Number(options.page) || 1,
      language: options.language || "en"
    });

    // Add optional parameters
    if (options.query) params.append("q", options.query);
    if (options.symbols) params.append("symbols", options.symbols);
    if (options.startDate) params.append("publish_date_start", options.startDate);
    if (options.endDate) params.append("publish_date_end", options.endDate);

    const response = await fetch(`${BASE_URL}?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`MarketAux API error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      meta: data.meta,
      data: data.data || [],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("MarketAux service error:", error.message);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

/**
 * Get latest market news
 * @param {number} limit - Number of articles to fetch
 * @returns {Promise<Object>} Latest news
 */
export async function getLatestNews(limit = 20) {
  return getFinancialNews({
    limit: Math.min(limit, 100),
    page: 1
  });
}

/**
 * Search news by keyword
 * @param {string} query - Search query
 * @param {Object} options - Additional options (page, limit, etc.)
 * @returns {Promise<Object>} Search results
 */
export async function searchNews(query, options = {}) {
  return getFinancialNews({
    query,
    ...options
  });
}

/**
 * Get news for specific stocks/symbols
 * @param {string|Array} symbols - Stock symbols (comma-separated or array)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} News for the symbols
 */
export async function getNewsForSymbols(symbols, options = {}) {
  const symbolsString = Array.isArray(symbols) ? symbols.join(",") : symbols;
  return getFinancialNews({
    symbols: symbolsString,
    ...options
  });
}

/**
 * Get trending news
 * @returns {Promise<Object>} Top trending news articles
 */
export async function getTrendingNews() {
  return getFinancialNews({
    limit: 50,
    page: 1
  });
}

/**
 * Get news by date range
 * @param {string} startDate - ISO format date
 * @param {string} endDate - ISO format date
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} News within date range
 */
export async function getNewsByDateRange(startDate, endDate, options = {}) {
  return getFinancialNews({
    startDate,
    endDate,
    ...options
  });
}

/**
 * Get crypto-related news
 * Common crypto symbols: BTC, ETH, BNB, SOL, XRP, etc.
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Crypto news
 */
export async function getCryptoNews(options = {}) {
  const cryptoSymbols = ["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE"];
  return getFinancialNews({
    symbols: cryptoSymbols.join(","),
    ...options
  });
}

/**
 * Get stock market news (major US stocks)
 * @param {Object} options - Filter options
 * @returns {Promise<Object>} Stock market news
 */
export async function getStockMarketNews(options = {}) {
  const majorStocks = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META"];
  return getFinancialNews({
    symbols: majorStocks.join(","),
    ...options
  });
}

/**
 * Validate API key and check service status
 * @returns {Promise<boolean>} True if API is working
 */
export async function isServiceAvailable() {
  try {
    const result = await getLatestNews(1);
    return result.success;
  } catch (error) {
    console.error("MarketAux service status check failed:", error.message);
    return false;
  }
}

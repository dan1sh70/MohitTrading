/**
 * Static mapping of Indian stock trading symbols to Upstox instrument keys.
 * Format: NSE_EQ|ISIN (e.g., NSE_EQ|INE002A01018 for Reliance)
 * 
 * This is a fallback when Upstox instruments endpoint is not available.
 * Keep in sync with SUPPORTED_INDIAN_STOCKS in upstox.service.js
 */
export const upstoxInstrumentKeys = {
  // NSE Equity (Large Cap - CNX Nifty 50)
  "INFY": "NSE_EQ|INE009A01021",      // Infosys Limited
  "TCS": "NSE_EQ|INE467B01029",       // Tata Consultancy Services
  "RELIANCE": "NSE_EQ|INE002A01018",  // Reliance Industries
  "HDFC": "NSE_EQ|INE022A01026",      // HDFC
  "ICICIBANK": "NSE_EQ|INE090A01021", // ICICI Bank
  "SBIN": "NSE_EQ|INE062A01020",      // State Bank of India
  "WIPRO": "NSE_EQ|INE239A01022",     // Wipro Limited
  "MARUTI": "NSE_EQ|INE585A01024",    // Maruti Suzuki
  "BAJAJFINSV": "NSE_EQ|INE945I01010", // Bajaj Finserv
  "LT": "NSE_EQ|INE020A01021",        // Larsen & Toubro
  "HINDUNILVR": "NSE_EQ|INE129A01021", // Hindustan Unilever
  "SUNPHARMA": "NSE_EQ|INE044A01021", // Sun Pharmaceutical
  "ADANIGREEN": "NSE_EQ|INE456A01026", // Adani Green Energy
  "BHARTIARTL": "NSE_EQ|INE939I01010", // Bharti Airtel
  "HDFCBANK": "NSE_EQ|INE040A01034",   // HDFC Bank
  
  // Futures (NSE F&O)
  "HDFCBANK-FUT": "NSE_FO|HDFCBANK",   // HDFC Bank Futures
  "INFY-FUT": "NSE_FO|INFY",           // Infosys Futures
};

/**
 * Get Upstox instrument key for a trading symbol
 * Returns full instrument key in NSE_EQ|ISIN format or NSE_FO|SYMBOL format
 */
export function getInstrumentKey(symbol) {
  const normalized = String(symbol || "").toUpperCase().trim();
  return upstoxInstrumentKeys[normalized] || null;
}

/**
 * Build a comma-separated list of instrument keys for batch quote requests
 * Filters out symbols that don't have a mapping
 */
export function buildInstrumentKeyList(symbols) {
  return symbols
    .map(s => getInstrumentKey(s))
    .filter(k => k !== null)
    .join(",");
}

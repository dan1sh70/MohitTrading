import { sql } from "../../db/mysql.js";
import { cacheGet, cacheSet } from "../../db/redis.js";

// Hardened list of top liquid Indian universe across Large, Mid, and Small Cap & Sectors
export const MARKET_MOVERS_UNIVERSE = [
  // NIFTY 50 / Large Cap
  { symbol: "RELIANCE", yahooSymbol: "RELIANCE.NS", name: "Reliance Industries Ltd", exchange: "NSE", sector: "Energy", capCategory: "LARGE_CAP", marketCap: 1780000 },
  { symbol: "TCS", yahooSymbol: "TCS.NS", name: "Tata Consultancy Services Ltd", exchange: "NSE", sector: "IT", capCategory: "LARGE_CAP", marketCap: 1350000 },
  { symbol: "HDFCBANK", yahooSymbol: "HDFCBANK.NS", name: "HDFC Bank Ltd", exchange: "NSE", sector: "Banking", capCategory: "LARGE_CAP", marketCap: 1280000 },
  { symbol: "INFY", yahooSymbol: "INFY.NS", name: "Infosys Ltd", exchange: "NSE", sector: "IT", capCategory: "LARGE_CAP", marketCap: 780000 },
  { symbol: "ICICIBANK", yahooSymbol: "ICICIBANK.NS", name: "ICICI Bank Ltd", exchange: "NSE", sector: "Banking", capCategory: "LARGE_CAP", marketCap: 890000 },
  { symbol: "BHARTIARTL", yahooSymbol: "BHARTIARTL.NS", name: "Bharti Airtel Ltd", exchange: "NSE", sector: "Telecom", capCategory: "LARGE_CAP", marketCap: 720000 },
  { symbol: "SBIN", yahooSymbol: "SBIN.NS", name: "State Bank of India", exchange: "NSE", sector: "Banking", capCategory: "LARGE_CAP", marketCap: 680000 },
  { symbol: "LICI", yahooSymbol: "LICI.NS", name: "Life Insurance Corporation of India", exchange: "NSE", sector: "Financial Services", capCategory: "LARGE_CAP", marketCap: 620000 },
  { symbol: "ITC", yahooSymbol: "ITC.NS", name: "ITC Ltd", exchange: "NSE", sector: "FMCG", capCategory: "LARGE_CAP", marketCap: 560000 },
  { symbol: "HINDUNILVR", yahooSymbol: "HINDUNILVR.NS", name: "Hindustan Unilever Ltd", exchange: "NSE", sector: "FMCG", capCategory: "LARGE_CAP", marketCap: 540000 },
  { symbol: "LT", yahooSymbol: "LT.NS", name: "Larsen & Toubro Ltd", exchange: "NSE", sector: "Capital Goods", capCategory: "LARGE_CAP", marketCap: 490000 },
  { symbol: "BAJFINANCE", yahooSymbol: "BAJFINANCE.NS", name: "Bajaj Finance Ltd", exchange: "NSE", sector: "Financial Services", capCategory: "LARGE_CAP", marketCap: 440000 },
  { symbol: "MARUTI", yahooSymbol: "MARUTI.NS", name: "Maruti Suzuki India Ltd", exchange: "NSE", sector: "Automobile", capCategory: "LARGE_CAP", marketCap: 390000 },
  { symbol: "HCLTECH", yahooSymbol: "HCLTECH.NS", name: "HCL Technologies Ltd", exchange: "NSE", sector: "IT", capCategory: "LARGE_CAP", marketCap: 380000 },
  { symbol: "SUNPHARMA", yahooSymbol: "SUNPHARMA.NS", name: "Sun Pharmaceutical Industries Ltd", exchange: "NSE", sector: "Healthcare", capCategory: "LARGE_CAP", marketCap: 370000 },
  { symbol: "TATAMOTORS", yahooSymbol: "TATAMOTORS.NS", name: "Tata Motors Ltd", exchange: "NSE", sector: "Automobile", capCategory: "LARGE_CAP", marketCap: 360000 },
  { symbol: "KOTAKBANK", yahooSymbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank Ltd", exchange: "NSE", sector: "Banking", capCategory: "LARGE_CAP", marketCap: 350000 },
  { symbol: "ONGC", yahooSymbol: "ONGC.NS", name: "Oil & Natural Gas Corporation Ltd", exchange: "NSE", sector: "Energy", capCategory: "LARGE_CAP", marketCap: 340000 },
  { symbol: "NTPC", yahooSymbol: "NTPC.NS", name: "NTPC Ltd", exchange: "NSE", sector: "Power", capCategory: "LARGE_CAP", marketCap: 330000 },
  { symbol: "AXISBANK", yahooSymbol: "AXISBANK.NS", name: "Axis Bank Ltd", exchange: "NSE", sector: "Banking", capCategory: "LARGE_CAP", marketCap: 320000 },
  { symbol: "TITAN", yahooSymbol: "TITAN.NS", name: "Titan Company Ltd", exchange: "NSE", sector: "Consumer Durables", capCategory: "LARGE_CAP", marketCap: 290000 },
  { symbol: "WIPRO", yahooSymbol: "WIPRO.NS", name: "Wipro Ltd", exchange: "NSE", sector: "IT", capCategory: "LARGE_CAP", marketCap: 270000 },
  { symbol: "ADANIENT", yahooSymbol: "ADANIENT.NS", name: "Adani Enterprises Ltd", exchange: "NSE", sector: "Metals & Mining", capCategory: "LARGE_CAP", marketCap: 280000 },
  { symbol: "ADANIPORTS", yahooSymbol: "ADANIPORTS.NS", name: "Adani Ports & SEZ Ltd", exchange: "NSE", sector: "Services", capCategory: "LARGE_CAP", marketCap: 260000 },
  { symbol: "COALINDIA", yahooSymbol: "COALINDIA.NS", name: "Coal India Ltd", exchange: "NSE", sector: "Energy", capCategory: "LARGE_CAP", marketCap: 250000 },
  { symbol: "POWERGRID", yahooSymbol: "POWERGRID.NS", name: "Power Grid Corp of India Ltd", exchange: "NSE", sector: "Power", capCategory: "LARGE_CAP", marketCap: 270000 },
  { symbol: "BAJAJFINSV", yahooSymbol: "BAJAJFINSV.NS", name: "Bajaj Finserv Ltd", exchange: "NSE", sector: "Financial Services", capCategory: "LARGE_CAP", marketCap: 260000 },
  { symbol: "TATASTEEL", yahooSymbol: "TATASTEEL.NS", name: "Tata Steel Ltd", exchange: "NSE", sector: "Metals & Mining", capCategory: "LARGE_CAP", marketCap: 200000 },
  { symbol: "ASIANPAINT", yahooSymbol: "ASIANPAINT.NS", name: "Asian Paints Ltd", exchange: "NSE", sector: "Consumer Durables", capCategory: "LARGE_CAP", marketCap: 240000 },
  { symbol: "ULTRACEMCO", yahooSymbol: "ULTRACEMCO.NS", name: "UltraTech Cement Ltd", exchange: "NSE", sector: "Materials", capCategory: "LARGE_CAP", marketCap: 280000 },
  // Mid Cap & High Beta Movers
  { symbol: "VOLTAS", yahooSymbol: "VOLTAS.NS", name: "Voltas Ltd", exchange: "NSE", sector: "Consumer Durables", capCategory: "MID_CAP", marketCap: 52000 },
  { symbol: "FEDERALBNK", yahooSymbol: "FEDERALBNK.NS", name: "Federal Bank Ltd", exchange: "NSE", sector: "Banking", capCategory: "MID_CAP", marketCap: 48000 },
  { symbol: "TATACHEM", yahooSymbol: "TATACHEM.NS", name: "Tata Chemicals Ltd", exchange: "NSE", sector: "Chemicals", capCategory: "MID_CAP", marketCap: 28000 },
  { symbol: "POLYCAB", yahooSymbol: "POLYCAB.NS", name: "Polycab India Ltd", exchange: "NSE", sector: "Capital Goods", capCategory: "MID_CAP", marketCap: 95000 },
  { symbol: "TRENT", yahooSymbol: "TRENT.NS", name: "Trent Ltd", exchange: "NSE", sector: "Consumer Services", capCategory: "LARGE_CAP", marketCap: 220000 },
  { symbol: "BEL", yahooSymbol: "BEL.NS", name: "Bharat Electronics Ltd", exchange: "NSE", sector: "Capital Goods", capCategory: "LARGE_CAP", marketCap: 210000 },
  { symbol: "HAL", yahooSymbol: "HAL.NS", name: "Hindustan Aeronautics Ltd", exchange: "NSE", sector: "Capital Goods", capCategory: "LARGE_CAP", marketCap: 300000 },
  { symbol: "ZOMATO", yahooSymbol: "ZOMATO.NS", name: "Zomato Ltd", exchange: "NSE", sector: "Consumer Services", capCategory: "LARGE_CAP", marketCap: 230000 },
  { symbol: "IDFCFIRSTB", yahooSymbol: "IDFCFIRSTB.NS", name: "IDFC First Bank Ltd", exchange: "NSE", sector: "Banking", capCategory: "MID_CAP", marketCap: 56000 },
  { symbol: "PERSISTENT", yahooSymbol: "PERSISTENT.NS", name: "Persistent Systems Ltd", exchange: "NSE", sector: "IT", capCategory: "MID_CAP", marketCap: 75000 }
];

/**
 * Fetch quote for a single stock
 */
async function fetchStockQuote(stock) {
  try {
    const encoded = encodeURIComponent(stock.yahooSymbol);
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
      }
    });

    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const currentPrice = meta.regularMarketPrice ?? meta.chartPreviousClose ?? 0;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? currentPrice;
    const priceChange = meta.fulldayChange ?? +(currentPrice - previousClose).toFixed(2);
    const percentageChange = meta.regularMarketChangePercent ?? +(previousClose > 0 ? ((currentPrice - previousClose) / previousClose) * 100 : 0).toFixed(2);
    const dayHigh = meta.regularMarketDayHigh ?? currentPrice;
    const dayLow = meta.regularMarketDayLow ?? currentPrice;
    const volume = meta.regularMarketVolume ?? 0;
    const avgVolume = volume > 0 ? Math.round(volume * 0.95) : 0;

    return {
      symbol: stock.symbol,
      companyName: stock.name,
      exchange: stock.exchange,
      currentPrice: Number(currentPrice),
      previousClose: Number(previousClose),
      priceChange: Number(priceChange),
      percentageChange: Number(percentageChange),
      volume: Number(volume),
      averageVolume: avgVolume,
      dayHigh: Number(dayHigh),
      dayLow: Number(dayLow),
      marketCap: stock.marketCap * 10000000, // INR Crores to absolute approx
      sector: stock.sector,
      capCategory: stock.capCategory
    };
  } catch (err) {
    return null;
  }
}

/**
 * Scan all stocks in universe and get ranked gainers and losers
 */
export async function scanMarketMovers(filters = {}) {
  const cacheKey = "discover:market_movers_raw";
  let dataset = null;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) dataset = JSON.parse(cached);
  } catch (e) {}

  if (!dataset) {
    const results = [];
    // Process in batches of 8 to respect rate limits
    const chunkSize = 8;
    for (let i = 0; i < MARKET_MOVERS_UNIVERSE.length; i += chunkSize) {
      const chunk = MARKET_MOVERS_UNIVERSE.slice(i, i + chunkSize);
      const settled = await Promise.allSettled(chunk.map(fetchStockQuote));
      for (const s of settled) {
        if (s.status === "fulfilled" && s.value) {
          results.push(s.value);
        }
      }
    }

    dataset = results;
    try {
      await cacheSet(cacheKey, JSON.stringify(dataset), 45); // 45s cache
    } catch (e) {}
  }

  // Apply filters
  let filtered = [...dataset];

  if (filters.exchange) {
    filtered = filtered.filter(s => s.exchange.toUpperCase() === filters.exchange.toUpperCase());
  }
  if (filters.sector) {
    filtered = filtered.filter(s => s.sector.toUpperCase() === filters.sector.toUpperCase());
  }
  if (filters.capCategory) {
    filtered = filtered.filter(s => s.capCategory.toUpperCase() === filters.capCategory.toUpperCase());
  }
  if (filters.index) {
    const idx = filters.index.toUpperCase();
    if (idx === "BANK NIFTY" || idx === "BANK_NIFTY") {
      filtered = filtered.filter(s => s.sector === "Banking");
    } else if (idx === "NIFTY IT" || idx === "NIFTY_IT") {
      filtered = filtered.filter(s => s.sector === "IT");
    } else if (idx === "NIFTY 50" || idx === "NIFTY_50") {
      filtered = filtered.filter(s => s.capCategory === "LARGE_CAP");
    }
  }

  const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 10, 5), 50);

  // Sort gainers (highest positive percentage movement)
  const gainers = [...filtered]
    .sort((a, b) => b.percentageChange - a.percentageChange)
    .slice(0, limit);

  // Sort losers (highest negative percentage movement)
  const losers = [...filtered]
    .sort((a, b) => a.percentageChange - b.percentageChange)
    .slice(0, limit);

  return {
    gainers,
    losers,
    totalScanned: dataset.length,
    filteredCount: filtered.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Return available filter options for frontend
 */
export function getMarketFilters() {
  const exchanges = ["NSE", "BSE"];
  const indices = ["NIFTY 50", "NIFTY 100", "NIFTY 500", "BANK NIFTY", "NIFTY IT"];
  const sectors = [...new Set(MARKET_MOVERS_UNIVERSE.map(s => s.sector))].sort();
  const capCategories = ["LARGE_CAP", "MID_CAP", "SMALL_CAP"];
  const limits = [5, 10, 20, 50];

  return {
    exchanges,
    indices,
    sectors,
    capCategories,
    limits
  };
}


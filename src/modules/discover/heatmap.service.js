import { sql } from "../../db/mysql.js";
import { cacheGet, cacheSet } from "../../db/redis.js";
import { MARKET_MOVERS_UNIVERSE, scanMarketMovers } from "./market-movers.service.js";

/**
 * Generate Heatmap data grouped by Index or Sector
 */
export async function getMarketHeatmap(category = "NIFTY_50") {
  const normCat = category.toUpperCase().replace(/\s+/g, "_");
  const cacheKey = `discover:heatmap:${normCat}`;

  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (e) {}

  // Scan market movers
  const { gainers, losers } = await scanMarketMovers({ limit: 50 });
  const allStocks = [...gainers, ...losers];
  const uniqueMap = new Map();
  for (const s of allStocks) {
    if (!uniqueMap.has(s.symbol)) {
      uniqueMap.set(s.symbol, s);
    }
  }

  let filtered = [...uniqueMap.values()];

  if (normCat === "NIFTY_50" || normCat === "NIFTY50") {
    filtered = filtered.filter(s => s.capCategory === "LARGE_CAP");
  } else if (normCat === "BANK_NIFTY" || normCat === "BANKNIFTY") {
    filtered = filtered.filter(s => s.sector === "Banking");
  } else if (normCat === "NIFTY_100" || normCat === "NIFTY100") {
    filtered = filtered.filter(s => s.capCategory === "LARGE_CAP" || s.capCategory === "MID_CAP");
  }

  // Calculate market breadth
  let advances = 0;
  let declines = 0;
  let unchanged = 0;

  for (const s of filtered) {
    if (s.percentageChange > 0) advances++;
    else if (s.percentageChange < 0) declines++;
    else unchanged++;
  }

  const adRatio = declines > 0 ? +(advances / declines).toFixed(3) : advances;

  // Group by sector
  const sectorGroups = {};
  for (const s of filtered) {
    if (!sectorGroups[s.sector]) {
      sectorGroups[s.sector] = {
        sector: s.sector,
        stockCount: 0,
        totalMarketCap: 0,
        totalChange: 0,
        stocks: []
      };
    }
    sectorGroups[s.sector].stockCount++;
    sectorGroups[s.sector].totalMarketCap += s.marketCap;
    sectorGroups[s.sector].totalChange += s.percentageChange;
    sectorGroups[s.sector].stocks.push({
      symbol: s.symbol,
      companyName: s.companyName,
      sector: s.sector,
      currentPrice: s.currentPrice,
      previousClose: s.previousClose,
      priceChange: s.priceChange,
      percentageChange: s.percentageChange,
      marketCap: s.marketCap,
      capCategory: s.capCategory,
      volume: s.volume,
      // Heat color intensity based on % change (-3% to +3%)
      intensity: Math.min(Math.max(s.percentageChange / 3, -1), 1)
    });
  }

  // Calculate sector average performance
  const sectors = Object.values(sectorGroups).map(sec => ({
    sector: sec.sector,
    stockCount: sec.stockCount,
    totalMarketCap: sec.totalMarketCap,
    avgPerformance: +(sec.totalChange / sec.stockCount).toFixed(2),
    stocks: sec.stocks.sort((a, b) => b.marketCap - a.marketCap)
  })).sort((a, b) => b.avgPerformance - a.avgPerformance);

  const topPerformingStocks = [...filtered].sort((a, b) => b.percentageChange - a.percentageChange).slice(0, 5);
  const worstPerformingStocks = [...filtered].sort((a, b) => a.percentageChange - b.percentageChange).slice(0, 5);

  const response = {
    category: normCat,
    totalStocks: filtered.length,
    marketBreadth: {
      advances,
      declines,
      unchanged,
      advanceDeclineRatio: adRatio,
      totalTraded: filtered.length
    },
    topPerformingStocks,
    worstPerformingStocks,
    sectors,
    timestamp: new Date().toISOString()
  };

  try {
    await cacheSet(cacheKey, JSON.stringify(response), 30);
  } catch (e) {}

  return response;
}

/**
 * Get dedicated market breadth statistics
 */
export async function getMarketBreadth() {
  const heatmap = await getMarketHeatmap("NIFTY_50");
  return {
    exchange: "NSE",
    indexName: "NIFTY 50",
    ...heatmap.marketBreadth,
    timestamp: heatmap.timestamp
  };
}


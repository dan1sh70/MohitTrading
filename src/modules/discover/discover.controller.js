import { getOptionExpiries, getOptionChain, getOptionAnalytics, getOptionAnalyticsHistory, UNDERLYING_CONFIG } from "./option-chain.service.js";
import { scanMarketMovers, getMarketFilters } from "./market-movers.service.js";
import { getDailyFiiDii, getMonthlyFiiDii, getFiiDiiHistory, getFiiDiiAnalytics } from "./fii-dii.service.js";
import { getGlobalIndices, getIndexHistory, GLOBAL_INDICES_CONFIG } from "./global-indices.service.js";
import { getMarketHeatmap, getMarketBreadth } from "./heatmap.service.js";

/**
 * Standard API Response Formatter matching Section 11 Specification
 */
function sendSuccess(res, data, message = "Market data retrieved successfully", source = "YAHOO_FINANCE", isDelayed = false) {
  return res.status(200).json({
    success: true,
    message,
    data,
    meta: {
      source,
      timestamp: new Date().toISOString(),
      data_status: isDelayed ? "delayed" : "live",
      is_delayed: isDelayed
    }
  });
}

function sendError(res, error, statusCode = 500) {
  console.error("[Discover API Error]:", error);
  return res.status(statusCode).json({
    success: false,
    message: error.message || "Failed to retrieve market data",
    data: null,
    meta: {
      source: "DISCOVER_SERVICE",
      timestamp: new Date().toISOString(),
      data_status: "unavailable",
      is_delayed: false
    }
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 1: OPTION CHAIN CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

export async function getOptionChainSymbolsHandler(req, res) {
  try {
    const symbols = Object.keys(UNDERLYING_CONFIG).map(k => ({
      symbol: k,
      name: UNDERLYING_CONFIG[k].name,
      strikeInterval: UNDERLYING_CONFIG[k].strikeInterval,
      lotSize: UNDERLYING_CONFIG[k].lotSize
    }));
    return sendSuccess(res, symbols, "Option chain symbols retrieved successfully", "UPSTOX_NSE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getOptionChainHandler(req, res) {
  try {
    const { symbol } = req.params;
    const { expiry, minStrike, maxStrike } = req.query;
    if (!symbol) return res.status(400).json({ success: false, message: "Symbol is required" });

    const chain = await getOptionChain(symbol, expiry, minStrike, maxStrike);
    return sendSuccess(res, chain, `Option chain for ${symbol.toUpperCase()} retrieved successfully`, "UPSTOX_NSE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getOptionExpiriesHandler(req, res) {
  try {
    const { symbol } = req.params;
    if (!symbol) return res.status(400).json({ success: false, message: "Symbol is required" });

    const expiries = await getOptionExpiries(symbol);
    return sendSuccess(res, { symbol: symbol.toUpperCase(), expiries }, "Expiries retrieved successfully", "UPSTOX_NSE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getOptionContractsHandler(req, res) {
  try {
    const { symbol } = req.params;
    const { expiry } = req.query;
    const chain = await getOptionChain(symbol, expiry);
    
    // Flatten CE and PE contracts for frontend contract list
    const contracts = [];
    for (const s of chain.strikes) {
      if (s.CE) contracts.push(s.CE);
      if (s.PE) contracts.push(s.PE);
    }
    return sendSuccess(res, { symbol: symbol.toUpperCase(), expiry: chain.expiryDate, count: contracts.length, contracts }, "Contracts retrieved successfully", "UPSTOX_NSE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getOptionAnalyticsHandler(req, res) {
  try {
    const { symbol } = req.params;
    const { expiry } = req.query;
    if (!symbol) return res.status(400).json({ success: false, message: "Symbol is required" });

    const analytics = await getOptionAnalytics(symbol, expiry);
    return sendSuccess(res, analytics, "Option analytics calculated successfully", "UPSTOX_NSE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getOptionHistoryHandler(req, res) {
  try {
    const { symbol } = req.params;
    const limit = parseInt(req.query.limit, 10) || 20;
    const history = await getOptionAnalyticsHistory(symbol, limit);
    return sendSuccess(res, { symbol: symbol.toUpperCase(), history }, "Option chain historical snapshots retrieved", "DATABASE");
  } catch (err) {
    return sendError(res, err);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 2: TOP GAINERS / LOSERS CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

export async function getTopGainersHandler(req, res) {
  try {
    const { limit = 10, exchange, sector, capCategory, index } = req.query;
    const data = await scanMarketMovers({ limit, exchange, sector, capCategory, index });
    return sendSuccess(res, { count: data.gainers.length, gainers: data.gainers }, "Top gainers retrieved successfully", "YAHOO_FINANCE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getTopLosersHandler(req, res) {
  try {
    const { limit = 10, exchange, sector, capCategory, index } = req.query;
    const data = await scanMarketMovers({ limit, exchange, sector, capCategory, index });
    return sendSuccess(res, { count: data.losers.length, losers: data.losers }, "Top losers retrieved successfully", "YAHOO_FINANCE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getGainersFiltersHandler(req, res) {
  try {
    const filters = getMarketFilters();
    return sendSuccess(res, filters, "Gainers filters retrieved successfully", "CONFIG");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getLosersFiltersHandler(req, res) {
  try {
    const filters = getMarketFilters();
    return sendSuccess(res, filters, "Losers filters retrieved successfully", "CONFIG");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getMarketMoversHandler(req, res) {
  try {
    const { limit = 10, exchange, sector, capCategory, index } = req.query;
    const data = await scanMarketMovers({ limit, exchange, sector, capCategory, index });
    return sendSuccess(res, data, "Market movers retrieved successfully", "YAHOO_FINANCE");
  } catch (err) {
    return sendError(res, err);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 3: FII / DII DATA CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

export async function getFiiDiiOverviewHandler(req, res) {
  try {
    const daily = await getDailyFiiDii();
    const analytics = await getFiiDiiAnalytics();
    return sendSuccess(res, { daily, analytics }, "FII / DII summary retrieved successfully", "NSE_OFFICIAL");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getFiiDiiDailyHandler(req, res) {
  try {
    const { date } = req.query;
    const daily = await getDailyFiiDii(date);
    return sendSuccess(res, daily, "Daily FII / DII data retrieved successfully", "NSE_OFFICIAL");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getFiiDiiMonthlyHandler(req, res) {
  try {
    const { year } = req.query;
    const monthly = await getMonthlyFiiDii(year ? parseInt(year, 10) : null);
    return sendSuccess(res, monthly, "Monthly FII / DII data retrieved successfully", "NSE_OFFICIAL");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getFiiDiiHistoryHandler(req, res) {
  try {
    const { startDate, endDate, limit = 30 } = req.query;
    const history = await getFiiDiiHistory(startDate, endDate, parseInt(limit, 10));
    return sendSuccess(res, history, "FII / DII historical records retrieved successfully", "NSE_OFFICIAL");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getFiiDiiAnalyticsHandler(req, res) {
  try {
    const analytics = await getFiiDiiAnalytics();
    return sendSuccess(res, analytics, "FII / DII analytics generated successfully", "NSE_OFFICIAL");
  } catch (err) {
    return sendError(res, err);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 4: GLOBAL INDICES CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

export async function getAllGlobalIndicesHandler(req, res) {
  try {
    const indices = await getGlobalIndices();
    return sendSuccess(res, indices, "Global market indices retrieved successfully", "YAHOO_FINANCE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getIndiaIndicesHandler(req, res) {
  try {
    const indices = await getGlobalIndices("INDIA");
    return sendSuccess(res, indices, "Indian market indices retrieved successfully", "YAHOO_FINANCE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getInternationalIndicesHandler(req, res) {
  try {
    const indices = await getGlobalIndices("INTERNATIONAL");
    return sendSuccess(res, indices, "International market indices retrieved successfully", "YAHOO_FINANCE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getSingleIndexHandler(req, res) {
  try {
    const { symbol } = req.params;
    const indices = await getGlobalIndices();
    const item = indices.find(i => i.symbol.toUpperCase() === symbol.toUpperCase() || i.name.toUpperCase() === symbol.toUpperCase());
    if (!item) {
      return res.status(404).json({ success: false, message: `Index '${symbol}' not found` });
    }
    return sendSuccess(res, item, `Index ${item.name} retrieved successfully`, "YAHOO_FINANCE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getIndexHistoryHandler(req, res) {
  try {
    const { symbol } = req.params;
    const { interval = "15m", range = "5d" } = req.query;
    const history = await getIndexHistory(symbol, interval, range);
    return sendSuccess(res, history, `History for ${symbol} retrieved successfully`, "YAHOO_FINANCE");
  } catch (err) {
    return sendError(res, err);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 5: MARKET HEATMAP CONTROLLERS
// ═════════════════════════════════════════════════════════════════════════════

export async function getHeatmapOverviewHandler(req, res) {
  try {
    const { category = "NIFTY_50" } = req.query;
    const heatmap = await getMarketHeatmap(category);
    return sendSuccess(res, heatmap, `Heatmap for ${category} retrieved successfully`, "YAHOO_FINANCE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getNifty50HeatmapHandler(req, res) {
  try {
    const heatmap = await getMarketHeatmap("NIFTY_50");
    return sendSuccess(res, heatmap, "NIFTY 50 heatmap retrieved successfully", "YAHOO_FINANCE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getNifty100HeatmapHandler(req, res) {
  try {
    const heatmap = await getMarketHeatmap("NIFTY_100");
    return sendSuccess(res, heatmap, "NIFTY 100 heatmap retrieved successfully", "YAHOO_FINANCE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getNifty500HeatmapHandler(req, res) {
  try {
    const heatmap = await getMarketHeatmap("NIFTY_500");
    return sendSuccess(res, heatmap, "NIFTY 500 heatmap retrieved successfully", "YAHOO_FINANCE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getBankNiftyHeatmapHandler(req, res) {
  try {
    const heatmap = await getMarketHeatmap("BANK_NIFTY");
    return sendSuccess(res, heatmap, "BANK NIFTY heatmap retrieved successfully", "YAHOO_FINANCE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getSectorHeatmapHandler(req, res) {
  try {
    const heatmap = await getMarketHeatmap("NIFTY_50");
    return sendSuccess(res, { count: heatmap.sectors.length, sectors: heatmap.sectors }, "Sector-wise heatmap retrieved successfully", "YAHOO_FINANCE");
  } catch (err) {
    return sendError(res, err);
  }
}

export async function getMarketBreadthHandler(req, res) {
  try {
    const breadth = await getMarketBreadth();
    return sendSuccess(res, breadth, "Market breadth statistics retrieved successfully", "YAHOO_FINANCE");
  } catch (err) {
    return sendError(res, err);
  }
}

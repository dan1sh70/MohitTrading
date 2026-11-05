import { Router } from "express";
import { requireAuth, requireAdmin } from "../../middleware/auth.js";
import { requirePremium } from "../../middleware/premium.js";
import {
  // Module 1: Option Chain
  getOptionChainSymbolsHandler,
  getOptionChainHandler,
  getOptionExpiriesHandler,
  getOptionContractsHandler,
  getOptionAnalyticsHandler,
  getOptionHistoryHandler,

  // Module 2: Top Gainers / Losers
  getTopGainersHandler,
  getTopLosersHandler,
  getGainersFiltersHandler,
  getLosersFiltersHandler,
  getMarketMoversHandler,

  // Module 3: FII / DII
  getFiiDiiOverviewHandler,
  getFiiDiiDailyHandler,
  getFiiDiiMonthlyHandler,
  getFiiDiiHistoryHandler,
  getFiiDiiAnalyticsHandler,

  // Module 4: Global Indices
  getAllGlobalIndicesHandler,
  getIndiaIndicesHandler,
  getInternationalIndicesHandler,
  getSingleIndexHandler,
  getIndexHistoryHandler,

  // Module 5: Market Heatmap
  getHeatmapOverviewHandler,
  getNifty50HeatmapHandler,
  getNifty100HeatmapHandler,
  getNifty500HeatmapHandler,
  getBankNiftyHeatmapHandler,
  getSectorHeatmapHandler,
  getMarketBreadthHandler
} from "./discover.controller.js";

export const discoverRouter = Router();

// Public previews / filter metadata (Allowed for all users to browse available capabilities)
discoverRouter.get("/option-chain/symbols", getOptionChainSymbolsHandler);
discoverRouter.get("/gainers/filters", getGainersFiltersHandler);
discoverRouter.get("/losers/filters", getLosersFiltersHandler);

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 1: OPTION CHAIN ROUTES (PRO ZONE PROTECTED)
// ═════════════════════════════════════════════════════════════════════════════
discoverRouter.get("/option-chain/:symbol/expiries", requireAuth, requirePremium("option_chain"), getOptionExpiriesHandler);
discoverRouter.get("/option-chain/:symbol/contracts", requireAuth, requirePremium("option_chain"), getOptionContractsHandler);
discoverRouter.get("/option-chain/:symbol/analytics", requireAuth, requirePremium("option_chain"), getOptionAnalyticsHandler);
discoverRouter.get("/option-chain/:symbol/history", requireAuth, requirePremium("option_chain"), getOptionHistoryHandler);
discoverRouter.get("/option-chain/:symbol", requireAuth, requirePremium("option_chain"), getOptionChainHandler);

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 2: TOP GAINERS / LOSERS ROUTES (PRO ZONE PROTECTED)
// ═════════════════════════════════════════════════════════════════════════════
discoverRouter.get("/gainers", requireAuth, requirePremium("gainers_losers"), getTopGainersHandler);
discoverRouter.get("/losers", requireAuth, requirePremium("gainers_losers"), getTopLosersHandler);
discoverRouter.get("/market-movers", requireAuth, requirePremium("gainers_losers"), getMarketMoversHandler);

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 3: FII / DII DATA ROUTES (PRO ZONE PROTECTED)
// ═════════════════════════════════════════════════════════════════════════════
discoverRouter.get("/fii-dii/daily", requireAuth, requirePremium("fii_dii"), getFiiDiiDailyHandler);
discoverRouter.get("/fii-dii/monthly", requireAuth, requirePremium("fii_dii"), getFiiDiiMonthlyHandler);
discoverRouter.get("/fii-dii/history", requireAuth, requirePremium("fii_dii"), getFiiDiiHistoryHandler);
discoverRouter.get("/fii-dii/analytics", requireAuth, requirePremium("fii_dii"), getFiiDiiAnalyticsHandler);
discoverRouter.get("/fii-dii", requireAuth, requirePremium("fii_dii"), getFiiDiiOverviewHandler);

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 4: GLOBAL INDICES ROUTES (PRO ZONE PROTECTED)
// ═════════════════════════════════════════════════════════════════════════════
discoverRouter.get("/global-indices/india", requireAuth, requirePremium("global_indices"), getIndiaIndicesHandler);
discoverRouter.get("/global-indices/international", requireAuth, requirePremium("global_indices"), getInternationalIndicesHandler);
discoverRouter.get("/global-indices/history/:symbol", requireAuth, requirePremium("global_indices"), getIndexHistoryHandler);
discoverRouter.get("/global-indices/:symbol/history", requireAuth, requirePremium("global_indices"), getIndexHistoryHandler);
discoverRouter.get("/global-indices/:symbol", requireAuth, requirePremium("global_indices"), getSingleIndexHandler);
discoverRouter.get("/global-indices", requireAuth, requirePremium("global_indices"), getAllGlobalIndicesHandler);

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 5: MARKET HEATMAP ROUTES (PRO ZONE PROTECTED)
// ═════════════════════════════════════════════════════════════════════════════
discoverRouter.get("/heatmap/nifty-50", requireAuth, requirePremium("market_heatmap"), getNifty50HeatmapHandler);
discoverRouter.get("/heatmap/nifty-100", requireAuth, requirePremium("market_heatmap"), getNifty100HeatmapHandler);
discoverRouter.get("/heatmap/nifty-500", requireAuth, requirePremium("market_heatmap"), getNifty500HeatmapHandler);
discoverRouter.get("/heatmap/bank-nifty", requireAuth, requirePremium("market_heatmap"), getBankNiftyHeatmapHandler);
discoverRouter.get("/heatmap/sectors", requireAuth, requirePremium("market_heatmap"), getSectorHeatmapHandler);
discoverRouter.get("/heatmap/market-breadth", requireAuth, requirePremium("market_heatmap"), getMarketBreadthHandler);
discoverRouter.get("/heatmap", requireAuth, requirePremium("market_heatmap"), getHeatmapOverviewHandler);

export default discoverRouter;

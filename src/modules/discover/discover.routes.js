import { Router } from "express";
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

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 1: OPTION CHAIN ROUTES
// ═════════════════════════════════════════════════════════════════════════════
discoverRouter.get("/option-chain/symbols", getOptionChainSymbolsHandler);
discoverRouter.get("/option-chain/:symbol/expiries", getOptionExpiriesHandler);
discoverRouter.get("/option-chain/:symbol/contracts", getOptionContractsHandler);
discoverRouter.get("/option-chain/:symbol/analytics", getOptionAnalyticsHandler);
discoverRouter.get("/option-chain/:symbol/history", getOptionHistoryHandler);
discoverRouter.get("/option-chain/:symbol", getOptionChainHandler);

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 2: TOP GAINERS / LOSERS ROUTES
// ═════════════════════════════════════════════════════════════════════════════
discoverRouter.get("/gainers/filters", getGainersFiltersHandler);
discoverRouter.get("/losers/filters", getLosersFiltersHandler);
discoverRouter.get("/gainers", getTopGainersHandler);
discoverRouter.get("/losers", getTopLosersHandler);
discoverRouter.get("/market-movers", getMarketMoversHandler);

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 3: FII / DII DATA ROUTES
// ═════════════════════════════════════════════════════════════════════════════
discoverRouter.get("/fii-dii/daily", getFiiDiiDailyHandler);
discoverRouter.get("/fii-dii/monthly", getFiiDiiMonthlyHandler);
discoverRouter.get("/fii-dii/history", getFiiDiiHistoryHandler);
discoverRouter.get("/fii-dii/analytics", getFiiDiiAnalyticsHandler);
discoverRouter.get("/fii-dii", getFiiDiiOverviewHandler);

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 4: GLOBAL INDICES ROUTES
// ═════════════════════════════════════════════════════════════════════════════
discoverRouter.get("/global-indices/india", getIndiaIndicesHandler);
discoverRouter.get("/global-indices/international", getInternationalIndicesHandler);
discoverRouter.get("/global-indices/history/:symbol", getIndexHistoryHandler);
discoverRouter.get("/global-indices/:symbol/history", getIndexHistoryHandler);
discoverRouter.get("/global-indices/:symbol", getSingleIndexHandler);
discoverRouter.get("/global-indices", getAllGlobalIndicesHandler);

// ═════════════════════════════════════════════════════════════════════════════
// MODULE 5: MARKET HEATMAP ROUTES
// ═════════════════════════════════════════════════════════════════════════════
discoverRouter.get("/heatmap/nifty-50", getNifty50HeatmapHandler);
discoverRouter.get("/heatmap/nifty-100", getNifty100HeatmapHandler);
discoverRouter.get("/heatmap/nifty-500", getNifty500HeatmapHandler);
discoverRouter.get("/heatmap/bank-nifty", getBankNiftyHeatmapHandler);
discoverRouter.get("/heatmap/sectors", getSectorHeatmapHandler);
discoverRouter.get("/heatmap/market-breadth", getMarketBreadthHandler);
discoverRouter.get("/heatmap", getHeatmapOverviewHandler);

export default discoverRouter;

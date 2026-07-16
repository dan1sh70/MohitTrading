import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validateBody } from "../middleware/validate.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { 
  loginSchema, 
  registerSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} from "../modules/auth/auth.schema.js";
import { 
  login, 
  register, 
  forgotPassword, 
  resetPassword, 
  verifyResetToken,
  logout
} from "../modules/auth/auth.controller.js";
import { upstoxLogin, upstoxCallback, upstoxConnected } from "../modules/auth/upstox.controller.js";
import {
  createUser,
  getPositions,
  getStats,
  listAuditLogs,
  listUsers
} from "../modules/admin/admin.controller.js";
import { createUserSchema } from "../modules/admin/admin.schema.js";
import {
  getMarketHours,
  getMarketHoursByType,
  updateMarketHours,
  checkMarketStatus,
  getMarketHoursHistory
} from "../modules/admin/market-hours.controller.js";
import {
  getMarketHolidays,
  getMarketHolidayById,
  createMarketHoliday,
  updateMarketHoliday,
  deleteMarketHoliday,
  checkTodayHoliday,
  bulkCreateHolidays
} from "../modules/admin/market-holidays.controller.js";
import {
  createTradeSchema,
  closeTradeSchema
} from "../modules/trades/trades.schema.js";
import {
  closeTrade,
  createTrade,
  listTrades,
  resetAccount
} from "../modules/trades/trades.controller.js";
import {
  getAllPrices,
  getPrice,
  getStats as getCryptoStats,
  buyCrypto,
  sellCrypto,
  getPortfolio,
  getClosedPositions,
  getUserTrades,
  getHistoricalPrices,
  getChartData,
  getTechnicals,
  getTop3,
  getTop10,
  getTrending,
  getTop10Ranked,
  getAllStats,
  getCryptoLotSize,
  getAllCryptoLotSizes,
  validateCryptoLotSize,
  getCryptoLotSizeStats
} from "../modules/crypto/crypto.controller.js";
import {
  streamPrices,
  streamSinglePrice
} from "../modules/crypto/crypto-stream.controller.js";
import {
  buyTradeSchema,
  sellTradeSchema
} from "../modules/crypto/crypto.schema.js";
import cryptoOrdersRouter from "../modules/crypto/crypto-orders.routes.js";
import {
  getUSStockPrice,
  getStocks,
  getStockDailyData,
  getStockSMAIndicator,
  getStockRSIIndicator,
  getExchangeRate,
  getForexChartHandler,
  getForexPairs,
  getTestedForex,
  getUpcomingForex,
  getCommodities
} from "../modules/stocks/stock.controller.js";
import {
  getIndianStock,
  getTopIndian,
  getIndianStocks,
  getIndianStocksBatch,
  getIndianStockIntradayData,
  getIndianStockDailyData,
  getLotSizeForSymbol,
  getAllLotSizes,
  validateLotSize,
  getLotSizeStats as getLotStats,
  getEquityInstruments,
  getFuturesInstruments,
  getOptionsInstruments
} from "../modules/stocks/indian.controller.js";
import { fetchUpstoxInstruments } from "../services/upstox.service.js";
import { getUpstoxTokenStatus } from "../services/upstox-token-manager.js";
import { getLiveQuote, getOHLC, getOptionChain as getUpstoxOptionChain } from "../services/upstox-market-engine.js";
import { getHealthStatus, updateHealthStatus } from "../services/health-monitor.service.js";
import {
  buyIndianStock,
  sellIndianStock,
  getIndianStockPositions,
  getPositionDetails,
  exitPosition,
  getPerformanceMetrics,
  updateIndianStock,
  getIndianStockOrders,
  processPendingIndianOrders,
  getIndianStockPortfolio
} from "../modules/stocks/indian-trade.controller.js";
import {
  buyIndianStockSchema,
  sellIndianStockSchema,
  exitPositionSchema
} from "../modules/stocks/indian-trade.schema.js";
import {
  buyUsStock, sellUsStock, getUsPerformanceMetrics
} from "../modules/stocks/us-trade.controller.js";
import {
  buyForex, sellForex, getForexPerformanceMetrics
} from "../modules/forex/forex-trade.controller.js";
import {
  buyCommodity, sellCommodity, getCommodityPerformanceMetrics
} from "../modules/commodities/commodity-trade.controller.js";
import {
  getLatestNewsHandler,
  searchNewsHandler,
  getNewsBySymbolsHandler,
  getTrendingNewsHandler,
  getNewsByDateRangeHandler,
  getCryptoNewsHandler,
  getStockNewsHandler,
  getAdvancedNewsHandler
} from "../modules/news/news.controller.js";
import { tvSearch, tvResolve, tvHistory } from "../modules/tradingview/tradingview.controller.js";
import { getOptionChain, getOptionAnalytics } from "../modules/options/options.controller.js";
import { aggregateAndCache } from "../services/candle-aggregator.service.js";

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  message: { message: "Too many login attempts. Try again shortly." }
});

// Rate limiter for crypto trading (5 requests per minute)
const cryptoTradingLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  message: { message: "Too many trading requests. Try again shortly." }
});

// Rate limiter for crypto price queries (500 requests per minute for dev)
const cryptoPriceLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 500,
  message: { message: "Too many price requests. Try again shortly." }
});

// Rate limiter for news queries (40 requests per minute)
const newsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  message: { message: "Too many news requests. Try again shortly." }
});

export const apiRouter = Router();

// DEBUG: Log all incoming requests
apiRouter.use((req, res, next) => {
  console.log(`[DEBUG] ${req.method} ${req.path} - User: ${req.user?.id || 'none'}, Role: ${req.user?.role || 'none'}`);
  next();
});

apiRouter.get("/health", async (_req, res) => {
  try {
    const health = await updateHealthStatus();
    res.json({ status: "ok", service: "paper-trading-backend", health });
  } catch (error) {
    console.error('[Health] Error updating health status:', error.message);
    const cached = await getHealthStatus();
    res.json({ status: "ok", service: "paper-trading-backend", health: cached });
  }
});

apiRouter.post("/auth/login", loginLimiter, validateBody(loginSchema), login);
apiRouter.post("/auth/register", loginLimiter, validateBody(registerSchema), register);
apiRouter.post("/auth/logout", requireAuth, logout);
apiRouter.post("/auth/forgot-password", loginLimiter, validateBody(forgotPasswordSchema), forgotPassword);
apiRouter.post("/auth/reset-password", loginLimiter, validateBody(resetPasswordSchema), resetPassword);
apiRouter.get("/auth/verify-reset-token/:token", verifyResetToken);

// Upstox OAuth routes
apiRouter.get("/auth/upstox/login", upstoxLogin);
apiRouter.get("/auth/upstox/callback", upstoxCallback);
apiRouter.get("/auth/upstox/connected", upstoxConnected);

// Upstox market data routes
apiRouter.get("/upstox/quote/:symbol", async (req, res) => {
  try {
    const symbol = (req.params.symbol || "").toUpperCase();
    if (!symbol) return res.status(400).json({ success: false, message: "Symbol is required" });
    const quote = await getLiveQuote(symbol, req.user?.id || "default");
    res.json({ success: true, data: quote });
  } catch (err) {
    console.error('[Upstox] /upstox/quote error:', err.message);
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

apiRouter.get("/upstox/ohlc/:symbol", async (req, res) => {
  try {
    const symbol = (req.params.symbol || "").toUpperCase();
    const interval = req.query.interval || "1m";
    if (!symbol) return res.status(400).json({ success: false, message: "Symbol is required" });
    const ohlc = await getOHLC(symbol, interval, req.user?.id || "default");
    res.json({ success: true, data: ohlc });
  } catch (err) {
    console.error('[Upstox] /upstox/ohlc error:', err.message);
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

apiRouter.get("/upstox/options/:symbol", async (req, res) => {
  try {
    const symbol = (req.params.symbol || "").toUpperCase();
    if (!symbol) return res.status(400).json({ success: false, message: "Symbol is required" });
    const chain = await getUpstoxOptionChain(symbol, req.user?.id || "default");
    res.json({ success: true, data: chain });
  } catch (err) {
    console.error('[Upstox] /upstox/options error:', err.message);
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
});

// Debug: expose raw Upstox instruments (requires valid OAuth token cached)
apiRouter.get("/debug/upstox/instruments", async (_req, res) => {
  try {
    const instruments = await fetchUpstoxInstruments("NSE_EQ");
    res.json({ success: true, count: instruments.length, data: instruments.slice(0, 200) });
  } catch (err) {
    console.error('[Debug] Failed to fetch Upstox instruments:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch instruments', error: err.message });
  }
});

// Crypto price endpoints (public, rate limited)
apiRouter.get("/crypto/prices", cryptoPriceLimiter, getAllPrices);
apiRouter.get("/crypto/prices/:symbol", cryptoPriceLimiter, getPrice);
apiRouter.get("/crypto/stats/:symbol", cryptoPriceLimiter, getCryptoStats);

// Crypto lot size endpoints (public, rate limited) - Binance LOT_SIZE filters
apiRouter.get("/crypto/lot-size/:symbol", cryptoPriceLimiter, getCryptoLotSize);
apiRouter.get("/crypto/lot-sizes/all", cryptoPriceLimiter, getAllCryptoLotSizes);
apiRouter.get("/crypto/lot-sizes/validate", cryptoPriceLimiter, validateCryptoLotSize);
apiRouter.get("/crypto/lot-sizes/stats", cryptoPriceLimiter, getCryptoLotSizeStats);

// Crypto streaming endpoints (real-time updates)
apiRouter.get("/crypto/stream/prices", streamPrices);
apiRouter.get("/crypto/stream/prices/:symbol", streamSinglePrice);

// Crypto market data endpoints (public, rate limited)
apiRouter.get("/crypto/:symbol/historical", cryptoPriceLimiter, getHistoricalPrices);
apiRouter.get("/crypto/:symbol/chart", cryptoPriceLimiter, getChartData);
apiRouter.get("/crypto/:symbol/indicators", cryptoPriceLimiter, getTechnicals);
apiRouter.get("/crypto/top-3/famous", cryptoPriceLimiter, getTop3);
apiRouter.get("/crypto/trending/top-10", cryptoPriceLimiter, getTop10);
apiRouter.get("/crypto/trending/all", cryptoPriceLimiter, getTrending);
apiRouter.get("/crypto/top-10/ranked", cryptoPriceLimiter, getTop10Ranked);
apiRouter.get("/crypto/all/stats", cryptoPriceLimiter, getAllStats);

// Crypto trading endpoints (authenticated, rate limited)
apiRouter.post("/crypto/buy", requireAuth, cryptoTradingLimiter, validateBody(buyTradeSchema), buyCrypto);
apiRouter.post("/crypto/sell", requireAuth, cryptoTradingLimiter, validateBody(sellTradeSchema), sellCrypto);
apiRouter.get("/crypto/portfolio", requireAuth, getPortfolio);
apiRouter.get("/crypto/closed-positions", requireAuth, getClosedPositions);
apiRouter.get("/crypto/trades", requireAuth, getUserTrades);

// Crypto Orders API (new trading system with matching engine)
apiRouter.use("/crypto", cryptoOrdersRouter);

// Reset account endpoint - clears all trades, positions, performance data and resets balance
apiRouter.post("/auth/reset-account", requireAuth, resetAccount);

// ========== STOCKS & FOREX ENDPOINTS ==========

// US Stocks (Alpha Vantage) - No rate limiter for development
apiRouter.get("/stocks/us", getStocks);
apiRouter.get("/stocks/us/:symbol", getUSStockPrice);
apiRouter.get("/stocks/us/:symbol/daily", getStockDailyData);
apiRouter.get("/stocks/us/:symbol/sma", getStockSMAIndicator);
apiRouter.get("/stocks/us/:symbol/rsi", getStockRSIIndicator);

// Forex (Alpha Vantage) - No rate limiter for development
apiRouter.get("/forex/pairs", getForexPairs);
apiRouter.get("/forex/pairs/tested", getTestedForex);
apiRouter.get("/forex/pairs/upcoming", getUpcomingForex);
apiRouter.get("/forex/rate/:from/:to", getExchangeRate);
apiRouter.get("/forex/chart/:from/:to", getForexChartHandler);

// ========== INDIAN STOCKS DATA ENDPOINTS (PUBLIC) ==========
// NOTE: Specific routes must come BEFORE parameterized routes
apiRouter.get("/stocks/in", getIndianStocks);
apiRouter.get("/stocks/in/top", getTopIndian);
apiRouter.get("/stocks/in/batch", getIndianStocksBatch);

// ========== INDIAN STOCKS LOT SIZE ENDPOINTS (PUBLIC) ==========
// Free API for lot size management - No authentication required
apiRouter.get("/stocks/in/lot-size/:symbol", getLotSizeForSymbol);
apiRouter.get("/stocks/in/lot-sizes/all", getAllLotSizes);
apiRouter.get("/stocks/in/lot-sizes/stats", getLotStats);
apiRouter.get("/stocks/in/lot-sizes/validate", validateLotSize);
apiRouter.get("/stocks/in/instruments/equity", getEquityInstruments);
apiRouter.get("/stocks/in/instruments/futures", getFuturesInstruments);
apiRouter.get("/stocks/in/instruments/options", getOptionsInstruments);

// ========== INDIAN STOCK TRADING ENDPOINTS (AUTHENTICATED) ==========
// 
// WORKFLOW:
// 1. User selects stock from Markets tab
// 2. Clicks Buy/Sell → IndianStockTradeScreen
// 3. Submits order → POST /stocks/in/trade/buy or /sell
// 4. OrderPlaced confirmation screen
// 5. Navigate to Trading Lab → Positions tab
// 6. View positions via GET /stocks/in/positions
// 7. Exit position via POST /stocks/in/positions/:id/exit
// 8. View performance via GET /stocks/in/performance
// 
// FEATURES:
// - Real-time balance management
// - P&L calculation (Long and Short positions)
// - Performance metrics with 6 scoring systems
// - Automatic grade calculation (A/B/C/D)
// - Audit logging for all trades

apiRouter.post("/stocks/in/trade/buy", requireAuth, validateBody(buyIndianStockSchema), buyIndianStock);
apiRouter.post("/stocks/in/trade/sell", requireAuth, validateBody(sellIndianStockSchema), sellIndianStock);
apiRouter.get("/stocks/in/trade/orders", requireAuth, getIndianStockOrders);
apiRouter.post("/stocks/in/trade/orders/process", requireAuth, processPendingIndianOrders);
apiRouter.put("/stocks/in/trade/update", requireAuth, updateIndianStock);
apiRouter.get("/stocks/in/positions", requireAuth, getIndianStockPositions);
apiRouter.get("/stocks/in/positions/:positionId", requireAuth, getPositionDetails);
apiRouter.post("/stocks/in/positions/:positionId/exit", requireAuth, validateBody(exitPositionSchema), exitPosition);
apiRouter.get("/stocks/in/performance", requireAuth, getPerformanceMetrics);
apiRouter.get("/stocks/in/portfolio", requireAuth, getIndianStockPortfolio);

// Parameterized Indian stock data routes (must come AFTER specific routes)
apiRouter.get("/stocks/in/:symbol/intraday", getIndianStockIntradayData);
apiRouter.get("/stocks/in/:symbol/daily", getIndianStockDailyData);
apiRouter.get("/stocks/in/:symbol", getIndianStock);

// Commodities - No rate limiter for development
apiRouter.get("/commodities", getCommodities);

// ========== NEW: US STOCKS TRADING ENDPOINTS ==========
apiRouter.post("/stocks/us/trade/buy", requireAuth, validateBody(buyIndianStockSchema), buyUsStock);
apiRouter.post("/stocks/us/trade/sell", requireAuth, validateBody(sellIndianStockSchema), sellUsStock);
apiRouter.get("/stocks/us/performance", requireAuth, getUsPerformanceMetrics);

// ========== NEW: FOREX TRADING ENDPOINTS ==========
apiRouter.post("/forex/trade/buy", requireAuth, validateBody(buyIndianStockSchema), buyForex);
apiRouter.post("/forex/trade/sell", requireAuth, validateBody(sellIndianStockSchema), sellForex);
apiRouter.get("/forex/performance", requireAuth, getForexPerformanceMetrics);

// ========== NEW: COMMODITIES TRADING ENDPOINTS ==========
apiRouter.post("/commodities/trade/buy", requireAuth, validateBody(buyIndianStockSchema), buyCommodity);
apiRouter.post("/commodities/trade/sell", requireAuth, validateBody(sellIndianStockSchema), sellCommodity);
apiRouter.get("/commodities/performance", requireAuth, getCommodityPerformanceMetrics);

// ========== NEWS ENDPOINTS (MarketAux) ==========

// Financial news endpoints (public, rate limited)
apiRouter.get("/news/latest", newsLimiter, getLatestNewsHandler);
apiRouter.get("/news/search", newsLimiter, searchNewsHandler);
apiRouter.get("/news/symbols", newsLimiter, getNewsBySymbolsHandler);
apiRouter.get("/news/trending", newsLimiter, getTrendingNewsHandler);
apiRouter.get("/news/date-range", newsLimiter, getNewsByDateRangeHandler);
apiRouter.get("/news/crypto", newsLimiter, getCryptoNewsHandler);
apiRouter.get("/news/stocks", newsLimiter, getStockNewsHandler);
apiRouter.get("/news/advanced", newsLimiter, getAdvancedNewsHandler);

// Image proxy endpoint to bypass CORS
apiRouter.options("/proxy-image", (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).send();
});

apiRouter.get("/proxy-image", async (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).json({ error: "URL parameter required" });
  }
  
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return res.status(502).json({ error: "Failed to fetch image" });
    }
    
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Type', contentType);
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('[Image Proxy] Error:', error.message);
    res.status(500).json({ error: "Failed to proxy image" });
  }
});

// Admin endpoints (each requires auth + admin)
apiRouter.get("/admin/stats", requireAuth, requireAdmin, getStats);
apiRouter.get("/admin/audit-logs", requireAuth, requireAdmin, listAuditLogs);
apiRouter.get("/admin/users", requireAuth, requireAdmin, listUsers);
apiRouter.post("/admin/users", requireAuth, requireAdmin, validateBody(createUserSchema), createUser);
apiRouter.get("/admin/positions", requireAuth, requireAdmin, getPositions);
apiRouter.get("/admin/trades", requireAuth, requireAdmin, listTrades);
apiRouter.post("/admin/trades", requireAuth, requireAdmin, validateBody(createTradeSchema), createTrade);
apiRouter.patch("/admin/trades/:id/close", requireAuth, requireAdmin, validateBody(closeTradeSchema), closeTrade);

// Market Hours Management (Admin)
apiRouter.get("/admin/market-hours", requireAuth, requireAdmin, getMarketHours);
apiRouter.get("/admin/market-hours/:marketType", requireAuth, requireAdmin, getMarketHoursByType);
apiRouter.put("/admin/market-hours/:id", requireAuth, requireAdmin, updateMarketHours);
apiRouter.get("/admin/market-hours/:id/history", requireAuth, requireAdmin, getMarketHoursHistory);

// Market Holidays Management (Admin)
apiRouter.get("/admin/market-holidays", requireAuth, requireAdmin, getMarketHolidays);
apiRouter.get("/admin/market-holidays/:id", requireAuth, requireAdmin, getMarketHolidayById);
apiRouter.post("/admin/market-holidays", requireAuth, requireAdmin, createMarketHoliday);
apiRouter.put("/admin/market-holidays/:id", requireAuth, requireAdmin, updateMarketHoliday);
apiRouter.delete("/admin/market-holidays/:id", requireAuth, requireAdmin, deleteMarketHoliday);
apiRouter.post("/admin/market-holidays/bulk-create", requireAuth, requireAdmin, bulkCreateHolidays);

// Market Status & Holidays (Public)
apiRouter.get("/market-hours/status/:marketType", checkMarketStatus);
apiRouter.get("/market-holidays/check/:marketType", checkTodayHoliday);
apiRouter.get("/market-holidays/:marketType", getMarketHolidays);

// TradingView-compatible endpoints
apiRouter.get("/tv/search", tvSearch);
apiRouter.get("/tv/resolve", tvResolve);
apiRouter.get("/tv/history", tvHistory);

// Options chain endpoints
apiRouter.get("/options/chain", getOptionChain);
apiRouter.get("/options/analytics", getOptionAnalytics);

// Candle aggregation endpoint (POST expected with base candles)
apiRouter.post("/candles/aggregate", async (req, res) => {
  try {
    const { symbol, fromResolution, toResolution, fromTs, toTs, candles } = req.body;
    if (!symbol || !fromResolution || !toResolution || !candles) return res.status(400).json({ error: 'missing_params' });
    const agg = await aggregateAndCache(symbol, fromResolution, toResolution, fromTs, toTs, candles);
    res.json({ success: true, data: agg });
  } catch (err) {
    console.error('[API] /candles/aggregate error', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: Upstox token status (shows whether refresh token exists, expiry, next scheduled refresh)
apiRouter.get("/admin/upstox/token-status", requireAuth, requireAdmin, async (req, res) => {
  try {
    const userId = req.user?.id || "default";
    const status = await getUpstoxTokenStatus(userId);
    res.json({ success: true, data: status });
  } catch (err) {
    console.error('[Admin] Failed to get Upstox token status:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

apiRouter.get("/upstox/token-status", async (req, res) => {
  try {
    const userId = req.user?.id || "default";
    const status = await getUpstoxTokenStatus(userId);
    res.json({ success: true, data: status });
  } catch (err) {
    console.error('[Upstox] Failed to get token status:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

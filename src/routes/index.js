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
  verifyResetToken 
} from "../modules/auth/auth.controller.js";
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
  getAllStats
} from "../modules/crypto/crypto.controller.js";
import {
  streamPrices,
  streamSinglePrice
} from "../modules/crypto/crypto-stream.controller.js";
import {
  buyTradeSchema,
  sellTradeSchema
} from "../modules/crypto/crypto.schema.js";
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
  getLotSizeStats as getLotStats
} from "../modules/stocks/indian.controller.js";
import {
  buyIndianStock,
  sellIndianStock,
  getIndianStockPositions,
  getPositionDetails,
  exitPosition,
  getPerformanceMetrics,
  updateIndianStock
} from "../modules/stocks/indian-trade.controller.js";
import {
  buyIndianStockSchema,
  sellIndianStockSchema,
  exitPositionSchema
} from "../modules/stocks/indian-trade.schema.js";
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

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "paper-trading-backend" });
});

apiRouter.post("/auth/login", loginLimiter, validateBody(loginSchema), login);
apiRouter.post("/auth/register", loginLimiter, validateBody(registerSchema), register);
apiRouter.post("/auth/forgot-password", loginLimiter, validateBody(forgotPasswordSchema), forgotPassword);
apiRouter.post("/auth/reset-password", loginLimiter, validateBody(resetPasswordSchema), resetPassword);
apiRouter.get("/auth/verify-reset-token/:token", verifyResetToken);

// Crypto price endpoints (public, rate limited)
apiRouter.get("/crypto/prices", cryptoPriceLimiter, getAllPrices);
apiRouter.get("/crypto/prices/:symbol", cryptoPriceLimiter, getPrice);
apiRouter.get("/crypto/stats/:symbol", cryptoPriceLimiter, getCryptoStats);

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
apiRouter.put("/stocks/in/trade/update", requireAuth, updateIndianStock);
apiRouter.get("/stocks/in/positions", requireAuth, getIndianStockPositions);
apiRouter.get("/stocks/in/positions/:positionId", requireAuth, getPositionDetails);
apiRouter.post("/stocks/in/positions/:positionId/exit", requireAuth, validateBody(exitPositionSchema), exitPosition);
apiRouter.get("/stocks/in/performance", requireAuth, getPerformanceMetrics);

// Parameterized Indian stock data routes (must come AFTER specific routes)
apiRouter.get("/stocks/in/:symbol/intraday", getIndianStockIntradayData);
apiRouter.get("/stocks/in/:symbol/daily", getIndianStockDailyData);
apiRouter.get("/stocks/in/:symbol", getIndianStock);

// Commodities - No rate limiter for development
apiRouter.get("/commodities", getCommodities);

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

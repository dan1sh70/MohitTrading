import { Router } from "express";
import rateLimit from "express-rate-limit";
import { validateBody } from "../middleware/validate.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { loginSchema, registerSchema } from "../modules/auth/auth.schema.js";
import { login, register } from "../modules/auth/auth.controller.js";
import {
  createUser,
  getPositions,
  getStats,
  listAuditLogs,
  listUsers
} from "../modules/admin/admin.controller.js";
import { createUserSchema } from "../modules/admin/admin.schema.js";
import {
  createTradeSchema,
  closeTradeSchema
} from "../modules/trades/trades.schema.js";
import {
  closeTrade,
  createTrade,
  listTrades
} from "../modules/trades/trades.controller.js";
import {
  getAllPrices,
  getPrice,
  getStats as getCryptoStats,
  buyCrypto,
  sellCrypto,
  getPortfolio,
  getUserTrades,
  getHistoricalPrices,
  getChartData,
  getTop3,
  getTop10,
  getTrending,
  getTechnicals,
  getTop10Ranked,
  getAllStats
} from "../modules/crypto/crypto.controller.js";
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
  getForexPairs,
  getTestedForex,
  getUpcomingForex
} from "../modules/stocks/stock.controller.js";
import {
  getIndianStock,
  getIndianStocks,
  getIndianStockIntradayData,
  getIndianStockDailyData,
  getTopIndian
} from "../modules/stocks/indian.controller.js";
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

// Rate limiter for crypto price queries (30 requests per minute)
const cryptoPriceLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  message: { message: "Too many price requests. Try again shortly." }
});

// Rate limiter for news queries (40 requests per minute)
const newsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  message: { message: "Too many news requests. Try again shortly." }
});

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "paper-trading-backend" });
});

apiRouter.post("/auth/login", loginLimiter, validateBody(loginSchema), login);
apiRouter.post("/auth/register", loginLimiter, validateBody(registerSchema), register);

// Crypto price endpoints (public, rate limited)
apiRouter.get("/crypto/prices", cryptoPriceLimiter, getAllPrices);
apiRouter.get("/crypto/prices/:symbol", cryptoPriceLimiter, getPrice);
apiRouter.get("/crypto/stats/:symbol", cryptoPriceLimiter, getCryptoStats);

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
apiRouter.get("/crypto/trades", requireAuth, getUserTrades);

// ========== STOCKS & FOREX ENDPOINTS ==========

// US Stocks (Alpha Vantage)
apiRouter.get("/stocks/us", cryptoPriceLimiter, getStocks);
apiRouter.get("/stocks/us/:symbol", cryptoPriceLimiter, getUSStockPrice);
apiRouter.get("/stocks/us/:symbol/daily", cryptoPriceLimiter, getStockDailyData);
apiRouter.get("/stocks/us/:symbol/sma", cryptoPriceLimiter, getStockSMAIndicator);
apiRouter.get("/stocks/us/:symbol/rsi", cryptoPriceLimiter, getStockRSIIndicator);

// Forex (Alpha Vantage)
apiRouter.get("/forex/pairs", cryptoPriceLimiter, getForexPairs);
apiRouter.get("/forex/pairs/tested", cryptoPriceLimiter, getTestedForex);
apiRouter.get("/forex/pairs/upcoming", cryptoPriceLimiter, getUpcomingForex);
apiRouter.get("/forex/rate/:from/:to", cryptoPriceLimiter, getExchangeRate);

// Indian Stocks (DhanHQ)
apiRouter.get("/stocks/in", cryptoPriceLimiter, getIndianStocks);
apiRouter.get("/stocks/in/top", cryptoPriceLimiter, getTopIndian);
apiRouter.get("/stocks/in/:symbol", cryptoPriceLimiter, getIndianStock);
apiRouter.get("/stocks/in/:symbol/intraday", cryptoPriceLimiter, getIndianStockIntradayData);
apiRouter.get("/stocks/in/:symbol/daily", cryptoPriceLimiter, getIndianStockDailyData);

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

// Admin endpoints (authenticated + admin required)
apiRouter.use(requireAuth, requireAdmin);

apiRouter.get("/admin/stats", getStats);
apiRouter.get("/admin/audit-logs", listAuditLogs);
apiRouter.get("/admin/users", listUsers);
apiRouter.post("/admin/users", validateBody(createUserSchema), createUser);
apiRouter.get("/admin/positions", getPositions);
apiRouter.get("/admin/trades", listTrades);
apiRouter.post("/admin/trades", validateBody(createTradeSchema), createTrade);
apiRouter.patch("/admin/trades/:id/close", validateBody(closeTradeSchema), closeTrade);

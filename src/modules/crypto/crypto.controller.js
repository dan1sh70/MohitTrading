import { sql } from "../../db/mysql.js";
import { cacheDel, cacheGet } from "../../db/redis.js";
import { writeAuditLog } from "../../utils/audit-log.js";
import {
  getCryptoPrice,
  getCryptoStats,
  getAllCryptoPrices
} from "./crypto.service.js";
import {
  getCandleData,
  getHistoricalData,
  getTop3Famous,
  getTop10Trending,
  getTrendingCryptos,
  getTechnicalIndicators
} from "./crypto-advanced.service.js";

/**
 * GET /api/crypto/prices
 * Get all supported crypto prices with 24h stats
 */
export async function getAllPrices(req, res) {
  try {
    const prices = await getAllCryptoPrices();
    return res.json({
      data: prices,
      count: prices.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Get all prices error:", error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/crypto/prices/:symbol
 * Get current price for a specific crypto
 */
export async function getPrice(req, res) {
  const symbol = String(req.params.symbol).toUpperCase();

  if (!symbol || symbol.trim().length === 0) {
    return res.status(400).json({
      message: `Symbol is required`
    });
  }

  try {
    const price = await getCryptoPrice(symbol);
    return res.json(price);
  } catch (error) {
    console.error(`Get price error for ${symbol}:`, error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/crypto/stats/:symbol
 * Get 24h stats for a specific crypto
 */
export async function getStats(req, res) {
  const symbol = String(req.params.symbol).toUpperCase();

  if (!symbol || symbol.trim().length === 0) {
    return res.status(400).json({
      message: `Symbol is required`
    });
  }

  try {
    const stats = await getCryptoStats(symbol);
    return res.json(stats);
  } catch (error) {
    console.error(`Get stats error for ${symbol}:`, error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * POST /api/crypto/buy
 * Buy cryptocurrency
 */
export async function buyCrypto(req, res) {
  const { symbol, quantity, price } = req.validatedBody;
  const userId = req.user.id;

  if (!symbol || symbol.trim().length === 0) {
    return res.status(400).json({
      message: `Symbol is required`
    });
  }

  try {
    // Validate sufficient balance
    const userResult = await sql(
      `SELECT balance FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const userBalance = parseFloat(userResult.rows[0].balance);
    const totalCost = quantity * price;

    if (userBalance < totalCost) {
      return res.status(400).json({
        message: `Insufficient balance. Required: ${totalCost}, Available: ${userBalance}`
      });
    }

    // Create buy transaction
    const tradeResult = await sql(
      `
        INSERT INTO trades (user_id, symbol, side, quantity, price)
        VALUES ($1, $2, 'BUY', $3, $4)
      `,
      [userId, symbol, quantity, price]
    );

    // Update user balance
    await sql(
      `UPDATE users SET balance = balance - $1 WHERE id = $2`,
      [totalCost, userId]
    );

    // Invalidate cache
    await cacheDel("admin:stats", "admin:positions", "crypto:prices:all");

    // Write audit log
    await writeAuditLog({
      actorUserId: userId,
      action: "BUY_CRYPTO",
      targetType: "trade",
      targetId: String(tradeResult.insertId),
      details: {
        symbol,
        quantity,
        price,
        totalCost
      }
    });

    const trade = await sql(
      `
        SELECT id, user_id, symbol, side, quantity, price, status, created_at
        FROM trades
        WHERE id = $1
      `,
      [tradeResult.insertId]
    );

    return res.status(201).json({
      message: "Buy order created successfully",
      trade: trade.rows[0]
    });
  } catch (error) {
    console.error("Buy crypto error:", error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * POST /api/crypto/sell
 * Sell cryptocurrency
 */
export async function sellCrypto(req, res) {
  const { symbol, quantity, price } = req.validatedBody;
  const userId = req.user.id;

  if (!symbol || symbol.trim().length === 0) {
    return res.status(400).json({
      message: `Symbol is required`
    });
  }

  try {
    // Check if user has open positions for this symbol
    const positionResult = await sql(
      `
        SELECT COALESCE(SUM(CASE 
          WHEN side = 'BUY' THEN quantity 
          WHEN side = 'SELL' THEN -quantity 
          END), 0) as net_position
        FROM trades
        WHERE user_id = $1 AND symbol = $2 AND status = 'OPEN'
      `,
      [userId, symbol]
    );

    const netPosition = positionResult.rows[0].net_position || 0;

    if (netPosition < quantity) {
      return res.status(400).json({
        message: `Insufficient position. Available: ${netPosition}, Requested: ${quantity}`
      });
    }

    // Create sell transaction
    const tradeResult = await sql(
      `
        INSERT INTO trades (user_id, symbol, side, quantity, price)
        VALUES ($1, $2, 'SELL', $3, $4)
      `,
      [userId, symbol, quantity, price]
    );

    // Update user balance (add the sell proceeds)
    const sellProceeds = quantity * price;
    await sql(
      `UPDATE users SET balance = balance + $1 WHERE id = $2`,
      [sellProceeds, userId]
    );

    // Invalidate cache
    await cacheDel("admin:stats", "admin:positions", "crypto:prices:all");

    // Write audit log
    await writeAuditLog({
      actorUserId: userId,
      action: "SELL_CRYPTO",
      targetType: "trade",
      targetId: String(tradeResult.insertId),
      details: {
        symbol,
        quantity,
        price,
        proceeds: sellProceeds
      }
    });

    const trade = await sql(
      `
        SELECT id, user_id, symbol, side, quantity, price, status, created_at
        FROM trades
        WHERE id = $1
      `,
      [tradeResult.insertId]
    );

    return res.status(201).json({
      message: "Sell order created successfully",
      trade: trade.rows[0]
    });
  } catch (error) {
    console.error("Sell crypto error:", error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/crypto/portfolio
 * Get user's crypto portfolio
 */
export async function getPortfolio(req, res) {
  const userId = req.user.id;

  try {
    // Get user balance
    const userResult = await sql(
      `SELECT balance FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const balance = parseFloat(userResult.rows[0].balance);

    // Get open positions
    const positionsResult = await sql(
      `
        SELECT 
          symbol,
          COALESCE(SUM(CASE 
            WHEN side = 'BUY' THEN quantity 
            WHEN side = 'SELL' THEN -quantity 
            END), 0) as quantity,
          COALESCE(AVG(price), 0) as avg_price
        FROM trades
        WHERE user_id = $1 AND status = 'OPEN'
        GROUP BY symbol
        HAVING quantity > 0
      `,
      [userId]
    );

    const positions = positionsResult.rows || [];

    // Fetch current prices for all positions
    const portfolio = await Promise.all(
      positions.map(async (position) => {
        try {
          const currentPriceData = await getCryptoPrice(position.symbol);
          const currentPrice = currentPriceData.price;
          const value = position.quantity * currentPrice;
          const pnl = (currentPrice - position.avg_price) * position.quantity;

          return {
            symbol: position.symbol,
            quantity: position.quantity,
            avgPrice: parseFloat(position.avg_price),
            currentPrice,
            value,
            pnl,
            pnlPercent: ((pnl / (position.avg_price * position.quantity)) * 100).toFixed(2)
          };
        } catch (error) {
          return {
            symbol: position.symbol,
            quantity: position.quantity,
            avgPrice: parseFloat(position.avg_price),
            error: "Unable to fetch current price"
          };
        }
      })
    );

    return res.json({
      balance,
      positions: portfolio,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Get portfolio error:", error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/crypto/trades
 * Get user's trades history
 */
export async function getUserTrades(req, res) {
  const userId = req.user.id;
  const page = Math.max(1, Number.parseInt(req.query.page ?? "1", 10) || 1);
  const limitRaw = Number.parseInt(req.query.limit ?? "20", 10) || 20;
  const limit = Math.min(100, Math.max(5, limitRaw));
  const offset = (page - 1) * limit;

  try {
    const countResult = await sql(
      `SELECT COUNT(*) as total FROM trades WHERE user_id = $1`,
      [userId]
    );

    const total = countResult.rows[0].total || 0;

    const tradesResult = await sql(
      `
        SELECT id, symbol, side, quantity, price, status, pnl, created_at, closed_at
        FROM trades
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset]
    );

    return res.json({
      data: tradesResult.rows || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (error) {
    console.error("Get user trades error:", error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/crypto/:symbol/historical
 * Get historical OHLCV data for a crypto
 */
export async function getHistoricalPrices(req, res) {
  const symbol = String(req.params.symbol).toUpperCase();
  const timeframe = String(req.query.timeframe || "1d").toLowerCase();
  const days = Math.min(Number.parseInt(req.query.days || "30", 10), 365);

  try {
    const data = await getHistoricalData(symbol, timeframe, days);
    return res.json(data);
  } catch (error) {
    console.error(`Get historical error for ${symbol}:`, error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/crypto/:symbol/chart
 * Get candlestick chart data for charting
 */
export async function getChartData(req, res) {
  const symbol = String(req.params.symbol).toUpperCase();
  const timeframe = String(req.query.timeframe || "1d").toLowerCase();
  const limit = Math.min(Number.parseInt(req.query.limit || "100", 10), 1000);

  try {
    const candles = await getCandleData(symbol, timeframe, limit);
    return res.json({
      symbol,
      timeframe,
      data: candles,
      count: candles.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error(`Get chart error for ${symbol}:`, error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/crypto/top-3/famous
 * Get top 3 famous cryptocurrencies
 */
export async function getTop3(req, res) {
  try {
    const data = await getTop3Famous();
    return res.json(data);
  } catch (error) {
    console.error("Get top 3 error:", error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/crypto/trending/top-10
 * Get top 10 trending cryptocurrencies
 */
export async function getTop10(req, res) {
  try {
    const data = await getTop10Trending();
    return res.json(data);
  } catch (error) {
    console.error("Get top 10 error:", error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/crypto/trending/all
 * Get all trending cryptocurrencies filtered by percent change
 */
export async function getTrending(req, res) {
  const minPercent = Number.parseFloat(req.query.minPercent || "0");

  try {
    const data = await getTrendingCryptos(minPercent);
    return res.json(data);
  } catch (error) {
    console.error("Get trending error:", error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/crypto/:symbol/indicators
 * Get technical indicators for a crypto
 */
export async function getTechnicals(req, res) {
  const symbol = String(req.params.symbol).toUpperCase();
  const timeframe = String(req.query.timeframe || "1d").toLowerCase();

  try {
    const indicators = await getTechnicalIndicators(symbol, timeframe);
    return res.json(indicators);
  } catch (error) {
    console.error(`Get indicators error for ${symbol}:`, error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/crypto/top-10/ranked
 * Get top 10 cryptocurrencies ranked by statistics (from Redis cache)
 * Automatically updated every 2 seconds by the polling service
 */
export async function getTop10Ranked(req, res) {
  try {
    // Try to fetch from cache first
    const cacheKey = "crypto:top10:ranked";
    const cached = await cacheGet(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // If not in cache, return empty response
    return res.json({
      data: [],
      count: 0,
      message: "Top 10 data not yet available",
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Get top 10 ranked error:", error);
    return res.status(500).json({ message: error.message });
  }
}

/**
 * GET /api/crypto/all/stats
 * Get all crypto statistics from cache
 * Automatically updated every 2 seconds by the polling service
 */
export async function getAllStats(req, res) {
  try {
    // Try to fetch from cache first
    const cacheKey = "crypto:stats:all";
    const cached = await cacheGet(cacheKey);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // If not in cache, return empty response
    return res.json({
      data: [],
      count: 0,
      message: "Stats not yet available",
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Get all stats error:", error);
    return res.status(500).json({ message: error.message });
  }
}

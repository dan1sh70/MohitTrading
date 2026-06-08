// ═════════════════════════════════════════════════════════════════════════════
// CRYPTO ORDER CONTROLLER
// ═════════════════════════════════════════════════════════════════════════════
// Handles all crypto trading API endpoints

import { sql } from "../../db/mysql.js";
import { z } from "zod";
import {
  placeOrder,
  closePosition,
  cancelOrder
} from "../../services/trade-execution.service.js";
import {
  getCryptoPrice,
  getCryptoStats
} from "./crypto.service.js";
import {
  updatePositionPnL,
  checkLiquidation,
  liquidatePosition
} from "../../services/pnl-liquidation.service.js";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * VALIDATION SCHEMAS
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const placeBuyOrderSchema = z.object({
  symbol: z.string().min(3).max(20).toUpperCase(),
  quantity: z.number().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive").optional(),
  leverage: z.number().min(1).max(20).default(1),
  tradingMode: z.enum(['SPOT', 'FUTURES', 'OPTIONS']).default('SPOT'),
  orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET')
});

export const placeSellOrderSchema = z.object({
  symbol: z.string().min(3).max(20).toUpperCase(),
  quantity: z.number().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive").optional(),
  leverage: z.number().min(1).max(20).default(1),
  tradingMode: z.enum(['SPOT', 'FUTURES', 'OPTIONS']).default('SPOT'),
  orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET')
});

export const closePositionSchema = z.object({
  positionId: z.number().positive("Position ID must be positive"),
  closingPrice: z.number().positive("Price must be positive").optional()
});

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ORDER PLACEMENT ENDPOINTS
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * POST /api/crypto/orders/buy
 * Place a BUY order
 */
export async function placeBuyOrder(req, res) {
  const { symbol, quantity, price, leverage, tradingMode, orderType } = req.validatedBody || req.body;
  const userId = req.user.id;
  
  try {
    const result = await placeOrder(
      userId,
      symbol,
      'BUY',
      orderType || 'MARKET',
      quantity,
      price,
      leverage,
      tradingMode
    );
    
    return res.json({
      success: true,
      data: result,
      message: `Buy order placed successfully`
    });
    
  } catch (error) {
    console.error(`Buy order error: ${error.message}`);
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * POST /api/crypto/orders/sell
 * Place a SELL order
 */
export async function placeSellOrder(req, res) {
  const { symbol, quantity, price, leverage, tradingMode, orderType } = req.validatedBody || req.body;
  const userId = req.user.id;
  
  try {
    const result = await placeOrder(
      userId,
      symbol,
      'SELL',
      orderType || 'MARKET',
      quantity,
      price,
      leverage,
      tradingMode
    );
    
    return res.json({
      success: true,
      data: result,
      message: 'Sell order placed successfully'
    });
    
  } catch (error) {
    console.error(`Sell order error: ${error.message}`);
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POSITION MANAGEMENT ENDPOINTS
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * GET /api/crypto/positions
 * Get all active positions for user
 */
export async function getPositions(req, res) {
  const userId = req.user.id;
  
  try {
    const positions = await sql(
      `SELECT * FROM crypto_positions 
       WHERE user_id = $1 AND status = 'ACTIVE'
       ORDER BY entry_time DESC`,
      [userId]
    );
    
    // Dynamically fetch current prices for each active position
    const positionsWithPrices = await Promise.all(
      positions.rows.map(async (position) => {
        try {
          const priceData = await getCryptoPrice(position.symbol);
          const currentPrice = parseFloat(priceData.price);
          
          // Calculate unrealised PnL dynamically
          const quantity = parseFloat(position.quantity);
          const entryPrice = parseFloat(position.entry_price);
          const side = position.side || 'BUY';
          const margin = parseFloat(position.margin) || (quantity * entryPrice);
          
          let unrealisedPnL = 0;
          if (side === 'BUY') {
            unrealisedPnL = (currentPrice - entryPrice) * quantity;
          } else {
            unrealisedPnL = (entryPrice - currentPrice) * quantity;
          }
          
          const unrealisedPnlPercent = margin > 0 ? (unrealisedPnL / margin) * 100 : 0;
          
          return {
            ...position,
            current_price: currentPrice,
            currentPrice: currentPrice,
            unrealised_pnl: unrealisedPnL,
            unrealised_pnl_percent: unrealisedPnlPercent
          };
        } catch (error) {
          console.error(`Error fetching price for ${position.symbol}: ${error.message}`);
          return {
            ...position,
            current_price: position.entry_price,
            currentPrice: position.entry_price,
            unrealised_pnl: 0,
            unrealised_pnl_percent: 0
          };
        }
      })
    );
    
    return res.json({
      success: true,
      data: positionsWithPrices,
      count: positionsWithPrices.length
    });
    
  } catch (error) {
    console.error(`Get positions error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * GET /api/crypto/positions/:positionId
 * Get specific position details
 */
export async function getPositionDetails(req, res) {
  const positionId = parseInt(req.params.positionId);
  const userId = req.user.id;
  
  try {
    const positions = await sql(
      `SELECT * FROM crypto_positions WHERE id = $1 AND user_id = $2`,
      [positionId, userId]
    );
    
    if ((positions.rows || []).length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }
    
    const position = positions.rows[0];
    
    // Get current price and update P&L
    const priceData = await getCryptoPrice(position.symbol);
    const currentPrice = parseFloat(priceData.price);
    
    const pnlResult = await updatePositionPnL(positionId, currentPrice);
    
    return res.json({
      success: true,
      data: {
        ...position,
        currentPrice,
        ...pnlResult
      }
    });
    
  } catch (error) {
    console.error(`Get position details error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * POST /api/crypto/positions/:positionId/close
 * Close a position
 */
export async function closePositionEndpoint(req, res) {
  const positionId = parseInt(req.params.positionId);
  const userId = req.user.id;
  const { closingPrice } = req.validatedBody || req.body;
  
  try {
    const result = await closePosition(userId, positionId, closingPrice);
    
    return res.json({
      success: true,
      data: result,
      message: 'Position closed successfully'
    });
    
  } catch (error) {
    console.error(`Close position error: ${error.message}`);
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ORDER MANAGEMENT ENDPOINTS
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * GET /api/crypto/orders
 * Get all orders for user
 */
export async function getOrders(req, res) {
  const userId = req.user.id;
  const status = req.query.status; // optional filter
  
  try {
    let query = `SELECT * FROM crypto_orders WHERE user_id = $1`;
    const params = [userId];
    
    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }
    
    query += ` ORDER BY created_at DESC LIMIT 100`;
    
    const orders = await sql(query, params);
    
    return res.json({
      success: true,
      data: orders.rows,
      count: orders.rows.length
    });
    
  } catch (error) {
    console.error(`Get orders error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * POST /api/crypto/orders/:orderId/cancel
 * Cancel an open order
 */
export async function cancelOrderEndpoint(req, res) {
  const orderId = parseInt(req.params.orderId);
  const userId = req.user.id;
  
  try {
    const result = await cancelOrder(userId, orderId);
    
    return res.json({
      success: true,
      data: result,
      message: 'Order cancelled successfully'
    });
    
  } catch (error) {
    console.error(`Cancel order error: ${error.message}`);
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PERFORMANCE & ANALYTICS
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * GET /api/crypto/performance
 * Get user's crypto trading performance metrics
 */
export async function getCryptoPerformance(req, res) {
  const userId = req.user.id;
  
  try {
    const performance = await sql(`SELECT * FROM crypto_performance WHERE user_id = $1`, [userId]);
    
    // Generate dynamic full 21-field Report Card
    const trades = await sql(`SELECT symbol, net_pnl as pnl, fees_paid as charges, margin_used, entry_time, exit_time, duration_seconds FROM crypto_trades WHERE user_id = $1 AND exit_time IS NOT NULL ORDER BY exit_time DESC`, [userId]);
    const userBalanceResult = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
    const accountEquity = userBalanceResult.length > 0 ? parseFloat(userBalanceResult[0].balance) : 10000;
    
    // Import the engine if not imported at top
    const { calculateTradefinityMetrics } = await import('../../services/tradefinity-performance.service.js');
    const metrics = calculateTradefinityMetrics(trades.rows || trades, accountEquity, 0, 0);
    
    // Calculate Percentile & Ranking
    const rankResult = await sql(`SELECT COUNT(*) as total_users FROM crypto_performance WHERE total_trades > 0`);
    const belowResult = await sql(`SELECT COUNT(*) as users_below FROM crypto_performance WHERE overall_score < $1 AND total_trades > 0`, [metrics.overallScore]);
    
    const totalUsers = parseInt((rankResult.rows || rankResult)[0]?.total_users || 1);
    const usersBelow = parseInt((belowResult.rows || belowResult)[0]?.users_below || 0);
    const percentile_rank = totalUsers > 0 ? parseFloat(((usersBelow / totalUsers) * 100).toFixed(2)) : 0;
    const higherResult = await sql(`SELECT COUNT(*) as users_above FROM crypto_performance WHERE overall_score > $1 AND total_trades > 0`, [metrics.overallScore]);
    const global_rank = parseInt((higherResult.rows || higherResult)[0]?.users_above || 0) + 1;
    
    // Calculate Improvement
    const storedScore = (performance.rows || performance)[0]?.overall_score || 0;
    const previousScore = (performance.rows || performance)[0]?.previous_score || storedScore;
    const improvement = metrics.overallScore - previousScore;
    
    const baseData = (performance.rows || performance)[0] || {};
    const reportCard = {
      ...baseData,
      ...metrics, // Overwrites DB fields with full dynamic engine output
      percentile_rank,
      global_rank,
      improvement
    };
    
    return res.json({
      success: true,
      data: reportCard
    });
    
  } catch (error) {
    console.error(`Get performance error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * GET /api/crypto/trades
 * Get closed trades
 */
export async function getTrades(req, res) {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 50;
  
  try {
    const trades = await sql(
      `SELECT * FROM crypto_trades 
       WHERE user_id = $1 
       ORDER BY exit_time DESC 
       LIMIT $2`,
      [userId, limit]
    );
    
    return res.json({
      success: true,
      data: trades.rows,
      count: trades.rows.length
    });
    
  } catch (error) {
    console.error(`Get trades error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * RISK MANAGEMENT ENDPOINTS
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * GET /api/crypto/positions/:positionId/liquidation-check
 * Check if position should be liquidated
 */
export async function checkPositionLiquidation(req, res) {
  const positionId = parseInt(req.params.positionId);
  const userId = req.user.id;
  
  try {
    const positions = await sql(
      `SELECT symbol FROM crypto_positions WHERE id = $1 AND user_id = $2`,
      [positionId, userId]
    );
    
    if (positions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }
    
    const priceData = await getCryptoPrice(positions[0].symbol);
    const currentPrice = parseFloat(priceData.price);
    
    const result = await checkLiquidation(positionId, currentPrice);
    
    if (result.shouldLiquidate) {
      // Auto-liquidate
      const liquidationResult = await liquidatePosition(positionId, currentPrice);
      
      return res.json({
        success: true,
        data: {
          liquidated: true,
          ...liquidationResult
        }
      });
    }
    
    return res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error(`Liquidation check error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * GET /api/crypto/account/balance
 * Get current account balance
 */
export async function getAccountBalance(req, res) {
  const userId = req.user.id;
  
  try {
    const user = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
    
    if ((user.rows || []).length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const balance = parseFloat(user.rows[0].balance || 0);
    
    // Fetch active positions and calculate unrealised PnL dynamically from live prices
    const positions = await sql(
      `SELECT symbol, side, entry_price, quantity, margin_used FROM crypto_positions 
       WHERE user_id = $1 AND status = 'ACTIVE'`,
      [userId]
    );
    
    let totalUnrealisedPnL = 0;
    for (const pos of (positions.rows || [])) {
      try {
        const priceData = await getCryptoPrice(pos.symbol);
        const currentPrice = parseFloat(priceData.price);
        const entryPrice = parseFloat(pos.entry_price);
        const quantity = parseFloat(pos.quantity);
        
        if (pos.side === 'LONG') {
          totalUnrealisedPnL += (currentPrice - entryPrice) * quantity;
        } else {
          totalUnrealisedPnL += (entryPrice - currentPrice) * quantity;
        }
      } catch (e) {
        // Skip positions where price fetch fails
      }
    }
    
    const totalEquity = balance + totalUnrealisedPnL;
    
    return res.json({
      success: true,
      data: {
        availableBalance: balance,
        unrealisedPnL: totalUnrealisedPnL,
        totalEquity
      }
    });
    
  } catch (error) {
    console.error(`Get balance error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ORDERBOOK & MARKET DATA
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * GET /api/crypto/orderbook/:symbol
 * Get orderbook snapshot for a symbol
 */
export async function getOrderbook(req, res) {
  const symbol = String(req.params.symbol).toUpperCase();
  
  try {
    // This will be populated by the matching engine service
    // For now, return basic structure
    return res.json({
      success: true,
      data: {
        symbol,
        bids: [],
        asks: [],
        spread: 0,
        timestamp: Date.now()
      }
    });
    
  } catch (error) {
    console.error(`Get orderbook error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PORTFOLIO ANALYTICS ENDPOINTS
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Internal helper: runs the Tradefinity engine for the authenticated user
 */
async function _runTradefinityForUser(userId) {
  const trades = await sql(
    `SELECT symbol, net_pnl as pnl, fees_paid as charges, margin_used, entry_time, exit_time, duration_seconds, leverage, status
     FROM crypto_trades WHERE user_id = $1 AND exit_time IS NOT NULL
     ORDER BY exit_time DESC`,
    [userId]
  );
  const userBalanceResult = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
  const accountEquity = (userBalanceResult.rows || userBalanceResult).length > 0
    ? parseFloat((userBalanceResult.rows || userBalanceResult)[0].balance)
    : 10000;

  const { calculateTradefinityMetrics } = await import('../../services/tradefinity-performance.service.js');
  const metrics = calculateTradefinityMetrics(trades.rows || trades, accountEquity, 0, 0);
  return { metrics, accountEquity };
}

/**
 * GET /api/crypto/portfolio-health
 * Returns focused portfolio health metrics
 */
export async function getPortfolioHealth(req, res) {
  try {
    const { metrics, accountEquity } = await _runTradefinityForUser(req.user.id);

    // Fetch active positions for live exposure breakdown
    const positions = await sql(
      `SELECT symbol, side, margin_used, entry_price, quantity
       FROM crypto_positions WHERE user_id = $1 AND status = 'ACTIVE'`,
      [req.user.id]
    );

    const activePositions = (positions.rows || positions);
    const totalMarginLocked = activePositions.reduce((sum, p) => sum + parseFloat(p.margin_used || 0), 0);
    const assetBreakdown = {};
    activePositions.forEach(p => {
      const sym = p.symbol || 'UNKNOWN';
      if (!assetBreakdown[sym]) assetBreakdown[sym] = { marginUsed: 0, count: 0 };
      assetBreakdown[sym].marginUsed += parseFloat(p.margin_used || 0);
      assetBreakdown[sym].count += 1;
    });

    return res.json({
      success: true,
      data: {
        portfolioHealthScore: metrics.portfolioHealth,
        roiPercent: metrics.roiPct,
        maxDrawdownPercent: metrics.maxDrawdown,
        totalTrades: metrics.totalTrades,
        effectivePnl: metrics.effectivePnl,
        tradingCosts: metrics.tradingCosts,
        bestAsset: metrics.bestAsset,
        worstAsset: metrics.worstAsset,
        diversificationCount: Object.keys(assetBreakdown).length,
        activePositionsCount: activePositions.length,
        totalMarginLocked,
        accountEquity,
        assetBreakdown
      }
    });
  } catch (error) {
    console.error(`Portfolio health error: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/crypto/risk-meter
 * Returns focused risk assessment metrics
 */
export async function getRiskMeter(req, res) {
  try {
    const { metrics, accountEquity } = await _runTradefinityForUser(req.user.id);

    // Fetch active positions for live margin ratio
    const positions = await sql(
      `SELECT margin_used, margin_ratio, liquidation_price, leverage, symbol, side
       FROM crypto_positions WHERE user_id = $1 AND status = 'ACTIVE'`,
      [req.user.id]
    );

    const activePositions = (positions.rows || positions);
    const totalMarginUsed = activePositions.reduce((sum, p) => sum + parseFloat(p.margin_used || 0), 0);
    const currentMarginUtilization = accountEquity > 0 ? (totalMarginUsed / accountEquity) * 100 : 0;

    // Positions near liquidation
    const atRiskPositions = activePositions.filter(p => {
      const ratio = parseFloat(p.margin_ratio || 100);
      return ratio < 30;
    });

    return res.json({
      success: true,
      data: {
        riskScore: metrics.riskMeter,
        maxDrawdownPercent: metrics.maxDrawdown,
        profitFactor: metrics.profitFactor,
        winRate: metrics.winRate,
        winLossRatio: metrics.winLossRatio,
        behaviorScore: metrics.behaviorScore,
        behaviorFlags: metrics.behaviorFlags,
        marginStress: metrics.marginStress,
        liquidationHistory: metrics.liquidationHistory,
        currentMarginUtilization: parseFloat(currentMarginUtilization.toFixed(2)),
        totalMarginUsed,
        activePositionsCount: activePositions.length,
        atRiskPositionsCount: atRiskPositions.length,
        atRiskPositions: atRiskPositions.map(p => ({
          symbol: p.symbol,
          side: p.side,
          leverage: parseFloat(p.leverage),
          marginRatio: parseFloat(p.margin_ratio || 0),
          liquidationPrice: parseFloat(p.liquidation_price || 0)
        }))
      }
    });
  } catch (error) {
    console.error(`Risk meter error: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * GET /api/crypto/report-card
 * Returns the full Tradefinity v2.1 report card (all 21+ fields)
 */
export async function getReportCard(req, res) {
  try {
    const { metrics } = await _runTradefinityForUser(req.user.id);

    // Percentile and ranking
    const rankResult = await sql(`SELECT COUNT(*) as total_users FROM crypto_performance WHERE total_trades > 0`);
    const belowResult = await sql(`SELECT COUNT(*) as users_below FROM crypto_performance WHERE overall_score < $1 AND total_trades > 0`, [metrics.overallScore]);

    const totalUsers = parseInt((rankResult.rows || rankResult)[0]?.total_users || 1);
    const usersBelow = parseInt((belowResult.rows || belowResult)[0]?.users_below || 0);
    const percentileRank = totalUsers > 0 ? parseFloat(((usersBelow / totalUsers) * 100).toFixed(2)) : 0;

    const higherResult = await sql(`SELECT COUNT(*) as users_above FROM crypto_performance WHERE overall_score > $1 AND total_trades > 0`, [metrics.overallScore]);
    const globalRank = parseInt((higherResult.rows || higherResult)[0]?.users_above || 0) + 1;

    return res.json({
      success: true,
      data: {
        // Scores
        overallScore: metrics.overallScore,
        overallGrade: metrics.overallGrade,
        consistencyScore: metrics.consistencyScore,
        riskMeter: metrics.riskMeter,
        portfolioHealth: metrics.portfolioHealth,
        capitalEvaluationScore: metrics.capitalEvaluationScore,

        // Behavior
        behaviorScore: metrics.behaviorScore,
        behaviorFlags: metrics.behaviorFlags,
        tradingStyle: metrics.tradingStyle,

        // Win/Loss Analytics
        totalTrades: metrics.totalTrades,
        winningTrades: metrics.winningTrades,
        losingTrades: metrics.losingTrades,
        winRate: metrics.winRate,
        avgProfit: metrics.avgProfit,
        avgLoss: metrics.avgLoss,
        profitFactor: metrics.profitFactor,
        winLossRatio: metrics.winLossRatio,

        // P&L
        grossPnl: metrics.grossPnl,
        effectivePnl: metrics.effectivePnl,
        tradingCosts: metrics.tradingCosts,
        roiPercent: metrics.roiPct,
        maxDrawdownPercent: metrics.maxDrawdown,

        // Risk
        marginStress: metrics.marginStress,
        liquidationHistory: metrics.liquidationHistory,

        // Asset & Regime
        bestAsset: metrics.bestAsset,
        worstAsset: metrics.worstAsset,
        bestRegime: metrics.bestRegime,
        worstRegime: metrics.worstRegime,

        // Duration
        avgHoldingDurationSeconds: metrics.avgHoldingDuration,

        // Ranking
        percentileRank,
        globalRank,
        totalUsersRanked: totalUsers
      }
    });
  } catch (error) {
    console.error(`Report card error: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
}

export default {
  placeBuyOrder,
  placeSellOrder,
  getPositions,
  getPositionDetails,
  closePositionEndpoint,
  getOrders,
  cancelOrderEndpoint,
  getCryptoPerformance,
  getTrades,
  checkPositionLiquidation,
  getAccountBalance,
  getOrderbook,
  getPortfolioHealth,
  getRiskMeter,
  getReportCard
};


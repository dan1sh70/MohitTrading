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

const placeBuyOrderSchema = z.object({
  symbol: z.string().min(3).max(20).toUpperCase(),
  quantity: z.number().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive").optional(),
  leverage: z.number().min(1).max(20).default(1),
  tradingMode: z.enum(['SPOT', 'FUTURES', 'OPTIONS']).default('SPOT'),
  orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET')
});

const placeSellOrderSchema = z.object({
  symbol: z.string().min(3).max(20).toUpperCase(),
  quantity: z.number().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive").optional(),
  leverage: z.number().min(1).max(20).default(1),
  tradingMode: z.enum(['SPOT', 'FUTURES', 'OPTIONS']).default('SPOT'),
  orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET')
});

const closePositionSchema = z.object({
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
  const { symbol, quantity, price, leverage, tradingMode, orderType } = req.validatedBody;
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
  const { symbol, quantity, price, leverage, tradingMode, orderType } = req.validatedBody;
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
    
    return res.json({
      success: true,
      data: positions,
      count: positions.length
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
    
    if (positions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }
    
    const position = positions[0];
    
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
  const { closingPrice } = req.body;
  
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
      data: orders,
      count: orders.length
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
    const performance = await sql(
      `SELECT * FROM crypto_performance WHERE user_id = $1`,
      [userId]
    );
    
    if (performance.length === 0) {
      return res.json({
        success: true,
        data: {
          totalTrades: 0,
          totalRealizedPnL: 0,
          winRate: 0,
          overallGrade: 'D'
        }
      });
    }
    
    return res.json({
      success: true,
      data: performance[0]
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
      data: trades,
      count: trades.length
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
    
    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Calculate total equity (balance + unrealised P&L from active positions)
    const positions = await sql(
      `SELECT SUM(unrealised_pnl) as total_unrealised_pnl FROM crypto_positions 
       WHERE user_id = $1 AND status = 'ACTIVE'`,
      [userId]
    );
    
    const totalUnrealisedPnL = positions[0]?.total_unrealised_pnl || 0;
    const totalEquity = user[0].balance + totalUnrealisedPnL;
    
    return res.json({
      success: true,
      data: {
        availableBalance: user[0].balance,
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
  getOrderbook
};

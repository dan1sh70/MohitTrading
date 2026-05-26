// ═════════════════════════════════════════════════════════════════════════════
// TRADE EXECUTION SERVICE
// ═════════════════════════════════════════════════════════════════════════════
// Orchestrates order placement, matching, and settlement

import { sql } from "../db/mysql.js";
import { redis } from "../db/redis.js";
import {
  addOrderToBook,
  matchOrder,
  executeMatches,
  storeMatchHistory,
  removeOrderFromBook
} from "./matching-engine.service.js";
import {
  calculateRequiredMargin,
  calculateLiquidationPrice,
  updateCryptoPerformance
} from "./pnl-liquidation.service.js";
import { getCryptoPrice } from "../modules/crypto/crypto.service.js";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ORDER PLACEMENT & VALIDATION
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Place a new order (market or limit)
 */
export async function placeOrder(userId, symbol, side, orderType, quantity, price = null, leverage = 1, tradingMode = 'SPOT') {
  try {
    // Validate inputs
    if (!['BUY', 'SELL'].includes(side)) {
      throw new Error('Invalid side: must be BUY or SELL');
    }
    
    if (!['MARKET', 'LIMIT', 'STOP_LOSS', 'TAKE_PROFIT'].includes(orderType)) {
      throw new Error('Invalid order type');
    }
    
    if (orderType === 'LIMIT' && !price) {
      throw new Error('Price required for limit orders');
    }
    
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    
    // Check user balance
    const userResult = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
    if ((userResult.rows || []).length === 0) {
      throw new Error('User not found');
    }
    
    const userBalance = parseFloat(userResult.rows[0].balance || 0);
    
    // For market orders, get current price
    let executionPrice = price;
    if (orderType === 'MARKET') {
      const priceData = await getCryptoPrice(symbol);
      executionPrice = parseFloat(priceData.price);
    }
    
    // Calculate required margin
    const requiredMargin = calculateRequiredMargin(quantity, executionPrice, leverage);
    
    // Validate balance for leverage trading
    if (tradingMode === 'FUTURES') {
      if (userBalance < requiredMargin) {
        throw new Error(`Insufficient balance. Required: ${requiredMargin}, Available: ${userBalance}`);
      }
    } else if (tradingMode === 'SPOT') {
      if (side === 'BUY' && userBalance < (quantity * executionPrice)) {
        throw new Error(`Insufficient balance for spot buy`);
      }
    }
    
    // Create order record
    const orderResult = await sql(
      `INSERT INTO crypto_orders 
       (user_id, symbol, side, order_type, original_quantity, remaining_quantity,
        price, leverage, trading_mode, status, time_in_force, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING id`,
      [
        userId, symbol, side, orderType, quantity, quantity,
        price, leverage, tradingMode, 'OPEN', 'GTC'
      ]
    );
    
    const orderId = orderResult.rows?.[0]?.id;
    
    // For market orders, execute immediately
    if (orderType === 'MARKET') {
      return await executeMarketOrder(orderId, userId, symbol, side, quantity, executionPrice, leverage, tradingMode);
    }
    
    // For limit orders, add to orderbook
    if (orderType === 'LIMIT') {
      await addOrderToBook(symbol, side, orderId, userId, price, quantity, Date.now());
      
      // Try to match against existing orders
      const incomingOrder = {
        orderId,
        userId,
        symbol,
        side,
        price,
        quantity,
        createdAt: Date.now()
      };
      
      return await attemptOrderMatching(incomingOrder, leverage, tradingMode);
    }
    
    return {
      orderId,
      status: 'OPEN',
      message: 'Order placed successfully'
    };
    
  } catch (error) {
    console.error(`Error placing order: ${error.message}`);
    throw error;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MARKET ORDER EXECUTION
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Execute market order immediately at current price
 */
async function executeMarketOrder(orderId, userId, symbol, side, quantity, executionPrice, leverage, tradingMode) {
  try {
    // For spot: settle immediately
    if (tradingMode === 'SPOT') {
      // Update user balance
      const userBalanceRes = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
      if ((userBalanceRes.rows || []).length === 0) throw new Error('User not found');
      const costOrProceeds = quantity * executionPrice;
      const newBalance = side === 'BUY' 
        ? parseFloat(userBalanceRes.rows[0].balance || 0) - costOrProceeds
        : parseFloat(userBalanceRes.rows[0].balance || 0) + costOrProceeds;
      
      await sql(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId]);
      
      // Record order fill
      await sql(
        `INSERT INTO crypto_order_fills 
         (order_id, symbol, side, quantity, price, fill_time)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [orderId, symbol, side, quantity, executionPrice]
      );
      
      // Update order status
      await sql(
        `UPDATE crypto_orders 
         SET status = 'FILLED', filled_quantity = $1, remaining_quantity = 0, filled_at = NOW()
         WHERE id = $2`,
        [quantity, orderId]
      );
      
      return {
        orderId,
        status: 'FILLED',
        executionPrice,
        quantity,
        newBalance
      };
    }
    
    // For futures: create a position
    if (tradingMode === 'FUTURES') {
      const requiredMargin = calculateRequiredMargin(quantity, executionPrice, leverage);
      const liquidationPrice = calculateLiquidationPrice(executionPrice, leverage, side === 'BUY' ? 'LONG' : 'SHORT');
      
      // Create position
      const positionResult = await sql(
        `INSERT INTO crypto_positions 
         (user_id, symbol, side, entry_price, quantity, leverage, margin_used, 
          liquidation_price, entry_time, status, trading_mode)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'ACTIVE', $9)
         RETURNING id`,
        [
          userId, symbol, side === 'BUY' ? 'LONG' : 'SHORT', executionPrice, quantity,
          leverage, requiredMargin, liquidationPrice, tradingMode
        ]
      );
      
      const positionId = positionResult.rows?.[0]?.id;
      
      // Reserve margin from user balance
      const userBalanceRes = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
      if ((userBalanceRes.rows || []).length === 0) throw new Error('User not found');
      const newBalance = parseFloat(userBalanceRes.rows[0].balance || 0) - requiredMargin;
      
      await sql(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId]);
      
      // Record fill
      await sql(
        `INSERT INTO crypto_order_fills 
         (order_id, symbol, side, quantity, price, fill_time)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [orderId, symbol, side, quantity, executionPrice]
      );
      
      // Update order
      await sql(
        `UPDATE crypto_orders 
         SET status = 'FILLED', position_id = $1, filled_quantity = $2, remaining_quantity = 0, filled_at = NOW()
         WHERE id = $3`,
        [positionId, quantity, orderId]
      );
      
      return {
        orderId,
        positionId,
        status: 'FILLED',
        side: side === 'BUY' ? 'LONG' : 'SHORT',
        executionPrice,
        quantity,
        leverage,
        marginUsed: requiredMargin,
        liquidationPrice,
        newBalance
      };
    }
    
  } catch (error) {
    console.error(`Error executing market order: ${error.message}`);
    
    // Mark order as rejected
    await sql(
      `UPDATE crypto_orders SET status = 'REJECTED' WHERE id = $1`,
      [orderId]
    );
    
    throw error;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LIMIT ORDER MATCHING
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Attempt to match limit order against existing orders
 */
async function attemptOrderMatching(incomingOrder, leverage, tradingMode) {
  try {
    const { matches, remaining } = await matchOrder(incomingOrder);
    
    if (matches.length === 0) {
      return {
        orderId: incomingOrder.orderId,
        status: 'OPEN',
        message: 'Order placed but no matches found'
      };
    }
    
    // Execute matches
    const executions = await executeMatches(matches, incomingOrder.symbol);
    
    // Store match history
    for (const match of executions) {
      if (match.executed) {
        await storeMatchHistory(incomingOrder.symbol, match);
      }
    }
    
    // Update order quantities
    const filledQuantity = incomingOrder.quantity - remaining;
    
    if (remaining === 0) {
      // Order fully filled
      await sql(
        `UPDATE crypto_orders 
         SET status = 'FILLED', filled_quantity = $1, remaining_quantity = 0, filled_at = NOW()
         WHERE id = $2`,
        [filledQuantity, incomingOrder.orderId]
      );
    } else {
      // Partially filled
      await sql(
        `UPDATE crypto_orders 
         SET status = 'PARTIALLY_FILLED', filled_quantity = $1, remaining_quantity = $2
         WHERE id = $3`,
        [filledQuantity, remaining, incomingOrder.orderId]
      );
    }
    
    return {
      orderId: incomingOrder.orderId,
      status: remaining === 0 ? 'FILLED' : 'PARTIALLY_FILLED',
      matchCount: matches.length,
      filledQuantity,
      remainingQuantity: remaining,
      matches: executions.map(m => ({
        matchedWith: m.makerOrderId,
        quantity: m.quantity,
        price: m.price
      }))
    };
    
  } catch (error) {
    console.error(`Error matching order: ${error.message}`);
    throw error;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POSITION MANAGEMENT
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Close a position (FUTURES)
 */
export async function closePosition(userId, positionId, closingPrice = null) {
  try {
    const result = await sql(
      `SELECT * FROM crypto_positions WHERE id = $1 AND user_id = $2 AND status = 'ACTIVE'`,
      [positionId, userId]
    );
    
    if (result.length === 0) {
      throw new Error('Position not found or already closed');
    }
    
    const position = result[0];
    
    // Use current market price if not specified
    let exitPrice = closingPrice;
    if (!exitPrice) {
      const priceData = await getCryptoPrice(position.symbol);
      exitPrice = parseFloat(priceData.price);
    }
    
    // Create closing order
    const closingOrderResult = await sql(
      `INSERT INTO crypto_orders 
       (user_id, symbol, side, order_type, original_quantity, remaining_quantity,
        position_id, price, leverage, trading_mode, status, time_in_force, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING id`,
      [
        userId,
        position.symbol,
        position.side === 'LONG' ? 'SELL' : 'BUY', // Opposite of entry
        'MARKET',
        position.quantity,
        position.quantity,
        positionId,
        exitPrice,
        position.leverage,
        position.trading_mode,
        'FILLED'
      ]
    );
    
    const closingOrderId = closingOrderResult.rows?.[0]?.id;
    
    // Calculate P&L
    let pnl = 0;
    if (position.side === 'LONG') {
      pnl = (exitPrice - position.entry_price) * position.quantity * position.leverage;
    } else {
      pnl = (position.entry_price - exitPrice) * position.quantity * position.leverage;
    }
    
    // Update position
    await sql(
      `UPDATE crypto_positions 
       SET status = 'CLOSED', exit_time = NOW(), exit_price = $1, 
           unrealised_pnl = 0, realised_pnl = $2
       WHERE id = $3`,
      [exitPrice, pnl, positionId]
    );
    
    // Record the trade
    const entryOrderResult = await sql(
      `SELECT id FROM crypto_orders WHERE position_id = $1 ORDER BY created_at LIMIT 1`,
      [positionId]
    );
    
    const entryOrderId = entryOrderResult.rows?.[0]?.id;
    
    const durationSeconds = Math.floor((Date.now() - new Date(position.entry_time).getTime()) / 1000);
    
    await sql(
      `INSERT INTO crypto_trades 
       (user_id, position_id, symbol, trading_mode, entry_order_id, entry_price, entry_quantity,
        entry_time, exit_order_id, exit_price, exit_quantity, exit_time, net_pnl, pnl_percent,
        leverage, margin_used, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, $14, $15, $16)`,
      [
        userId, positionId, position.symbol, position.trading_mode,
        entryOrderId, position.entry_price, position.quantity, position.entry_time,
        closingOrderId, exitPrice, position.quantity,
        pnl, (pnl / position.margin_used) * 100,
        position.leverage, position.margin_used, durationSeconds
      ]
    );
    
    // Return margin to user
    const userBalanceRes = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
    const newBalance = parseFloat(userBalanceRes.rows?.[0]?.balance || 0) + position.margin_used + pnl;
    
    await sql(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId]);
    
    // Update performance metrics
    await updateCryptoPerformance(userId);
    
    return {
      positionId,
      closed: true,
      exitPrice,
      pnl,
      pnlPercent: (pnl / position.margin_used) * 100,
      newBalance,
      returnedMargin: position.margin_used
    };
    
  } catch (error) {
    console.error(`Error closing position: ${error.message}`);
    throw error;
  }
}

/**
 * Cancel a pending order
 */
export async function cancelOrder(userId, orderId) {
  try {
    const result = await sql(
      `SELECT * FROM crypto_orders WHERE id = $1 AND user_id = $2 AND status = 'OPEN'`,
      [orderId, userId]
    );
    
    if (result.length === 0) {
      throw new Error('Order not found or already filled');
    }
    
    const order = result[0];
    
    // Remove from orderbook
    await removeOrderFromBook(order.symbol, order.side, orderId, userId);
    
    // Update order status
    await sql(
      `UPDATE crypto_orders SET status = 'CANCELLED' WHERE id = $1`,
      [orderId]
    );
    
    return {
      orderId,
      cancelled: true,
      symbol: order.symbol
    };
    
  } catch (error) {
    console.error(`Error cancelling order: ${error.message}`);
    throw error;
  }
}

export default {
  placeOrder,
  closePosition,
  cancelOrder
};

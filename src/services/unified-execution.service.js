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
  updateUnifiedPerformance
} from "./pnl-liquidation.service.js";
import { getUnifiedPrice } from "../modules/unified/unified.service.js";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ORDER PLACEMENT & VALIDATION
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Place a new order (market or limit)
 */
export async function placeOrder(userId, assetClass, symbol, side, orderType, quantity, price = null, leverage = 1, tradingMode = 'SPOT', takeProfit = null, stopLoss = null) {
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
    
    // Fetch live market price to evaluate orders
    const priceData = await getUnifiedPrice(symbol);
    const livePrice = parseFloat(priceData.price);
    
    // For market orders, execution price is live price. For limit, it's the requested price (for margin calc)
    let executionPrice = price;
    if (orderType === 'MARKET') {
      executionPrice = livePrice;
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
      `INSERT INTO unified_orders 
       (user_id, asset_class, symbol, side, order_type, original_quantity, remaining_quantity,
        price, leverage, trading_mode, status, time_in_force, created_at)
       VALUES ($1, $2, $3, $4, $4, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING id`,
      [
        userId, assetClass, symbol, side, orderType, quantity, quantity,
        price, leverage, tradingMode, 'OPEN', 'GTC'
      ]
    );
    
    const orderId = orderResult.rows?.[0]?.id;
    
    // For market orders, execute immediately
    if (orderType === 'MARKET') {
      return await executeMarketOrder(orderId, userId, assetClass, symbol, side, quantity, livePrice, leverage, tradingMode, takeProfit, stopLoss);
    }
    
    // For limit, stop-loss, take-profit orders, evaluate against live price immediately
    if (['LIMIT', 'STOP_LOSS', 'TAKE_PROFIT'].includes(orderType)) {
      let shouldExecute = false;
      
      if (orderType === 'LIMIT') {
        if (side === 'BUY' && livePrice <= price) shouldExecute = true;
        if (side === 'SELL' && livePrice >= price) shouldExecute = true;
      } else if (orderType === 'STOP_LOSS') {
        if (side === 'BUY' && livePrice >= price) shouldExecute = true;
        if (side === 'SELL' && livePrice <= price) shouldExecute = true;
      } else if (orderType === 'TAKE_PROFIT') {
        if (side === 'BUY' && livePrice <= price) shouldExecute = true;
        if (side === 'SELL' && livePrice >= price) shouldExecute = true;
      }
      
      if (shouldExecute) {
        // Execute immediately at the live market price
        return await executeMarketOrder(orderId, userId, symbol, side, quantity, livePrice, leverage, tradingMode, takeProfit, stopLoss);
      }
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
async function executeMarketOrder(orderId, userId, symbol, side, quantity, executionPrice, leverage, tradingMode, takeProfit = null, stopLoss = null) {
  try {
    // For spot: settle immediately AND create a position record so it shows in portfolio
    if (tradingMode === 'SPOT') {
      // Update user balance
      const userBalanceRes = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
      if ((userBalanceRes.rows || []).length === 0) throw new Error('User not found');
      const costOrProceeds = quantity * executionPrice;
      const newBalance = side === 'BUY' 
        ? parseFloat(userBalanceRes.rows[0].balance || 0) - costOrProceeds
        : parseFloat(userBalanceRes.rows[0].balance || 0) + costOrProceeds;
      
      await sql(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId]);
      
      // Create a position record so it appears in the Portfolio
      const positionResult = await sql(
        `INSERT INTO unified_positions 
         (user_id, symbol, side, entry_price, quantity, leverage, margin_used, 
          liquidation_price, entry_time, status, trading_mode, take_profit, stop_loss)
         VALUES ($1, $2, $3, $4, $4, $4, $5, $6, $7, $8, NOW(), 'ACTIVE', $9, $10, $11)
         RETURNING id`,
        [
          userId, symbol, side === 'BUY' ? 'LONG' : 'SHORT', executionPrice, quantity,
          1, costOrProceeds, 0, tradingMode, takeProfit, stopLoss
        ]
      );
      
      const positionId = positionResult.rows?.[0]?.id;
      
      // Record order fill
      await sql(
        `INSERT INTO unified_order_fills 
         (order_id, symbol, side, quantity, price, fill_time)
         VALUES ($1, $2, $3, $4, $4, $4, $5, NOW())`,
        [orderId, symbol, side, quantity, executionPrice]
      );
      
      // Update order status
      await sql(
        `UPDATE unified_orders 
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
        leverage: 1,
        marginUsed: costOrProceeds,
        newBalance
      };
    }
    
    // For futures: create a position
    if (tradingMode === 'FUTURES') {
      const requiredMargin = calculateRequiredMargin(quantity, executionPrice, leverage);
      const liquidationPrice = calculateLiquidationPrice(executionPrice, leverage, side === 'BUY' ? 'LONG' : 'SHORT');
      
      // Create position
      const positionResult = await sql(
        `INSERT INTO unified_positions 
         (user_id, symbol, side, entry_price, quantity, leverage, margin_used, 
          liquidation_price, entry_time, status, trading_mode, take_profit, stop_loss)
         VALUES ($1, $2, $3, $4, $4, $4, $5, $6, $7, $8, NOW(), 'ACTIVE', $9, $10, $11)
         RETURNING id`,
        [
          userId, symbol, side === 'BUY' ? 'LONG' : 'SHORT', executionPrice, quantity,
          leverage, requiredMargin, liquidationPrice, tradingMode, takeProfit, stopLoss
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
        `INSERT INTO unified_order_fills 
         (order_id, symbol, side, quantity, price, fill_time)
         VALUES ($1, $2, $3, $4, $4, $4, $5, NOW())`,
        [orderId, symbol, side, quantity, executionPrice]
      );
      
      // Update order
      await sql(
        `UPDATE unified_orders 
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
      `UPDATE unified_orders SET status = 'REJECTED' WHERE id = $1`,
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
 * Settle a single matched execution (adjusts balances and creates position records)
 */
async function settleMatchExecution(userId, symbol, side, quantity, price, leverage, tradingMode, orderId) {
  const executionPrice = parseFloat(price);
  
  try {
    if (tradingMode === 'SPOT') {
      const userBalanceRes = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
      if ((userBalanceRes.rows || []).length === 0) throw new Error('User not found');
      const costOrProceeds = quantity * executionPrice;
      const newBalance = side === 'BUY' 
        ? parseFloat(userBalanceRes.rows[0].balance || 0) - costOrProceeds
        : parseFloat(userBalanceRes.rows[0].balance || 0) + costOrProceeds;
      
      await sql(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId]);
      
      const positionResult = await sql(
        `INSERT INTO unified_positions 
         (user_id, symbol, side, entry_price, quantity, leverage, margin_used, 
          liquidation_price, entry_time, status, trading_mode)
         VALUES ($1, $2, $3, $4, $4, $4, $5, $6, $7, $8, NOW(), 'ACTIVE', $9)
         RETURNING id`,
        [
          userId, symbol, side === 'BUY' ? 'LONG' : 'SHORT', executionPrice, quantity,
          1, costOrProceeds, 0, tradingMode
        ]
      );
      
      const positionId = positionResult.rows?.[0]?.id;
      
      await sql(
        `UPDATE unified_orders SET position_id = $1 WHERE id = $2`,
        [positionId, orderId]
      );
      
      return positionId;
    } else if (tradingMode === 'FUTURES') {
      const requiredMargin = calculateRequiredMargin(quantity, executionPrice, leverage);
      const liquidationPrice = calculateLiquidationPrice(executionPrice, leverage, side === 'BUY' ? 'LONG' : 'SHORT');
      
      const positionResult = await sql(
        `INSERT INTO unified_positions 
         (user_id, symbol, side, entry_price, quantity, leverage, margin_used, 
          liquidation_price, entry_time, status, trading_mode)
         VALUES ($1, $2, $3, $4, $4, $4, $5, $6, $7, $8, NOW(), 'ACTIVE', $9)
         RETURNING id`,
        [
          userId, symbol, side === 'BUY' ? 'LONG' : 'SHORT', executionPrice, quantity,
          leverage, requiredMargin, liquidationPrice, tradingMode
        ]
      );
      
      const positionId = positionResult.rows?.[0]?.id;
      
      const userBalanceRes = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
      if ((userBalanceRes.rows || []).length === 0) throw new Error('User not found');
      const newBalance = parseFloat(userBalanceRes.rows[0].balance || 0) - requiredMargin;
      
      await sql(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId]);
      
      await sql(
        `UPDATE unified_orders SET position_id = $1 WHERE id = $2`,
        [positionId, orderId]
      );
      
      return positionId;
    }
  } catch (error) {
    console.error(`Error in settleMatchExecution: ${error.message}`);
    throw error;
  }
}

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
    
    // Store match history and settle executions (balances & positions)
    for (const match of executions) {
      if (match.executed) {
        await storeMatchHistory(incomingOrder.symbol, match);
        
        // Settle for taker (incoming order)
        await settleMatchExecution(
          match.takerUserId,
          incomingOrder.symbol,
          match.takerSide,
          match.quantity,
          match.price,
          leverage,
          tradingMode,
          match.takerOrderId
        );
        
        // Retrieve maker order details to settle for maker
        const makerOrderRes = await sql(
          `SELECT leverage, trading_mode, remaining_quantity, filled_quantity FROM unified_orders WHERE id = $1`,
          [match.makerOrderId]
        );
        
        if (makerOrderRes.rows && makerOrderRes.rows.length > 0) {
          const makerOrder = makerOrderRes.rows[0];
          const makerLeverage = parseFloat(makerOrder.leverage) || 1;
          const makerTradingMode = makerOrder.trading_mode || 'SPOT';
          
          await settleMatchExecution(
            match.makerUserId,
            incomingOrder.symbol,
            match.makerSide,
            match.quantity,
            match.price,
            makerLeverage,
            makerTradingMode,
            match.makerOrderId
          );
          
          // Update maker order status and quantities in DB
          const currentRemaining = parseFloat(makerOrder.remaining_quantity);
          const currentFilled = parseFloat(makerOrder.filled_quantity);
          const newRemaining = Math.max(0, currentRemaining - match.quantity);
          const newFilled = currentFilled + match.quantity;
          const newStatus = newRemaining === 0 ? 'FILLED' : 'PARTIALLY_FILLED';
          
          await sql(
            `UPDATE unified_orders 
             SET status = $1, remaining_quantity = $2, filled_quantity = $3, filled_at = ${newRemaining === 0 ? 'NOW()' : 'NULL'}
             WHERE id = $4`,
            [newStatus, newRemaining, newFilled, match.makerOrderId]
          );
        }
      }
    }
    
    // Update order quantities
    const filledQuantity = incomingOrder.quantity - remaining;
    
    if (remaining === 0) {
      // Order fully filled
      await sql(
        `UPDATE unified_orders 
         SET status = 'FILLED', filled_quantity = $1, remaining_quantity = 0, filled_at = NOW()
         WHERE id = $2`,
        [filledQuantity, incomingOrder.orderId]
      );
    } else {
      // Partially filled
      await sql(
        `UPDATE unified_orders 
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
      `SELECT * FROM unified_positions WHERE id = $1 AND user_id = $2 AND status = 'ACTIVE'`,
      [positionId, userId]
    );
    
    if (result.length === 0) {
      throw new Error('Position not found or already closed');
    }
    
    const position = result[0];
    
    // Use current market price if not specified
    let exitPrice = closingPrice;
    if (!exitPrice) {
      const priceData = await getUnifiedPrice(position.symbol);
      exitPrice = parseFloat(priceData.price);
    }
    
    // Create closing order
    const closingOrderResult = await sql(
      `INSERT INTO unified_orders 
       (user_id, symbol, side, order_type, original_quantity, remaining_quantity,
        position_id, price, leverage, trading_mode, status, time_in_force, created_at)
       VALUES ($1, $2, $3, $4, $4, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
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
        'FILLED',
        'GTC' // time_in_force
      ]
    );
    
    const closingOrderId = closingOrderResult.rows?.[0]?.id;
    
    // Calculate P&L
    let pnl = 0;
    if (position.side === 'LONG') {
      pnl = (exitPrice - position.entry_price) * position.quantity;
    } else {
      pnl = (position.entry_price - exitPrice) * position.quantity;
    }
    
    // Update position
    await sql(
      `UPDATE unified_positions 
       SET status = 'CLOSED', exit_time = NOW(), exit_price = $1, 
           unrealised_pnl = 0, realised_pnl = $2
       WHERE id = $3`,
      [exitPrice, pnl, positionId]
    );
    
    // Record the trade
    const entryOrderResult = await sql(
      `SELECT id FROM unified_orders WHERE position_id = $1 ORDER BY created_at LIMIT 1`,
      [positionId]
    );
    
    const entryOrderId = entryOrderResult.rows?.[0]?.id;
    
    const durationSeconds = Math.floor((Date.now() - new Date(position.entry_time).getTime()) / 1000);
    
    await sql(
      `INSERT INTO unified_trades 
       (user_id, position_id, symbol, trading_mode, entry_order_id, entry_price, entry_quantity,
        entry_time, exit_order_id, exit_price, exit_quantity, exit_time, net_pnl, pnl_percent,
        leverage, margin_used, duration_seconds)
       VALUES ($1, $2, $3, $4, $4, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, $14, $15, $16)`,
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
    const marginUsed = parseFloat(position.margin_used) || 0;
    const newBalance = parseFloat(userBalanceRes.rows?.[0]?.balance || 0) + marginUsed + pnl;
    
    await sql(`UPDATE users SET balance = $1 WHERE id = $2`, [newBalance, userId]);
    
    // Update performance metrics
    await updateUnifiedPerformance(userId, position.asset_class);
    
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
      `SELECT * FROM unified_orders WHERE id = $1 AND user_id = $2 AND status = 'OPEN'`,
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
      `UPDATE unified_orders SET status = 'CANCELLED' WHERE id = $1`,
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

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PENDING ORDERS POLLING (PAPER TRADING AUTO-MATCHING)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export async function processPendingCryptoOrders(livePrices) {
  if (!livePrices || livePrices.length === 0) return;
  
  const priceMap = new Map();
  for (const p of livePrices) {
    priceMap.set(p.symbol, parseFloat(p.price));
  }
  
  try {
    const result = await sql(
      `SELECT * FROM unified_orders 
       WHERE status = 'OPEN' AND order_type IN ('LIMIT', 'STOP_LOSS', 'TAKE_PROFIT')`
    );
    
    // In our DB wrapper, result could be the array of rows directly, or { rows: [...] }
    const pendingOrders = result.rows || result || [];
    if (pendingOrders.length === 0) return;
    
    for (const order of pendingOrders) {
      const livePrice = priceMap.get(order.symbol);
      if (!livePrice) continue;
      
      const targetPrice = parseFloat(order.price);
      let shouldExecute = false;
      
      if (order.order_type === 'LIMIT') {
        if (order.side === 'BUY' && livePrice <= targetPrice) shouldExecute = true;
        if (order.side === 'SELL' && livePrice >= targetPrice) shouldExecute = true;
      } else if (order.order_type === 'STOP_LOSS') {
        if (order.side === 'BUY' && livePrice >= targetPrice) shouldExecute = true;
        if (order.side === 'SELL' && livePrice <= targetPrice) shouldExecute = true;
      } else if (order.order_type === 'TAKE_PROFIT') {
        if (order.side === 'BUY' && livePrice <= targetPrice) shouldExecute = true;
        if (order.side === 'SELL' && livePrice >= targetPrice) shouldExecute = true;
      }
      
      if (shouldExecute) {
        try {
          await executeMarketOrder(
            order.id, 
            order.user_id, 
            order.symbol, 
            order.side, 
            parseFloat(order.remaining_quantity || order.original_quantity), 
            livePrice, 
            order.leverage, 
            order.trading_mode
          );
        } catch (execError) {
          console.error(`[TradeExecution] Failed to auto-execute pending order ${order.id}:`, execError.message);
        }
      }
    }
  } catch (error) {
    console.error(`[TradeExecution] Error processing pending crypto orders:`, error.message);
  }
}

export default {
  placeOrder,
  closePosition,
  cancelOrder,
  processPendingCryptoOrders
};

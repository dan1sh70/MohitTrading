// ═════════════════════════════════════════════════════════════════════════════
// PnL & LIQUIDATION ENGINE
// ═════════════════════════════════════════════════════════════════════════════
// Handles:
// - Real-time P&L calculation (unrealised & realised)
// - Margin ratio tracking
// - Liquidation price calculation
// - Auto-liquidation when margin breaches threshold
// - Funding costs for leverage positions

import { sql } from "../db/mysql.js";
import { cacheSet, cacheGet } from "../db/redis.js";
import { getMarkPrice } from "./mark-price.service.js";

const LIQUIDATION_THRESHOLD = 0.05; // 5% margin ratio = liquidation
const MARGIN_WARNING_THRESHOLD = 0.15; // 15% margin ratio = warning

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * P&L CALCULATIONS
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * For LONG positions:
 *   Unrealised P&L = (Current Price - Entry Price) × Quantity × Leverage
 *   
 * For SHORT positions:
 *   Unrealised P&L = (Entry Price - Current Price) × Quantity × Leverage
 *
 * Liquidation Price:
 *   For LONG: LP = Entry Price × (1 - 1/Leverage + (Fees % / Leverage))
 *   For SHORT: LP = Entry Price × (1 + 1/Leverage - (Fees % / Leverage))
 *
 * Margin Ratio = Equity / Margin Used
 * When Margin Ratio < 5% → Auto liquidate
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Calculate unrealised P&L for a position
 * @param {number} entryPrice - Entry price of position
 * @param {number} currentPrice - Current market price
 * @param {number} quantity - Position size
 * @param {number} leverage - Leverage multiplier
 * @param {string} side - LONG or SHORT
 * @returns {number} Unrealised P&L in USD
 */
export function calculateUnrealisedPnL(entryPrice, currentPrice, quantity, leverage, side) {
  const priceDifference = currentPrice - entryPrice;
  
  if (side === 'LONG') {
    return priceDifference * quantity * leverage;
  } else if (side === 'SHORT') {
    return -priceDifference * quantity * leverage;
  }
  
  return 0;
}

/**
 * Calculate unrealised P&L percentage
 */
export function calculateUnrealisedPnLPercent(unrealisedPnL, marginUsed) {
  if (marginUsed === 0) return 0;
  return (unrealisedPnL / marginUsed) * 100;
}

/**
 * Calculate liquidation price based on leverage and entry price
 * 
 * LONG position: As price drops, loses margin
 *   LP = Entry × (1 - 1/Leverage)
 *   E.g., 1000 USDT entry, 10x leverage = LP = 1000 × (1 - 1/10) = 900 USDT
 * 
 * SHORT position: As price rises, loses margin
 *   LP = Entry × (1 + 1/Leverage)
 *   E.g., 1000 USDT entry, 10x leverage = LP = 1000 × (1 + 1/10) = 1100 USDT
 */
export function calculateLiquidationPrice(entryPrice, leverage, side, feesPercent = 0.002) {
  // Simplified formula (doesn't account for funding costs)
  const marginFraction = 1 / leverage;
  
  if (side === 'LONG') {
    // For long: price drops to liquidation
    return entryPrice * (1 - marginFraction + feesPercent);
  } else if (side === 'SHORT') {
    // For short: price rises to liquidation
    return entryPrice * (1 + marginFraction - feesPercent);
  }
  
  return 0;
}

/**
 * Calculate margin ratio (equity / margin used)
 * Margin Ratio = (Initial Balance + Unrealised P&L) / Margin Used
 * 
 * When margin ratio < 5%, position gets liquidated
 */
export function calculateMarginRatio(initialBalance, unrealisedPnL, marginUsed) {
  const currentEquity = initialBalance + unrealisedPnL;
  
  if (marginUsed === 0) return 100; // Safe
  
  return (currentEquity / marginUsed) * 100;
}

/**
 * Calculate required margin for a position
 * Required Margin = (Quantity × Entry Price) / Leverage
 */
export function calculateRequiredMargin(quantity, entryPrice, leverage) {
  return (quantity * entryPrice) / leverage;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POSITION P&L UPDATES
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Update position P&L with latest market price
 */
export async function updatePositionPnL(positionId, currentPrice) {
  try {
    const result = await sql(
      `SELECT 
        id, user_id, side, entry_price, quantity, leverage, margin_used, realised_pnl
      FROM crypto_positions WHERE id = $1`,
      [positionId]
    );
    
    if (result.length === 0) {
      throw new Error(`Position ${positionId} not found`);
    }
    
    const position = result[0];
    
    // Calculate new unrealised P&L
    const unrealisedPnL = calculateUnrealisedPnL(
      position.entry_price,
      currentPrice,
      position.quantity,
      position.leverage,
      position.side
    );
    
    const unrealisedPnLPercent = calculateUnrealisedPnLPercent(unrealisedPnL, position.margin_used);
    
    // Calculate liquidation price
    const liquidationPrice = calculateLiquidationPrice(
      position.entry_price,
      position.leverage,
      position.side
    );
    
    // Calculate margin ratio
    const userBalance = await sql(
      `SELECT balance FROM users WHERE id = $1`,
      [position.user_id]
    );
    
    const marginRatio = calculateMarginRatio(
      userBalance[0].balance,
      unrealisedPnL,
      position.margin_used
    );
    
    // Update position
    await sql(
      `UPDATE crypto_positions 
       SET current_price = $1, 
           unrealised_pnl = $2, 
           unrealised_pnl_percent = $3,
           liquidation_price = $4,
           margin_ratio = $5,
           last_update = NOW()
       WHERE id = $6`,
      [
        currentPrice,
        unrealisedPnL,
        unrealisedPnLPercent,
        liquidationPrice,
        marginRatio,
        positionId
      ]
    );
    
    return {
      positionId,
      currentPrice,
      unrealisedPnL,
      unrealisedPnLPercent,
      liquidationPrice,
      marginRatio,
      shouldLiquidate: marginRatio < LIQUIDATION_THRESHOLD
    };
    
  } catch (error) {
    console.error(`Error updating position P&L: ${error.message}`);
    throw error;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LIQUIDATION LOGIC
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Check if position should be liquidated
 * ✅ NOW USES MARK PRICE instead of last trade price
 */
export async function checkLiquidation(positionId) {
  try {
    const result = await sql(
      `SELECT id, user_id, symbol, side, entry_price, quantity, leverage, 
              margin_used, status
       FROM crypto_positions WHERE id = $1`,
      [positionId]
    );
    
    if (result.length === 0 || result[0].status !== 'ACTIVE') {
      return { shouldLiquidate: false };
    }
    
    const position = result[0];
    
    // ✅ GET MARK PRICE (not last trade price)
    const markPrice = await getMarkPrice(position.symbol);
    
    // Calculate current P&L using mark price
    const unrealisedPnL = calculateUnrealisedPnL(
      position.entry_price,
      markPrice,
      position.quantity,
      position.leverage,
      position.side
    );
    
    // Get user balance
    const userResult = await sql(
      `SELECT balance FROM users WHERE id = $1`,
      [position.user_id]
    );
    
    const marginRatio = calculateMarginRatio(
      userResult[0].balance,
      unrealisedPnL,
      position.margin_used
    );
    
    const shouldLiquidate = marginRatio < LIQUIDATION_THRESHOLD;
    
    return {
      shouldLiquidate,
      marginRatio,
      unrealisedPnL,
      markPrice,
      liquidationPrice: calculateLiquidationPrice(
        position.entry_price,
        position.leverage,
        position.side
      )
    };
    
  } catch (error) {
    console.error(`Error checking liquidation: ${error.message}`);
    throw error;
  }
}

/**
 * Execute liquidation of a position
 * Closes the position at current market price
 */
export async function liquidatePosition(positionId, liquidationPrice) {
  try {
    const result = await sql(
      `SELECT id, user_id, symbol, side, entry_price, quantity, leverage, margin_used, realised_pnl
       FROM crypto_positions WHERE id = $1 AND status = 'ACTIVE'`,
      [positionId]
    );
    
    if (result.length === 0) {
      throw new Error(`Active position ${positionId} not found`);
    }
    
    const position = result[0];
    
    // Calculate loss at liquidation price
    const unrealisedPnL = calculateUnrealisedPnL(
      position.entry_price,
      liquidationPrice,
      position.quantity,
      position.leverage,
      position.side
    );
    
    // Total loss includes realised P&L from partial closes
    const totalLoss = position.realised_pnl + unrealisedPnL;
    
    // Close position
    await sql(
      `UPDATE crypto_positions 
       SET status = 'LIQUIDATED',
           exit_time = NOW(),
           exit_price = $1,
           unrealised_pnl = 0,
           realised_pnl = $2,
           current_price = $3,
           last_update = NOW()
       WHERE id = $4`,
      [liquidationPrice, unrealisedPnL, liquidationPrice, positionId]
    );
    
    // Record liquidation event
    await sql(
      `INSERT INTO crypto_liquidations 
       (user_id, position_id, symbol, side, entry_price, liquidation_price, 
        quantity, leverage, loss_amount, liquidated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        position.user_id,
        positionId,
        position.symbol,
        position.side,
        position.entry_price,
        liquidationPrice,
        position.quantity,
        position.leverage,
        Math.abs(totalLoss)
      ]
    );
    
    // Deduct loss from user balance
    const userBalance = await sql(
      `SELECT balance FROM users WHERE id = $1`,
      [position.user_id]
    );
    
    const newBalance = userBalance[0].balance + totalLoss; // totalLoss is negative
    
    await sql(
      `UPDATE users SET balance = $1 WHERE id = $2`,
      [newBalance, position.user_id]
    );
    
    // Record balance change
    await sql(
      `INSERT INTO crypto_balance_history 
       (user_id, asset, previous_balance, new_balance, change_amount, reason, related_position_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        position.user_id,
        'USDT',
        userBalance[0].balance,
        newBalance,
        totalLoss,
        'LIQUIDATION',
        positionId
      ]
    );
    
    return {
      positionId,
      liquidated: true,
      liquidationPrice,
      loss: totalLoss,
      newBalance,
      timestamp: new Date()
    };
    
  } catch (error) {
    console.error(`Error liquidating position: ${error.message}`);
    throw error;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FUNDING COSTS (For perpetual futures)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Calculate funding cost for a leveraged position
 * Funding Rate = Daily interest on borrowed amount
 * Cost = (Position Value) × (Leverage - 1) × (Daily Rate)
 * 
 * Typical funding rates: 0.01% - 0.05% per day
 */
export function calculateFundingCost(positionValue, leverage, dailyFundingRate) {
  const borrowedAmount = positionValue * (leverage - 1);
  return borrowedAmount * dailyFundingRate;
}

/**
 * Charge funding costs to user
 */
export async function chargeFundingCost(userId, positionId, fundingCost) {
  try {
    // Update balance
    const userBalance = await sql(
      `SELECT balance FROM users WHERE id = $1`,
      [userId]
    );
    
    const newBalance = userBalance[0].balance - fundingCost;
    
    await sql(
      `UPDATE users SET balance = $1 WHERE id = $2`,
      [newBalance, userId]
    );
    
    // Update position
    await sql(
      `UPDATE crypto_positions 
       SET funding_paid = funding_paid + $1
       WHERE id = $2`,
      [fundingCost, positionId]
    );
    
    // Record in balance history
    await sql(
      `INSERT INTO crypto_balance_history 
       (user_id, asset, previous_balance, new_balance, change_amount, reason, related_position_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        'USDT',
        userBalance[0].balance,
        newBalance,
        -fundingCost,
        'FUNDING_COST',
        positionId
      ]
    );
    
    return {
      charged: true,
      amount: fundingCost,
      newBalance
    };
    
  } catch (error) {
    console.error(`Error charging funding cost: ${error.message}`);
    throw error;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PERFORMANCE METRICS
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Calculate and update user's crypto performance metrics
 */
export async function updateCryptoPerformance(userId) {
  try {
    // Get all closed trades
    const trades = await sql(
      `SELECT net_pnl, pnl_percent, duration_seconds, leverage
       FROM crypto_trades WHERE user_id = $1 AND exit_time IS NOT NULL
       ORDER BY exit_time DESC`,
      [userId]
    );
    
    if (trades.length === 0) {
      // Initialize performance
      await sql(
        `INSERT INTO crypto_performance (user_id, total_trades, overall_grade)
         VALUES ($1, 0, 'D')
         ON DUPLICATE KEY UPDATE total_trades = 0`,
        [userId]
      );
      return;
    }
    
    // Calculate metrics
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.net_pnl > 0).length;
    const losingTrades = trades.filter(t => t.net_pnl < 0).length;
    
    const totalPnL = trades.reduce((sum, t) => sum + t.net_pnl, 0);
    const totalProfit = trades.filter(t => t.net_pnl > 0).reduce((sum, t) => sum + t.net_pnl, 0);
    const totalLoss = Math.abs(trades.filter(t => t.net_pnl < 0).reduce((sum, t) => sum + t.net_pnl, 0));
    
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgProfit = winningTrades > 0 ? totalProfit / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? totalLoss / losingTrades : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? 999 : 0);
    
    // Consistency score (0-100): based on win rate and profit factor
    const consistencyScore = Math.min(100, Math.round((winRate / 2) + (Math.min(profitFactor, 5) * 10)));
    
    // Calculate grade
    let overallGrade = 'D';
    let overallScore = Math.round(consistencyScore);
    
    if (profitFactor > 3 && winRate > 60) {
      overallGrade = 'A+';
      overallScore = 95;
    } else if (profitFactor > 2.5 && winRate > 55) {
      overallGrade = 'A';
      overallScore = 90;
    } else if (profitFactor > 2 && winRate > 50) {
      overallGrade = 'B';
      overallScore = 80;
    } else if (profitFactor > 1.5 && winRate > 45) {
      overallGrade = 'C';
      overallScore = 70;
    }
    
    const avgTradeDuration = trades.reduce((sum, t) => sum + t.duration_seconds, 0) / totalTrades;
    
    // Update or insert
    await sql(
      `INSERT INTO crypto_performance 
       (user_id, total_trades, total_realised_pnl, winning_trades, losing_trades, 
        win_rate, avg_profit, avg_loss, profit_factor, consistency_score, overall_grade, overall_score, avg_trade_duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON DUPLICATE KEY UPDATE
       total_trades = $2,
       total_realised_pnl = $3,
       winning_trades = $4,
       losing_trades = $5,
       win_rate = $6,
       avg_profit = $7,
       avg_loss = $8,
       profit_factor = $9,
       consistency_score = $10,
       overall_grade = $11,
       overall_score = $12,
       avg_trade_duration = $13`,
      [
        userId, totalTrades, totalPnL, winningTrades, losingTrades,
        winRate, avgProfit, avgLoss, profitFactor, consistencyScore,
        overallGrade, overallScore, avgTradeDuration
      ]
    );
    
  } catch (error) {
    console.error(`Error updating crypto performance: ${error.message}`);
    throw error;
  }
}

export default {
  calculateUnrealisedPnL,
  calculateUnrealisedPnLPercent,
  calculateLiquidationPrice,
  calculateMarginRatio,
  calculateRequiredMargin,
  updatePositionPnL,
  checkLiquidation,
  liquidatePosition,
  calculateFundingCost,
  chargeFundingCost,
  updateCryptoPerformance
};

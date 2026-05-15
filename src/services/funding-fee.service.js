// ═════════════════════════════════════════════════════════════════════════════
// FUNDING FEE SERVICE
// ═════════════════════════════════════════════════════════════════════════════
// Manages funding rates and settlement for perpetual futures
// Matches Binance's 8-hour funding cycle
// Funding Rate = Base Rate + Interest Rate (depends on market imbalance)

import { sql } from "../db/mysql.js";
import { redis, cacheSet, cacheGet } from "../db/redis.js";

const FUNDING_CYCLE_HOURS = 8; // Settlement every 8 hours
const BASE_FUNDING_RATE = 0.0001; // 0.01% per 8-hour cycle
const MAX_FUNDING_RATE = 0.001; // 0.1% max per cycle
const INTEREST_RATE = 0.00000417; // Annual interest ~1.5% divided by cycles

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FUNDING RATE CALCULATION
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * Funding Rate = Interest Rate + (Premium Index / 24)
 * 
 * Where Premium Index = (Max Price - Mark Price) / Mark Price
 * If more longs than shorts → positive funding (longs pay shorts)
 * If more shorts than longs → negative funding (shorts pay longs)
 */

/**
 * Calculate current funding rate based on market position imbalance
 */
export async function calculateFundingRate(symbol) {
  try {
    // Count long and short positions
    const positions = await sql(
      `SELECT side, COUNT(*) as count, SUM(quantity) as total_qty
       FROM crypto_positions
       WHERE symbol = $1 AND status = 'ACTIVE' AND trading_mode = 'FUTURES'
       GROUP BY side`,
      [symbol]
    );
    
    let longCount = 0;
    let shortCount = 0;
    let longQuantity = 0;
    let shortQuantity = 0;
    
    for (const pos of positions) {
      if (pos.side === 'LONG') {
        longCount = pos.count;
        longQuantity = parseFloat(pos.total_qty) || 0;
      } else if (pos.side === 'SHORT') {
        shortCount = pos.count;
        shortQuantity = parseFloat(pos.total_qty) || 0;
      }
    }
    
    // Calculate imbalance ratio
    const totalQuantity = longQuantity + shortQuantity;
    const imbalanceRatio = totalQuantity > 0 
      ? (longQuantity - shortQuantity) / totalQuantity 
      : 0;
    
    // Base funding rate + imbalance adjustment
    // If imbalance is positive (more longs), rate is positive (longs pay shorts)
    let fundingRate = INTEREST_RATE + (imbalanceRatio * 0.01);
    
    // Cap at max rate
    fundingRate = Math.max(-MAX_FUNDING_RATE, Math.min(MAX_FUNDING_RATE, fundingRate));
    
    return {
      symbol,
      fundingRate,
      longPositions: longCount,
      shortPositions: shortCount,
      longQuantity,
      shortQuantity,
      imbalanceRatio
    };
    
  } catch (error) {
    console.error(`Error calculating funding rate: ${error.message}`);
    return {
      symbol,
      fundingRate: BASE_FUNDING_RATE,
      longPositions: 0,
      shortPositions: 0,
      error: error.message
    };
  }
}

/**
 * Record funding rate in history
 */
export async function recordFundingRate(symbol, fundingRate, markPrice) {
  try {
    const nextSettlementTime = new Date();
    nextSettlementTime.setHours(nextSettlementTime.getHours() + FUNDING_CYCLE_HOURS);
    
    await sql(
      `INSERT INTO crypto_funding_rates 
       (symbol, funding_rate, mark_price, next_settlement_time, recorded_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [symbol, fundingRate, markPrice, nextSettlementTime]
    );
    
    // Cache current rate
    await cacheSet(
      `fundingRate:${symbol}`,
      JSON.stringify({
        rate: fundingRate,
        markPrice,
        recordedAt: Date.now(),
        nextSettlement: nextSettlementTime.getTime()
      }),
      FUNDING_CYCLE_HOURS * 3600 * 1000
    );
    
  } catch (error) {
    console.error(`Error recording funding rate: ${error.message}`);
  }
}

/**
 * Get current funding rate for symbol
 */
export async function getFundingRate(symbol) {
  try {
    const cached = await cacheGet(`fundingRate:${symbol}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const result = await sql(
      `SELECT funding_rate, mark_price, next_settlement_time, recorded_at
       FROM crypto_funding_rates
       WHERE symbol = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [symbol]
    );
    
    if (result.length === 0) {
      return {
        rate: BASE_FUNDING_RATE,
        markPrice: 0,
        nextSettlement: new Date()
      };
    }
    
    return {
      rate: parseFloat(result[0].funding_rate),
      markPrice: parseFloat(result[0].mark_price),
      recordedAt: result[0].recorded_at,
      nextSettlement: result[0].next_settlement_time
    };
    
  } catch (error) {
    console.error(`Error getting funding rate: ${error.message}`);
    return { rate: BASE_FUNDING_RATE, error: error.message };
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * FUNDING PAYMENT SETTLEMENT
 * ─────────────────────────────────────────────────────────────────────────────
 * Run every 8 hours to:
 * 1. Calculate funding amount for each position
 * 2. Deduct from balance (if positive) or add (if negative)
 * 3. Record payment history
 */

/**
 * Settle funding payments for all users
 * Call this every 8 hours via cron job
 */
export async function settleFundingPayments(symbol) {
  try {
    const fundingInfo = await getFundingRate(symbol);
    const fundingRate = fundingInfo.rate;
    
    // Get all active positions for this symbol
    const positions = await sql(
      `SELECT id, user_id, quantity, side, leverage, margin_used
       FROM crypto_positions
       WHERE symbol = $1 AND status = 'ACTIVE' AND trading_mode = 'FUTURES'`,
      [symbol]
    );
    
    let totalSettled = 0;
    
    for (const position of positions) {
      const quantity = parseFloat(position.quantity);
      const leverage = parseFloat(position.leverage);
      
      // Funding amount = Quantity × Mark Price × Funding Rate
      // For SHORT positions: funding is negative (they receive when rate is positive)
      const fundingMultiplier = position.side === 'LONG' ? 1 : -1;
      const fundingAmount = quantity * fundingInfo.markPrice * fundingRate * fundingMultiplier;
      
      if (Math.abs(fundingAmount) < 0.000001) continue; // Skip tiny amounts
      
      // Deduct from user balance
      await sql(
        `UPDATE users 
         SET balance = balance - $1
         WHERE id = $2`,
        [fundingAmount, position.user_id]
      );
      
      // Record payment
      await sql(
        `INSERT INTO crypto_funding_payments
         (user_id, position_id, funding_amount, funding_rate, settlement_time)
         VALUES ($1, $2, $3, $4, NOW())`,
        [position.user_id, position.id, fundingAmount, fundingRate]
      );
      
      // Update position's funding_paid
      await sql(
        `UPDATE crypto_positions
         SET funding_paid = funding_paid + $1
         WHERE id = $2`,
        [fundingAmount, position.id]
      );
      
      // Record balance change
      const userBalance = await sql(
        `SELECT balance FROM users WHERE id = $1`,
        [position.user_id]
      );
      
      await sql(
        `INSERT INTO crypto_balance_history
         (user_id, asset, previous_balance, new_balance, change_amount, reason, related_position_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          position.user_id,
          'USDT',
          userBalance[0].balance + fundingAmount,
          userBalance[0].balance,
          fundingAmount,
          'FUNDING_COST',
          position.id
        ]
      );
      
      totalSettled += Math.abs(fundingAmount);
    }
    
    console.log(`✅ Funding settled for ${symbol}: ${positions.length} positions, ${totalSettled.toFixed(4)} USDT total`);
    
    return {
      symbol,
      fundingRate,
      positionsSettled: positions.length,
      totalSettled
    };
    
  } catch (error) {
    console.error(`Error settling funding payments: ${error.message}`);
    throw error;
  }
}

/**
 * Get funding payment history for user
 */
export async function getFundingPaymentHistory(userId, symbol = null, limit = 100) {
  try {
    let query = `
      SELECT id, position_id, funding_amount, funding_rate, settlement_time
      FROM crypto_funding_payments
      WHERE user_id = $1
    `;
    
    const params = [userId];
    
    if (symbol) {
      query += ` AND position_id IN (
        SELECT id FROM crypto_positions WHERE symbol = $2 AND user_id = $1
      )`;
      params.push(symbol);
    }
    
    query += ` ORDER BY settlement_time DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await sql(query, params);
    
    return {
      payments: result,
      totalAmount: result.reduce((sum, p) => sum + parseFloat(p.funding_amount), 0),
      count: result.length
    };
    
  } catch (error) {
    console.error(`Error getting funding payment history: ${error.message}`);
    return { payments: [], totalAmount: 0, count: 0 };
  }
}

/**
 * Calculate predicted funding payment for a position
 */
export async function predictFundingPayment(positionId) {
  try {
    const position = await sql(
      `SELECT id, symbol, quantity, side, margin_used
       FROM crypto_positions WHERE id = $1`,
      [positionId]
    );
    
    if (position.length === 0) return 0;
    
    const pos = position[0];
    const fundingInfo = await getFundingRate(pos.symbol);
    const quantity = parseFloat(pos.quantity);
    
    const fundingMultiplier = pos.side === 'LONG' ? 1 : -1;
    const predictedPayment = quantity * fundingInfo.markPrice * fundingInfo.rate * fundingMultiplier;
    
    return {
      positionId,
      symbol: pos.symbol,
      side: pos.side,
      fundingRate: fundingInfo.rate,
      predictedPayment,
      nextSettlement: fundingInfo.nextSettlement
    };
    
  } catch (error) {
    console.error(`Error predicting funding payment: ${error.message}`);
    return { error: error.message };
  }
}

export default {
  calculateFundingRate,
  recordFundingRate,
  getFundingRate,
  settleFundingPayments,
  getFundingPaymentHistory,
  predictFundingPayment,
  FUNDING_CYCLE_HOURS
};

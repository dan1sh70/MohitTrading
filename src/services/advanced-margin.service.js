// ═════════════════════════════════════════════════════════════════════════════
// ADVANCED MARGIN MANAGEMENT SERVICE
// ═════════════════════════════════════════════════════════════════════════════
// Handles:
// - Isolated vs Cross margin modes
// - Margin mode switching
// - Hedge mode (two-way) vs One-way position aggregation
// - Position merging for one-way mode
// - Margin reallocation

import { sql } from "../../db/mysql.js";
import { getMarkPrice } from "./mark-price.service.js";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MARGIN MODES
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * ISOLATED: Margin locked per position
 *   - Each position has separate margin
 *   - Loss limited to position margin
 *   - Can't affect other positions
 * 
 * CROSS: Shared margin pool
 *   - All positions share user's balance
 *   - Loss in one position affects margin ratio for all
 *   - More efficient margin usage
 */

/**
 * Switch position to isolated margin mode
 */
export async function switchToIsolatedMargin(userId, positionId, isolatedMarginAmount) {
  try {
    const position = await sql(
      `SELECT id, user_id, margin_used, status FROM crypto_positions WHERE id = $1 AND user_id = $2`,
      [positionId, userId]
    );
    
    if (position.length === 0) {
      throw new Error('Position not found');
    }
    
    if (position[0].status !== 'ACTIVE') {
      throw new Error('Can only modify active positions');
    }
    
    const requiredMargin = parseFloat(position[0].margin_used);
    
    if (isolatedMarginAmount < requiredMargin) {
      throw new Error(`Isolated margin must be at least ${requiredMargin}`);
    }
    
    // Get user balance
    const user = await sql(
      `SELECT balance FROM users WHERE id = $1`,
      [userId]
    );
    
    if (user[0].balance < isolatedMarginAmount) {
      throw new Error('Insufficient balance for isolated margin');
    }
    
    // Switch mode
    await sql(
      `UPDATE crypto_positions 
       SET margin_mode = 'ISOLATED', isolated_margin = $1, last_update = NOW()
       WHERE id = $2`,
      [isolatedMarginAmount, positionId]
    );
    
    // Track isolated margin total
    const isolatedTotal = await sql(
      `SELECT SUM(isolated_margin) as total FROM crypto_positions 
       WHERE user_id = $1 AND margin_mode = 'ISOLATED' AND status = 'ACTIVE'`,
      [userId]
    );
    
    await sql(
      `UPDATE users SET isolated_margin_total = $1 WHERE id = $2`,
      [isolatedTotal[0].total || 0, userId]
    );
    
    return {
      positionId,
      marginMode: 'ISOLATED',
      isolatedMargin: isolatedMarginAmount
    };
    
  } catch (error) {
    console.error(`Error switching to isolated margin: ${error.message}`);
    throw error;
  }
}

/**
 * Switch position to cross margin mode
 */
export async function switchToCrossMargin(userId, positionId) {
  try {
    const position = await sql(
      `SELECT id, user_id, status FROM crypto_positions WHERE id = $1 AND user_id = $2`,
      [positionId, userId]
    );
    
    if (position.length === 0) {
      throw new Error('Position not found');
    }
    
    // Switch mode
    await sql(
      `UPDATE crypto_positions 
       SET margin_mode = 'CROSS', isolated_margin = 0, last_update = NOW()
       WHERE id = $1`,
      [positionId]
    );
    
    // Update isolated margin total
    const isolatedTotal = await sql(
      `SELECT SUM(isolated_margin) as total FROM crypto_positions 
       WHERE user_id = $1 AND margin_mode = 'ISOLATED' AND status = 'ACTIVE'`,
      [userId]
    );
    
    await sql(
      `UPDATE users SET isolated_margin_total = $1 WHERE id = $2`,
      [isolatedTotal[0].total || 0, userId]
    );
    
    return {
      positionId,
      marginMode: 'CROSS'
    };
    
  } catch (error) {
    console.error(`Error switching to cross margin: ${error.message}`);
    throw error;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * HEDGE MODE vs ONE-WAY MODE
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * ONE-WAY (Default):
 *   - One position per symbol (either LONG or SHORT)
 *   - New SELL closes LONG first, opens SHORT if qty > closed amount
 *   - Simple, good for beginners
 * 
 * HEDGE MODE (Advanced):
 *   - Can have LONG and SHORT for same symbol simultaneously
 *   - Separate P&L per side
 *   - Better for hedging strategies
 */

/**
 * Enable hedge mode for user
 */
export async function enableHedgeMode(userId) {
  try {
    await sql(
      `UPDATE users SET hedge_mode = TRUE WHERE id = $1`,
      [userId]
    );
    
    return { userId, hedgeMode: true };
    
  } catch (error) {
    console.error(`Error enabling hedge mode: ${error.message}`);
    throw error;
  }
}

/**
 * Disable hedge mode for user
 */
export async function disableHedgeMode(userId) {
  try {
    // Check for conflicting positions (both LONG and SHORT for same symbol)
    const conflicts = await sql(
      `SELECT symbol, GROUP_CONCAT(DISTINCT side) as sides
       FROM crypto_positions
       WHERE user_id = $1 AND status = 'ACTIVE' AND trading_mode = 'FUTURES'
       GROUP BY symbol
       HAVING COUNT(DISTINCT side) > 1`,
      [userId]
    );
    
    if (conflicts.length > 0) {
      const symbols = conflicts.map(c => c.symbol).join(', ');
      throw new Error(`Cannot disable hedge mode: conflicting positions for ${symbols}. Close one side first.`);
    }
    
    await sql(
      `UPDATE users SET hedge_mode = FALSE WHERE id = $1`,
      [userId]
    );
    
    return { userId, hedgeMode: false };
    
  } catch (error) {
    console.error(`Error disabling hedge mode: ${error.message}`);
    throw error;
  }
}

/**
 * Get hedge mode status
 */
export async function getHedgeMode(userId) {
  try {
    const result = await sql(
      `SELECT hedge_mode FROM users WHERE id = $1`,
      [userId]
    );
    
    return result.length > 0 ? result[0].hedge_mode : false;
    
  } catch (error) {
    console.error(`Error getting hedge mode: ${error.message}`);
    return false;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POSITION AGGREGATION (for one-way mode)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Get aggregated position for symbol (one-way mode)
 * Returns net LONG or SHORT position
 */
export async function getAggregatedPosition(userId, symbol) {
  try {
    const positions = await sql(
      `SELECT id, side, quantity, entry_price, leverage, unrealised_pnl, margin_used
       FROM crypto_positions
       WHERE user_id = $1 AND symbol = $2 AND status = 'ACTIVE' AND trading_mode = 'FUTURES'
       ORDER BY entry_time ASC`,
      [userId, symbol]
    );
    
    if (positions.length === 0) {
      return null;
    }
    
    // If hedge mode, return both positions
    const hedgeMode = await getHedgeMode(userId);
    if (hedgeMode) {
      return {
        hedgeMode: true,
        positions: positions,
        count: positions.length
      };
    }
    
    // One-way: aggregate positions
    let totalQuantity = 0;
    let totalValue = 0;
    let dominantSide = null;
    
    for (const pos of positions) {
      const qty = parseFloat(pos.quantity);
      const side = pos.side;
      
      if (dominantSide === null) {
        dominantSide = side;
        totalQuantity = qty;
        totalValue = qty * parseFloat(pos.entry_price);
      } else if (side === dominantSide) {
        totalQuantity += qty;
        totalValue += qty * parseFloat(pos.entry_price);
      } else {
        // Opposite side: reduce quantity
        if (totalQuantity > qty) {
          totalQuantity -= qty;
        } else if (totalQuantity === qty) {
          totalQuantity = 0;
          dominantSide = null;
        } else {
          totalQuantity = qty - totalQuantity;
          dominantSide = side;
          totalValue = totalQuantity * parseFloat(pos.entry_price);
        }
      }
    }
    
    if (totalQuantity === 0) {
      return null;
    }
    
    const avgEntryPrice = totalValue / totalQuantity;
    
    // Calculate combined P&L and margin
    const markPrice = await getMarkPrice(symbol);
    let unrealisedPnL = 0;
    let totalMargin = 0;
    
    if (dominantSide === 'LONG') {
      unrealisedPnL = (markPrice - avgEntryPrice) * totalQuantity * positions[0].leverage;
    } else {
      unrealisedPnL = (avgEntryPrice - markPrice) * totalQuantity * positions[0].leverage;
    }
    
    for (const pos of positions) {
      totalMargin += parseFloat(pos.margin_used);
    }
    
    return {
      hedgeMode: false,
      symbol,
      side: dominantSide,
      quantity: totalQuantity,
      entryPrice: avgEntryPrice,
      currentPrice: markPrice,
      unrealisedPnL,
      margin: totalMargin,
      positionCount: positions.length,
      positions: positions
    };
    
  } catch (error) {
    console.error(`Error getting aggregated position: ${error.message}`);
    throw error;
  }
}

/**
 * Calculate margin utilization for user
 */
export async function calculateMarginUtilization(userId) {
  try {
    // Cross margin utilization
    const crossMarginResult = await sql(
      `SELECT SUM(margin_used) as used FROM crypto_positions
       WHERE user_id = $1 AND margin_mode = 'CROSS' AND status = 'ACTIVE'`,
      [userId]
    );
    
    const crossMarginUsed = parseFloat(crossMarginResult[0].used) || 0;
    
    // Isolated margin utilization
    const isolatedMarginResult = await sql(
      `SELECT SUM(isolated_margin) as total FROM crypto_positions
       WHERE user_id = $1 AND margin_mode = 'ISOLATED' AND status = 'ACTIVE'`,
      [userId]
    );
    
    const isolatedMarginUsed = parseFloat(isolatedMarginResult[0].total) || 0;
    
    const totalMarginUsed = crossMarginUsed + isolatedMarginUsed;
    
    // Get user balance
    const userResult = await sql(
      `SELECT balance FROM users WHERE id = $1`,
      [userId]
    );
    
    const balance = parseFloat(userResult[0].balance);
    const availableMargin = balance - isolatedMarginUsed; // Isolated margin is locked
    
    return {
      balance,
      marginUsed: totalMarginUsed,
      crossMarginUsed,
      isolatedMarginUsed,
      availableMargin,
      utilizationPercent: (totalMarginUsed / balance * 100).toFixed(2)
    };
    
  } catch (error) {
    console.error(`Error calculating margin utilization: ${error.message}`);
    throw error;
  }
}

export default {
  switchToIsolatedMargin,
  switchToCrossMargin,
  enableHedgeMode,
  disableHedgeMode,
  getHedgeMode,
  getAggregatedPosition,
  calculateMarginUtilization
};

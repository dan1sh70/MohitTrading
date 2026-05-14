// ═════════════════════════════════════════════════════════════════════════════
// STOP LOSS / TAKE PROFIT TRIGGER ENGINE
// ═════════════════════════════════════════════════════════════════════════════
// Monitors positions for stop loss and take profit levels
// Executes market orders when triggered
// Checks every 100ms for accuracy

import { sql } from "../../db/mysql.js";
import { getMarkPrice } from "./mark-price.service.js";
import { closePosition } from "./trade-execution.service.js";
import { redis } from "../../db/redis.js";

const CHECK_INTERVAL_MS = 100; // Check every 100ms
const TRIGGER_TOLERANCE = 0.0001; // 0.01% tolerance for trigger execution

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TRIGGER CHECKING & EXECUTION
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Check all active positions for stop loss / take profit triggers
 * Run this continuously in background
 */
export async function checkAndExecuteTriggers(symbol = null) {
  try {
    // Get all active positions with stop loss or take profit
    let query = `
      SELECT id, user_id, symbol, side, entry_price, quantity, leverage, 
             take_profit, stop_loss, margin_used, current_price
      FROM crypto_positions
      WHERE status = 'ACTIVE' 
        AND trading_mode = 'FUTURES'
        AND (take_profit IS NOT NULL OR stop_loss IS NOT NULL)
    `;
    
    const params = [];
    if (symbol) {
      query += ` AND symbol = $1`;
      params.push(symbol);
    }
    
    const positions = await sql(query, params);
    
    let triggered = 0;
    
    for (const position of positions) {
      try {
        const markPrice = await getMarkPrice(position.symbol);
        
        // Check take profit
        if (position.take_profit) {
          const tp = parseFloat(position.take_profit);
          
          if (shouldTriggerTP(markPrice, tp, position.side)) {
            console.log(`✅ Take Profit triggered for position ${position.id} at ${markPrice}`);
            
            await executeTriggeredClose(
              position.user_id,
              position.id,
              markPrice,
              'TAKE_PROFIT'
            );
            
            triggered++;
            continue;
          }
        }
        
        // Check stop loss
        if (position.stop_loss) {
          const sl = parseFloat(position.stop_loss);
          
          if (shouldTriggerSL(markPrice, sl, position.side)) {
            console.log(`⚠️ Stop Loss triggered for position ${position.id} at ${markPrice}`);
            
            await executeTriggeredClose(
              position.user_id,
              position.id,
              markPrice,
              'STOP_LOSS'
            );
            
            triggered++;
          }
        }
        
      } catch (error) {
        console.error(`Error checking triggers for position ${position.id}: ${error.message}`);
      }
    }
    
    if (triggered > 0) {
      console.log(`📊 Triggered: ${triggered} positions`);
    }
    
    return { checked: positions.length, triggered };
    
  } catch (error) {
    console.error(`Error checking triggers: ${error.message}`);
    return { checked: 0, triggered: 0, error: error.message };
  }
}

/**
 * Check if take profit should trigger
 */
function shouldTriggerTP(currentPrice, targetPrice, side) {
  if (side === 'LONG') {
    // Long position: TP triggers when price >= target
    return currentPrice >= targetPrice * (1 - TRIGGER_TOLERANCE);
  } else {
    // Short position: TP triggers when price <= target
    return currentPrice <= targetPrice * (1 + TRIGGER_TOLERANCE);
  }
}

/**
 * Check if stop loss should trigger
 */
function shouldTriggerSL(currentPrice, stopPrice, side) {
  if (side === 'LONG') {
    // Long position: SL triggers when price <= stop
    return currentPrice <= stopPrice * (1 + TRIGGER_TOLERANCE);
  } else {
    // Short position: SL triggers when price >= stop
    return currentPrice >= stopPrice * (1 - TRIGGER_TOLERANCE);
  }
}

/**
 * Execute triggered close order
 */
async function executeTriggeredClose(userId, positionId, executionPrice, triggerType) {
  try {
    const result = await sql(
      `SELECT * FROM crypto_positions WHERE id = $1 AND user_id = $2`,
      [positionId, userId]
    );
    
    if (result.length === 0) {
      throw new Error(`Position ${positionId} not found`);
    }
    
    const position = result[0];
    
    // Close position at market price
    const closeResult = await closePosition(userId, positionId, executionPrice);
    
    // Record trigger event
    await sql(
      `INSERT INTO trigger_events (position_id, user_id, trigger_type, trigger_price, execution_price, pnl, executed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        positionId,
        userId,
        triggerType,
        triggerType === 'TAKE_PROFIT' ? position.take_profit : position.stop_loss,
        executionPrice,
        closeResult.pnl
      ]
    );
    
    // Send notification
    await redis.publish(
      `user:${userId}:notifications`,
      JSON.stringify({
        type: 'TRIGGER_EXECUTED',
        triggerType,
        positionId,
        pnl: closeResult.pnl,
        executionPrice,
        timestamp: Date.now()
      })
    );
    
    return closeResult;
    
  } catch (error) {
    console.error(`Error executing triggered close: ${error.message}`);
    throw error;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POSITION TRIGGER MANAGEMENT
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Set take profit for a position
 */
export async function setTakeProfit(userId, positionId, targetPrice) {
  try {
    const result = await sql(
      `SELECT id FROM crypto_positions WHERE id = $1 AND user_id = $2 AND status = 'ACTIVE'`,
      [positionId, userId]
    );
    
    if (result.length === 0) {
      throw new Error('Position not found');
    }
    
    await sql(
      `UPDATE crypto_positions 
       SET take_profit = $1, last_update = NOW()
       WHERE id = $2`,
      [targetPrice, positionId]
    );
    
    // Cache for quick access
    await redis.set(`tp:${positionId}`, targetPrice, 'EX', 86400);
    
    return { positionId, takeProfit: targetPrice };
    
  } catch (error) {
    console.error(`Error setting take profit: ${error.message}`);
    throw error;
  }
}

/**
 * Set stop loss for a position
 */
export async function setStopLoss(userId, positionId, stopPrice) {
  try {
    const result = await sql(
      `SELECT id FROM crypto_positions WHERE id = $1 AND user_id = $2 AND status = 'ACTIVE'`,
      [positionId, userId]
    );
    
    if (result.length === 0) {
      throw new Error('Position not found');
    }
    
    await sql(
      `UPDATE crypto_positions 
       SET stop_loss = $1, last_update = NOW()
       WHERE id = $2`,
      [stopPrice, positionId]
    );
    
    // Cache for quick access
    await redis.set(`sl:${positionId}`, stopPrice, 'EX', 86400);
    
    return { positionId, stopLoss: stopPrice };
    
  } catch (error) {
    console.error(`Error setting stop loss: ${error.message}`);
    throw error;
  }
}

/**
 * Cancel take profit
 */
export async function cancelTakeProfit(userId, positionId) {
  try {
    await sql(
      `UPDATE crypto_positions 
       SET take_profit = NULL, last_update = NOW()
       WHERE id = $1 AND user_id = $2`,
      [positionId, userId]
    );
    
    await redis.del(`tp:${positionId}`);
    
    return { positionId, takeProfit: null };
    
  } catch (error) {
    console.error(`Error cancelling take profit: ${error.message}`);
    throw error;
  }
}

/**
 * Cancel stop loss
 */
export async function cancelStopLoss(userId, positionId) {
  try {
    await sql(
      `UPDATE crypto_positions 
       SET stop_loss = NULL, last_update = NOW()
       WHERE id = $1 AND user_id = $2`,
      [positionId, userId]
    );
    
    await redis.del(`sl:${positionId}`);
    
    return { positionId, stopLoss: null };
    
  } catch (error) {
    console.error(`Error cancelling stop loss: ${error.message}`);
    throw error;
  }
}

/**
 * Get trigger event history
 */
export async function getTriggerHistory(userId, limit = 50) {
  try {
    const result = await sql(
      `SELECT id, position_id, trigger_type, trigger_price, execution_price, pnl, executed_at
       FROM trigger_events
       WHERE user_id = $1
       ORDER BY executed_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    
    return result;
    
  } catch (error) {
    console.error(`Error getting trigger history: ${error.message}`);
    return [];
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BACKGROUND JOB STARTER
 * ─────────────────────────────────────────────────────────────────────────────
 */

let triggerCheckInterval = null;

/**
 * Start the trigger checking background job
 */
export function startTriggerCheckingEngine() {
  if (triggerCheckInterval) {
    console.log('Trigger checking engine already running');
    return;
  }
  
  console.log('🔍 Starting trigger checking engine (100ms interval)...');
  
  triggerCheckInterval = setInterval(async () => {
    try {
      await checkAndExecuteTriggers();
    } catch (error) {
      console.error(`Error in trigger checking loop: ${error.message}`);
    }
  }, CHECK_INTERVAL_MS);
}

/**
 * Stop the trigger checking engine
 */
export function stopTriggerCheckingEngine() {
  if (triggerCheckInterval) {
    clearInterval(triggerCheckInterval);
    triggerCheckInterval = null;
    console.log('Trigger checking engine stopped');
  }
}

export default {
  checkAndExecuteTriggers,
  setTakeProfit,
  setStopLoss,
  cancelTakeProfit,
  cancelStopLoss,
  getTriggerHistory,
  startTriggerCheckingEngine,
  stopTriggerCheckingEngine
};

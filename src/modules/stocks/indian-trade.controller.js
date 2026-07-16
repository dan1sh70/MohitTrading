/**
 * INDIAN STOCK TRADING CONTROLLER
 * 
 * Handles all Indian stock trading operations:
 * - Place buy/sell orders
 * - Manage positions (view, exit)
 * - Calculate and track performance metrics
 * - Update user balance on trade execution
 * 
 * WORKFLOW:
 * 1. User places BUY/SELL order
 * 2. Backend validates balance
 * 3. Creates position record in indian_stock_positions table
 * 4. Deducts margin from user balance
 * 5. Creates trade record for history
 * 6. User can exit position anytime
 * 7. P&L is calculated and returned to user
 * 8. Performance metrics are automatically updated
 * 
 * DATABASE TABLES:
 * - users: User balance tracking
 * - indian_stock_positions: Active and exited positions
 * - trades: Trade history (generic for all trading types)
 * - indian_stock_performance: Performance metrics
 * 
 * SCORING SYSTEM (6 METRICS):
 * 1. Consistency Score (0-100): Stability of performance
 * 2. Risk Meter (0-100): Risk management quality
 * 3. Portfolio Health (0-100): Overall account quality
 * 4. Win Rate (%): Percentage of winning trades
 * 5. Profit Factor: Gross Profit / Gross Loss ratio
 * 6. Capital Evaluation (0-100): Capital efficiency
 * 
 * GRADE ASSIGNMENT:
 * Score >= 90: A (Expert Trader)
 * Score >= 75: B (Good Trader)
 * Score >= 60: C (Average Trader)
 * Score >= 45: D (Below Average)
 * Score < 45: F (Poor Trader)
 */

import { sql } from "../../db/mysql.js";
import { writeAuditLog } from "../../utils/audit-log.js";
import { getIndianStockPrice } from "../../services/upstox.service.js";
import {
  createIndianStockLimitOrder,
  getIndianStockLimitOrders,
  processPendingIndianStockLimitOrders
} from "../../services/indian-order.service.js";
import { calculateTradefinityMetrics } from "../../services/tradefinity-performance.service.js";

const USD_INR_RATE = 83.5;

// ═══════════════════════════════════════════════════════════════════════════
// PLACE BUY ORDER
// ═══════════════════════════════════════════════════════════════════════════

export async function buyIndianStock(req, res) {
  console.log(`[IndianTrade] Buy request received - Path: ${req.path}, User: ${req.user?.id}`);
  
  const { symbol, quantity, entryPrice: bodyEntryPrice, timeFrame, marginUsed, charges, orderType } = req.validatedBody;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  
  try {
    let entryPrice = bodyEntryPrice;
    if (orderType === 'MARKET') {
      try {
        const priceData = await getIndianStockPrice(symbol.toUpperCase());
        entryPrice = parseFloat(priceData.price || priceData.currentPrice || entryPrice);
      } catch (err) {
        console.warn(`[IndianTrade] Failed to fetch live price for MARKET order: ${err.message}`);
      }
    }

    const userResult = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
    if (userResult.rowCount === 0) return res.status(404).json({ message: "User not found" });
    const currentBalance = parseFloat((userResult.rows || userResult)[0].balance);

    if (orderType === 'LIMIT') {
      if (!entryPrice) return res.status(400).json({ message: 'Price is required for LIMIT orders' });
      const orderId = await createIndianStockLimitOrder({
        userId, symbol, quantity, price: entryPrice, side: 'BUY', timeFrame, marginUsed, charges
      });
      return res.status(201).json({ message: 'Limit order placed (pending)', orderId, status: 'PENDING' });
    }

    // --- NEW LOGIC: FIND AND CLOSE EXISTING SELL (SHORT) POSITIONS FIRST ---
    const activeShortsResult = await sql(
      `SELECT * FROM indian_stock_positions WHERE user_id = $1 AND symbol = $2 AND status = 'ACTIVE' AND trade_type = 'SELL' ORDER BY entry_time ASC`,
      [userId, symbol.toUpperCase()]
    );
    
    let activeShorts = activeShortsResult.rows || activeShortsResult;
    let remainingToBuy = quantity;
    let totalPnl = 0;
    let marginReleasedINR = 0;
    const closedPositionIds = [];

    // 1. Process closing of existing short positions
    for (const position of activeShorts) {
      if (remainingToBuy <= 0) break;

      const pQuantity = position.quantity;
      const closeQty = Math.min(pQuantity, remainingToBuy);
      // For short, profit is when entry > exit
      const pnl = (position.entry_price - entryPrice) * closeQty;
      const pnlPercent = ((position.entry_price - entryPrice) / position.entry_price) * 100;
      
      const marginRatio = closeQty / pQuantity;
      const marginToRelease = position.margin_used * marginRatio;

      totalPnl += pnl;
      marginReleasedINR += marginToRelease;
      remainingToBuy -= closeQty;

      if (closeQty === pQuantity) {
        // Full close
        await sql(
          `UPDATE indian_stock_positions SET status = 'EXITED', exit_price = $1, exit_time = NOW(), pnl = $2, pnl_percent = $3 WHERE id = $4`,
          [entryPrice, pnl, pnlPercent, position.id]
        );
        closedPositionIds.push(position.id);
      } else {
        // Partial close
        const newMargin = position.margin_used - marginToRelease;
        const newQty = pQuantity - closeQty;
        
        // Update original position
        await sql(
          `UPDATE indian_stock_positions SET quantity = $1, margin_used = $2 WHERE id = $3`,
          [newQty, newMargin, position.id]
        );
        
        // Create an EXITED record
        const exitedRecord = await sql(
          `INSERT INTO indian_stock_positions 
           (user_id, symbol, quantity, entry_price, current_price, trade_type, time_frame, entry_time, exit_time, status, exit_price, margin_used, charges, pnl, pnl_percent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'EXITED', $9, $10, $11, $12, $13)`,
          [userId, position.symbol, closeQty, position.entry_price, entryPrice, 'SELL', position.time_frame, position.entry_time, entryPrice, marginToRelease, position.charges * marginRatio, pnl, pnlPercent]
        );
        closedPositionIds.push(exitedRecord.insertId || exitedRecord[0]?.insertId);
      }
    }

    // 2. Add short proceeds / margin back to balance
    let balanceAdjustmentINR = marginReleasedINR + totalPnl - charges;
    let balanceAdjustmentUSD = balanceAdjustmentINR / USD_INR_RATE;

    if (closedPositionIds.length > 0) {
      console.log(`[IndianTrade] Closed short positions. Adjusting balance by ${balanceAdjustmentUSD} USD`);
      await sql(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [balanceAdjustmentUSD, userId]);
      
      // Also update performance engine!
      await updatePerformanceMetrics(userId);
    }

    // 3. Open a LONG position for any remaining quantity
    let newPositionId = null;
    if (remainingToBuy > 0) {
      const longMarginUsed = (remainingToBuy / quantity) * marginUsed;
      const longCharges = (remainingToBuy / quantity) * charges;
      const totalLongCostUSD = (longMarginUsed + longCharges) / USD_INR_RATE;

      // Check balance for the new position
      if ((currentBalance + (closedPositionIds.length > 0 ? balanceAdjustmentUSD : 0)) < totalLongCostUSD) {
        return res.status(400).json({ message: "Insufficient balance to open new long position." });
      }

      // Deduct from balance
      await sql(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [totalLongCostUSD, userId]);
      balanceAdjustmentUSD -= totalLongCostUSD;

      const result = await sql(
        `INSERT INTO indian_stock_positions 
         (user_id, symbol, quantity, entry_price, current_price, trade_type, time_frame, entry_time, status, margin_used, charges)
         VALUES ($1, $2, $3, $4, $5, 'BUY', $6, NOW(), 'ACTIVE', $7, $8)`,
        [userId, symbol.toUpperCase(), remainingToBuy, entryPrice, entryPrice, timeFrame, longMarginUsed, longCharges]
      );
      newPositionId = result.insertId || result[0]?.insertId;
    }

    // 4. Create single generic trade record for the action
    await sql(
      `INSERT INTO trades (user_id, trading_type, symbol, side, quantity, price, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, 'indian_stock', symbol.toUpperCase(), 'BUY', quantity, entryPrice, 'CLOSED']
    );

    // Write audit log
    await writeAuditLog({
      actorUserId: userId,
      action: 'INDIAN_STOCK_BUY',
      targetType: 'position',
      targetId: newPositionId ? String(newPositionId) : 'CLOSED_MULTIPLE',
      details: { symbol, quantity, entryPrice, timeFrame, marginUsed, charges, closedPositionIds, longPositionId: newPositionId }
    });

    return res.status(201).json({
      message: "Buy order processed successfully",
      closedPositions: closedPositionIds,
      newLongPosition: newPositionId,
      symbol,
      quantity,
      entryPrice,
      totalPnl,
      netProceedsUSD: balanceAdjustmentUSD,
      remainingBalance: currentBalance + balanceAdjustmentUSD
    });
  } catch (error) {
    console.error(`[IndianTrade] ERROR processing buy:`, error);
    return res.status(500).json({ message: "Failed to process buy order", error: error.message });
  }
}

export async function sellIndianStock(req, res) {
  console.log(`[IndianTrade] Sell request received - Path: ${req.path}, User: ${req.user?.id}`);
  
  const { symbol, quantity, entryPrice: bodyEntryPrice, timeFrame, marginUsed, charges, orderType } = req.validatedBody;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    let entryPrice = bodyEntryPrice;
    if (orderType === 'MARKET') {
      try {
        const priceData = await getIndianStockPrice(symbol.toUpperCase());
        entryPrice = parseFloat(priceData.price || priceData.currentPrice || entryPrice);
      } catch (err) {
        console.warn(`[IndianTrade] Failed to fetch live price for MARKET sell order: ${err.message}`);
      }
    }

    const userResult = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
    if (userResult.rowCount === 0) return res.status(404).json({ message: "User not found" });
    const currentBalance = parseFloat((userResult.rows || userResult)[0].balance);

    const normalizedTimeFrame = (timeFrame || '').toString().trim().toLowerCase();
    const isIntraday = normalizedTimeFrame === 'intraday';

    if (orderType === 'LIMIT') {
      if (!entryPrice) return res.status(400).json({ message: 'Price is required for LIMIT orders' });
      const orderId = await createIndianStockLimitOrder({
        userId, symbol, quantity, price: entryPrice, side: 'SELL', timeFrame, marginUsed, charges
      });
      return res.status(201).json({ message: 'Limit sell order placed (pending)', orderId, status: 'PENDING' });
    }

    // --- NEW LOGIC: FIND AND CLOSE EXISTING BUY POSITIONS FIRST ---
    const activeBuysResult = await sql(
      `SELECT * FROM indian_stock_positions WHERE user_id = $1 AND symbol = $2 AND status = 'ACTIVE' AND trade_type = 'BUY' ORDER BY entry_time ASC`,
      [userId, symbol.toUpperCase()]
    );
    
    let activeBuys = activeBuysResult.rows || activeBuysResult;
    let remainingToSell = quantity;
    let totalPnl = 0;
    let marginReleasedINR = 0;
    const closedPositionIds = [];

    // If delivery mode and trying to sell more than they own, reject immediately
    if (!isIntraday) {
      const totalOwned = activeBuys.reduce((sum, p) => sum + p.quantity, 0);
      if (totalOwned < quantity) {
        return res.status(400).json({ message: `Delivery sell failed. You only own ${totalOwned} shares of ${symbol}.` });
      }
    }

    // 1. Process closing of existing long positions
    for (const position of activeBuys) {
      if (remainingToSell <= 0) break;

      const pQuantity = position.quantity;
      const closeQty = Math.min(pQuantity, remainingToSell);
      const pnl = (entryPrice - position.entry_price) * closeQty;
      const pnlPercent = ((entryPrice - position.entry_price) / position.entry_price) * 100;
      
      const marginRatio = closeQty / pQuantity;
      const marginToRelease = position.margin_used * marginRatio;

      totalPnl += pnl;
      marginReleasedINR += marginToRelease;
      remainingToSell -= closeQty;

      if (closeQty === pQuantity) {
        // Full close
        await sql(
          `UPDATE indian_stock_positions SET status = 'EXITED', exit_price = $1, exit_time = NOW(), pnl = $2, pnl_percent = $3 WHERE id = $4`,
          [entryPrice, pnl, pnlPercent, position.id]
        );
        closedPositionIds.push(position.id);
      } else {
        // Partial close
        const newMargin = position.margin_used - marginToRelease;
        const newQty = pQuantity - closeQty;
        
        // Update original position to hold the remaining qty
        await sql(
          `UPDATE indian_stock_positions SET quantity = $1, margin_used = $2 WHERE id = $3`,
          [newQty, newMargin, position.id]
        );
        
        // Create an EXITED record for the closed portion to track history/performance
        const exitedRecord = await sql(
          `INSERT INTO indian_stock_positions 
           (user_id, symbol, quantity, entry_price, current_price, trade_type, time_frame, entry_time, exit_time, status, exit_price, margin_used, charges, pnl, pnl_percent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'EXITED', $9, $10, $11, $12, $13)`,
          [userId, position.symbol, closeQty, position.entry_price, entryPrice, 'BUY', position.time_frame, position.entry_time, entryPrice, marginToRelease, position.charges * marginRatio, pnl, pnlPercent]
        );
        closedPositionIds.push(exitedRecord.insertId || exitedRecord[0]?.insertId);
      }
    }

    // 2. Add sell proceeds / margin back to balance
    // The user gets their initial margin back PLUS the profit (or minus the loss)
    // Less the charges for this new sell transaction
    let balanceAdjustmentINR = marginReleasedINR + totalPnl - charges;
    let balanceAdjustmentUSD = balanceAdjustmentINR / USD_INR_RATE;

    if (closedPositionIds.length > 0) {
      console.log(`[IndianTrade] Closed positions. Adjusting balance by ${balanceAdjustmentUSD} USD`);
      await sql(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [balanceAdjustmentUSD, userId]);
      
      // Also update performance engine!
      await updatePerformanceMetrics(userId);
    }

    // 3. Open a SHORT position for any remaining quantity (only if intraday)
    let newPositionId = null;
    if (remainingToSell > 0) {
      const shortMarginUsed = (remainingToSell / quantity) * marginUsed;
      const shortCharges = (remainingToSell / quantity) * charges;
      const totalShortCostUSD = (shortMarginUsed + shortCharges) / USD_INR_RATE;

      // Deduct from balance
      await sql(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [totalShortCostUSD, userId]);
      balanceAdjustmentUSD -= totalShortCostUSD; // Update total tracked change

      const result = await sql(
        `INSERT INTO indian_stock_positions 
         (user_id, symbol, quantity, entry_price, current_price, trade_type, time_frame, entry_time, status, margin_used, charges)
         VALUES ($1, $2, $3, $4, $5, 'SELL', $6, NOW(), 'ACTIVE', $7, $8)`,
        [userId, symbol.toUpperCase(), remainingToSell, entryPrice, entryPrice, timeFrame, shortMarginUsed, shortCharges]
      );
      newPositionId = result.insertId || result[0]?.insertId;
    }

    // 4. Create single generic trade record for the action
    await sql(
      `INSERT INTO trades (user_id, trading_type, symbol, side, quantity, price, status) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, 'indian_stock', symbol.toUpperCase(), 'SELL', quantity, entryPrice, 'CLOSED']
    );

    // Write audit log
    await writeAuditLog({
      actorUserId: userId,
      action: 'INDIAN_STOCK_SELL',
      targetType: 'position',
      targetId: newPositionId ? String(newPositionId) : 'CLOSED_MULTIPLE',
      details: { symbol, quantity, entryPrice, timeFrame, marginUsed, charges, closedPositionIds, shortPositionId: newPositionId }
    });

    return res.status(201).json({
      message: "Sell order processed successfully",
      closedPositions: closedPositionIds,
      newShortPosition: newPositionId,
      symbol,
      quantity,
      entryPrice,
      totalPnl,
      netProceedsUSD: balanceAdjustmentUSD,
      remainingBalance: currentBalance + balanceAdjustmentUSD
    });
  } catch (error) {
    console.error(`[IndianTrade] ERROR processing sell:`, error);
    return res.status(500).json({ message: "Failed to process sell order", error: error.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET USER POSITIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function getIndianStockPositions(req, res) {
  const userId = req.user?.id;
  const status = req.query.status || 'ACTIVE';

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    const result = await sql(
      `
        SELECT 
          id, symbol, quantity, entry_price, current_price, pnl, pnl_percent,
          trade_type, time_frame, entry_time, exit_time, status, exit_price,
          margin_used, charges
        FROM indian_stock_positions
        WHERE user_id = $1 AND status = $2
        ORDER BY entry_time DESC
      `,
      [userId, status]
    );

    // Fetch live market prices for all positions
    const positionsWithLivePrices = await Promise.all(
      result.rows.map(async (position) => {
        try {
          const priceData = await getIndianStockPrice(position.symbol);
          const currentPrice = parseFloat(priceData.price || priceData.currentPrice || position.current_price);
          const entryPrice = parseFloat(position.entry_price);
          const quantity = parseInt(position.quantity);
          
          // Calculate real-time P&L
          let pnl, pnlPercent;
          if (position.trade_type === 'BUY') {
            pnl = (currentPrice - entryPrice) * quantity;
            pnlPercent = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
          } else { // SELL/SHORT
            pnl = (entryPrice - currentPrice) * quantity;
            pnlPercent = entryPrice > 0 ? ((entryPrice - currentPrice) / entryPrice) * 100 : 0;
          }
          
          return {
            ...position,
            current_price: currentPrice,
            pnl: parseFloat(pnl.toFixed(2)),
            pnl_percent: parseFloat(pnlPercent.toFixed(2)),
            last_update: Date.now()
          };
        } catch (error) {
          console.error(`[Indian Stock Positions] Failed to fetch price for ${position.symbol}:`, error.message);
          // Return position with stored price if live fetch fails
          return {
            ...position,
            last_update: Date.now()
          };
        }
      })
    );

    return res.json({
      count: positionsWithLivePrices.length,
      positions: positionsWithLivePrices,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Error fetching positions:", error.message);
    return res.status(500).json({ message: "Failed to fetch positions", error: error.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET POSITION DETAILS
// ═══════════════════════════════════════════════════════════════════════════

export async function getPositionDetails(req, res) {
  const { positionId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    const result = await sql(
      `
        SELECT * FROM indian_stock_positions
        WHERE id = $1 AND user_id = $2
      `,
      [positionId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Position not found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching position details:", error.message);
    return res.status(500).json({ message: "Failed to fetch position details", error: error.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXIT POSITION
// ═══════════════════════════════════════════════════════════════════════════

export async function exitPosition(req, res) {
  const { positionId } = req.params;
  const { exitPrice } = req.validatedBody;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    // Get position details
    const positionResult = await sql(
      `SELECT * FROM indian_stock_positions WHERE id = $1 AND user_id = $2`,
      [positionId, userId]
    );

    if (positionResult.rowCount === 0) {
      return res.status(404).json({ message: "Position not found" });
    }

    const position = positionResult.rows[0];

    if (position.status === 'EXITED') {
      return res.status(400).json({ message: "Position already exited" });
    }

    // Calculate PnL
    let pnl, pnlPercent;
    if (position.trade_type === 'BUY') {
      pnl = (exitPrice - position.entry_price) * position.quantity;
      pnlPercent = ((exitPrice - position.entry_price) / position.entry_price) * 100;
    } else {
      // SELL position - profit when price goes down
      pnl = (position.entry_price - exitPrice) * position.quantity;
      pnlPercent = ((position.entry_price - exitPrice) / position.entry_price) * 100;
    }

    // Update position with exit details
    await sql(
      `
        UPDATE indian_stock_positions
        SET status = $1, exit_price = $2, exit_time = NOW(), pnl = $3, pnl_percent = $4
        WHERE id = $5
      `,
      ['EXITED', exitPrice, pnl, pnlPercent, positionId]
    );

    // Update user balance - return margin + pnl (converted to USD)
    const balanceAdjustmentINR = position.margin_used + pnl;
    const balanceAdjustment = balanceAdjustmentINR / USD_INR_RATE;
    await sql(
      `UPDATE users SET balance = balance + $1 WHERE id = $2`,
      [balanceAdjustment, userId]
    );

    // Close associated trade
    await sql(
      `
        UPDATE trades
        SET status = 'CLOSED', pnl = $1
        WHERE user_id = $2 AND symbol = $3 AND trading_type = $4
        ORDER BY created_at DESC LIMIT 1
      `,
      [pnl, userId, position.symbol, 'indian_stock']
    );

    // Write audit log
    await writeAuditLog({
      actorUserId: userId,
      action: 'INDIAN_STOCK_EXIT',
      targetType: 'position',
      targetId: String(positionId),
      details: { symbol: position.symbol, exitPrice, pnl, pnlPercent }
    });

    // Update performance metrics
    await updatePerformanceMetrics(userId);

    return res.json({
      message: "Position exited successfully",
      position: {
        id: positionId,
        symbol: position.symbol,
        quantity: position.quantity,
        entryPrice: position.entry_price,
        exitPrice,
        pnl,
        pnlPercent: pnlPercent.toFixed(2),
        marginReturned: position.margin_used
      }
    });
  } catch (error) {
    console.error("Error exiting position:", error.message);
    return res.status(500).json({ message: "Failed to exit position", error: error.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET PERFORMANCE METRICS
// ═══════════════════════════════════════════════════════════════════════════

export async function getPerformanceMetrics(req, res) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    // Check if performance record exists to get basic saved stats
    let result = await sql(
      `SELECT * FROM indian_stock_performance WHERE user_id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      await sql(`INSERT INTO indian_stock_performance (user_id) VALUES ($1)`, [userId]);
      result = await sql(`SELECT * FROM indian_stock_performance WHERE user_id = $1`, [userId]);
    }

    // Generate dynamic full 21-field Report Card
    const positionsResult = await sql(`SELECT * FROM indian_stock_positions WHERE user_id = $1 AND status = 'EXITED'`, [userId]);
    const userResult = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
    const accountEquity = userResult.rowCount > 0 ? parseFloat(userResult.rows[0].balance) * USD_INR_RATE : 1000000;
    
    const metrics = calculateTradefinityMetrics(positionsResult.rows, accountEquity, 0, 0);
    
    // Calculate Percentile & Ranking
    const rankResult = await sql(`SELECT COUNT(*) as total_users FROM indian_stock_performance WHERE total_trades > 0`);
    const belowResult = await sql(`SELECT COUNT(*) as users_below FROM indian_stock_performance WHERE overall_score < $1 AND total_trades > 0`, [metrics.overallScore]);
    
    const totalUsers = parseInt(rankResult.rows[0]?.total_users || 1);
    const usersBelow = parseInt(belowResult.rows[0]?.users_below || 0);
    const percentile_rank = totalUsers > 0 ? parseFloat(((usersBelow / totalUsers) * 100).toFixed(2)) : 0;
    const higherResult = await sql(`SELECT COUNT(*) as users_above FROM indian_stock_performance WHERE overall_score > $1 AND total_trades > 0`, [metrics.overallScore]);
    const global_rank = parseInt(higherResult.rows[0]?.users_above || 0) + 1;
    
    // Calculate Improvement (if previous score exists in db, otherwise 0)
    const storedScore = result.rows[0]?.overall_score || 0;
    const previousScore = result.rows[0]?.previous_score || storedScore; // Assuming previous_score might be added later
    const improvement = metrics.overallScore - previousScore;
    
    const reportCard = {
      ...result.rows[0],
      ...metrics, // Overwrites DB fields with full 21-field dynamic engine output
      percentile_rank,
      global_rank,
      improvement
    };

    return res.json(reportCard);
  } catch (error) {
    console.error("Error fetching performance metrics:", error.message);
    return res.status(500).json({ message: "Failed to fetch performance metrics", error: error.message });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE PERFORMANCE METRICS (Internal function)
// ═══════════════════════════════════════════════════════════════════════════

async function updatePerformanceMetrics(userId) {
  try {
    // Get all trades and exited positions for this user
    const tradesResult = await sql(
      `SELECT * FROM trades WHERE user_id = $1 AND trading_type = 'indian_stock'`,
      [userId]
    );
    
    const positionsResult = await sql(
      `SELECT * FROM indian_stock_positions WHERE user_id = $1 AND status = 'EXITED'`,
      [userId]
    );

    const positions = positionsResult.rows;
    
    if (positions.length === 0) {
      // Initialize or reset performance
      await sql(
        `
          UPDATE indian_stock_performance
          SET total_trades = 0, winning_trades = 0, losing_trades = 0,
              total_profit_loss = 0, realised_pnl = 0, win_rate = 0,
              profit_factor = 0, consistency_score = 0, risk_meter = 0,
              portfolio_health = 0, capital_evaluation_score = 0,
              overall_score = 0, overall_grade = 'D'
          WHERE user_id = $1
        `,
        [userId]
      );
      return;
    }

    // Get user's account equity (current balance) to calculate accurate metrics
    const userResult = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
    const accountEquity = userResult.rowCount > 0 ? parseFloat(userResult.rows[0].balance) * USD_INR_RATE : 1000000;

    // Use TRADEFINITY PERFORMANCE ENGINE v2.1 to calculate all 6+ metrics
    const metrics = calculateTradefinityMetrics(positions, accountEquity, 0, 0);

    // Update performance record
    await sql(
      `
        UPDATE indian_stock_performance
        SET 
          total_profit_loss = $1,
          realised_pnl = $2,
          total_trades = $3,
          winning_trades = $4,
          losing_trades = $5,
          win_rate = $6,
          avg_profit = $7,
          avg_loss = $8,
          profit_factor = $9,
          consistency_score = $10,
          risk_meter = $11,
          portfolio_health = $12,
          win_loss_ratio = $13,
          capital_evaluation_score = $14,
          overall_grade = $15,
          overall_score = $16
        WHERE user_id = $17
      `,
      [
        metrics.totalProfitLoss,
        metrics.realisedPnl,
        metrics.totalTrades,
        metrics.winningTrades,
        metrics.losingTrades,
        metrics.winRate,
        metrics.avgProfit,
        metrics.avgLoss,
        metrics.profitFactor,
        metrics.consistencyScore,
        metrics.riskMeter,
        metrics.portfolioHealth,
        metrics.winLossRatio,
        metrics.capitalEvaluationScore,
        metrics.overallGrade,
        metrics.overallScore,
        userId
      ]
    );
  } catch (error) {
    console.error("Error updating performance metrics:", error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PENDING LIMIT ORDERS: List and Processing
// ═══════════════════════════════════════════════════════════════════════════

export async function getIndianStockOrders(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'User not authenticated' });

  try {
    const orders = await getIndianStockLimitOrders(userId);
    return res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    console.error('Error fetching Indian stock orders:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function processPendingIndianOrders(req, res) {
  try {
    const result = await processPendingIndianStockLimitOrders();
    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('Error processing pending Indian orders:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// UPDATE INDIAN STOCK TRADE (stub - full implementation pending)
export async function updateIndianStock(req, res) {
  return res.status(501).json({
    success: false,
    message: "Update trade endpoint not yet implemented. Use exit position instead."
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET PORTFOLIO (open positions only, matching crypto portfolio schema)
// ═══════════════════════════════════════════════════════════════════════════

export async function getIndianStockPortfolio(req, res) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    // 1. Get user balance
    const userResult = await sql(
      `SELECT balance FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const balance = parseFloat(userResult.rows[0].balance);

    // 2. Get active positions grouped by symbol and trade_type
    const result = await sql(
      `
        SELECT 
          symbol,
          trade_type,
          SUM(quantity) as quantity,
          SUM(quantity * entry_price) / SUM(quantity) as entry_price
        FROM indian_stock_positions
        WHERE user_id = $1 AND status = 'ACTIVE'
        GROUP BY symbol, trade_type
      `,
      [userId]
    );

    const positions = result.rows || [];

    // 3. Fetch live market prices for all active positions and compute stats
    const portfolio = await Promise.all(
      positions.map(async (position) => {
        let currentPrice = parseFloat(position.current_price || position.entry_price || 0);
        let liveFetchFailed = false;

        try {
          const priceData = await getIndianStockPrice(position.symbol);
          currentPrice = parseFloat(priceData.price || priceData.currentPrice || currentPrice);
        } catch (error) {
          console.error(`[Indian Stock Portfolio] Failed to fetch price for ${position.symbol}:`, error.message);
          liveFetchFailed = true;
        }

        const entryPrice = parseFloat(position.entry_price);
        const quantity = parseInt(position.quantity);
        
        let value = 0;
        let pnl = 0;
        let pnlPercent = 0;

        if (position.trade_type === 'BUY') {
          value = quantity * currentPrice;
          pnl = (currentPrice - entryPrice) * quantity;
          pnlPercent = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
        } else { // SELL (Short Position)
          value = quantity * currentPrice;
          pnl = (entryPrice - currentPrice) * quantity;
          pnlPercent = entryPrice > 0 ? ((entryPrice - currentPrice) / entryPrice) * 100 : 0;
        }

        const resultObj = {
          symbol: position.symbol,
          quantity,
          avgPrice: entryPrice,
          currentPrice,
          value: parseFloat(value.toFixed(2)),
          pnl: parseFloat(pnl.toFixed(2)),
          pnlPercent: pnlPercent.toFixed(2),
          tradeType: position.trade_type
        };

        if (liveFetchFailed) {
          resultObj.warning = "Showing last cached price";
        }

        return resultObj;
      })
    );

    return res.json({
      balance,
      positions: portfolio,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Get Indian stocks portfolio error:", error);
    return res.status(500).json({ message: "Failed to fetch portfolio", error: error.message });
  }
}



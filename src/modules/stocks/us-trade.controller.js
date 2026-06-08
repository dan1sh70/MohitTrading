import { sql } from "../../db/mysql.js";
import { writeAuditLog } from "../../utils/audit-log.js";
import { calculateTradefinityMetrics } from "../../services/tradefinity-performance.service.js";
import { getStockPrice } from "../../services/alpha-vantage.service.js";

// Basic config for US Stocks
const MARGIN_MULTIPLIER = 1; // 1x leverage by default
const DEFAULT_CHARGES = 0.50; // $0.50 default charge

export async function buyUsStock(req, res) {
  const { symbol, quantity, entryPrice: bodyEntryPrice, timeFrame = 'INTRADAY', orderType = 'MARKET' } = req.validatedBody;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: "User not authenticated" });

  try {
    let entryPrice = bodyEntryPrice;
    if (orderType === 'MARKET') {
      try {
        const priceData = await getStockPrice(symbol.toUpperCase());
        entryPrice = parseFloat(priceData.price || entryPrice);
      } catch (err) {
        console.warn(`[UsTrade] Failed to fetch live price, falling back to body: ${err.message}`);
      }
    }

    if (!entryPrice) return res.status(400).json({ message: "Entry price is required" });

    const userResult = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
    if (userResult.rowCount === 0) return res.status(404).json({ message: "User not found" });
    const currentBalance = parseFloat((userResult.rows || userResult)[0].balance);

    // --- CLOSE EXISTING SHORT POSITIONS ---
    const activeShortsResult = await sql(
      `SELECT * FROM us_stock_positions WHERE user_id = $1 AND symbol = $2 AND status = 'ACTIVE' AND trade_type = 'SELL' ORDER BY entry_time ASC`,
      [userId, symbol.toUpperCase()]
    );
    
    let activeShorts = activeShortsResult.rows || activeShortsResult;
    let remainingToBuy = quantity;
    let totalPnl = 0;
    let marginReleased = 0;
    const closedPositionIds = [];

    for (const position of activeShorts) {
      if (remainingToBuy <= 0) break;

      const pQuantity = parseFloat(position.quantity);
      const closeQty = Math.min(pQuantity, remainingToBuy);
      const pnl = (position.entry_price - entryPrice) * closeQty; // Short profit
      const pnlPercent = ((position.entry_price - entryPrice) / position.entry_price) * 100;
      
      const marginRatio = closeQty / pQuantity;
      const marginToRelease = position.margin_used * marginRatio;

      totalPnl += pnl;
      marginReleased += marginToRelease;
      remainingToBuy -= closeQty;

      if (closeQty === pQuantity) {
        await sql(
          `UPDATE us_stock_positions SET status = 'EXITED', exit_price = $1, exit_time = NOW(), pnl = $2, pnl_percent = $3 WHERE id = $4`,
          [entryPrice, pnl, pnlPercent, position.id]
        );
        closedPositionIds.push(position.id);
      } else {
        const newMargin = position.margin_used - marginToRelease;
        const newQty = pQuantity - closeQty;
        
        await sql(
          `UPDATE us_stock_positions SET quantity = $1, margin_used = $2 WHERE id = $3`,
          [newQty, newMargin, position.id]
        );
        
        const exitedRecord = await sql(
          `INSERT INTO us_stock_positions 
           (user_id, symbol, quantity, entry_price, current_price, trade_type, time_frame, entry_time, exit_time, status, exit_price, margin_used, charges, pnl, pnl_percent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'EXITED', $9, $10, $11, $12, $13)`,
          [userId, position.symbol, closeQty, position.entry_price, entryPrice, 'SELL', position.time_frame, position.entry_time, entryPrice, marginToRelease, position.charges * marginRatio, pnl, pnlPercent]
        );
        closedPositionIds.push(exitedRecord.insertId || exitedRecord[0]?.insertId);
      }
    }

    let balanceAdjustment = marginReleased + totalPnl;
    
    if (closedPositionIds.length > 0) {
      await sql(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [balanceAdjustment, userId]);
      await updateUsPerformanceMetrics(userId);
    }

    // --- OPEN NEW LONG POSITION ---
    let newPositionId = null;
    let totalLongCost = 0;
    if (remainingToBuy > 0) {
      const marginUsed = (remainingToBuy * entryPrice) / MARGIN_MULTIPLIER;
      const charges = DEFAULT_CHARGES;
      totalLongCost = marginUsed + charges;

      if ((currentBalance + balanceAdjustment) < totalLongCost) {
        return res.status(400).json({ message: "Insufficient balance to open new long position." });
      }

      await sql(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [totalLongCost, userId]);
      balanceAdjustment -= totalLongCost;

      const result = await sql(
        `INSERT INTO us_stock_positions 
         (user_id, symbol, quantity, entry_price, current_price, trade_type, time_frame, entry_time, status, margin_used, charges)
         VALUES ($1, $2, $3, $4, $5, 'BUY', $6, NOW(), 'ACTIVE', $7, $8)`,
        [userId, symbol.toUpperCase(), remainingToBuy, entryPrice, entryPrice, timeFrame, marginUsed, charges]
      );
      newPositionId = result.insertId || result[0]?.insertId;
    }

    await sql(
      `INSERT INTO trades (user_id, trading_type, symbol, side, quantity, price, status) VALUES ($1, 'other', $2, 'BUY', $3, $4, 'CLOSED')`,
      [userId, symbol.toUpperCase(), quantity, entryPrice]
    );

    await writeAuditLog({
      actorUserId: userId,
      action: 'US_STOCK_BUY',
      targetType: 'position',
      targetId: newPositionId ? String(newPositionId) : 'CLOSED_MULTIPLE',
      details: { symbol, quantity, entryPrice, closedPositionIds, longPositionId: newPositionId }
    });

    return res.status(201).json({
      message: "Buy order processed successfully",
      closedPositions: closedPositionIds,
      newLongPosition: newPositionId,
      symbol, quantity, entryPrice, totalPnl, 
      netProceedsUSD: balanceAdjustment,
      remainingBalance: currentBalance + balanceAdjustment
    });
  } catch (error) {
    console.error(`[UsTrade] ERROR:`, error);
    return res.status(500).json({ message: "Failed to process buy order", error: error.message });
  }
}

export async function sellUsStock(req, res) {
  const { symbol, quantity, entryPrice: bodyEntryPrice, timeFrame = 'INTRADAY', orderType = 'MARKET' } = req.validatedBody;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ message: "User not authenticated" });

  try {
    let entryPrice = bodyEntryPrice;
    if (orderType === 'MARKET') {
      try {
        const priceData = await getStockPrice(symbol.toUpperCase());
        entryPrice = parseFloat(priceData.price || entryPrice);
      } catch (err) {
        console.warn(`[UsTrade] Failed to fetch live price, falling back to body: ${err.message}`);
      }
    }

    if (!entryPrice) return res.status(400).json({ message: "Entry price is required" });

    const userResult = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
    if (userResult.rowCount === 0) return res.status(404).json({ message: "User not found" });
    const currentBalance = parseFloat((userResult.rows || userResult)[0].balance);

    const isIntraday = timeFrame.toUpperCase() === 'INTRADAY';

    // --- CLOSE EXISTING LONG POSITIONS ---
    const activeBuysResult = await sql(
      `SELECT * FROM us_stock_positions WHERE user_id = $1 AND symbol = $2 AND status = 'ACTIVE' AND trade_type = 'BUY' ORDER BY entry_time ASC`,
      [userId, symbol.toUpperCase()]
    );
    
    let activeBuys = activeBuysResult.rows || activeBuysResult;
    let remainingToSell = quantity;
    let totalPnl = 0;
    let marginReleased = 0;
    const closedPositionIds = [];

    if (!isIntraday) {
      const totalOwned = activeBuys.reduce((sum, p) => sum + parseFloat(p.quantity), 0);
      if (totalOwned < quantity) {
        return res.status(400).json({ message: `Delivery sell failed. You only own ${totalOwned} shares of ${symbol}.` });
      }
    }

    for (const position of activeBuys) {
      if (remainingToSell <= 0) break;

      const pQuantity = parseFloat(position.quantity);
      const closeQty = Math.min(pQuantity, remainingToSell);
      const pnl = (entryPrice - position.entry_price) * closeQty;
      const pnlPercent = ((entryPrice - position.entry_price) / position.entry_price) * 100;
      
      const marginRatio = closeQty / pQuantity;
      const marginToRelease = position.margin_used * marginRatio;

      totalPnl += pnl;
      marginReleased += marginToRelease;
      remainingToSell -= closeQty;

      if (closeQty === pQuantity) {
        await sql(
          `UPDATE us_stock_positions SET status = 'EXITED', exit_price = $1, exit_time = NOW(), pnl = $2, pnl_percent = $3 WHERE id = $4`,
          [entryPrice, pnl, pnlPercent, position.id]
        );
        closedPositionIds.push(position.id);
      } else {
        const newMargin = position.margin_used - marginToRelease;
        const newQty = pQuantity - closeQty;
        
        await sql(
          `UPDATE us_stock_positions SET quantity = $1, margin_used = $2 WHERE id = $3`,
          [newQty, newMargin, position.id]
        );
        
        const exitedRecord = await sql(
          `INSERT INTO us_stock_positions 
           (user_id, symbol, quantity, entry_price, current_price, trade_type, time_frame, entry_time, exit_time, status, exit_price, margin_used, charges, pnl, pnl_percent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), 'EXITED', $9, $10, $11, $12, $13)`,
          [userId, position.symbol, closeQty, position.entry_price, entryPrice, 'BUY', position.time_frame, position.entry_time, entryPrice, marginToRelease, position.charges * marginRatio, pnl, pnlPercent]
        );
        closedPositionIds.push(exitedRecord.insertId || exitedRecord[0]?.insertId);
      }
    }

    let balanceAdjustment = marginReleased + totalPnl;

    if (closedPositionIds.length > 0) {
      await sql(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [balanceAdjustment, userId]);
      await updateUsPerformanceMetrics(userId);
    }

    // --- OPEN NEW SHORT POSITION ---
    let newPositionId = null;
    if (remainingToSell > 0) {
      const marginUsed = (remainingToSell * entryPrice) / MARGIN_MULTIPLIER;
      const charges = DEFAULT_CHARGES;
      const totalShortCost = marginUsed + charges;

      if ((currentBalance + balanceAdjustment) < totalShortCost) {
        return res.status(400).json({ message: "Insufficient balance to open new short position." });
      }

      await sql(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [totalShortCost, userId]);
      balanceAdjustment -= totalShortCost;

      const result = await sql(
        `INSERT INTO us_stock_positions 
         (user_id, symbol, quantity, entry_price, current_price, trade_type, time_frame, entry_time, status, margin_used, charges)
         VALUES ($1, $2, $3, $4, $5, 'SELL', $6, NOW(), 'ACTIVE', $7, $8)`,
        [userId, symbol.toUpperCase(), remainingToSell, entryPrice, entryPrice, timeFrame, marginUsed, charges]
      );
      newPositionId = result.insertId || result[0]?.insertId;
    }

    await sql(
      `INSERT INTO trades (user_id, trading_type, symbol, side, quantity, price, status) VALUES ($1, 'other', $2, 'SELL', $3, $4, 'CLOSED')`,
      [userId, symbol.toUpperCase(), quantity, entryPrice]
    );

    await writeAuditLog({
      actorUserId: userId,
      action: 'US_STOCK_SELL',
      targetType: 'position',
      targetId: newPositionId ? String(newPositionId) : 'CLOSED_MULTIPLE',
      details: { symbol, quantity, entryPrice, closedPositionIds, shortPositionId: newPositionId }
    });

    return res.status(201).json({
      message: "Sell order processed successfully",
      closedPositions: closedPositionIds,
      newShortPosition: newPositionId,
      symbol, quantity, entryPrice, totalPnl,
      netProceedsUSD: balanceAdjustment,
      remainingBalance: currentBalance + balanceAdjustment
    });
  } catch (error) {
    console.error(`[UsTrade] ERROR:`, error);
    return res.status(500).json({ message: "Failed to process sell order", error: error.message });
  }
}

export async function getUsPerformanceMetrics(req, res) {
  const userId = req.user?.id;
  try {
    const result = await sql(`SELECT * FROM us_stock_performance WHERE user_id = $1`, [userId]);
    if (result.rowCount === 0) {
      await updateUsPerformanceMetrics(userId);
      const newResult = await sql(`SELECT * FROM us_stock_performance WHERE user_id = $1`, [userId]);
      return res.json(newResult.rows[0] || {});
    }
    return res.json(result.rows[0] || {});
  } catch (error) {
    console.error(`[UsTrade] Fetch Performance Error:`, error);
    return res.status(500).json({ message: "Failed to fetch performance" });
  }
}

export async function updateUsPerformanceMetrics(userId) {
  try {
    const positionsResult = await sql(
      `SELECT * FROM us_stock_positions WHERE user_id = $1 AND status = 'EXITED' ORDER BY exit_time DESC`,
      [userId]
    );

    const userResult = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
    const accountEquity = parseFloat(userResult.rows[0]?.balance || 1000);

    const metrics = calculateTradefinityMetrics(positionsResult.rows, accountEquity, 0, 0);

    await sql(
      `INSERT INTO us_stock_performance 
       (user_id, total_profit_loss, realised_pnl, total_trades, winning_trades, losing_trades, win_rate, 
        avg_profit, avg_loss, profit_factor, consistency_score, risk_meter, portfolio_health, 
        win_loss_ratio, capital_evaluation_score, overall_grade, overall_score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON DUPLICATE KEY UPDATE
       total_profit_loss = VALUES(total_profit_loss),
       realised_pnl = VALUES(realised_pnl),
       total_trades = VALUES(total_trades),
       winning_trades = VALUES(winning_trades),
       losing_trades = VALUES(losing_trades),
       win_rate = VALUES(win_rate),
       avg_profit = VALUES(avg_profit),
       avg_loss = VALUES(avg_loss),
       profit_factor = VALUES(profit_factor),
       consistency_score = VALUES(consistency_score),
       risk_meter = VALUES(risk_meter),
       portfolio_health = VALUES(portfolio_health),
       win_loss_ratio = VALUES(win_loss_ratio),
       capital_evaluation_score = VALUES(capital_evaluation_score),
       overall_grade = VALUES(overall_grade),
       overall_score = VALUES(overall_score)`,
      [
        userId, metrics.totalPnL, metrics.realizedPnL, metrics.totalTrades, metrics.winningTrades,
        metrics.losingTrades, metrics.winRate, metrics.averageProfit, metrics.averageLoss,
        metrics.profitFactor, metrics.consistencyScore, metrics.riskMeter, metrics.portfolioHealth,
        metrics.winLossRatio, metrics.capitalEvaluationScore, metrics.overallGrade, metrics.overallScore
      ]
    );
  } catch (error) {
    console.error(`[UsTrade] Error updating performance:`, error);
  }
}

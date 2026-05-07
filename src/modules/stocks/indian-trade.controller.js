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
import { getIndianStockPrice } from "../../services/dhanhq.service.js";

// ═══════════════════════════════════════════════════════════════════════════
// PLACE BUY ORDER
// ═══════════════════════════════════════════════════════════════════════════

export async function buyIndianStock(req, res) {
  console.log(`[IndianTrade] Buy request received - Path: ${req.path}, User: ${req.user?.id}`);
  console.log(`[IndianTrade] Request body:`, JSON.stringify(req.validatedBody));
  
  const { symbol, quantity, entryPrice, timeFrame, marginUsed, charges } = req.validatedBody;
  const userId = req.user?.id;

  if (!userId) {
    console.log(`[IndianTrade] 401 - No userId in request`);
    return res.status(401).json({ message: "User not authenticated" });
  }
  
  console.log(`[IndianTrade] Processing buy - User: ${userId}, Symbol: ${symbol}, Qty: ${quantity}, TimeFrame: ${timeFrame}`);

  try {
    // Get current user balance
    console.log(`[IndianTrade] Fetching user balance for user ${userId}`);
    const userResult = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
    console.log(`[IndianTrade] User lookup result - rowCount: ${userResult.rowCount}`);

    if (userResult.rowCount === 0) {
      console.log(`[IndianTrade] 404 - User ${userId} not found in database`);
      return res.status(404).json({ message: "User not found" });
    }

    const currentBalance = parseFloat(userResult.rows[0].balance);
    const totalCost = marginUsed + charges;
    
    console.log(`[IndianTrade] Balance check - Current: ${currentBalance}, Required: ${totalCost}`);

    // Check if user has sufficient balance
    if (currentBalance < totalCost) {
      console.log(`[IndianTrade] 400 - Insufficient balance`);
      return res.status(400).json({ 
        message: "Insufficient balance",
        required: totalCost,
        available: currentBalance 
      });
    }

    // Deduct from user balance
    console.log(`[IndianTrade] Deducting ${totalCost} from user ${userId} balance`);
    await sql(
      `UPDATE users SET balance = balance - $1 WHERE id = $2`,
      [totalCost, userId]
    );
    console.log(`[IndianTrade] Balance updated successfully`);

    // Create position record
    console.log(`[IndianTrade] Creating position record with: symbol=${symbol}, quantity=${quantity}, entryPrice=${entryPrice}, timeFrame=${timeFrame}`);
    const result = await sql(
      `
        INSERT INTO indian_stock_positions 
        (user_id, symbol, quantity, entry_price, current_price, trade_type, time_frame, 
         entry_time, status, margin_used, charges)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10)
      `,
      [
        userId,
        symbol.toUpperCase(),
        quantity,
        entryPrice,
        entryPrice, // Initial current_price = entry_price
        'BUY',
        timeFrame,
        'ACTIVE',
        marginUsed,
        charges
      ]
    );

    const positionId = result.insertId || result[0]?.insertId;
    console.log(`[IndianTrade] Position created with ID: ${positionId}, Insert result:`, JSON.stringify(result));

    // Also create a trade record for history
    console.log(`[IndianTrade] Creating trade record`);
    await sql(
      `
        INSERT INTO trades 
        (user_id, trading_type, symbol, side, quantity, price, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [userId, 'indian_stock', symbol.toUpperCase(), 'BUY', quantity, entryPrice, 'OPEN']
    );
    console.log(`[IndianTrade] Trade record created`);

    // Write audit log
    console.log(`[IndianTrade] Writing audit log`);
    await writeAuditLog({
      actorUserId: userId,
      action: 'INDIAN_STOCK_BUY',
      targetType: 'position',
      targetId: String(positionId),
      details: { symbol, quantity, entryPrice, timeFrame, marginUsed, charges }
    });
    console.log(`[IndianTrade] Audit log written`);

    console.log(`[IndianTrade] Buy order completed successfully for user ${userId}`);
    return res.status(201).json({
      message: "Buy order placed successfully",
      positionId: positionId,
      symbol,
      quantity,
      entryPrice,
      timeFrame,
      marginUsed,
      charges,
      totalCost,
      remainingBalance: currentBalance - totalCost
    });
  } catch (error) {
    console.error(`[IndianTrade] ERROR - Full stack:`, error);
    console.error(`[IndianTrade] Error message: ${error.message}`);
    console.error(`[IndianTrade] Error code: ${error.code}`);
    console.error(`[IndianTrade] Error SQL: ${error.sql}`);
    return res.status(500).json({ 
      message: "Failed to place buy order", 
      error: error.message,
      code: error.code
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PLACE SELL ORDER
// ═══════════════════════════════════════════════════════════════════════════

export async function sellIndianStock(req, res) {
  console.log(`[IndianTrade] Sell request received - Path: ${req.path}, User: ${req.user?.id}`);
  console.log(`[IndianTrade] Request body:`, JSON.stringify(req.validatedBody));
  
  const { symbol, quantity, entryPrice, timeFrame, marginUsed, charges } = req.validatedBody;
  const userId = req.user?.id;

  if (!userId) {
    console.log(`[IndianTrade] 401 - No userId in request`);
    return res.status(401).json({ message: "User not authenticated" });
  }

  console.log(`[IndianTrade] Processing sell - User: ${userId}, Symbol: ${symbol}, Qty: ${quantity}, TimeFrame: ${timeFrame}`);

  try {
    // Get current user balance
    console.log(`[IndianTrade] Fetching user balance for user ${userId}`);
    const userResult = await sql(`SELECT balance FROM users WHERE id = $1`, [userId]);
    console.log(`[IndianTrade] User lookup result - rowCount: ${userResult.rowCount}`);

    if (userResult.rowCount === 0) {
      console.log(`[IndianTrade] 404 - User ${userId} not found in database`);
      return res.status(404).json({ message: "User not found" });
    }

    const currentBalance = parseFloat(userResult.rows[0].balance);
    const totalCost = marginUsed + charges;
    
    console.log(`[IndianTrade] Balance check - Current: ${currentBalance}, Required: ${totalCost}`);

    // Check if user has sufficient balance
    if (currentBalance < totalCost) {
      console.log(`[IndianTrade] 400 - Insufficient balance`);
      return res.status(400).json({ 
        message: "Insufficient balance",
        required: totalCost,
        available: currentBalance 
      });
    }

    // Deduct from user balance
    console.log(`[IndianTrade] Deducting ${totalCost} from user ${userId} balance`);
    await sql(
      `UPDATE users SET balance = balance - $1 WHERE id = $2`,
      [totalCost, userId]
    );
    console.log(`[IndianTrade] Balance updated successfully`);

    // Create position record for SHORT (SELL)
    console.log(`[IndianTrade] Creating sell position record with: symbol=${symbol}, quantity=${quantity}, entryPrice=${entryPrice}, timeFrame=${timeFrame}`);
    const result = await sql(
      `
        INSERT INTO indian_stock_positions 
        (user_id, symbol, quantity, entry_price, current_price, trade_type, time_frame, 
         entry_time, status, margin_used, charges)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10)
      `,
      [
        userId,
        symbol.toUpperCase(),
        quantity,
        entryPrice,
        entryPrice, // Initial current_price = entry_price
        'SELL',
        timeFrame,
        'ACTIVE',
        marginUsed,
        charges
      ]
    );

    const positionId = result.insertId || result[0]?.insertId;
    console.log(`[IndianTrade] Sell position created with ID: ${positionId}, Insert result:`, JSON.stringify(result));

    // Also create a trade record for history
    console.log(`[IndianTrade] Creating trade record for sell`);
    await sql(
      `
        INSERT INTO trades 
        (user_id, trading_type, symbol, side, quantity, price, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [userId, 'indian_stock', symbol.toUpperCase(), 'SELL', quantity, entryPrice, 'OPEN']
    );
    console.log(`[IndianTrade] Trade record created`);

    // Write audit log
    console.log(`[IndianTrade] Writing audit log`);
    await writeAuditLog({
      actorUserId: userId,
      action: 'INDIAN_STOCK_SELL',
      targetType: 'position',
      targetId: String(positionId),
      details: { symbol, quantity, entryPrice, timeFrame, marginUsed, charges }
    });
    console.log(`[IndianTrade] Audit log written`);

    console.log(`[IndianTrade] Sell order completed successfully for user ${userId}`);
    return res.status(201).json({
      message: "Sell order placed successfully",
      positionId: positionId,
      symbol,
      quantity,
      entryPrice,
      timeFrame,
      marginUsed,
      charges,
      totalCost,
      remainingBalance: currentBalance - totalCost
    });
  } catch (error) {
    console.error(`[IndianTrade] ERROR - Full stack:`, error);
    console.error(`[IndianTrade] Error message: ${error.message}`);
    console.error(`[IndianTrade] Error code: ${error.code}`);
    console.error(`[IndianTrade] Error SQL: ${error.sql}`);
    return res.status(500).json({ 
      message: "Failed to place sell order", 
      error: error.message,
      code: error.code
    });
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

    // Update user balance - return margin + pnl
    const balanceAdjustment = position.margin_used + pnl;
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
    // Check if performance record exists
    let result = await sql(
      `SELECT * FROM indian_stock_performance WHERE user_id = $1`,
      [userId]
    );

    if (result.rowCount === 0) {
      // Initialize performance record
      await sql(
        `
          INSERT INTO indian_stock_performance (user_id)
          VALUES ($1)
        `,
        [userId]
      );
      result = await sql(
        `SELECT * FROM indian_stock_performance WHERE user_id = $1`,
        [userId]
      );
    }

    return res.json(result.rows[0]);
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
    // Get all exited positions for this user
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
              profit_factor = 0
          WHERE user_id = $1
        `,
        [userId]
      );
      return;
    }

    // Calculate metrics
    let totalProfit = 0;
    let totalLoss = 0;
    let winningTrades = 0;
    let losingTrades = 0;

    positions.forEach(pos => {
      if (pos.pnl > 0) {
        totalProfit += pos.pnl;
        winningTrades++;
      } else if (pos.pnl < 0) {
        totalLoss += Math.abs(pos.pnl);
        losingTrades++;
      }
    });

    const totalTrades = positions.length;
    const totalPnL = totalProfit - totalLoss;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgProfit = winningTrades > 0 ? totalProfit / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? totalLoss / losingTrades : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;

    // Calculate consistency score (0-100)
    const consistencyScore = calculateConsistencyScore(positions);

    // Calculate risk meter (0-100)
    const riskMeter = calculateRiskMeter(avgLoss, avgProfit);

    // Calculate portfolio health (0-100)
    const portfolioHealth = calculatePortfolioHealth(winRate, profitFactor, consistencyScore);

    // Calculate overall score and grade
    const { overallScore, grade } = calculateOverallGrade(
      consistencyScore,
      riskMeter,
      portfolioHealth,
      winRate,
      profitFactor
    );

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
          overall_score = $14,
          overall_grade = $15
        WHERE user_id = $16
      `,
      [
        totalPnL,
        totalPnL,
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
        avgProfit,
        avgLoss,
        profitFactor,
        consistencyScore,
        riskMeter,
        portfolioHealth,
        avgProfit / (avgLoss || 1),
        overallScore,
        grade,
        userId
      ]
    );
  } catch (error) {
    console.error("Error updating performance metrics:", error.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS FOR SCORE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

function calculateConsistencyScore(positions) {
  if (positions.length === 0) return 0;

  const pnls = positions.map(p => p.pnl);
  const mean = pnls.reduce((a, b) => a + b) / pnls.length;
  const variance = pnls.reduce((sum, pnl) => sum + Math.pow(pnl - mean, 2), 0) / pnls.length;
  const stdDev = Math.sqrt(variance);
  
  // Lower standard deviation = higher consistency
  // Normalize to 0-100 scale
  const consistencyScore = Math.max(0, 100 - Math.min(stdDev / (mean || 1) * 20, 100));
  return Math.round(consistencyScore);
}

function calculateRiskMeter(avgLoss, avgProfit) {
  if (avgProfit === 0 && avgLoss === 0) return 50;
  
  const riskRatio = avgLoss / (avgProfit || 1);
  // Higher risk ratio = higher risk meter
  const riskMeter = Math.min(100, riskRatio * 30);
  return Math.round(100 - Math.min(riskMeter, 100));
}

function calculatePortfolioHealth(winRate, profitFactor, consistencyScore) {
  // Combined metric of win rate, profit factor, and consistency
  const healthScore = (winRate / 100) * 30 + Math.min(profitFactor / 5, 1) * 40 + (consistencyScore / 100) * 30;
  return Math.round(Math.min(healthScore * 100, 100));
}

function calculateOverallGrade(consistencyScore, riskMeter, portfolioHealth, winRate, profitFactor) {
  // Weighted calculation for overall score
  const overallScore = Math.round(
    (consistencyScore * 0.3) + 
    (riskMeter * 0.25) + 
    (portfolioHealth * 0.25) + 
    ((winRate / 100) * 100 * 0.2)
  );

  let grade = 'D';
  if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 75) grade = 'B';
  else if (overallScore >= 60) grade = 'C';
  else if (overallScore >= 45) grade = 'D';

  return { overallScore, grade };
}

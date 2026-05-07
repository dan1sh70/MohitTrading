import { cacheDel } from "../../db/redis.js";
import { sql } from "../../db/mysql.js";
import { writeAuditLog } from "../../utils/audit-log.js";

function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const limitRaw = Number.parseInt(query.limit ?? "20", 10) || 20;
  const limit = Math.min(100, Math.max(5, limitRaw));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export async function listTrades(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const status = String(req.query.status ?? "").trim().toUpperCase();
  const symbol = String(req.query.symbol ?? "").trim().toUpperCase();
  const userId = Number.parseInt(req.query.userId ?? "", 10);

  const clauses = [];
  const values = [];

  if (status === "OPEN" || status === "CLOSED") {
    values.push(status);
    clauses.push(`t.status = $${values.length}`);
  }

  if (symbol) {
    values.push(symbol);
    clauses.push(`t.symbol = $${values.length}`);
  }

  if (!Number.isNaN(userId) && userId > 0) {
    values.push(userId);
    clauses.push(`t.user_id = $${values.length}`);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const countResult = await sql(
    `
      SELECT COUNT(*) AS total
      FROM trades t
      ${whereSql}
    `,
    values
  );
  const total = Number(countResult.rows[0].total);

  values.push(limit, offset);

  const result = await sql(
    `
      SELECT t.id, t.symbol, t.side, t.quantity, t.price, t.status, t.pnl, t.created_at,
             u.id AS user_id, u.full_name AS user_name, u.email AS user_email
      FROM trades t
      JOIN users u ON u.id = t.user_id
      ${whereSql}
      ORDER BY t.created_at DESC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `,
    values
  );

  return res.json({
    items: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  });
}

export async function createTrade(req, res) {
  const { userId, symbol, side, quantity, price } = req.validatedBody;

  const userResult = await sql(`SELECT id FROM users WHERE id = $1`, [userId]);

  if (userResult.rowCount === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  const result = await sql(
    `
      INSERT INTO trades (user_id, symbol, side, quantity, price)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [userId, symbol, side, quantity, price]
  );

  const createdTrade = await sql(
    `
      SELECT id, user_id, symbol, side, quantity, price, status, pnl, created_at
      FROM trades
      WHERE id = $1
    `,
    [result.insertId]
  );

  await cacheDel("admin:stats", "admin:positions");

  await writeAuditLog({
    actorUserId: req.user?.id ?? null,
    action: "CREATE_TRADE",
    targetType: "trade",
    targetId: String(result.insertId),
    details: {
      userId,
      symbol,
      side,
      quantity,
      price
    }
  });

  return res.status(201).json(createdTrade.rows[0]);
}

export async function closeTrade(req, res) {
  const tradeId = Number(req.params.id);
  const { pnl } = req.validatedBody;

  if (Number.isNaN(tradeId)) {
    return res.status(400).json({ message: "Invalid trade id" });
  }

  const tradeResult = await sql(`SELECT id, status FROM trades WHERE id = $1`, [tradeId]);

  if (tradeResult.rowCount === 0) {
    return res.status(404).json({ message: "Trade not found" });
  }

  if (tradeResult.rows[0].status === "CLOSED") {
    return res.status(409).json({ message: "Trade is already closed" });
  }

  const updateResult = await sql(
    `
      UPDATE trades
      SET status = 'CLOSED', pnl = $2, closed_at = NOW()
      WHERE id = $1
    `,
    [tradeId, pnl]
  );

  if (updateResult.rowCount === 0) {
    return res.status(404).json({ message: "Trade not found" });
  }

  const result = await sql(
    `
      SELECT id, user_id, symbol, side, quantity, price, status, pnl, created_at, closed_at
      FROM trades
      WHERE id = $1
    `,
    [tradeId]
  );

  await cacheDel("admin:stats", "admin:positions");

  await writeAuditLog({
    actorUserId: req.user?.id ?? null,
    action: "CLOSE_TRADE",
    targetType: "trade",
    targetId: String(tradeId),
    details: {
      pnl: Number(pnl)
    }
  });

  return res.json(result.rows[0]);
}

/**
 * POST /api/auth/reset-account
 * Reset user account - clears all trades, positions, performance data and resets balance
 */
export async function resetAccount(req, res) {
  const userId = req.user.id;
  const DEFAULT_BALANCE = 1000000; // Default balance for new accounts (10 Lakhs)

  try {
    // Get current user info for audit log
    const userResult = await sql(
      `SELECT full_name, email, balance FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const previousBalance = parseFloat(userResult.rows[0].balance);

    // Count data to be deleted for the response
    const tradesCount = await sql(
      `SELECT COUNT(*) as count FROM trades WHERE user_id = $1`,
      [userId]
    );
    const positionsCount = await sql(
      `SELECT COUNT(*) as count FROM indian_stock_positions WHERE user_id = $1`,
      [userId]
    );

    // Delete all trades for the user
    await sql(`DELETE FROM trades WHERE user_id = $1`, [userId]);

    // Delete all indian stock positions for the user
    await sql(`DELETE FROM indian_stock_positions WHERE user_id = $1`, [userId]);

    // Delete indian stock performance data for the user
    await sql(`DELETE FROM indian_stock_performance WHERE user_id = $1`, [userId]);

    // Reset user balance to default
    await sql(
      `UPDATE users SET balance = $1 WHERE id = $2`,
      [DEFAULT_BALANCE, userId]
    );

    // Invalidate cache
    await cacheDel("admin:stats", "admin:positions", "crypto:prices:all");

    // Write audit log
    await writeAuditLog({
      actorUserId: userId,
      action: "RESET_ACCOUNT",
      targetType: "user",
      targetId: String(userId),
      details: {
        previousBalance,
        newBalance: DEFAULT_BALANCE,
        tradesDeleted: parseInt(tradesCount.rows[0].count),
        positionsDeleted: parseInt(positionsCount.rows[0].count)
      }
    });

    return res.json({
      success: true,
      message: "Account reset successfully",
      data: {
        newBalance: DEFAULT_BALANCE,
        tradesDeleted: parseInt(tradesCount.rows[0].count),
        positionsDeleted: parseInt(positionsCount.rows[0].count)
      }
    });
  } catch (error) {
    console.error("Reset account error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset account: " + error.message
    });
  }
}

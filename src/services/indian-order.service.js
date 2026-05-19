import { sql } from "../db/mysql.js";
import { writeAuditLog } from "../utils/audit-log.js";
import { getIndianStockPrice } from "./upstox.service.js";

async function ensureLimitOrdersTable() {
  await sql(`
    CREATE TABLE IF NOT EXISTS indian_stock_limit_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      symbol VARCHAR(32) NOT NULL,
      quantity INT NOT NULL,
      price DOUBLE NOT NULL,
      side ENUM('BUY', 'SELL') NOT NULL DEFAULT 'BUY',
      time_frame VARCHAR(20) NOT NULL DEFAULT 'Intraday',
      margin_used DOUBLE DEFAULT 0,
      charges DOUBLE DEFAULT 0,
      status ENUM('PENDING', 'FILLED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      filled_at DATETIME NULL,
      INDEX idx_user_id (user_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB;
  `);
}

export async function createIndianStockLimitOrder({ userId, symbol, quantity, price, side = 'BUY', timeFrame = 'Intraday', marginUsed = 0, charges = 0 }) {
  if (!userId) throw new Error('User ID is required');
  if (!symbol) throw new Error('Symbol is required');
  if (quantity <= 0) throw new Error('Quantity must be greater than zero');
  if (!price || price <= 0) throw new Error('Price must be a positive number');

  await ensureLimitOrdersTable();

  const result = await sql(
    `INSERT INTO indian_stock_limit_orders (user_id, symbol, quantity, price, side, time_frame, margin_used, charges) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [userId, symbol.toUpperCase(), quantity, price, side, timeFrame, marginUsed, charges]
  );

  const orderId = result.insertId;
  await writeAuditLog({
    actorUserId: userId,
    action: 'INDIAN_STOCK_LIMIT_ORDER_CREATE',
    targetType: 'limit_order',
    targetId: String(orderId),
    details: { symbol, quantity, price, side, timeFrame, marginUsed, charges }
  });

  return orderId;
}

export async function getIndianStockLimitOrders(userId) {
  await ensureLimitOrdersTable();
  const result = await sql(`SELECT * FROM indian_stock_limit_orders WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
  return result.rows;
}

export async function getPendingIndianStockLimitOrders(limit = 200) {
  await ensureLimitOrdersTable();
  const result = await sql(`SELECT * FROM indian_stock_limit_orders WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT $1`, [limit]);
  return result.rows;
}

export async function processPendingIndianStockLimitOrders() {
  const pendingOrders = await getPendingIndianStockLimitOrders(200);
  const executed = [];

  for (const order of pendingOrders) {
    try {
      const liveQuote = await getIndianStockPrice(order.symbol);
      const currentPrice = parseFloat(liveQuote.price || liveQuote.currentPrice || 0);
      if (!currentPrice) {
        continue;
      }

      let shouldExecute = false;
      if (order.side === 'BUY' && currentPrice <= parseFloat(order.price)) {
        shouldExecute = true;
      }
      if (order.side === 'SELL' && currentPrice >= parseFloat(order.price)) {
        shouldExecute = true;
      }

      if (!shouldExecute) continue;

      const userRes = await sql(`SELECT balance FROM users WHERE id = $1`, [order.user_id]);
      if (userRes.rowCount === 0) {
        continue;
      }

      const userBalance = parseFloat(userRes.rows[0].balance);
      const required = (order.margin_used || 0) + (order.charges || 0);
      if (userBalance < required) {
        continue;
      }

      await sql(`UPDATE users SET balance = balance - $1 WHERE id = $2`, [required, order.user_id]);

      const positionResult = await sql(
        `INSERT INTO indian_stock_positions (user_id, symbol, quantity, entry_price, current_price, trade_type, time_frame, entry_time, status, margin_used, charges) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,$9,$10)`,
        [order.user_id, order.symbol, order.quantity, currentPrice, currentPrice, order.side, order.time_frame, 'ACTIVE', order.margin_used || 0, order.charges || 0]
      );

      const positionId = positionResult.insertId;
      await sql(
        `INSERT INTO trades (user_id, trading_type, symbol, side, quantity, price, status) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order.user_id, 'indian_stock', order.symbol, order.side, order.quantity, currentPrice, 'OPEN']
      );

      await sql(`UPDATE indian_stock_limit_orders SET status = 'FILLED', filled_at = NOW() WHERE id = $1`, [order.id]);

      await writeAuditLog({
        actorUserId: order.user_id,
        action: 'INDIAN_STOCK_LIMIT_ORDER_FILLED',
        targetType: 'limit_order',
        targetId: String(order.id),
        details: { positionId, executedPrice: currentPrice, quantity: order.quantity, symbol: order.symbol }
      });

      executed.push({ orderId: order.id, positionId, executedPrice: currentPrice });
    } catch (error) {
      console.error(`[IndianOrderService] Failed to process order ${order.id}:`, error.message);
      continue;
    }
  }

  return { processed: executed.length, executed };
}

import bcrypt from "bcryptjs";
import { cacheDel, cacheGet, cacheSet } from "../../db/redis.js";
import { sql } from "../../db/mysql.js";
import { writeAuditLog } from "../../utils/audit-log.js";

function parsePagination(query) {
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const limitRaw = Number.parseInt(query.limit ?? "20", 10) || 20;
  const limit = Math.min(100, Math.max(5, limitRaw));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export async function getStats(_req, res) {
  const cacheKey = "admin:stats";
  const cached = await cacheGet(cacheKey);

  if (cached) {
    return res.json(JSON.parse(cached));
  }

  const [users, openTrades, closedTrades, volume, pnl] = await Promise.all([
    sql(`SELECT COUNT(*) AS total FROM users WHERE role = 'trader'`),
    sql(`SELECT COUNT(*) AS total FROM trades WHERE status = 'OPEN'`),
    sql(`SELECT COUNT(*) AS total FROM trades WHERE status = 'CLOSED'`),
    sql(`SELECT COALESCE(SUM(price * quantity), 0) AS total FROM trades`),
    sql(`SELECT COALESCE(SUM(pnl), 0) AS total FROM trades`)
  ]);

  const payload = {
    totalTraders: Number(users.rows[0].total),
    openTrades: Number(openTrades.rows[0].total),
    closedTrades: Number(closedTrades.rows[0].total),
    totalVolume: Number(volume.rows[0].total),
    totalPnl: Number(pnl.rows[0].total)
  };

  await cacheSet(cacheKey, JSON.stringify(payload), 20);

  return res.json(payload);
}

export async function listUsers(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const search = String(req.query.search ?? "").trim();
  const role = String(req.query.role ?? "").trim();

  const clauses = [];
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    clauses.push(`(LOWER(full_name) LIKE LOWER($${values.length}) OR LOWER(email) LIKE LOWER($${values.length}))`);
  }

  if (role === "admin" || role === "trader") {
    values.push(role);
    clauses.push(`role = $${values.length}`);
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const countResult = await sql(
    `SELECT COUNT(*) AS total FROM users ${whereSql}`,
    values
  );
  const total = Number(countResult.rows[0].total);

  values.push(limit, offset);

  const result = await sql(
    `
      SELECT id, full_name, email, role, balance, created_at
      FROM users
      ${whereSql}
      ORDER BY created_at DESC
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

export async function getPositions(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const search = String(req.query.search ?? "").trim();
  const symbol = String(req.query.symbol ?? "").trim().toUpperCase();
  const filters = { page, limit, search, symbol };
  const cacheKey = `admin:positions:${JSON.stringify(filters)}`;
  const cached = await cacheGet(cacheKey);

  if (cached) {
    return res.json(JSON.parse(cached));
  }

  const clauses = [`op.net_quantity <> 0`];
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    clauses.push(`LOWER(u.full_name) LIKE LOWER($${values.length})`);
  }

  if (symbol) {
    values.push(symbol);
    clauses.push(`op.symbol = $${values.length}`);
  }

  const whereSql = `WHERE ${clauses.join(" AND ")}`;

  const countResult = await sql(
    `
      WITH open_positions AS (
        SELECT
          t.user_id,
          t.symbol,
          SUM(CASE WHEN t.side = 'BUY' THEN t.quantity ELSE -t.quantity END) AS net_quantity,
          COALESCE(
            SUM(CASE WHEN t.side = 'BUY' THEN t.price * t.quantity ELSE 0 END)
            / NULLIF(SUM(CASE WHEN t.side = 'BUY' THEN t.quantity ELSE 0 END), 0),
            0
          ) AS avg_buy_price
        FROM trades t
        WHERE t.status = 'OPEN'
        GROUP BY t.user_id, t.symbol
      )
      SELECT COUNT(*) AS total
      FROM open_positions op
      JOIN users u ON u.id = op.user_id
      ${whereSql}
    `,
    values
  );
  const total = Number(countResult.rows[0].total);

  values.push(limit, offset);

  const result = await sql(
    `
      WITH open_positions AS (
        SELECT
          t.user_id,
          t.symbol,
          SUM(CASE WHEN t.side = 'BUY' THEN t.quantity ELSE -t.quantity END) AS net_quantity,
          COALESCE(
            SUM(CASE WHEN t.side = 'BUY' THEN t.price * t.quantity ELSE 0 END)
            / NULLIF(SUM(CASE WHEN t.side = 'BUY' THEN t.quantity ELSE 0 END), 0),
            0
          ) AS avg_buy_price
        FROM trades t
        WHERE t.status = 'OPEN'
        GROUP BY t.user_id, t.symbol
      ),
      realized_pnl AS (
        SELECT
          t.user_id,
          t.symbol,
          COALESCE(SUM(t.pnl), 0) AS realized_pnl
        FROM trades t
        WHERE t.status = 'CLOSED'
        GROUP BY t.user_id, t.symbol
      )
      SELECT
        u.id AS user_id,
        u.full_name AS user_name,
        op.symbol,
        op.net_quantity,
        op.avg_buy_price,
        COALESCE(rp.realized_pnl, 0) AS realized_pnl
      FROM open_positions op
      JOIN users u ON u.id = op.user_id
      LEFT JOIN realized_pnl rp ON rp.user_id = op.user_id AND rp.symbol = op.symbol
      ${whereSql}
      ORDER BY u.full_name, op.symbol
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `
    ,
    values
  );

  const payload = {
    items: result.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };

  await cacheSet(cacheKey, JSON.stringify(payload), 20);

  return res.json(payload);
}

export async function createUser(req, res) {
  const { fullName, email, role, balance, password } = req.validatedBody;
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const result = await sql(
      `
        INSERT INTO users (full_name, email, role, balance, password_hash)
        VALUES ($1, $2, $3, $4, $5)
      `,
      [fullName, email, role, balance, passwordHash]
    );

    const createdUser = await sql(
      `
        SELECT id, full_name, email, role, balance, created_at
        FROM users
        WHERE id = $1
      `,
      [result.insertId]
    );

    await cacheDel("admin:stats");

    await writeAuditLog({
      actorUserId: req.user?.id ?? null,
      action: "CREATE_USER",
      targetType: "user",
      targetId: String(result.insertId),
      details: {
        role,
        email
      }
    });

    return res.status(201).json(createdUser.rows[0]);
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "A user with this email already exists" });
    }

    throw error;
  }
}

export async function listAuditLogs(req, res) {
  const { page, limit, offset } = parsePagination(req.query);
  const action = String(req.query.action ?? "").trim();

  const values = [];
  let whereSql = "";

  if (action) {
    values.push(action);
    whereSql = `WHERE al.action = $${values.length}`;
  }

  const countResult = await sql(
    `
      SELECT COUNT(*) AS total
      FROM audit_logs al
      ${whereSql}
    `,
    values
  );
  const total = Number(countResult.rows[0].total);

  values.push(limit, offset);

  const result = await sql(
    `
      SELECT
        al.id,
        al.action,
        al.target_type,
        al.target_id,
        al.details,
        al.created_at,
        u.full_name AS actor_name,
        u.email AS actor_email
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.actor_user_id
      ${whereSql}
      ORDER BY al.created_at DESC
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

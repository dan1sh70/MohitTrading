import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "node:url";
import { env } from "../config/env.js";
import { sql } from "./mysql.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initDb() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = await fs.readFile(schemaPath, "utf8");
  await sql(schema);

  // Fix: Ensure trading_type column exists in trades table
  try {
    await sql(`ALTER TABLE trades ADD COLUMN trading_type ENUM('indian_stock', 'crypto', 'other') NOT NULL DEFAULT 'crypto'`);
    console.log("[DB Init] Added trading_type column to trades table");
  } catch (error) {
    // Column already exists or other error - ignore
    if (error.code !== 'ER_DUP_FIELDNAME' && !error.message?.includes('Duplicate')) {
      console.log("[DB Init] trading_type column check:", error.message);
    }
  }

  const passwordHash = await bcrypt.hash(env.adminPassword, 12);
  const traderPasswordHash = await bcrypt.hash(env.traderPassword, 12);

  await sql(
    `
      INSERT INTO users (full_name, email, role, password_hash)
      VALUES ($1, $2, 'admin', $3)
      ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)
    `,
    ["Platform Admin", env.adminEmail, passwordHash]
  );

  const sampleTraders = [
    { fullName: "Aarav Patel", email: "trader1@papertrading.local", balance: 150000 },
    { fullName: "Sara Khan", email: "trader2@papertrading.local", balance: 120000 }
  ];

  for (const trader of sampleTraders) {
    await sql(
      `
        INSERT INTO users (full_name, email, role, balance, password_hash)
        VALUES ($1, $2, 'trader', $3, $4)
        ON DUPLICATE KEY UPDATE balance = VALUES(balance)
      `,
      [trader.fullName, trader.email, trader.balance, traderPasswordHash]
    );
  }

  console.log("Database initialized and sample users seeded.");
}

// Run only if executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  initDb()
    .catch((error) => {
      console.error("Failed to initialize database:", error);
      process.exitCode = 1;
    });
}

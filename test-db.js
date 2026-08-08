import { sql } from './src/db/mysql.js';

async function run() {
  const queries = [
    'crypto_positions',
    'crypto_orders',
    'crypto_order_fills',
    'crypto_trades',
    'crypto_performance',
    'crypto_balance_history',
    'crypto_liquidations',
    'crypto_funding_payments',
    'trigger_events',
    'unified_positions',
    'unified_orders',
    'unified_trades',
    'unified_performance',
    'trades',
    'indian_stock_positions',
    'indian_stock_performance'
  ];

  console.log("Checking which tables exist...");
  
  for (const table of queries) {
    try {
      await sql(`SELECT 1 FROM ${table} LIMIT 1`);
      console.log(`[OK] Table exists: ${table}`);
    } catch (e) {
      console.log(`[ERROR] Table missing or error: ${table} - ${e.message}`);
    }
  }

  process.exit(0);
}

run();

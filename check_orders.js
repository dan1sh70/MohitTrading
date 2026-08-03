import { sql } from './src/db/mysql.js';

async function run() {
  try {
    console.log("=== Latest Crypto Orders ===");
    const cryptoOrders = await sql(`SELECT * FROM crypto_orders ORDER BY id DESC LIMIT 5`);
    console.log(cryptoOrders.rows || cryptoOrders);
    
    console.log("\n=== Latest Crypto Positions ===");
    const cryptoPos = await sql(`SELECT * FROM crypto_positions ORDER BY id DESC LIMIT 5`);
    console.log(cryptoPos.rows || cryptoPos);
    
    console.log("\n=== Latest Indian Stock Orders ===");
    const inOrders = await sql(`SELECT * FROM indian_stock_limit_orders ORDER BY id DESC LIMIT 5`);
    console.log(inOrders.rows || inOrders);
    
    console.log("\n=== Latest Indian Stock Positions ===");
    const inPos = await sql(`SELECT * FROM indian_stock_positions ORDER BY id DESC LIMIT 5`);
    console.log(inPos.rows || inPos);
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

run();

import { sql } from './src/db/mysql.js';

async function run() {
  try {
    const orders = await sql(`SELECT * FROM crypto_orders ORDER BY id DESC LIMIT 5`);
    console.log(orders.rows || orders);
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

run();

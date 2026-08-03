import { sql } from './src/db/mysql.js';

async function run() {
  try {
    const res1 = await sql(`DESCRIBE crypto_orders`);
    console.log("crypto_orders:", res1.rows || res1);
    const res2 = await sql(`DESCRIBE crypto_positions`);
    console.log("crypto_positions:", res2.rows || res2);
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

run();

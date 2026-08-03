import { sql } from './src/db/mysql.js';

async function run() {
  try {
    const result = await sql(`DESCRIBE users`);
    const balanceCol = result.rows.find(c => c.Field === 'balance');
    console.log(balanceCol);
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

run();

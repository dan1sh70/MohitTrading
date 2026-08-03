import { sql } from './src/db/mysql.js';

async function run() {
  try {
    const result = await sql(`SELECT id, email, balance FROM users`);
    console.log(result.rows || result);
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

run();

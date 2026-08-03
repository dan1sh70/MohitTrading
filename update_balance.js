import { sql } from './src/db/mysql.js';

async function run() {
  try {
    const result = await sql(`UPDATE users SET balance = 646954700000000 WHERE id = 2`);
    console.log("Success. Rows updated:", result.affectedRows || (result.rowCount !== undefined ? result.rowCount : "unknown"));
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

run();

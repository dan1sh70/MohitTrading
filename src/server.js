import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./db/mysql.js";
import { initDb } from "./db/init-db.js";
import { isCacheEnabled, redis } from "./db/redis.js";
import { startPollingService } from "./services/crypto-polling.service.js";
import { startForexPollingService } from "./services/forex-polling.service.js";
import { initializeWebSocket } from "./services/websocket.service.js";

async function startServer() {
  // Initialize database (create tables and seed users if needed)
  await initDb();

  await pool.query("SELECT 1");

  try {
    await redis.ping();
    console.log("Redis cache connected.");
  } catch (error) {
    if (isCacheEnabled()) {
      console.warn(`Redis unavailable, continuing without cache: ${error?.message || "unknown error"}`);
    }
  }

  // Start background polling service for crypto data (enabled by default)
  console.log("Starting crypto data polling service...");
  startPollingService();

  // Always start forex polling service for live rates
  const enableForexPolling = process.env.ENABLE_FOREX_POLLING !== "false";
  if (enableForexPolling) {
    console.log("Starting forex data polling service...");
    startForexPollingService();
  } else {
    console.log("Forex polling service disabled (set ENABLE_FOREX_POLLING=false to disable)");
  }

  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`Paper Trading backend running on http://0.0.0.0:${env.port}`);
    console.log(`Access from other devices: http://YOUR_IP:${env.port}`);
  });

  // Initialize WebSocket server for real-time updates
  initializeWebSocket(server);
}

startServer().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exitCode = 1;
});

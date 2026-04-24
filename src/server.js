import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./db/mysql.js";
import { isCacheEnabled, redis } from "./db/redis.js";
import { startPollingService } from "./services/crypto-polling.service.js";

async function startServer() {
  await pool.query("SELECT 1");

  try {
    await redis.ping();
    console.log("Redis cache connected.");
  } catch (error) {
    if (isCacheEnabled()) {
      console.warn(`Redis unavailable, continuing without cache: ${error?.message || "unknown error"}`);
    }
  }

  // Start background polling service for crypto data (optional)
  const enablePolling = process.env.ENABLE_CRYPTO_POLLING === "true";
  if (enablePolling) {
    console.log("Starting crypto data polling service...");
    startPollingService();
  } else {
    console.log("Crypto polling service disabled (set ENABLE_CRYPTO_POLLING=true to enable)");
  }

  app.listen(env.port, () => {
    console.log(`Paper Trading backend running on http://localhost:${env.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend:", error);
  process.exitCode = 1;
});

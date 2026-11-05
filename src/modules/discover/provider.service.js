import { sql } from "../../db/mysql.js";
import { cacheGet, cacheSet } from "../../db/redis.js";

/**
 * Standard provider interface & registry
 */
class MarketDataProviderManager {
  constructor() {
    this.providers = new Map();
    this.cooldowns = new Map();
  }

  registerProvider(code, providerInstance) {
    this.providers.set(code, providerInstance);
  }

  async getActiveProviders() {
    try {
      const rows = await sql(
        `SELECT provider_code, name, is_active, priority, health_status, error_count 
         FROM market_data_providers 
         WHERE is_active = TRUE 
         ORDER BY priority ASC`
      );
      return rows;
    } catch (err) {
      console.warn("[ProviderManager] Failed to read providers from DB:", err.message);
      return [
        { provider_code: "YAHOO_FINANCE", priority: 1, health_status: "HEALTHY" },
        { provider_code: "NSE_OFFICIAL", priority: 2, health_status: "HEALTHY" },
        { provider_code: "UPSTOX", priority: 3, health_status: "HEALTHY" }
      ];
    }
  }

  async recordProviderSuccess(providerCode) {
    try {
      await sql(
        `UPDATE market_data_providers 
         SET health_status = 'HEALTHY', error_count = 0, last_health_check = CURRENT_TIMESTAMP 
         WHERE provider_code = $1`,
        [providerCode]
      );
    } catch (e) {}
  }

  async recordProviderError(providerCode, errorMessage) {
    try {
      await sql(
        `UPDATE market_data_providers 
         SET error_count = error_count + 1,
             health_status = CASE WHEN error_count >= 5 THEN 'DEGRADED' ELSE health_status END,
             last_health_check = CURRENT_TIMESTAMP 
         WHERE provider_code = $1`,
        [providerCode]
      );
    } catch (e) {}
  }

  async logSync(providerCode, moduleName, syncType, recordsSynced, durationMs, status, errorMessage = null) {
    try {
      await sql(
        `INSERT INTO provider_sync_logs 
         (provider_code, module_name, sync_type, records_synced, duration_ms, status, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [providerCode, moduleName, syncType, recordsSynced, durationMs, status, errorMessage]
      );
    } catch (e) {
      console.warn("[ProviderManager] Sync log error:", e.message);
    }
  }
}

export const providerManager = new MarketDataProviderManager();

/**
 * Standard Yahoo Finance Adapter
 */
export class YahooFinanceProvider {
  constructor() {
    this.code = "YAHOO_FINANCE";
    this.baseUrl = "https://query1.finance.yahoo.com/v8/finance/chart";
  }

  async fetchChart(symbol, interval = "1d", range = "1d") {
    const encoded = encodeURIComponent(symbol);
    const url = `${this.baseUrl}/${encoded}?interval=${interval}&range=${range}`;
    const startTime = Date.now();

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
          "Accept": "application/json"
        }
      });

      if (!res.ok) {
        throw new Error(`Yahoo Finance API HTTP ${res.status}`);
      }

      const json = await res.json();
      const result = json?.chart?.result?.[0];
      if (!result) {
        throw new Error(json?.chart?.error?.description || "No chart data returned");
      }

      await providerManager.recordProviderSuccess(this.code);
      return {
        result,
        durationMs: Date.now() - startTime
      };
    } catch (err) {
      await providerManager.recordProviderError(this.code, err.message);
      throw err;
    }
  }
}

export const yahooProvider = new YahooFinanceProvider();
providerManager.registerProvider("YAHOO_FINANCE", yahooProvider);


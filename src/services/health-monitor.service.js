import { CacheKey, setJson, getJson } from "../cache/index.js";
import { getRateLimitStatus } from "./rate-limit.service.js";
import { getUpstoxTokenStatus } from "./upstox-token-manager.js";

const HEALTH_TTL_SECONDS = 30;

export async function updateHealthStatus() {
  const rateLimit = await getRateLimitStatus();
  const tokenStatus = await getUpstoxTokenStatus();
  const status = {
    timestamp: new Date().toISOString(),
    upstox: {
      token: tokenStatus,
      rateLimit
    }
  };
  await setJson(CacheKey.health(), status, HEALTH_TTL_SECONDS);
  return status;
}

export async function getHealthStatus() {
  return (await getJson(CacheKey.health())) || { status: "unknown" };
}

import { env } from "../config/env.js";
import { CacheKey, getJson, setJson } from "../cache/index.js";

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = Number(env.upstoxMaxRequestsPerMinute || 40);

async function getStats() {
  const stats = await getJson(CacheKey.rateLimitStats());
  return {
    windowStart: Date.now(),
    count: 0,
    ...(stats || {})
  };
}

export async function canRequest() {
  const stats = await getStats();
  const now = Date.now();
  if (now - stats.windowStart >= RATE_LIMIT_WINDOW_MS) {
    await setJson(CacheKey.rateLimitStats(), { windowStart: now, count: 1 }, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    return true;
  }

  if (stats.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  await setJson(CacheKey.rateLimitStats(), { windowStart: stats.windowStart, count: stats.count + 1 }, Math.ceil((stats.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000));
  return true;
}

export async function recordRequest() {
  const stats = await getStats();
  const now = Date.now();
  if (now - stats.windowStart >= RATE_LIMIT_WINDOW_MS) {
    await setJson(CacheKey.rateLimitStats(), { windowStart: now, count: 1 }, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
    return;
  }
  await setJson(CacheKey.rateLimitStats(), { windowStart: stats.windowStart, count: stats.count + 1 }, Math.ceil((stats.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000));
}

export async function getRateLimitStatus() {
  const stats = await getStats();
  return {
    windowStart: new Date(stats.windowStart).toISOString(),
    count: stats.count,
    limit: MAX_REQUESTS_PER_WINDOW,
    windowMs: RATE_LIMIT_WINDOW_MS
  };
}

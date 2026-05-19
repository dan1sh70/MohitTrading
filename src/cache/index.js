import { cacheGet, cacheSet, cacheDel, isCacheEnabled } from "../db/redis.js";

export const CacheKey = {
  upstoxToken: (userId = "default") => `upstox:token:${userId}`,
  livePrice: (symbol) => `upstox:live:price:${symbol}`,
  ohlc: (symbol, resolution) => `upstox:ohlc:${symbol}:${resolution}`,
  optionChain: (symbol) => `upstox:option:chain:${symbol}`,
  historical: (symbol, timeframe, fromTs, toTs) => `upstox:history:${symbol}:${timeframe}:${fromTs}:${toTs}`,
  health: () => `upstox:health`,
  requestStats: () => `upstox:stats:requests`,
  rateLimitStats: () => `upstox:stats:ratelimit`
};

export async function getJson(key) {
  const raw = await cacheGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export async function setJson(key, value, ttlSeconds = 60) {
  if (value === undefined) return;
  return cacheSet(key, JSON.stringify(value), ttlSeconds);
}

export async function deleteKey(key) {
  return cacheDel(key);
}

export { isCacheEnabled };

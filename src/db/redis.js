import Redis from "ioredis";
import { env } from "../config/env.js";

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 1,
  enableAutoPipelining: true,
  retryStrategy: () => null
});

let cacheEnabled = true;

function disableCache(error) {
  if (cacheEnabled) {
    const message = error?.message || "Redis is unavailable";
    console.warn(`Redis cache disabled: ${message}`);
    cacheEnabled = false;
    redis.disconnect();
  }
}

redis.on("error", (error) => {
  disableCache(error);
});

export function isCacheEnabled() {
  return cacheEnabled;
}

export async function cacheGet(key) {
  if (!cacheEnabled) {
    return null;
  }

  try {
    return await redis.get(key);
  } catch (error) {
    disableCache(error);
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 20) {
  if (!cacheEnabled) {
    return;
  }

  try {
    if (ttlSeconds > 0) {
      await redis.set(key, value, "EX", ttlSeconds);
      return;
    }

    await redis.set(key, value);
  } catch (error) {
    disableCache(error);
  }
}

export async function cacheDel(...keys) {
  if (!cacheEnabled || !keys.length) {
    return;
  }

  try {
    await redis.del(...keys);
  } catch (error) {
    disableCache(error);
  }
}

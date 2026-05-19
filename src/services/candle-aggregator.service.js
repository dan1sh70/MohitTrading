import { cacheGet, cacheSet } from "../db/redis.js";

const resolutionMap = {
  '1': 60,
  '3': 180,
  '5': 300,
  '15': 900,
  '30': 1800,
  '60': 3600,
  '240': 14400,
  'D': 86400,
  'W': 604800,
  'M': 2592000
};

export function convertResolutionToSeconds(res) {
  return resolutionMap[res] || Number(res) || 60;
}

/**
 * Aggregate lower timeframe candles into target timeframe
 * baseCandles: [{t, o, h, l, c, v}]
 */
export function aggregateCandles(baseCandles, fromResSec, toResSec) {
  if (!baseCandles || !baseCandles.length) return [];
  // sort by timestamp
  const sorted = baseCandles.slice().sort((a,b)=>a.t - b.t);

  const buckets = {};
  for (const c of sorted) {
    const bucket = Math.floor(c.t / toResSec) * toResSec;
    if (!buckets[bucket]) {
      buckets[bucket] = { t: bucket, o: c.o, h: c.h, l: c.l, c: c.c, v: c.v };
    } else {
      buckets[bucket].h = Math.max(buckets[bucket].h, c.h);
      buckets[bucket].l = Math.min(buckets[bucket].l, c.l);
      buckets[bucket].c = c.c;
      buckets[bucket].v += c.v || 0;
    }
  }

  return Object.values(buckets).sort((a,b)=>a.t - b.t);
}

/**
 * Aggregate from TradingView-style payload and cache result
 */
export async function aggregateAndCache(symbol, fromResolution, toResolution, fromTs, toTs, baseCandles) {
  const fromSec = convertResolutionToSeconds(fromResolution);
  const toSec = convertResolutionToSeconds(toResolution);
  const key = `agg:${symbol}:${fromResolution}->${toResolution}:${fromTs || '0'}:${toTs || '0'}`;
  const agg = aggregateCandles(baseCandles, fromSec, toSec);
  try {
    await cacheSet(key, JSON.stringify(agg), 60);
  } catch (err) {}
  return agg;
}

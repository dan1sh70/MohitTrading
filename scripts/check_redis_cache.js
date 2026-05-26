import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redis = new Redis(redisUrl);

async function inspectKey(key) {
  const raw = await redis.get(key);
  const ttl = await redis.ttl(key);
  const pttl = await redis.pttl(key);
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch (e) {
    parsed = raw;
  }

  return { key, raw, parsed, ttl, pttl };
}

(async function main(){
  try {
    console.log('Connecting to Redis at', redisUrl);
    const keys = ['crypto:price:BTCUSDT', 'crypto:prices:all'];

    for (const k of keys) {
      const info = await inspectKey(k);
      console.log('---');
      console.log('Key:', info.key);
      console.log('TTL (s):', info.ttl);
      console.log('PTTL (ms):', info.pttl);
      if (info.parsed === null) {
        console.log('Value: <null>');
      } else if (Array.isArray(info.parsed)) {
        console.log('Value: Array length', info.parsed.length);
        console.log('Sample:', info.parsed.slice(0,3));
      } else if (typeof info.parsed === 'object') {
        if (info.parsed.data && Array.isArray(info.parsed.data)) {
          console.log('Value: object with data array, count=', info.parsed.count || info.parsed.data.length);
          console.log('Sample data[0]:', info.parsed.data[0]);
        } else {
          console.log('Value object:', info.parsed);
        }
      } else {
        console.log('Raw value:', info.parsed);
      }
    }
  } catch (err) {
    console.error('Error inspecting cache:', err.message);
  } finally {
    redis.disconnect();
  }
})();

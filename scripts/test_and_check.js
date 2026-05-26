import { getAllCryptoPrices, getCryptoPrice } from '../src/modules/crypto/crypto.service.js';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

async function main(){
  try {
    console.log('Running batch fetch...');
    const all = await getAllCryptoPrices();
    console.log('Batch count:', Array.isArray(all) ? all.length : (all.data ? all.data.length : 0));

    const sym = 'BTCUSDT';
    const p = await getCryptoPrice(sym);
    console.log('Fetched single:', p);

    const keys = ['crypto:price:BTCUSDT', 'crypto:prices:all'];
    for (const k of keys) {
      const raw = await redis.get(k);
      const ttl = await redis.ttl(k);
      const pttl = await redis.pttl(k);
      console.log('---');
      console.log('Key:', k);
      console.log('TTL (s):', ttl);
      try {
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed === null) console.log('Value: <null>');
        else if (Array.isArray(parsed)) console.log('Value: Array length', parsed.length, 'sample', parsed.slice(0,2));
        else if (parsed.data && Array.isArray(parsed.data)) console.log('Value: Object with data count', parsed.count || parsed.data.length, 'sample', parsed.data[0]);
        else console.log('Value:', parsed);
      } catch (e) {
        console.log('Raw value:', raw);
      }
    }
  } catch (err) {
    console.error('Error during test:', err.message);
  } finally {
    try {
      await redis.quit();
    } catch (e) {
      try { redis.disconnect(); } catch (_) {}
    }
  }
}

main();

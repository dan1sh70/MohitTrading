import { getAllCryptoPrices, getCryptoPrice } from '../src/modules/crypto/crypto.service.js';
import { cacheGet, isCacheEnabled } from '../src/db/redis.js';

console.log('Starting crypto test...');
console.log('Cache enabled:', isCacheEnabled());

try {
  const all = await getAllCryptoPrices();
  console.log('All prices count:', Array.isArray(all) ? all.length : (all.data ? all.data.length : 0));
  console.log('Sample prices:', (Array.isArray(all) ? all.slice(0,5) : (all.data || []).slice(0,5)));

  const symbol = 'BTCUSDT';
  const p = await getCryptoPrice(symbol);
  console.log('Fetched price for', symbol, p);

  const cached = await cacheGet(`crypto:price:${symbol}`);
  console.log('Cached raw for', symbol, cached ? cached : 'none');
} catch (err) {
  console.error('Test failed:', err.message);
}

process.exit(0);

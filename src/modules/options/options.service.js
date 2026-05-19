import { cacheGet, cacheSet } from "../../db/redis.js";
import { getIndianStockPrice, fetchUpstoxInstruments } from "../../services/upstox.service.js";

/**
 * Build an options chain for a symbol and expiry.
 * Fallback to generated mock chain if API not available.
 */
export async function buildOptionChain(symbol, expiry = null) {
  const cacheKey = `option_chain:${symbol}:${expiry || 'nearest'}`;
  try {
    const cached = await cacheGet(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.warn('[Options] Redis get error', err.message);
  }

  // Try to fetch instruments and filter options
  try {
    const instruments = await fetchUpstoxInstruments('NSE_FO');
    // Filter option instruments for symbol
    const options = instruments.filter(i => i.symbol && i.symbol.startsWith(symbol) && (i.segment === 'FNO' || i.segment === 'OPT' || i.symbol.includes('OPT')));

    // If no options found, generate synthetic option chain
    if (!options.length) {
      const chain = await generateMockOptionChain(symbol);
      await cacheSet(cacheKey, JSON.stringify(chain), 30);
      return chain;
    }

    // Map into CE/PE buckets by strike and expiry
    const grouped = {};
    for (const inst of options) {
      const strike = Number(inst.raw?.strike_price || inst.lotSize || 0) || 0;
      const ex = inst.raw?.expiry || inst.expiry_date || null;
      const type = (inst.raw?.option_type || '').toUpperCase() || (inst.symbol.includes('CE') ? 'CE' : inst.symbol.includes('PE') ? 'PE' : null);

      const key = `${ex || 'NOEXP'}_${strike}`;
      if (!grouped[key]) grouped[key] = { strike, expiry: ex, CE: null, PE: null };
      if (type === 'CE') grouped[key].CE = inst;
      if (type === 'PE') grouped[key].PE = inst;
    }

    const result = { symbol, expiry, strikes: Object.values(grouped) };
    await cacheSet(cacheKey, JSON.stringify(result), 60);
    return result;
  } catch (err) {
    console.warn('[Options] Failed to build chain from Upstox, falling back', err.message);
    const chain = await generateMockOptionChain(symbol);
    try { await cacheSet(cacheKey, JSON.stringify(chain), 30); } catch (e) {}
    return chain;
  }
}

/**
 * Generate a mock option chain around ATM using LTP
 */
export async function generateMockOptionChain(symbol) {
  const priceData = await (async () => {
    try { return await getIndianStockPrice(symbol); } catch (e) { return null; }
  })();

  const ltp = priceData?.price || 1000;
  const nearestStrike = Math.round(ltp / 50) * 50;
  const strikes = [];
  const count = 21; // +-10 strikes

  for (let i = -10; i <= 10; i++) {
    const strike = nearestStrike + i * 50;
    strikes.push({
      strike,
      CE: {
        strike,
        bid: Math.max(0, Math.round((ltp - strike) * 10 + Math.random() * 20)),
        ask: Math.max(0, Math.round((ltp - strike) * 12 + Math.random() * 30)),
        last_price: Math.max(0, Math.round(Math.random() * 50)),
        oi: Math.floor(Math.random() * 50000)
      },
      PE: {
        strike,
        bid: Math.max(0, Math.round((strike - ltp) * 10 + Math.random() * 20)),
        ask: Math.max(0, Math.round((strike - ltp) * 12 + Math.random() * 30)),
        last_price: Math.max(0, Math.round(Math.random() * 50)),
        oi: Math.floor(Math.random() * 50000)
      }
    });
  }

  const chain = { symbol, expiry: null, underlying: ltp, strikes };
  return chain;
}

/**
 * Compute analytics: ATM, OTM/ITM, PCR, Max Pain, top OI
 */
export function computeOptionAnalytics(chain) {
  const underlying = chain.underlying || 0;
  // Find ATM index
  let atm = null;
  let minDiff = Infinity;
  for (const s of chain.strikes) {
    const diff = Math.abs(s.strike - underlying);
    if (diff < minDiff) { minDiff = diff; atm = s; }
  }

  const totalCEOI = chain.strikes.reduce((acc, s) => acc + (s.CE?.oi || 0), 0);
  const totalPEOI = chain.strikes.reduce((acc, s) => acc + (s.PE?.oi || 0), 0);
  const pcr = totalPEOI && totalCEOI ? +(totalPEOI / totalCEOI).toFixed(4) : null;

  // Max Pain calculation: minimize total payout
  const payoff = chain.strikes.map(s => {
    const strike = s.strike;
    const totalOI = (s.CE?.oi || 0) + (s.PE?.oi || 0);
    return { strike, pain: chain.strikes.reduce((sum, k) => {
      const ce = k.CE?.oi || 0;
      const pe = k.PE?.oi || 0;
      // payout for CE if underlying < strike -> max(0, strike - price) * oi
      const cePayout = Math.max(0, strike - k.strike) * ce;
      const pePayout = Math.max(0, k.strike - strike) * pe;
      return sum + cePayout + pePayout;
    }, 0) };
  });

  payoff.sort((a, b) => a.pain - b.pain);
  const maxPain = payoff.length ? payoff[0].strike : null;

  const topOI = chain.strikes.map(s => ({ strike: s.strike, totalOi: (s.CE?.oi||0) + (s.PE?.oi||0) }))
    .sort((a,b)=>b.totalOi-a.totalOi).slice(0,10);

  return { atm: atm?.strike || null, pcr, maxPain, topOI, totalCEOI, totalPEOI };
}

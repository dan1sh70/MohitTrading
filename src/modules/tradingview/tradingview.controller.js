import { getSupportedIndianStocks, getIndianStockIntraday, getIndianStockDaily } from "../../services/upstox.service.js";
import { cacheGet, cacheSet } from "../../db/redis.js";

/**
 * Search symbols for TradingView widget
 */
export async function tvSearch(req, res) {
  const query = (req.query.query || "").toUpperCase();
  const limit = parseInt(req.query.limit || "30", 10);

  try {
    const all = getSupportedIndianStocks();
    const filtered = all.filter(s => s.symbol.includes(query) || s.name.toUpperCase().includes(query)).slice(0, limit);
    const result = filtered.map(s => ({
      symbol: s.symbol,
      full_name: `${s.exchange}:${s.symbol}`,
      description: s.name,
      exchange: s.exchange,
      ticker: s.symbol
    }));

    res.json(result);
  } catch (err) {
    console.error('[TV] search error', err.message);
    res.status(500).json({ error: 'search_failed' });
  }
}

/**
 * Resolve symbol details for TradingView
 */
export async function tvResolve(req, res) {
  const symbol = (req.query.symbol || req.query.symbolName || "").toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    const all = getSupportedIndianStocks();
    const info = all.find(s => s.symbol === symbol || `${s.exchange}:${s.symbol}` === symbol) || { symbol };

    const payload = {
      name: info.symbol || symbol,
      description: info.name || info.symbol,
      ticker: info.symbol || symbol,
      type: "stock",
      session: "0900-1530:1234567",
      timezone: "Asia/Kolkata",
      minmov: 1,
      pricescale: 100,
      supported_resolutions: ["1","3","5","15","30","60","240","D","W","M"],
      has_intraday: true,
      has_seconds: false,
      has_daily: true,
      currency_code: "INR"
    };

    res.json(payload);
  } catch (err) {
    console.error('[TV] resolve error', err.message);
    res.status(500).json({ error: 'resolve_failed' });
  }
}

/**
 * TradingView history/bars endpoint
 */
export async function tvHistory(req, res) {
  const symbol = (req.query.symbol || "").toUpperCase();
  const resolution = (req.query.resolution || "1").toString();
  const from = parseInt(req.query.from || "0", 10);
  const to = parseInt(req.query.to || `${Math.floor(Date.now() / 1000)}`, 10);

  if (!symbol) return res.status(400).json({ s: 'error', errmsg: 'symbol required' });

  try {
    const cacheKey = `tv:history:${symbol}:${resolution}:${from}:${to}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Map TradingView resolution to Upstox intervals
    const resMap = { '1': '1minute', '3': '3minute', '5': '5minute', '15': '15minute', '30': '30minute', '60': '60minute', '240': '240minute', 'D': 'day', 'W': 'week', 'M': 'month' };
    const interval = resMap[resolution] || '1minute';

    let candles;
    if (['D','W','M'].includes(resolution)) {
      const daily = await getIndianStockDaily(symbol.replace(/^.*:/, '').replace(/NSE:/, ''));
      candles = daily.data.map(c => ({ t: Math.floor(new Date(c.date).getTime() / 1000), o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume }));
    } else {
      const intraday = await getIndianStockIntraday(symbol.replace(/^.*:/, '').replace(/NSE:/, ''), interval);
      candles = intraday.data.map(c => ({ t: Math.floor(c.timestamp / 1000), o: c.open, h: c.high, l: c.low, c: c.close, v: c.volume }));
    }

    // Filter by range
    const filtered = candles.filter(c => c.t >= from && c.t <= to);

    const response = {
      s: filtered.length ? 'ok' : 'no_data',
      t: filtered.map(c => c.t),
      o: filtered.map(c => c.o),
      h: filtered.map(c => c.h),
      l: filtered.map(c => c.l),
      c: filtered.map(c => c.c),
      v: filtered.map(c => c.v)
    };

    try { await cacheSet(cacheKey, JSON.stringify(response), 30); } catch (e) { /* cache best effort */ }

    res.json(response);
  } catch (err) {
    console.error('[TV] history error', err.message);
    res.status(500).json({ s: 'error', errmsg: err.message });
  }
}

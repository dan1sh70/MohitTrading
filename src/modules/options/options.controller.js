import { buildOptionChain, computeOptionAnalytics } from "./options.service.js";
import { cacheGet, cacheSet } from "../../db/redis.js";

export async function getOptionChain(req, res) {
  const symbol = (req.query.symbol || req.query.s || '').toUpperCase();
  const expiry = req.query.expiry || null;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    const chain = await buildOptionChain(symbol, expiry);
    res.json({ success: true, data: chain });
  } catch (err) {
    console.error('[Options] getOptionChain error', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

export async function getOptionAnalytics(req, res) {
  const symbol = (req.query.symbol || req.query.s || '').toUpperCase();
  const expiry = req.query.expiry || null;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    const chain = await buildOptionChain(symbol, expiry);
    // Attach underlying price if missing via cached price
    const analytics = computeOptionAnalytics(chain);
    res.json({ success: true, data: analytics });
  } catch (err) {
    console.error('[Options] getOptionAnalytics error', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
}

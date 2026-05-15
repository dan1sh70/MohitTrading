// ═════════════════════════════════════════════════════════════════════════════
// MARK PRICE SERVICE
// ═════════════════════════════════════════════════════════════════════════════
// Calculates fair mark price from orderbook
// Used for liquidation, position valuation, and funding rate calculations
// Compatible with Binance & Delta Exchange

import { sql } from "../db/mysql.js";
import { redis, cacheSet, cacheGet } from "../db/redis.js";
import { getCryptoPrice } from "../modules/crypto/crypto.service.js";

const MARK_PRICE_CACHE_TTL = 500; // Update every 500ms
const MARK_PRICE_DEPTH_LEVELS = 10; // Use top 10 bid/ask for calculation

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MARK PRICE CALCULATION
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * Mark Price = (Bid Price + Ask Price) / 2
 * Where Bid = weighted average of top 10 bid orders
 *       Ask = weighted average of top 10 ask orders
 * 
 * This prevents liquidation manipulation via pump/dump attacks
 * Matches Binance's "Fair Price Mark" calculation
 */

/**
 * Get weighted average price from orderbook side
 * @param {Array} orders - Orders sorted by price
 * @param {number} levels - Number of price levels to use
 * @returns {number} Weighted average price
 */
function calculateWeightedAveragePrice(orders, levels = 10) {
  if (orders.length === 0) return 0;
  
  let totalQuantity = 0;
  let totalValue = 0;
  
  const relevantOrders = orders.slice(0, levels);
  
  for (const order of relevantOrders) {
    const price = parseFloat(order.price);
    const quantity = parseFloat(order.quantity);
    
    totalQuantity += quantity;
    totalValue += price * quantity;
  }
  
  return totalQuantity > 0 ? totalValue / totalQuantity : 0;
}

/**
 * Get mark price for a symbol
 * Returns cached value if available, otherwise calculates from orderbook
 */
export async function getMarkPrice(symbol) {
  try {
    // Check cache first
    const cached = await cacheGet(`markPrice:${symbol}`);
    if (cached) {
      return parseFloat(cached);
    }
    
    // Get current bid/ask from orderbook
    const bids = await redis.zrevrange(
      `orderbook:${symbol}:BUY`,
      0,
      MARK_PRICE_DEPTH_LEVELS - 1,
      'WITHSCORES'
    );
    
    const asks = await redis.zrange(
      `orderbook:${symbol}:SELL`,
      0,
      MARK_PRICE_DEPTH_LEVELS - 1,
      'WITHSCORES'
    );
    
    // Parse bid prices (negated, so reverse negation)
    const bidPrices = [];
    for (let i = 0; i < bids.length; i += 2) {
      bidPrices.push({
        price: Math.abs(parseFloat(bids[i + 1])),
        quantity: bids[i]
      });
    }
    
    // Parse ask prices
    const askPrices = [];
    for (let i = 0; i < asks.length; i += 2) {
      askPrices.push({
        price: parseFloat(asks[i + 1]),
        quantity: asks[i]
      });
    }
    
    // Calculate weighted averages
    const weightedBid = calculateWeightedAveragePrice(bidPrices, MARK_PRICE_DEPTH_LEVELS);
    const weightedAsk = calculateWeightedAveragePrice(askPrices, MARK_PRICE_DEPTH_LEVELS);
    
    // Fallback to last trade price if orderbook empty
    let markPrice = (weightedBid + weightedAsk) / 2;
    
    if (markPrice === 0) {
      const priceData = await getCryptoPrice(symbol);
      markPrice = parseFloat(priceData.price);
    }
    
    // Cache for 500ms
    await cacheSet(`markPrice:${symbol}`, markPrice.toString(), MARK_PRICE_CACHE_TTL);
    
    return markPrice;
    
  } catch (error) {
    console.error(`Error getting mark price for ${symbol}: ${error.message}`);
    
    // Fallback to last trade price
    const priceData = await getCryptoPrice(symbol);
    return parseFloat(priceData.price);
  }
}

/**
 * Get mark price and bid/ask for symbol (for display)
 */
export async function getMarkPriceWithDepth(symbol) {
  try {
    const markPrice = await getMarkPrice(symbol);
    
    // Get best bid/ask
    const bestBid = await redis.zrevrange(
      `orderbook:${symbol}:BUY`,
      0,
      0,
      'WITHSCORES'
    );
    
    const bestAsk = await redis.zrange(
      `orderbook:${symbol}:SELL`,
      0,
      0,
      'WITHSCORES'
    );
    
    const bidPrice = bestBid.length > 0 ? Math.abs(parseFloat(bestBid[1])) : 0;
    const askPrice = bestAsk.length > 0 ? parseFloat(bestAsk[1]) : 0;
    
    return {
      symbol,
      markPrice,
      bidPrice,
      askPrice,
      spread: askPrice - bidPrice,
      spreadPercent: ((askPrice - bidPrice) / markPrice * 100).toFixed(4)
    };
    
  } catch (error) {
    console.error(`Error getting mark price with depth: ${error.message}`);
    throw error;
  }
}

/**
 * Store mark price history for analytics
 * Called periodically by background job
 */
export async function recordMarkPriceHistory(symbol, markPrice) {
  try {
    await sql(
      `INSERT INTO mark_price_history (symbol, mark_price, recorded_at)
       VALUES ($1, $2, NOW())`,
      [symbol, markPrice]
    );
  } catch (error) {
    console.error(`Error recording mark price history: ${error.message}`);
  }
}

/**
 * Get mark price history for chart
 */
export async function getMarkPriceHistory(symbol, hours = 24) {
  try {
    const result = await sql(
      `SELECT mark_price, recorded_at 
       FROM mark_price_history 
       WHERE symbol = $1 AND recorded_at > DATE_SUB(NOW(), INTERVAL $2 HOUR)
       ORDER BY recorded_at ASC`,
      [symbol, hours]
    );
    
    return result;
  } catch (error) {
    console.error(`Error getting mark price history: ${error.message}`);
    return [];
  }
}

/**
 * Calculate bankruptcy price (when position is fully liquidated)
 * Uses mark price for accuracy
 */
export async function calculateBankruptcyPrice(entryPrice, leverage, side) {
  // Simplified: bankruptcy when entire margin is lost
  if (side === 'LONG') {
    return entryPrice * (1 - 1 / leverage);
  } else {
    return entryPrice * (1 + 1 / leverage);
  }
}

export default {
  getMarkPrice,
  getMarkPriceWithDepth,
  recordMarkPriceHistory,
  getMarkPriceHistory,
  calculateBankruptcyPrice
};

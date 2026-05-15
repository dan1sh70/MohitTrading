// ═════════════════════════════════════════════════════════════════════════════
// MATCHING ENGINE - Price-Time Priority Order Matching
// ═════════════════════════════════════════════════════════════════════════════
// Implements fair, FIFO-based matching with:
// - Price-time priority (best price, then earliest order)
// - Partial fills support
// - Real-time orderbook management via Redis
// - WebSocket event broadcasting

import { redis } from "../db/redis.js";
import { sql } from "../db/mysql.js";

const ORDERBOOK_PREFIX = "orderbook";
const MATCH_HISTORY_PREFIX = "match_history";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ORDERBOOK STRUCTURE IN REDIS:
 * 
 * Key Pattern: orderbook:{symbol}:{side}
 * Type: Sorted Set
 * Score: Price (BUY side = -price for descending, SELL side = price for ascending)
 * Member: {orderId}:{userId}:{quantity}:{createdAt}
 * 
 * This ensures:
 * - BUY orders sorted: highest price first (best bid)
 * - SELL orders sorted: lowest price first (best ask)
 * - Within same price: FIFO order (earliest first)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Add order to orderbook (Redis sorted set)
 * @param {string} symbol - Trading pair (e.g., BTCUSDT)
 * @param {string} side - BUY or SELL
 * @param {number} orderId - Order ID
 * @param {number} userId - User ID
 * @param {number} price - Order price
 * @param {number} quantity - Order quantity
 * @param {number} createdAt - Order creation timestamp
 */
export async function addOrderToBook(symbol, side, orderId, userId, price, quantity, createdAt) {
  const key = `${ORDERBOOK_PREFIX}:${symbol}:${side}`;
  
  // For BUY orders: negate price to sort descending (highest price first)
  // For SELL orders: use price as-is to sort ascending (lowest price first)
  const score = side === 'BUY' ? -price : price;
  
  const member = `${orderId}:${userId}:${quantity}:${createdAt}`;
  
  await redis.zadd(key, score, member);
  
  // Set expiry for orderbook entries (24 hours)
  await redis.expire(key, 86400);
}

/**
 * Remove order from orderbook
 */
export async function removeOrderFromBook(symbol, side, orderId, userId) {
  const key = `${ORDERBOOK_PREFIX}:${symbol}:${side}`;
  
  // Find and remove all entries with this orderId
  const members = await redis.zrange(key, 0, -1);
  
  for (const member of members) {
    if (member.startsWith(`${orderId}:`)) {
      await redis.zrem(key, member);
    }
  }
}

/**
 * Update order quantity in orderbook (for partial fills)
 */
export async function updateOrderQuantityInBook(symbol, side, orderId, userId, newQuantity, createdAt) {
  await removeOrderFromBook(symbol, side, orderId, userId);
  
  if (newQuantity > 0) {
    // Re-add with updated quantity
    const buySell = await redis.hget(`order:${orderId}`, 'side');
    const price = parseFloat(await redis.hget(`order:${orderId}`, 'price'));
    await addOrderToBook(symbol, side, orderId, userId, price, newQuantity, createdAt);
  }
}

/**
 * Get best bid (highest BUY price)
 */
export async function getBestBid(symbol) {
  const key = `${ORDERBOOK_PREFIX}:${symbol}:BUY`;
  const orders = await redis.zrevrange(key, 0, 0, 'WITHSCORES');
  
  if (orders.length === 0) return null;
  
  const [member, score] = [orders[0], orders[1]];
  const [orderId, userId, quantity, createdAt] = member.split(':');
  
  return {
    orderId: parseInt(orderId),
    userId: parseInt(userId),
    price: -parseFloat(score), // Negate back
    quantity: parseFloat(quantity),
    createdAt: parseInt(createdAt)
  };
}

/**
 * Get best ask (lowest SELL price)
 */
export async function getBestAsk(symbol) {
  const key = `${ORDERBOOK_PREFIX}:${symbol}:SELL`;
  const orders = await redis.zrange(key, 0, 0, 'WITHSCORES');
  
  if (orders.length === 0) return null;
  
  const [member, score] = [orders[0], orders[1]];
  const [orderId, userId, quantity, createdAt] = member.split(':');
  
  return {
    orderId: parseInt(orderId),
    userId: parseInt(userId),
    price: parseFloat(score),
    quantity: parseFloat(quantity),
    createdAt: parseInt(createdAt)
  };
}

/**
 * Get entire orderbook snapshot for a symbol
 */
export async function getOrderbookSnapshot(symbol) {
  const buyKey = `${ORDERBOOK_PREFIX}:${symbol}:BUY`;
  const sellKey = `${ORDERBOOK_PREFIX}:${symbol}:SELL`;
  
  // Get all BUY orders (reverse to get highest prices first)
  const buyOrders = await redis.zrevrange(buyKey, 0, -1, 'WITHSCORES');
  const bids = [];
  for (let i = 0; i < buyOrders.length; i += 2) {
    const member = buyOrders[i];
    const score = buyOrders[i + 1];
    const [orderId, userId, quantity, createdAt] = member.split(':');
    bids.push({
      orderId: parseInt(orderId),
      userId: parseInt(userId),
      price: -parseFloat(score),
      quantity: parseFloat(quantity),
      createdAt: parseInt(createdAt)
    });
  }
  
  // Get all SELL orders (ascending, lowest prices first)
  const sellOrders = await redis.zrange(sellKey, 0, -1, 'WITHSCORES');
  const asks = [];
  for (let i = 0; i < sellOrders.length; i += 2) {
    const member = sellOrders[i];
    const score = sellOrders[i + 1];
    const [orderId, userId, quantity, createdAt] = member.split(':');
    asks.push({
      orderId: parseInt(orderId),
      userId: parseInt(userId),
      price: parseFloat(score),
      quantity: parseFloat(quantity),
      createdAt: parseInt(createdAt)
    });
  }
  
  return {
    symbol,
    bids,
    asks,
    spread: asks.length > 0 && bids.length > 0 ? asks[0].price - bids[0].price : 0,
    timestamp: Date.now()
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MATCHING ENGINE CORE
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Main matching function - Match incoming order against orderbook
 * Returns: { matches: [{ makerOrderId, takerOrderId, quantity, price }], remaining }
 */
export async function matchOrder(incomingOrder) {
  const {
    orderId: incomingOrderId,
    userId: incomingUserId,
    symbol,
    side: incomingSide,
    price: incomingPrice,
    quantity: incomingQuantity,
    createdAt: incomingCreatedAt
  } = incomingOrder;
  
  const matches = [];
  let remainingQuantity = incomingQuantity;
  
  // Determine opposite side and get matching orders
  const oppositeSide = incomingSide === 'BUY' ? 'SELL' : 'BUY';
  const key = `${ORDERBOOK_PREFIX}:${symbol}:${oppositeSide}`;
  
  // Get orders from opposite side that can match
  const oppositeOrders = oppositeSide === 'SELL' 
    ? await redis.zrange(key, 0, -1, 'WITHSCORES') // SELL: ascending (lowest first)
    : await redis.zrevrange(key, 0, -1, 'WITHSCORES'); // BUY: descending (highest first)
  
  for (let i = 0; i < oppositeOrders.length && remainingQuantity > 0; i += 2) {
    const member = oppositeOrders[i];
    const score = oppositeOrders[i + 1];
    const [makerOrderId, makerUserId, makerQuantity, makerCreatedAt] = member.split(':');
    
    const makerPrice = oppositeSide === 'SELL' ? parseFloat(score) : -parseFloat(score);
    
    // Check if prices match
    // BUY order: incoming price >= maker price (willing to buy at maker's price or better)
    // SELL order: incoming price <= maker price (willing to sell at maker's price or better)
    const priceMatches = incomingSide === 'BUY' 
      ? incomingPrice >= makerPrice 
      : incomingPrice <= makerPrice;
    
    if (!priceMatches) break; // No more matches possible
    
    // Calculate fill quantity (lesser of the two)
    const fillQuantity = Math.min(remainingQuantity, parseFloat(makerQuantity));
    const fillPrice = makerPrice; // Use maker's price (maker sets the price)
    
    matches.push({
      makerOrderId: parseInt(makerOrderId),
      makerUserId: parseInt(makerUserId),
      takerOrderId: incomingOrderId,
      takerUserId: incomingUserId,
      symbol,
      quantity: fillQuantity,
      price: fillPrice,
      timestamp: Date.now(),
      makerCreatedAt: parseInt(makerCreatedAt),
      takerCreatedAt: incomingCreatedAt
    });
    
    remainingQuantity -= fillQuantity;
    
    // Update maker's remaining quantity
    const newMakerQuantity = parseFloat(makerQuantity) - fillQuantity;
    if (newMakerQuantity <= 0) {
      // Order fully filled, remove from book
      await redis.zrem(key, member);
    } else {
      // Partially filled, update quantity
      const newMember = `${makerOrderId}:${makerUserId}:${newMakerQuantity}:${makerCreatedAt}`;
      await redis.zrem(key, member);
      await redis.zadd(key, score, newMember);
    }
  }
  
  return {
    matches,
    remaining: Math.max(0, remainingQuantity)
  };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TRADE EXECUTION & SETTLEMENT
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Execute matched trades in database
 */
export async function executeMatches(matches, symbol) {
  const tradeExecutions = [];
  
  for (const match of matches) {
    try {
      // Record the fill in crypto_order_fills table
      await sql(
        `INSERT INTO crypto_order_fills 
         (order_id, symbol, side, quantity, price, commission, commission_asset, fill_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          match.takerOrderId,
          symbol,
          'BUY', // Assuming taker side
          match.quantity,
          match.price,
          0, // Commission will be calculated later
          'USDT',
          new Date()
        ]
      );
      
      // Also record maker fill
      await sql(
        `INSERT INTO crypto_order_fills 
         (order_id, symbol, side, quantity, price, commission, commission_asset, fill_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          match.makerOrderId,
          symbol,
          'SELL', // Opposite side
          match.quantity,
          match.price,
          0,
          'USDT',
          new Date()
        ]
      );
      
      tradeExecutions.push({
        ...match,
        executed: true,
        executedAt: new Date()
      });
      
    } catch (error) {
      console.error(`Error executing match: ${error.message}`);
      tradeExecutions.push({
        ...match,
        executed: false,
        error: error.message
      });
    }
  }
  
  return tradeExecutions;
}

/**
 * Store match history in Redis for analytics and auditing
 */
export async function storeMatchHistory(symbol, match) {
  const key = `${MATCH_HISTORY_PREFIX}:${symbol}`;
  const history = {
    ...match,
    recordedAt: Date.now()
  };
  
  // Store in sorted set ordered by time
  await redis.zadd(key, Date.now(), JSON.stringify(history));
  
  // Keep last 10000 matches per symbol
  await redis.zremrangebyrank(key, 0, -10001);
}

/**
 * Get recent match history
 */
export async function getMatchHistory(symbol, limit = 100) {
  const key = `${MATCH_HISTORY_PREFIX}:${symbol}`;
  const matches = await redis.zrevrange(key, 0, limit - 1);
  
  return matches.map(m => JSON.parse(m));
}

export default {
  addOrderToBook,
  removeOrderFromBook,
  updateOrderQuantityInBook,
  getBestBid,
  getBestAsk,
  getOrderbookSnapshot,
  matchOrder,
  executeMatches,
  storeMatchHistory,
  getMatchHistory
};

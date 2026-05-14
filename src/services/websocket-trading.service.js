// ═════════════════════════════════════════════════════════════════════════════
// WEBSOCKET SERVICE - REAL-TIME TRADING UPDATES
// ═════════════════════════════════════════════════════════════════════════════
// Broadcasts:
// - Live price updates
// - Order fills & updates
// - Position P&L updates in real-time
// - Orderbook changes
// - Trade executions
// - Liquidation alerts

import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { getCryptoPrice } from '../modules/crypto/crypto.service.js';
import { redis } from '../db/redis.js';

// Map to store connected clients
const connections = new Map(); // userId -> Set of WebSocket connections
const subscriptions = new Map(); // userId -> Set of subscribed symbols

let wss = null;

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * WEBSOCKET INITIALIZATION
 * ─────────────────────────────────────────────────────────────────────────────
 */

export function initializeWebSocket(server) {
  wss = new WebSocket.Server({ server });
  
  wss.on('connection', handleConnection);
  
  console.log('WebSocket server initialized');
  
  // Start real-time price broadcasting
  startPriceBroadcasting();
  
  // Start Redis pub/sub listener
  startRedisListener();
}

/**
 * Handle new WebSocket connection
 */
function handleConnection(ws, req) {
  // Extract token from URL query
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  if (!token) {
    ws.close(1008, 'Token required');
    return;
  }
  
  // Verify token
  let userId = null;
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    userId = decoded.id;
  } catch (error) {
    ws.close(1008, 'Invalid token');
    return;
  }
  
  // Register connection
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
    subscriptions.set(userId, new Set());
  }
  
  connections.get(userId).add(ws);
  
  console.log(`[WebSocket] User ${userId} connected`);
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'CONNECTION',
    status: 'connected',
    userId,
    timestamp: Date.now()
  }));
  
  // Handle messages
  ws.on('message', (data) => handleMessage(userId, ws, data));
  
  // Handle disconnection
  ws.on('close', () => handleDisconnection(userId, ws));
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`[WebSocket] Error for user ${userId}:`, error.message);
  });
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(userId, ws, data) {
  try {
    const message = JSON.parse(data);
    
    switch (message.type) {
      case 'SUBSCRIBE':
        handleSubscription(userId, message.symbol);
        break;
        
      case 'UNSUBSCRIBE':
        handleUnsubscription(userId, message.symbol);
        break;
        
      case 'PING':
        ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        break;
        
      default:
        console.warn(`[WebSocket] Unknown message type: ${message.type}`);
    }
  } catch (error) {
    console.error(`[WebSocket] Error handling message:`, error.message);
    ws.send(JSON.stringify({
      type: 'ERROR',
      message: error.message,
      timestamp: Date.now()
    }));
  }
}

/**
 * Handle disconnection
 */
function handleDisconnection(userId, ws) {
  const userConnections = connections.get(userId);
  if (userConnections) {
    userConnections.delete(ws);
    if (userConnections.size === 0) {
      connections.delete(userId);
      subscriptions.delete(userId);
      console.log(`[WebSocket] User ${userId} disconnected`);
    }
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SUBSCRIPTION MANAGEMENT
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Subscribe user to price updates for a symbol
 */
function handleSubscription(userId, symbol) {
  if (!subscriptions.has(userId)) {
    subscriptions.set(userId, new Set());
  }
  
  subscriptions.get(userId).add(symbol);
  
  console.log(`[WebSocket] User ${userId} subscribed to ${symbol}`);
  
  // Notify user of subscription
  const userConnections = connections.get(userId);
  if (userConnections) {
    const message = JSON.stringify({
      type: 'SUBSCRIPTION',
      status: 'subscribed',
      symbol,
      timestamp: Date.now()
    });
    
    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

/**
 * Unsubscribe user from price updates
 */
function handleUnsubscription(userId, symbol) {
  const userSubs = subscriptions.get(userId);
  if (userSubs) {
    userSubs.delete(symbol);
  }
  
  console.log(`[WebSocket] User ${userId} unsubscribed from ${symbol}`);
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BROADCASTING
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Broadcast price update to subscribed users
 */
export async function broadcastPriceUpdate(symbol, priceData) {
  const message = JSON.stringify({
    type: 'PRICE_UPDATE',
    symbol,
    price: priceData.price,
    timestamp: priceData.timestamp || Date.now()
  });
  
  // Send to all users subscribed to this symbol
  for (const [userId, userSubs] of subscriptions.entries()) {
    if (userSubs.has(symbol)) {
      const userConnections = connections.get(userId);
      if (userConnections) {
        userConnections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
          }
        });
      }
    }
  }
}

/**
 * Broadcast order fill event
 */
export async function broadcastOrderFilled(userId, orderData) {
  const message = JSON.stringify({
    type: 'ORDER_FILLED',
    orderId: orderData.orderId,
    symbol: orderData.symbol,
    side: orderData.side,
    quantity: orderData.quantity,
    price: orderData.price,
    timestamp: Date.now()
  });
  
  const userConnections = connections.get(userId);
  if (userConnections) {
    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

/**
 * Broadcast position update (P&L change)
 */
export async function broadcastPositionUpdate(userId, positionData) {
  const message = JSON.stringify({
    type: 'POSITION_UPDATE',
    positionId: positionData.positionId,
    symbol: positionData.symbol,
    unrealisedPnL: positionData.unrealisedPnL,
    unrealisedPnLPercent: positionData.unrealisedPnLPercent,
    currentPrice: positionData.currentPrice,
    marginRatio: positionData.marginRatio,
    timestamp: Date.now()
  });
  
  const userConnections = connections.get(userId);
  if (userConnections) {
    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

/**
 * Broadcast trade execution
 */
export async function broadcastTradeExecution(userId, tradeData) {
  const message = JSON.stringify({
    type: 'TRADE_EXECUTED',
    symbol: tradeData.symbol,
    buyOrderId: tradeData.buyOrderId,
    sellOrderId: tradeData.sellOrderId,
    quantity: tradeData.quantity,
    price: tradeData.price,
    timestamp: Date.now()
  });
  
  // Send to both buyer and seller
  const buyerConnections = connections.get(tradeData.buyerId);
  const sellerConnections = connections.get(tradeData.sellerId);
  
  [buyerConnections, sellerConnections].forEach(conns => {
    if (conns) {
      conns.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  });
}

/**
 * Broadcast liquidation alert
 */
export async function broadcastLiquidationAlert(userId, liquidationData) {
  const message = JSON.stringify({
    type: 'LIQUIDATION_ALERT',
    positionId: liquidationData.positionId,
    symbol: liquidationData.symbol,
    liquidationPrice: liquidationData.liquidationPrice,
    currentPrice: liquidationData.currentPrice,
    marginRatio: liquidationData.marginRatio,
    timestamp: Date.now()
  });
  
  const userConnections = connections.get(userId);
  if (userConnections) {
    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

/**
 * Broadcast liquidation execution
 */
export async function broadcastLiquidationExecuted(userId, liquidationData) {
  const message = JSON.stringify({
    type: 'LIQUIDATION_EXECUTED',
    positionId: liquidationData.positionId,
    symbol: liquidationData.symbol,
    liquidationPrice: liquidationData.liquidationPrice,
    loss: liquidationData.loss,
    timestamp: Date.now()
  });
  
  const userConnections = connections.get(userId);
  if (userConnections) {
    userConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BACKGROUND PROCESSES
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Start broadcasting live prices
 * Runs every 500ms and broadcasts prices for subscribed symbols
 */
function startPriceBroadcasting() {
  setInterval(async () => {
    try {
      // Get unique set of all subscribed symbols
      const allSymbols = new Set();
      
      for (const userSubs of subscriptions.values()) {
        userSubs.forEach(symbol => allSymbols.add(symbol));
      }
      
      // Fetch and broadcast prices for each symbol
      for (const symbol of allSymbols) {
        try {
          const priceData = await getCryptoPrice(symbol);
          await broadcastPriceUpdate(symbol, priceData);
        } catch (error) {
          console.error(`[WebSocket] Error fetching price for ${symbol}:`, error.message);
        }
      }
    } catch (error) {
      console.error(`[WebSocket] Error in price broadcasting:`, error.message);
    }
  }, 500); // Update every 500ms
}

/**
 * Start Redis pub/sub listener for trading events
 * Listens for events from matching engine and other services
 */
function startRedisListener() {
  try {
    // Create a separate Redis connection for pub/sub
    const redisPubSub = redis.duplicate();
    
    // Subscribe to trading events
    redisPubSub.on('message', (channel, message) => {
      try {
        const event = JSON.parse(message);
        
        switch (event.type) {
          case 'ORDER_FILLED':
            broadcastOrderFilled(event.userId, event.data);
            break;
            
          case 'POSITION_UPDATE':
            broadcastPositionUpdate(event.userId, event.data);
            break;
            
          case 'TRADE_EXECUTED':
            broadcastTradeExecution(event.userId, event.data);
            break;
            
          case 'LIQUIDATION_ALERT':
            broadcastLiquidationAlert(event.userId, event.data);
            break;
            
          case 'LIQUIDATION_EXECUTED':
            broadcastLiquidationExecuted(event.userId, event.data);
            break;
        }
      } catch (error) {
        console.error(`[WebSocket] Error processing Redis message:`, error.message);
      }
    });
    
    // Subscribe to channels
    redisPubSub.subscribe(
      'trading:orders',
      'trading:positions',
      'trading:trades',
      'trading:liquidations',
      (err, count) => {
        if (err) {
          console.error(`[WebSocket] Error subscribing to channels:`, err.message);
        } else {
          console.log(`[WebSocket] Subscribed to ${count} channels`);
        }
      }
    );
    
  } catch (error) {
    console.error(`[WebSocket] Error starting Redis listener:`, error.message);
  }
}

/**
 * Publish trading event to Redis for distribution
 */
export async function publishTradingEvent(channel, event) {
  try {
    await redis.publish(channel, JSON.stringify(event));
  } catch (error) {
    console.error(`[WebSocket] Error publishing event:`, error.message);
  }
}

/**
 * Get current connection count
 */
export function getConnectionCount() {
  let total = 0;
  for (const userConnections of connections.values()) {
    total += userConnections.size;
  }
  return total;
}

/**
 * Get subscription count for a symbol
 */
export function getSymbolSubscriberCount(symbol) {
  let count = 0;
  for (const userSubs of subscriptions.values()) {
    if (userSubs.has(symbol)) {
      count++;
    }
  }
  return count;
}

export default {
  initializeWebSocket,
  broadcastPriceUpdate,
  broadcastOrderFilled,
  broadcastPositionUpdate,
  broadcastTradeExecution,
  broadcastLiquidationAlert,
  broadcastLiquidationExecuted,
  publishTradingEvent,
  getConnectionCount,
  getSymbolSubscriberCount
};

import { WebSocketServer } from 'ws';
import { redis } from '../db/redis.js';

let wss = null;
const subscribers = new Map(); // symbol -> Set of WebSocket connections

/**
 * Initialize WebSocket server for real-time price updates
 */
export function initializeWebSocket(server) {
  wss = new WebSocketServer({ 
    server,
    path: '/ws/crypto'
  });

  wss.on('connection', (ws, req) => {
    console.log('[WebSocket] Client connected');
    
    // Handle subscription messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        if (data.type === 'subscribe') {
          const symbols = Array.isArray(data.symbols) ? data.symbols : [data.symbols];
          
          symbols.forEach(symbol => {
            if (!subscribers.has(symbol)) {
              subscribers.set(symbol, new Set());
            }
            subscribers.get(symbol).add(ws);
            console.log(`[WebSocket] Client subscribed to ${symbol}`);
          });
          
          // Send current prices immediately
          sendCurrentPrices(ws, symbols);
        }
        
        if (data.type === 'unsubscribe') {
          const symbols = Array.isArray(data.symbols) ? data.symbols : [data.symbols];
          
          symbols.forEach(symbol => {
            if (subscribers.has(symbol)) {
              subscribers.get(symbol).delete(ws);
              if (subscribers.get(symbol).size === 0) {
                subscribers.delete(symbol);
              }
            }
            console.log(`[WebSocket] Client unsubscribed from ${symbol}`);
          });
        }
      } catch (error) {
        console.error('[WebSocket] Error handling message:', error);
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
      // Remove from all subscriptions
      subscribers.forEach((clients, symbol) => {
        clients.delete(ws);
        if (clients.size === 0) {
          subscribers.delete(symbol);
        }
      });
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });
  });

  console.log('[WebSocket] Server initialized on /ws/crypto');
}

/**
 * Send current prices to newly connected client
 */
async function sendCurrentPrices(ws, symbols) {
  try {
    const prices = [];
    
    for (const symbol of symbols) {
      const cacheKey = `crypto:price:${symbol}`;
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        const priceData = JSON.parse(cached);
        prices.push(priceData);
      }
    }
    
    if (prices.length > 0) {
      ws.send(JSON.stringify({
        type: 'price_update',
        data: prices
      }));
    }
  } catch (error) {
    console.error('[WebSocket] Error sending current prices:', error);
  }
}

/**
 * Broadcast price update to all subscribed clients
 */
export function broadcastPriceUpdate(priceData) {
  if (!wss || !subscribers.has(priceData.symbol)) {
    return;
  }

  const message = JSON.stringify({
    type: 'price_update',
    data: [priceData],
    timestamp: Date.now()
  });

  const clients = subscribers.get(priceData.symbol);
  const deadClients = new Set();

  clients.forEach(ws => {
    try {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      } else {
        deadClients.add(ws);
      }
    } catch (error) {
      console.error('[WebSocket] Error sending to client:', error);
      deadClients.add(ws);
    }
  });

  // Remove dead connections
  deadClients.forEach(ws => {
    clients.delete(ws);
  });

  console.log(`[WebSocket] Broadcasted ${priceData.symbol} price to ${clients.size} clients`);
}

/**
 * Get WebSocket server stats
 */
export function getWebSocketStats() {
  return {
    connectedClients: wss ? wss.clients.size : 0,
    activeSubscriptions: subscribers.size,
    subscriptionDetails: Array.from(subscribers.entries()).map(([symbol, clients]) => ({
      symbol,
      clients: clients.size
    }))
  };
}

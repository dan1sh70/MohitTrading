import { redis } from "../../db/redis.js";

/**
 * GET /api/crypto/stream/prices
 * Server-Sent Events (SSE) endpoint for real-time crypto price updates
 */
export async function streamPrices(req, res) {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  console.log('[SSE] Client connected to crypto price stream');

  // Send initial data
  sendInitialPrices(res);

  // Set up interval to send updates every 2 seconds
  const interval = setInterval(async () => {
    try {
      await sendCurrentPrices(res);
    } catch (error) {
      console.error('[SSE] Error sending price update:', error);
    }
  }, 2000);

  // Handle client disconnect
  req.on('close', () => {
    console.log('[SSE] Client disconnected from crypto price stream');
    clearInterval(interval);
  });

  req.on('error', (error) => {
    console.error('[SSE] Client error:', error);
    clearInterval(interval);
  });
}

/**
 * Send initial prices when client connects
 */
async function sendInitialPrices(res) {
  try {
    // Get all cached prices
    const cached = await redis.get("crypto:prices:all");
    
    if (cached) {
      const data = JSON.parse(cached);
      const message = `data: ${JSON.stringify({
        type: 'initial_prices',
        data: data.data,
        count: data.count,
        timestamp: data.timestamp
      })}\n\n`;
      
      res.write(message);
      console.log(`[SSE] Sent initial prices: ${data.count} cryptos`);
    } else {
      // Fallback to individual price fetches
      const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];
      const prices = [];
      
      for (const symbol of symbols) {
        try {
          const cached = await redis.get(`crypto:price:${symbol}`);
          if (cached) {
            prices.push(JSON.parse(cached));
          }
        } catch (error) {
          console.warn(`[SSE] Error getting ${symbol} price:`, error);
        }
      }
      
      const message = `data: ${JSON.stringify({
        type: 'initial_prices',
        data: prices,
        count: prices.length,
        timestamp: Date.now()
      })}\n\n`;
      
      res.write(message);
      console.log(`[SSE] Sent initial prices: ${prices.length} cryptos (fallback)`);
    }
  } catch (error) {
    console.error('[SSE] Error sending initial prices:', error);
  }
}

/**
 * Send current prices at regular intervals
 */
async function sendCurrentPrices(res) {
  try {
    // Get all cached prices
    const cached = await redis.get("crypto:prices:all");
    
    if (cached) {
      const data = JSON.parse(cached);
      const message = `data: ${JSON.stringify({
        type: 'price_update',
        data: data.data,
        count: data.count,
        timestamp: data.timestamp
      })}\n\n`;
      
      res.write(message);
    }
  } catch (error) {
    console.error('[SSE] Error sending current prices:', error);
  }
}

/**
 * GET /api/crypto/stream/prices/:symbol
 * SSE endpoint for single crypto price updates
 */
export async function streamSinglePrice(req, res) {
  const symbol = String(req.params.symbol).toUpperCase();

  if (!symbol || symbol.trim().length === 0) {
    return res.status(400).json({
      message: 'Symbol is required'
    });
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  console.log(`[SSE] Client connected to ${symbol} price stream`);

  // Send initial price
  try {
    const cached = await redis.get(`crypto:price:${symbol}`);
    
    if (cached) {
      const priceData = JSON.parse(cached);
      const message = `data: ${JSON.stringify({
        type: 'initial_price',
        data: priceData,
        timestamp: Date.now()
      })}\n\n`;
      
      res.write(message);
    }
  } catch (error) {
    console.error(`[SSE] Error sending initial ${symbol} price:`, error);
  }

  // Set up interval to send updates
  const interval = setInterval(async () => {
    try {
      const cached = await redis.get(`crypto:price:${symbol}`);
      
      if (cached) {
        const priceData = JSON.parse(cached);
        const message = `data: ${JSON.stringify({
          type: 'price_update',
          data: priceData,
          timestamp: Date.now()
        })}\n\n`;
        
        res.write(message);
      }
    } catch (error) {
      console.error(`[SSE] Error sending ${symbol} update:`, error);
    }
  }, 2000);

  // Handle client disconnect
  req.on('close', () => {
    console.log(`[SSE] Client disconnected from ${symbol} stream`);
    clearInterval(interval);
  });

  req.on('error', (error) => {
    console.error(`[SSE] Client error on ${symbol} stream:`, error);
    clearInterval(interval);
  });
}

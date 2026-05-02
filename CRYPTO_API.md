# Crypto Trading API Documentation

## Overview

Real-time cryptocurrency trading endpoints with Binance price feeds, Redis caching, and rate limiting.

## Features

- **Real-time Prices**: Fetch current crypto prices from Binance API
- **24h Stats**: Get 24-hour price changes and volume data
- **Trading**: Buy/Sell cryptocurrencies with balance management
- **Portfolio**: View current holdings and profit/loss
- **Redis Caching**: 30-second price cache for performance optimization
- **Rate Limiting**:
  - Price endpoints: 30 requests/minute
  - Trading endpoints: 5 requests/minute
  - Login: 10 requests/minute

## Supported Cryptocurrencies

- BTCUSDT (Bitcoin)
- ETHUSDT (Ethereum)
- BNBUSDT (Binance Coin)
- SOLUSDT (Solana)
- XRPUSDT (XRP)
- TRXUSDT (TRON)
- ADAUSDT (Cardano)

## API Endpoints

### 1. Get All Crypto Prices

```
GET /api/crypto/prices
```

**Rate Limit**: 30 requests/minute  
**Authentication**: Not required  
**Description**: Fetch current prices for all supported cryptocurrencies

**Response**:

```json
{
  "data": [
    {
      "symbol": "BTCUSDT",
      "price": 49825.13,
      "timestamp": 1713052800000
    },
    {
      "symbol": "ETHUSDT",
      "price": 49825.13,
      "timestamp": 1713052800000
    }
  ],
  "count": 7,
  "timestamp": 1713052800000
}
```

### 2. Get Specific Crypto Price

```
GET /api/crypto/prices/:symbol
```

**Example**: `GET /api/crypto/prices/BTCUSDT`  
**Rate Limit**: 30 requests/minute  
**Authentication**: Not required  
**Description**: Fetch current price for a specific cryptocurrency

**Response**:

```json
{
  "symbol": "BTCUSDT",
  "price": 49825.13,
  "timestamp": 1713052800000
}
```

### 3. Get Crypto 24h Statistics

```
GET /api/crypto/stats/:symbol
```

**Example**: `GET /api/crypto/stats/ETHUSDT`  
**Rate Limit**: 30 requests/minute  
**Authentication**: Not required  
**Description**: Get 24-hour statistics including price change and volume

**Response**:

```json
{
  "symbol": "ETHUSDT",
  "price": 49825.13,
  "priceChange": 162.45,
  "priceChangePercent": 0.33,
  "highPrice": 50000.0,
  "lowPrice": 49000.0,
  "volume": 12345.67,
  "quoteAssetVolume": 615234567.89,
  "timestamp": 1713052800000
}
```

### 4. Buy Cryptocurrency

```
POST /api/crypto/buy
```

**Rate Limit**: 5 requests/minute  
**Authentication**: Required (Bearer token)  
**Description**: Execute a buy order for cryptocurrency

**Request Body**:

```json
{
  "symbol": "BTCUSDT",
  "quantity": 0.5,
  "price": 49825.13
}
```

**Response**:

```json
{
  "message": "Buy order created successfully",
  "trade": {
    "id": 123,
    "user_id": 1,
    "symbol": "BTCUSDT",
    "side": "BUY",
    "quantity": 0.5,
    "price": 49825.13,
    "status": "OPEN",
    "created_at": "2026-04-14T10:00:00Z"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Invalid symbol or insufficient balance
- `401 Unauthorized`: Missing or invalid authentication token
- `429 Too Many Requests`: Rate limit exceeded

### 5. Sell Cryptocurrency

```
POST /api/crypto/sell
```

**Rate Limit**: 5 requests/minute  
**Authentication**: Required (Bearer token)  
**Description**: Execute a sell order for cryptocurrency

**Request Body**:

```json
{
  "symbol": "BTCUSDT",
  "quantity": 0.5,
  "price": 50000.0
}
```

**Response**:

```json
{
  "message": "Sell order created successfully",
  "trade": {
    "id": 124,
    "user_id": 1,
    "symbol": "BTCUSDT",
    "side": "SELL",
    "quantity": 0.5,
    "price": 50000.0,
    "status": "OPEN",
    "created_at": "2026-04-14T10:01:00Z"
  }
}
```

**Error Responses**:

- `400 Bad Request`: Invalid symbol or insufficient position
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: User not found

### 6. Get User Portfolio

```
GET /api/crypto/portfolio
```

**Authentication**: Required (Bearer token)  
**Description**: Get user's current holdings and portfolio value

**Response**:

```json
{
  "balance": 95000.5,
  "positions": [
    {
      "symbol": "BTCUSDT",
      "quantity": 0.5,
      "avgPrice": 49825.13,
      "currentPrice": 50000.0,
      "value": 25000.0,
      "pnl": 87.44,
      "pnlPercent": "0.35"
    },
    {
      "symbol": "ETHUSDT",
      "quantity": 1.0,
      "avgPrice": 2500.0,
      "currentPrice": 2620.0,
      "value": 2620.0,
      "pnl": 120.0,
      "pnlPercent": "4.80"
    }
  ],
  "timestamp": 1713052800000
}
```

### 7. Get User Trade History

```
GET /api/crypto/trades?page=1&limit=20
```

**Authentication**: Required (Bearer token)  
**Query Parameters**:

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Description**: Get paginated list of user's trades

**Response**:

```json
{
  "data": [
    {
      "id": 124,
      "symbol": "BTCUSDT",
      "side": "SELL",
      "quantity": 0.5,
      "price": 50000.0,
      "status": "OPEN",
      "pnl": null,
      "created_at": "2026-04-14T10:01:00Z",
      "closed_at": null
    },
    {
      "id": 123,
      "symbol": "BTCUSDT",
      "side": "BUY",
      "quantity": 0.5,
      "price": 49825.13,
      "status": "OPEN",
      "pnl": null,
      "created_at": "2026-04-14T10:00:00Z",
      "closed_at": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

## Authentication

All endpoints requiring authentication need the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Get your token by logging in:

```
POST /api/auth/login

{
  "email": "trader@example.com",
  "password": "YourPassword123"
}
```

## Rate Limiting

Rate limits are enforced per IP address. When you exceed the rate limit, you'll receive:

```json
{
  "message": "Too many requests. Try again shortly."
}
```

**HTTP Status**: 429 (Too Many Requests)

### Rate Limit Headers

Responses include rate limit information in headers:

- `RateLimit-Limit`: Maximum requests per window
- `RateLimit-Remaining`: Requests remaining in current window
- `RateLimit-Reset`: Time when the limit resets (Unix timestamp)

## Redis Caching

Crypto prices are cached in Redis for 30 seconds to:

- Reduce load on Binance API
- Improve response times
- Ensure consistency across simultaneous requests

Cache is automatically invalidated when:

- A trade is created (buy/sell)
- Cache TTL expires (30 seconds)

## Error Handling

All error responses follow this format:

```json
{
  "message": "Error description"
}
```

**Common Error Codes**:

- `400 Bad Request`: Invalid input or business logic error
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Implementation Notes

### Balance Management

- When user buys crypto: balance decreases by (quantity × price)
- When user sells crypto: balance increases by (quantity × price)
- Users cannot sell more crypto than they own

### Position Tracking

- All trades (buy/sell) are stored in the database
- Net position is calculated as: SUM(BUY quantity) - SUM(SELL quantity)
- Only open trades count towards available positions

### Profit & Loss

- Calculated as: (currentPrice - avgPrice) × quantity
- PnL % shows the percentage gain/loss
- Only calculated for portfolios with price data available

### WebSocket Integration (Future)

Reference Binance WebSocket streams for real-time updates:

```
wss://stream.binance.com/stream?streams=
btcusdt@miniTicker/
ethusdt@miniTicker/
bnbusdt@miniTicker/
solusdt@miniTicker/
xrpusdt@miniTicker/
trxusdt@miniTicker/
adausdt@miniTicker
```

## Example Client Code

### Fetch All Prices (JavaScript/Fetch)

```javascript
const response = await fetch("http://localhost:8808/api/crypto/prices");
const { data, count } = await response.json();
console.log(`Fetched ${count} cryptocurrency prices`);
```

### Buy Crypto (with Authentication)

```javascript
const token = "your_jwt_token_here";

const response = await fetch("http://localhost:8808/api/crypto/buy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    symbol: "BTCUSDT",
    quantity: 0.5,
    price: 49825.13,
  }),
});

const result = await response.json();
console.log(result.message);
```

### Get Portfolio

```javascript
const token = "your_jwt_token_here";

const response = await fetch("http://localhost:8808/api/crypto/portfolio", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const portfolio = await response.json();
console.log(`Available Balance: $${portfolio.balance}`);
console.log(`Holdings: ${portfolio.positions.length} positions`);
```

## Testing with cURL

### Get all prices

```bash
curl http://localhost:8808/api/crypto/prices
```

### Get specific price

```bash
curl http://localhost:8808/api/crypto/prices/BTCUSDT
```

### Get 24h stats

```bash
curl http://localhost:8808/api/crypto/stats/ETHUSDT
```

### Buy crypto (replace TOKEN with your JWT)

```bash
curl -X POST http://localhost:8808/api/crypto/buy \\
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "symbol": "BTCUSDT",
    "quantity": 0.5,
    "price": 49825.13
  }'
```

### Get portfolio

```bash
curl http://localhost:8808/api/crypto/portfolio \\
  -H "Authorization: Bearer TOKEN"
```

## Dependencies

- **express**: Web framework
- **axios/fetch**: HTTP client for Binance API
- **ioredis**: Redis client for caching
- **mysql2**: Database for trades and positions
- **express-rate-limit**: Rate limiting middleware
- **zod**: Input validation
- **jsonwebtoken**: JWT authentication

## Future Enhancements

1. WebSocket integration for real-time price feeds
2. Order book data from Binance
3. Advanced charting endpoints
4. Stop-loss and take-profit orders
5. Multi-asset portfolio tracking
6. Performance metrics and analytics
7. Trade alerts and notifications

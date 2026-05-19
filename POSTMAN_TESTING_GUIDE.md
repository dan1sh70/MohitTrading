# Paper Trading API - Postman Testing Guide

A comprehensive guide for testing all APIs in Postman.

**Base URL:** `http://localhost:8808/api` (local) or your deployed URL

---

## Table of Contents

1. [Setup](#setup)
2. [Public Endpoints (No Auth)](#public-endpoints)
3. [Authentication](#authentication)
4. [Authenticated Trading Endpoints](#authenticated-trading-endpoints)
5. [Admin Endpoints](#admin-endpoints)
6. [Rate Limits](#rate-limits)

---

## Setup

### 1. Create a Postman Collection

1. Open Postman
2. Click **New Collection**
3. Name it "Paper Trading API"

### 2. Set Collection Variables

| Variable     | Initial Value           | Description             |
| ------------ | ----------------------- | ----------------------- |
| `base_url`   | `http://localhost:8808` | Your API base URL       |
| `auth_token` | _(empty)_               | Will be set after login |

### 3. Create Environment (Optional)

Create separate environments for local/development/production with different `base_url` values.

---

## Public Endpoints

### Health Check

**Method:** GET  
**URL:** `{{base_url}}/health`  
**Auth:** None

**Expected Response (200):**

```json
{
  "status": "ok",
  "timestamp": 1715278901234
}
```

---

### Authentication

#### Login

**Method:** POST  
**URL:** `{{base_url}}/api/auth/login`  
**Auth:** None  
**Rate Limit:** 10 req/minute

**Request Body:**

```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Expected Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

---

#### Register

**Method:** POST  
**URL:** `{{base_url}}/api/auth/register`  
**Auth:** None  
**Rate Limit:** 10 req/minute

**Request Body:**

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "trader"
}
```

**Expected Response (201):**

```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 2,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "trader"
  }
}
```

**Postman Setup:**

1. In **Tests** tab, add this script to save the token:

```javascript
if (pm.response.code === 200) {
  var jsonData = pm.response.json();
  pm.collectionVariables.set("auth_token", jsonData.token);
}
```

---

## Crypto Endpoints

### Get All Crypto Prices

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/prices`  
**Auth:** None  
**Rate Limit:** 30 req/minute

**Expected Response:**

```json
{
  "data": [
    { "symbol": "BTC", "price": 65000.0, "change24h": 2.5 },
    { "symbol": "ETH", "price": 3500.0, "change24h": -1.2 }
  ],
  "count": 50,
  "timestamp": 1715278901234
}
```

---

### Get Single Crypto Price

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/prices/:symbol`  
**Auth:** None  
**Rate Limit:** 30 req/minute

**Path Variable:**

- `symbol` - e.g., `BTC`, `ETH`, `SOL`

**Expected Response:**

```json
{
  "symbol": "BTC",
  "price": 65000.0,
  "change24h": 2.5,
  "volume24h": 35000000000,
  "timestamp": 1715278901234
}
```

---

### Get Crypto Stats

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/stats/:symbol`  
**Auth:** None  
**Rate Limit:** 30 req/minute

**Path Variable:**

- `symbol` - e.g., `BTC`, `ETH`

---

### Get Historical Prices

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/:symbol/historical`  
**Auth:** None  
**Rate Limit:** 30 req/minute

**Path Variable:**

- `symbol` - e.g., `BTC`

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `timeframe` | string | `1d` | `1d`, `1h`, `15m`, `5m` |
| `days` | number | `30` | Max 365 |

**Example:** `{{base_url}}/api/crypto/BTC/historical?timeframe=1d&days=30`

---

### Get Chart Data

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/:symbol/chart`  
**Auth:** None  
**Rate Limit:** 30 req/minute

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `timeframe` | string | `1d` | Time interval |
| `limit` | number | `100` | Max 1000 candles |

---

### Get Technical Indicators

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/:symbol/indicators`  
**Auth:** None  
**Rate Limit:** 30 req/minute

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `timeframe` | string | `1d` | `1d`, `1h`, `15m` |

---

### Get Top 3 Famous Cryptos

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/top-3/famous`  
**Auth:** None

---

### Get Top 10 Trending

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/trending/top-10`  
**Auth:** None

---

### Get All Trending

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/trending/all`  
**Auth:** None

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `minPercent` | number | `0` | Minimum % change filter |

---

### Get Top 10 Ranked (Cached)

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/top-10/ranked`  
**Auth:** None

---

### Get All Stats (Cached)

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/all/stats`  
**Auth:** None

---

## US Stocks Endpoints

### Get All US Stocks

**Method:** GET  
**URL:** `{{base_url}}/api/stocks/us`  
**Auth:** None  
**Rate Limit:** 30 req/minute

---

### Get US Stock Price

**Method:** GET  
**URL:** `{{base_url}}/api/stocks/us/:symbol`  
**Auth:** None

**Path Variable:**

- `symbol` - e.g., `AAPL`, `MSFT`, `GOOGL`

**Example:** `{{base_url}}/api/stocks/us/AAPL`

---

### Get Stock Daily Data

**Method:** GET  
**URL:** `{{base_url}}/api/stocks/us/:symbol/daily`  
**Auth:** None

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `outputSize` | string | `compact` | `compact` or `full` |

---

### Get SMA Indicator

**Method:** GET  
**URL:** `{{base_url}}/api/stocks/us/:symbol/sma`  
**Auth:** None

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `interval` | string | `daily` | `daily`, `weekly`, `monthly` |
| `timePeriod` | number | `20` | SMA period |

---

### Get RSI Indicator

**Method:** GET  
**URL:** `{{base_url}}/api/stocks/us/:symbol/rsi`  
**Auth:** None

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `interval` | string | `daily` | Time interval |
| `timePeriod` | number | `14` | RSI period (typically 14) |

---

## Forex Endpoints

### Get All Forex Pairs

**Method:** GET  
**URL:** `{{base_url}}/api/forex/pairs`  
**Auth:** None

---

### Get Tested Forex Pairs (Free Tier)

**Method:** GET  
**URL:** `{{base_url}}/api/forex/pairs/tested`  
**Auth:** None

---

### Get Upcoming Forex Pairs

**Method:** GET  
**URL:** `{{base_url}}/api/forex/pairs/upcoming`  
**Auth:** None

---

### Get Exchange Rate

**Method:** GET  
**URL:** `{{base_url}}/api/forex/rate/:from/:to`  
**Auth:** None

**Path Variables:**

- `from` - Base currency (e.g., `EUR`)
- `to` - Quote currency (e.g., `USD`)

**Example:** `{{base_url}}/api/forex/rate/EUR/USD`

---

## Indian Stocks Endpoints (Upstox Powered)

**Data Source:** Upstox API (OAuth 2.0)  
**Authentication:** Upstox credentials configured in `.env`  
**Rate Limit:** 30 req/minute

---

### Get All Indian Stocks

**Method:** GET  
**URL:** `{{base_url}}/api/stocks/in`  
**Auth:** None

**Expected Response (200):**

```json
{
  "data": [
    {
      "symbol": "INFY",
      "name": "Infosys Limited",
      "exchange": "NSE",
      "price": 1580.5,
      "open": 1570.0,
      "high": 1595.0,
      "low": 1565.0,
      "close": 1565.25,
      "change": 15.25,
      "changePercent": 0.97,
      "volume": 8500000,
      "timestamp": 1715278901234,
      "marketOpen": true,
      "isStale": false
    }
  ],
  "count": 15,
  "timestamp": 1715278901234,
  "marketOpen": true,
  "source": "Upstox"
}
```

---

### Get Top Indian Stocks

**Method:** GET  
**URL:** `{{base_url}}/api/stocks/in/top`  
**Auth:** None

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sortBy` | string | `volume` | `volume`, `changePercent`, `price` |

**Example:** `{{base_url}}/api/stocks/in/top?sortBy=changePercent`

---

### Get Indian Stock Price

**Method:** GET  
**URL:** `{{base_url}}/api/stocks/in/:symbol`  
**Auth:** None

**Path Variable:**

- `symbol` - e.g., `RELIANCE`, `TCS`, `INFY`, `HDFCBANK`, `ICICIBANK`

**Supported Symbols:** INFY, TCS, RELIANCE, HDFC, ICICIBANK, SBIN, WIPRO, MARUTI, BAJAJFINSV, LT, HINDUNILVR, SUNPHARMA, ADANIGREEN, BHARTIARTL, HDFCBANK

**Expected Response (200):**

```json
{
  "symbol": "INFY",
  "name": "Infosys Limited",
  "exchange": "NSE",
  "price": 1580.5,
  "open": 1570.0,
  "high": 1595.0,
  "low": 1565.0,
  "close": 1565.25,
  "change": 15.25,
  "changePercent": 0.97,
  "volume": 8500000,
  "timestamp": 1715278901234,
  "marketOpen": true,
  "isStale": false,
  "source": "Upstox"
}
```

---

### Get Batch Indian Stocks

**Method:** GET  
**URL:** `{{base_url}}/api/stocks/in/batch`  
**Auth:** None

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | `10` | Max stocks to return (1-15) |

---

### Get Intraday Candlestick Data

**Method:** GET  
**URL:** `{{base_url}}/api/stocks/in/:symbol/intraday`  
**Auth:** None

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `interval` | string | `1min` | `1minute`, `5minute`, `15minute` |

**Expected Response (200):**

```json
{
  "symbol": "INFY",
  "name": "Infosys Limited",
  "exchange": "NSE",
  "interval": "1minute",
  "data": [
    {
      "timestamp": 1715278800000,
      "open": 1570.0,
      "high": 1575.5,
      "low": 1568.0,
      "close": 1573.25,
      "volume": 450000
    }
  ],
  "timestamp": 1715278901234,
  "source": "Upstox"
}
```

---

### Get Daily Candlestick Data

**Method:** GET  
**URL:** `{{base_url}}/api/stocks/in/:symbol/daily`  
**Auth:** None

**Expected Response (200):**

```json
{
  "symbol": "INFY",
  "name": "Infosys Limited",
  "exchange": "NSE",
  "data": [
    {
      "date": "2024-05-17",
      "open": 1570.0,
      "high": 1595.5,
      "low": 1565.0,
      "close": 1580.5,
      "volume": 8500000
    }
  ],
  "timestamp": 1715278901234,
  "source": "Upstox"
}
```

---

### Get Lot Size for Symbol

**Method:** GET  
**URL:** `{{base_url}}/api/stocks/in/lot-size/:symbol`  
**Auth:** None

**Expected Response (200):**

```json
{
  "symbol": "RELIANCE",
  "lotSize": 1,
  "name": "Reliance Industries",
  "exchange": "NSE",
  "category": "equity",
  "source": "Upstox"
}
```

---

### Get All Lot Sizes

**Method:** GET  
**URL:** `{{base_url}}/api/stocks/in/lot-sizes/all`  
**Auth:** None

**Expected Response (200):**

```json
{
  "data": [
    {
      "symbol": "NIFTY",
      "lotSize": 50,
      "name": "Nifty 50",
      "exchange": "NSE",
      "category": "fno"
    },
    {
      "symbol": "RELIANCE",
      "lotSize": 1,
      "name": "Reliance Industries",
      "exchange": "NSE",
      "category": "equity"
    }
  ],
  "count": 150,
  "timestamp": 1715278901234,
  "source": "Upstox"
}
```

---

### Validate Lot Multiple

**Method:** GET  
**URL:** `{{base_url}}/api/stocks/in/lot-sizes/validate`  
**Auth:** None

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `symbol` | string | Yes | Stock symbol |
| `quantity` | number | Yes | Quantity to validate |

**Example:** `{{base_url}}/api/stocks/in/lot-sizes/validate?symbol=RELIANCE&quantity=100`

**Expected Response (200):**

```json
{
  "symbol": "RELIANCE",
  "quantity": 100,
  "lotSize": 1,
  "isValid": true,
  "remainder": 0,
  "suggestion": "Quantity is valid (multiple of 1)"
}
```

---

## News Endpoints

### Get Latest News

**Method:** GET  
**URL:** `{{base_url}}/api/news/latest`  
**Auth:** None  
**Rate Limit:** 40 req/minute

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | `20` | 1-100 articles |
| `page` | number | `1` | Page number |

---

### Search News

**Method:** GET  
**URL:** `{{base_url}}/api/news/search`  
**Auth:** None

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search query |
| `page` | number | No | Page number |
| `limit` | number | No | 1-100 |

**Example:** `{{base_url}}/api/news/search?q=bitcoin&limit=10`

---

### Get News by Symbols

**Method:** GET  
**URL:** `{{base_url}}/api/news/symbols`  
**Auth:** None

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `symbols` | string | Yes | Comma-separated (e.g., `BTC,ETH,AAPL`) |
| `page` | number | No | Page number |
| `limit` | number | No | 1-100 |

---

### Get Trending News

**Method:** GET  
**URL:** `{{base_url}}/api/news/trending`  
**Auth:** None

---

### Get News by Date Range

**Method:** GET  
**URL:** `{{base_url}}/api/news/date-range`  
**Auth:** None

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `startDate` | string | Yes | ISO format (e.g., `2024-01-01`) |
| `endDate` | string | Yes | ISO format (e.g., `2024-01-31`) |
| `page` | number | No | Page number |
| `limit` | number | No | 1-100 |

---

### Get Crypto News

**Method:** GET  
**URL:** `{{base_url}}/api/news/crypto`  
**Auth:** None

---

### Get Stock Market News

**Method:** GET  
**URL:** `{{base_url}}/api/news/stocks`  
**Auth:** None

---

### Advanced News Search

**Method:** GET  
**URL:** `{{base_url}}/api/news/advanced`  
**Auth:** None

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `query` | string | Search text |
| `symbols` | string | Comma-separated symbols |
| `startDate` | string | ISO date |
| `endDate` | string | ISO date |
| `page` | number | Page number |
| `limit` | number | Results per page |

---

## Authenticated Trading Endpoints

**All endpoints below require Authentication Header:**

```
Authorization: Bearer {{auth_token}}
```

### Buy Crypto

**Method:** POST  
**URL:** `{{base_url}}/api/crypto/buy`  
**Auth:** Required  
**Rate Limit:** 5 req/minute

**Request Body:**

```json
{
  "symbol": "BTC",
  "quantity": 0.5,
  "price": 65000.0
}
```

**Validation Rules:**

- `symbol`: 3-20 characters, uppercase
- `quantity`: Positive number
- `price`: Positive number

**Expected Response (201):**

```json
{
  "message": "Buy order created successfully",
  "trade": {
    "id": 123,
    "user_id": 1,
    "symbol": "BTC",
    "side": "BUY",
    "quantity": 0.5,
    "price": 65000.0,
    "status": "OPEN",
    "created_at": "2024-05-01T12:00:00Z"
  }
}
```

---

### Sell Crypto

**Method:** POST  
**URL:** `{{base_url}}/api/crypto/sell`  
**Auth:** Required  
**Rate Limit:** 5 req/minute

**Request Body:**

```json
{
  "symbol": "BTC",
  "quantity": 0.25,
  "price": 66000.0
}
```

---

### Get Portfolio

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/portfolio`  
**Auth:** Required

**Expected Response:**

```json
{
  "balance": 95000.0,
  "positions": [
    {
      "symbol": "BTC",
      "quantity": 0.5,
      "avgPrice": 65000.0,
      "currentPrice": 66000.0,
      "value": 33000.0,
      "pnl": 500.0,
      "pnlPercent": "1.54"
    }
  ],
  "timestamp": 1715278901234
}
```

---

### Get User Trades

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/trades`  
**Auth:** Required

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | 5-100 items per page |

**Expected Response:**

```json
{
  "data": [
    {
      "id": 123,
      "symbol": "BTCUSDT",
      "side": "BUY",
      "quantity": 0.5,
      "price": "40012.5",
      "status": "FILLED",
      "pnl": "720.00",
      "created_at": "2026-05-14T09:12:30.000Z",
      "closed_at": "2026-05-14T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### NEW: Place Buy Order (Market / Limit)

**Method:** POST  
**URL:** `{{base_url}}/api/crypto/orders/buy`  
**Auth:** Required  
**Rate Limit:** 5 req/minute

**Request Body:**

```json
{
  "symbol": "BTCUSDT",
  "orderType": "MARKET",
  "quantity": 0.25,
  "price": 40000.0,
  "leverage": 10,
  "tradingMode": "FUTURES"
}
```

**Expected Response:**

```json
{
  "orderId": 312,
  "status": "FILLED",
  "symbol": "BTCUSDT",
  "side": "BUY",
  "orderType": "MARKET",
  "quantity": 0.25,
  "filledQuantity": 0.25,
  "executionPrice": 40012.5,
  "marginUsed": 1000.3125,
  "liquidationPrice": 36393.75
}
```

---

### NEW: Place Sell Order (Market / Limit)

**Method:** POST  
**URL:** `{{base_url}}/api/crypto/orders/sell`  
**Auth:** Required  
**Rate Limit:** 5 req/minute

**Request Body:**

```json
{
  "symbol": "BTCUSDT",
  "orderType": "LIMIT",
  "quantity": 0.15,
  "price": 40500.0,
  "leverage": 5,
  "tradingMode": "FUTURES"
}
```

**Expected Response:**

```json
{
  "orderId": 313,
  "status": "OPEN",
  "symbol": "BTCUSDT",
  "side": "SELL",
  "orderType": "LIMIT",
  "quantity": 0.15,
  "remainingQuantity": 0.15,
  "price": 40500.0
}
```

---

### NEW: Get Active Orders

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/orders?status=OPEN&symbol=BTCUSDT&page=1&limit=20`  
**Auth:** Required

---

### NEW: Cancel Order

**Method:** POST  
**URL:** `{{base_url}}/api/crypto/orders/{{orderId}}/cancel`  
**Auth:** Required

**Expected Response:**

```json
{
  "orderId": 313,
  "status": "CANCELLED",
  "message": "Order cancelled successfully"
}
```

---

### NEW: Get Active Positions

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/positions`  
**Auth:** Required

---

### NEW: Get Position Details

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/positions/{{positionId}}`  
**Auth:** Required

---

### NEW: Close Position

**Method:** POST  
**URL:** `{{base_url}}/api/crypto/positions/{{positionId}}/close`  
**Auth:** Required  
**Rate Limit:** 5 req/minute

**Request Body (optional):**

```json
{ "closePrice": 40320.0 }
```

---

### NEW: Get Performance Metrics

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/performance`  
**Auth:** Required

---

### NEW: Get Account Balance

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/account/balance`  
**Auth:** Required

---

### NEW: Get Orderbook Snapshot

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/orderbook/BTCUSDT`  
**Auth:** Not required

---

### NEW: Check Liquidation Status

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/positions/{{positionId}}/liquidation-check`  
**Auth:** Required

---

### NEW: Get Current Mark Price

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/mark-price/BTCUSDT`  
**Auth:** Not required

**Expected Response:**

```json
{
  "symbol": "BTCUSDT",
  "markPrice": 45234.5,
  "lastPrice": 45200.0,
  "bidPrice": 45220.25,
  "askPrice": 45250.75,
  "updatedAt": "2026-05-14T10:30:00Z"
}
```

---

### NEW: Get Mark Price History

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/mark-price/BTCUSDT/history?limit=20&interval=5m`  
**Auth:** Not required

**Expected Response:**

```json
{
  "symbol": "BTCUSDT",
  "data": [
    {
      "timestamp": "2026-05-14T10:30:00Z",
      "markPrice": 45234.5,
      "bidPrice": 45220.25,
      "askPrice": 45250.75
    },
    {
      "timestamp": "2026-05-14T10:25:00Z",
      "markPrice": 45210.75,
      "bidPrice": 45195.5,
      "askPrice": 45225.0
    }
  ]
}
```

---

### NEW: Get Current Funding Rate

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/funding/rates/BTCUSDT`  
**Auth:** Not required

**Expected Response:**

```json
{
  "symbol": "BTCUSDT",
  "fundingRate": 0.00008,
  "markPrice": 45234.5,
  "nextSettlementTime": "2026-05-14T16:00:00Z"
}
```

---

### NEW: Get Funding Payment History

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/funding/payments?limit=20&symbol=BTCUSDT`  
**Auth:** Required

**Expected Response:**

```json
{
  "data": [
    {
      "positionId": 84,
      "symbol": "BTCUSDT",
      "side": "LONG",
      "fundingAmount": -40.5,
      "fundingRate": 0.00008,
      "settlementTime": "2026-05-14T08:00:00Z"
    }
  ]
}
```

---

### NEW: Predict Funding Payment

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/funding/predict/84`  
**Auth:** Required

**Expected Response:**

```json
{
  "positionId": 84,
  "symbol": "BTCUSDT",
  "predictedPayment": -40.5,
  "nextSettlementTime": "2026-05-14T16:00:00Z"
}
```

---

### NEW: Set Take Profit Target

**Method:** POST  
**URL:** `{{base_url}}/api/crypto/positions/{{positionId}}/take-profit`  
**Auth:** Required

**Request Body:**

```json
{
  "targetPrice": 50000.0
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Take profit set successfully",
  "positionId": 84,
  "targetPrice": 50000.0
}
```

---

### NEW: Set Stop Loss Level

**Method:** POST  
**URL:** `{{base_url}}/api/crypto/positions/{{positionId}}/stop-loss`  
**Auth:** Required

**Request Body:**

```json
{
  "stopPrice": 40000.0
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Stop loss set successfully",
  "positionId": 84,
  "stopPrice": 40000.0
}
```

---

### NEW: Cancel Take Profit

**Method:** DELETE  
**URL:** `{{base_url}}/api/crypto/positions/{{positionId}}/take-profit`  
**Auth:** Required

**Expected Response:**

```json
{
  "success": true,
  "message": "Take profit cancelled",
  "positionId": 84
}
```

---

### NEW: Cancel Stop Loss

**Method:** DELETE  
**URL:** `{{base_url}}/api/crypto/positions/{{positionId}}/stop-loss`  
**Auth:** Required

**Expected Response:**

```json
{
  "success": true,
  "message": "Stop loss cancelled",
  "positionId": 84
}
```

---

### NEW: Get Trigger Execution History

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/triggers/history?limit=20`  
**Auth:** Required

**Expected Response:**

```json
{
  "data": [
    {
      "id": 15,
      "positionId": 84,
      "triggerType": "TAKE_PROFIT",
      "executionPrice": 50050.25,
      "pnl": 47802.75,
      "executedAt": "2026-05-14T12:30:45Z"
    }
  ]
}
```

---

### NEW: Switch Margin Mode

**Method:** POST  
**URL:** `{{base_url}}/api/crypto/positions/{{positionId}}/margin-mode`  
**Auth:** Required

**Request Body:**

```json
{
  "mode": "ISOLATED",
  "isolatedMargin": 5000.0
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Margin mode changed to ISOLATED",
  "positionId": 84,
  "marginMode": "ISOLATED"
}
```

---

### NEW: Get Margin Utilization

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/margin-utilization`  
**Auth:** Required

**Expected Response:**

```json
{
  "balance": 125087.5,
  "marginUsed": 45000.0,
  "availableMargin": 80087.5,
  "marginUtilizationPercent": "35.96"
}
```

---

### NEW: Enable Hedge Mode

**Method:** POST  
**URL:** `{{base_url}}/api/crypto/hedge-mode/enable`  
**Auth:** Required

**Expected Response:**

```json
{
  "success": true,
  "message": "Hedge mode enabled",
  "hedgeMode": true
}
```

---

### NEW: Disable Hedge Mode

**Method:** POST  
**URL:** `{{base_url}}/api/crypto/hedge-mode/disable`  
**Auth:** Required

**Expected Response:**

```json
{
  "success": true,
  "message": "Hedge mode disabled",
  "hedgeMode": false
}
```

---

### NEW: Get Hedge Mode Status

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/hedge-mode/status`  
**Auth:** Required

**Expected Response:**

```json
{
  "hedgeMode": true,
  "mode": "HEDGE"
}
```

---

### NEW: Update Reduce-Only Flag

**Method:** POST  
**URL:** `{{base_url}}/api/crypto/positions/{{positionId}}/reduce-only`  
**Auth:** Required

**Request Body:**

```json
{
  "reduceOnly": true
}
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Reduce-only flag updated",
  "positionId": 84,
  "reduceOnly": true
}
```

---

### NEW: Get Maker/Taker Fees

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/fees/config/BTCUSDT`  
**Auth:** Not required

**Expected Response:**

```json
{
  "symbol": "BTCUSDT",
  "makerFeeRate": -0.0002,
  "takerFeeRate": 0.0004,
  "fundingRateBase": 0.00001
}
```

---

### NEW: Get Aggregated Position

**Method:** GET  
**URL:** `{{base_url}}/api/crypto/positions/aggregated/BTCUSDT`  
**Auth:** Required

**Expected Response:**

```json
{
  "symbol": "BTCUSDT",
  "netQuantity": 0.5,
  "netSide": "LONG",
  "pnl": 3667.25
}
```

---

## Admin Endpoints

**All endpoints below require:**

1. Authentication Header: `Authorization: Bearer {{auth_token}}`
2. Admin Role (role = "admin" in JWT token)

### Get Admin Stats

**Method:** GET  
**URL:** `{{base_url}}/api/admin/stats`  
**Auth:** Admin Only

**Expected Response:**

```json
{
  "totalTraders": 150,
  "openTrades": 45,
  "closedTrades": 320,
  "totalVolume": 12500000.0,
  "totalPnl": 85000.0
}
```

---

### List Users

**Method:** GET  
**URL:** `{{base_url}}/api/admin/users`  
**Auth:** Admin Only

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | 5-100 per page |
| `search` | string | Search by name/email |
| `role` | string | Filter by `admin` or `trader` |

---

### Create User

**Method:** POST  
**URL:** `{{base_url}}/api/admin/users`  
**Auth:** Admin Only

**Request Body:**

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "role": "trader",
  "balance": 100000,
  "password": "securepassword123"
}
```

**Validation:**

- `fullName`: 2-120 characters
- `email`: Valid email format
- `role`: `admin` or `trader`
- `balance`: Non-negative number
- `password`: 6-120 characters

---

### Get Positions

**Method:** GET  
**URL:** `{{base_url}}/api/admin/positions`  
**Auth:** Admin Only

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | 5-100 per page |
| `search` | string | Search by user name |
| `symbol` | string | Filter by symbol |

---

### List All Trades

**Method:** GET  
**URL:** `{{base_url}}/api/admin/trades`  
**Auth:** Admin Only

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | 5-100 per page |
| `status` | string | `OPEN` or `CLOSED` |
| `symbol` | string | Filter by symbol |
| `userId` | number | Filter by user ID |

---

### Create Trade (Admin)

**Method:** POST  
**URL:** `{{base_url}}/api/admin/trades`  
**Auth:** Admin Only

**Request Body:**

```json
{
  "userId": 2,
  "symbol": "BTC",
  "side": "BUY",
  "quantity": 1.0,
  "price": 65000.0
}
```

---

### Close Trade

**Method:** PATCH  
**URL:** `{{base_url}}/api/admin/trades/:id/close`  
**Auth:** Admin Only

**Path Variable:**

- `id` - Trade ID

**Request Body:**

```json
{
  "pnl": 1500.0
}
```

---

### List Audit Logs

**Method:** GET  
**URL:** `{{base_url}}/api/admin/audit-logs`  
**Auth:** Admin Only

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | 5-100 per page |
| `action` | string | Filter by action type |

---

## Rate Limits

| Endpoint Category         | Limit | Window   |
| ------------------------- | ----- | -------- |
| Login                     | 10    | 1 minute |
| Crypto Trading (buy/sell) | 5     | 1 minute |
| Crypto Price Queries      | 30    | 1 minute |
| News Queries              | 40    | 1 minute |

**Rate Limit Response (429):**

```json
{
  "message": "Too many requests. Try again shortly."
}
```

---

## Testing Workflow in Postman

### Step 1: Test Public Endpoints

1. Test `GET /health` - Should return 200
2. Test `GET /api/crypto/prices` - Should return prices
3. Test `GET /api/stocks/us` - Should return stock list

### Step 2: Authenticate

1. Send `POST /api/auth/login` with valid credentials
2. Verify token is saved to collection variable
3. Check the Tests tab shows "Token saved"

### Step 3: Test Authenticated Endpoints

1. `GET /api/crypto/portfolio` - Should return user portfolio
2. `POST /api/crypto/buy` - Create a test buy order
3. `GET /api/crypto/trades` - Verify trade appears

### Step 4: Test Admin Endpoints (if admin user)

1. `GET /api/admin/stats` - Should return admin stats
2. `GET /api/admin/users` - Should return user list
3. `GET /api/admin/trades` - Should return all trades

---

## Common Response Codes

| Code | Meaning           | Description                     |
| ---- | ----------------- | ------------------------------- |
| 200  | OK                | Successful request              |
| 201  | Created           | Resource created successfully   |
| 400  | Bad Request       | Invalid input data              |
| 401  | Unauthorized      | Missing or invalid token        |
| 403  | Forbidden         | Not admin (for admin endpoints) |
| 404  | Not Found         | Resource not found              |
| 409  | Conflict          | Resource already exists/closed  |
| 429  | Too Many Requests | Rate limit exceeded             |
| 500  | Server Error      | Internal server error           |

---

## Error Response Format

```json
{
  "message": "Error description here"
}
```

---

## Pagination Format

All list endpoints return pagination in this format:

```json
{
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

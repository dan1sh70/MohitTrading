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

| Variable | Initial Value | Description |
|----------|---------------|-------------|
| `base_url` | `http://localhost:8808` | Your API base URL |
| `auth_token` | *(empty)* | Will be set after login |

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
    { "symbol": "BTC", "price": 65000.00, "change24h": 2.5 },
    { "symbol": "ETH", "price": 3500.00, "change24h": -1.2 }
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
  "price": 65000.00,
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

## Indian Stocks Endpoints

### Get All Indian Stocks
**Method:** GET  
**URL:** `{{base_url}}/api/stocks/in`  
**Auth:** None

---

### Get Top Indian Stocks
**Method:** GET  
**URL:** `{{base_url}}/api/stocks/in/top`  
**Auth:** None

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `sortBy` | string | `volume` | `volume`, `changePercent`, `price` |

---

### Get Indian Stock Price
**Method:** GET  
**URL:** `{{base_url}}/api/stocks/in/:symbol`  
**Auth:** None

**Path Variable:**
- `symbol` - e.g., `RELIANCE`, `TCS`, `INFY`

---

### Get Intraday Data
**Method:** GET  
**URL:** `{{base_url}}/api/stocks/in/:symbol/intraday`  
**Auth:** None

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `interval` | string | `1min` | `1min`, `5min`, `15min` |

---

### Get Daily Data
**Method:** GET  
**URL:** `{{base_url}}/api/stocks/in/:symbol/daily`  
**Auth:** None

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
  "price": 65000.00
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
    "price": 65000.00,
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
  "price": 66000.00
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
  "balance": 95000.00,
  "positions": [
    {
      "symbol": "BTC",
      "quantity": 0.5,
      "avgPrice": 65000.00,
      "currentPrice": 66000.00,
      "value": 33000.00,
      "pnl": 500.00,
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
  "totalVolume": 12500000.00,
  "totalPnl": 85000.00
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
  "price": 65000.00
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
  "pnl": 1500.00
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

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Login | 10 | 1 minute |
| Crypto Trading (buy/sell) | 5 | 1 minute |
| Crypto Price Queries | 30 | 1 minute |
| News Queries | 40 | 1 minute |

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

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Not admin (for admin endpoints) |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists/closed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal server error |

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

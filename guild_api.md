# 📖 Paper Trading Server - API Reference Guide

This guide provides a comprehensive overview of all API endpoints available in the Paper Trading Server. All requests are prefix-routed to `http://localhost:8808` (or configured base URL).

## 📚 Table of Contents

- [Authentication APIs](#authentication-apis) (6 APIs)
- [Crypto Market Data](#crypto-market-data) (16 APIs)
- [Crypto Trading](#crypto-trading) (3 APIs)
- [Crypto Orders & Positions](#crypto-orders-positions) (9 APIs)
- [Crypto Futures Advanced](#crypto-futures-advanced) (17 APIs)
- [Indian Stocks & Trading](#indian-stocks-trading) (12 APIs)
- [Commodities & Trading](#commodities-trading) (1 APIs)
- [News, TradingView, and Options](#news-tradingview-and-options) (8 APIs)
- [Admin and Market Controls](#admin-and-market-controls) (13 APIs)
- [Utilities & Health Checks](#utilities-health-checks) (1 APIs)

---

## 📂 Authentication APIs

### Forgot Password - Request Reset Link

**Endpoint:** `POST /api/auth/forgot-password`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5 requests/minute  

**Description:**  
Request password reset

**Success Response Example:**

```json
{
  "success": true,
  "message": "Password reset link has been sent to your email address."
}

**Development Mode Response (includes token for testing):**

{
  "success": true,
  "message": "Password reset link has been sent to your email address.",
  "resetToken": "a1b2c3d4e5f6...",
  "note": "This token is only exposed in development mode. In production, it would be sent via email."
}

**Error Response (400) - Invalid Email:**

{
  "success": false,
  "message": "Please provide a valid email address"
}

**cURL Example:**
```

---

### Login - Get JWT Token

**Endpoint:** `POST /api/auth/login`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 10 requests/minute  

**Description:**  
Get JWT token

**Success Response Example:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiZW1haWwiOiJ0cmFkZXIxQHBhcGVydHJhZGluZy5sb2NhbCIsInJvbGUiOiJ0cmFkZXIiLCJpYXQiOjE3NzYxODY5NjUsImV4cCI6MTc3NjI3MzM2NX0.0PCuFvFhI0emxowN1kCp7NsWS512u9pkvG3anr-vJ-s",
  "user": {
    "id": 2,
    "name": "Aarav Patel",
    "email": "trader1@papertrading.local",
    "role": "trader"
  }
}

**Error Response (401):**

{
  "message": "Invalid email or password"
}

**Token Usage:**

Header: Authorization: Bearer <token>
Expiry: 24 hours

**cURL Example:**
```

---

### Logout

**Endpoint:** `POST /api/auth/logout`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
Logout the current user session and invalidate the JWT token.

**Success Response Example:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Register - Create New Account

**Endpoint:** `POST /api/auth/register`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 10 requests/minute  

**Description:**  
Register user

---

### Reset Password - Complete Password Reset

**Endpoint:** `POST /api/auth/reset-password`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5 requests/minute  

**Description:**  
Reset password

**Success Response Example:**

```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password."
}

**Error Response (400) - Invalid/Expired Token:**

{
  "success": false,
  "message": "Invalid or expired reset token."
}

**Error Response (400) - Already Used Token:**

{
  "success": false,
  "message": "This reset token has already been used. Please request a new one."
}

**Error Response (400) - Weak Password:**

{
  "success": false,
  "message": "Password must contain at least one uppercase letter"
}

**cURL Example:**
```

---

### Verify Reset Token - Check Token Validity

**Endpoint:** `GET /api/auth/verify-reset-token/:token`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 10 requests/minute  

**Description:**  
Verify reset token

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `token` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "success": true,
  "valid": true,
  "email": "trader1@papertrading.local",
  "message": "Token is valid."
}

**Error Response (400) - Invalid Token:**

{
  "success": false,
  "valid": false,
  "message": "Invalid reset token."
}

**Error Response (400) - Expired Token:**

{
  "success": false,
  "valid": false,
  "message": "Reset token has expired."
}

**Error Response (400) - Used Token:**

{
  "success": false,
  "valid": false,
  "message": "This reset token has already been used."
}

**cURL Example:**
```

---

## 📂 Crypto Market Data

### Get Candlestick Chart Data ✨ **NEW**

**Endpoint:** `GET /api/crypto/:symbol/chart?timeframe=1d&limit=100`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30 requests/minute  

**Description:**  
** Display candlestick chart with TradingView

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `symbol` | Dynamic path variable | 

**Query Parameters:**

| Parameter | Description |
| --- | --- |
| `timeframe` | URL query variable | 
| `limit` | URL query variable | 

**Success Response Example:**

```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1d",
  "data": [
    {
      "timestamp": 1776086400000,
      "open": 74000.0,
      "high": 75100.0,
      "low": 73800.0,
      "close": 74834.75,
      "volume": 25000.45,
      "quoteAssetVolume": 1250000000.0
    },
    {
      "timestamp": 1776172800000,
      "open": 74834.75,
      "high": 75250.0,
      "low": 74500.0,
      "close": 74923.45,
      "volume": 26000.5,
      "quoteAssetVolume": 1280000000.0
    }
  ],
  "count": 100,
  "timestamp": 1776187034126
}

**Timeframe Options:**

- `1h`: Hourly candles
- `1d`: Daily candles
- `1w`: Weekly candles
- `1m`: Monthly candles
- `1y`: Yearly candles

**Use Case:** Display candlestick chart with TradingView

**cURL Examples:**
```

---

### Get Historical OHLCV Data ✨ **NEW**

**Endpoint:** `GET /api/crypto/:symbol/historical?timeframe=1d&days=30`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30 requests/minute  

**Description:**  
** Get historical price data for analysis

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `symbol` | Dynamic path variable | 

**Query Parameters:**

| Parameter | Description |
| --- | --- |
| `timeframe` | URL query variable | 
| `days` | URL query variable | 

**Success Response Example:**

```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1d",
  "data": [
    {
      "timestamp": 1776086400000,
      "open": 74000.0,
      "high": 75100.0,
      "low": 73800.0,
      "close": 74834.75,
      "volume": 25000.45
    },
    {
      "timestamp": 1776172800000,
      "open": 74834.75,
      "high": 75250.0,
      "low": 74500.0,
      "close": 74923.45,
      "volume": 26000.5
    }
  ],
  "count": 30,
  "lastUpdated": 1776187034126
}

**Use Case:** Get historical price data for analysis

**cURL Examples:**
```

---

### Get Technical Indicators ✨ **NEW**

**Endpoint:** `GET /api/crypto/:symbol/indicators?timeframe=1d`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30 requests/minute  

**Description:**  
** Display AI Trade Insights in app

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `symbol` | Dynamic path variable | 

**Query Parameters:**

| Parameter | Description |
| --- | --- |
| `timeframe` | URL query variable | 

**Success Response Example:**

```json
{
  "symbol": "BTCUSDT",
  "timeframe": "1d",
  "sma20": 74500.0,
  "rsi": 65.32,
  "macd": {
    "macdLine": 245.67,
    "signalLine": 234.56,
    "histogram": 11.11
  },
  "bollingerBands": {
    "upper": 75100.0,
    "middle": 74500.0,
    "lower": 73900.0
  },
  "timestamp": 1776187034126
}

**Indicators Explained:**

- **SMA20**: 20-period Simple Moving Average
  - Trend direction indicator
- **RSI**: Relative Strength Index (0-100)
  - <30: Oversold (Bullish signal)
  - > 70: Overbought (Bearish signal)
- **MACD**: Moving Average Convergence Divergence
  - macdLine: 12-26 EMA difference
  - signalLine: 9-period EMA of MACD
  - histogram: MACD - Signal Line
- **Bollinger Bands**: Volatility indicator
  - upper: SMA20 + (2 × StdDev)
  - middle: SMA20
  - lower: SMA20 - (2 × StdDev)

**Use Case:** Display AI Trade Insights in app

**cURL Example:**
```

---

### Get Account Balance & Equity

**Endpoint:** `GET /api/crypto/account/balance`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** -  

**Description:**  
Get balance & equity

---

### Get All Crypto Statistics (Cached) ⚡ **NEW**

**Endpoint:** `GET /api/crypto/all/stats`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30 requests/minute  

**Description:**  
** Get bulk crypto data for tables, grids, or market overview

**Success Response Example:**

```json
{
  "data": [
    {
      "symbol": "BTCUSDT",
      "price": 74834.75,
      "priceChange": 1256.32,
      "priceChangePercent": 1.7,
      "highPrice": 75000.0,
      "lowPrice": 73500.0,
      "volume": 25000.45,
      "quoteAssetVolume": 1250000000.0,
      "timestamp": 1776187034126
    },
    {
      "symbol": "ETHUSDT",
      "price": 2338.75,
      "priceChange": 45.32,
      "priceChangePercent": 1.98,
      "highPrice": 2400.0,
      "lowPrice": 2250.0,
      "volume": 50000.32,
      "quoteAssetVolume": 280000000.0,
      "timestamp": 1776187034126
    }
  ],
  "count": 10,
  "timestamp": 1776187034126
}

**Features:**

- ⚡ Fresh data every 2 seconds from background polling
- 💾 Cached in Redis for instant response
- 📊 All 10 supported cryptos with full statistics
- 🔄 Automatically updated in the background

**Use Case:** Get bulk crypto data for tables, grids, or market overview

**cURL Example:**
```

---

### Get Live Orderbook Snapshot

**Endpoint:** `GET /api/crypto/orderbook/:symbol`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30 requests/minute  

**Description:**  
Get live orderbook snapshot

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `symbol` | Dynamic path variable | 

---

### Get Performance Metrics

**Endpoint:** `GET /api/crypto/performance`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** -  

**Description:**  
Get performance metrics

---

### Calculate Crypto Performance

**Endpoint:** `POST /api/crypto/performance/calculate`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
Calculate Tradefinity score and detailed stats for a provided array of closed positions.

**Request Body:**

```json
{
  "positions": [
    {
      "symbol": "BTCUSDT",
      "side": "BUY",
      "quantity": 0.5,
      "entryPrice": 60000,
      "exitPrice": 65000,
      "leverage": 3,
      "status": "CLOSED"
    }
  ]
}
```

**Success Response Example:**

```json
{
  "success": true,
  "metrics": {
    "totalTrades": 1,
    "winRate": 100,
    "profitFactor": 99.9,
    "tradefinityScore": 85
  }
}
```

---

### Get All Crypto Prices

**Endpoint:** `GET /api/crypto/prices`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30 requests/minute  

**Description:**  
All crypto prices

**Success Response Example:**

```json
{
  "data": [
    {
      "symbol": "BTCUSDT",
      "price": 74834.75,
      "timestamp": 1776186993270
    },
    {
      "symbol": "ETHUSDT",
      "price": 2338.75,
      "timestamp": 1776187020891
    },
    {
      "symbol": "BNBUSDT",
      "price": 619.77,
      "timestamp": 1776187020893
    },
    {
      "symbol": "SOLUSDT",
      "price": 85.23,
      "timestamp": 1776187020893
    },
    {
      "symbol": "XRPUSDT",
      "price": 1.3707,
      "timestamp": 1776187020896
    },
    {
      "symbol": "TRXUSDT",
      "price": 0.3221,
      "timestamp": 1776187020903
    },
    {
      "symbol": "ADAUSDT",
      "price": 0.2449,
      "timestamp": 1776187020900
    }
  ],
  "count": 7,
  "timestamp": 1776187034126
}

**cURL Example:**
```

---

### Get Specific Crypto Price

**Endpoint:** `GET /api/crypto/prices/:symbol`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30 requests/minute  

**Description:**  
Single price

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `symbol` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "symbol": "BTCUSDT",
  "price": 74834.75,
  "timestamp": 1776186993270
}

**Error Response (400):**

{
  "message": "Symbol XXXUSDT not supported. Supported symbols: BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT, XRPUSDT, TRXUSDT, ADAUSDT"
}

**cURL Example:**
```

---

### Get 24h Statistics

**Endpoint:** `GET /api/crypto/stats/:symbol`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30 requests/minute  

**Description:**  
24h statistics

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `symbol` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "symbol": "BTCUSDT",
  "price": 74834.75,
  "priceChange": 1256.32,
  "priceChangePercent": 1.7,
  "highPrice": 75000.0,
  "lowPrice": 73500.0,
  "volume": 25000.45,
  "quoteAssetVolume": 1250000000.0,
  "timestamp": 1776187034126
}

**cURL Example:**
```

---

### Get Top 10 Ranked Cryptos (Cached) ⚡ **NEW**

**Endpoint:** `GET /api/crypto/top-10/ranked`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30 requests/minute  

**Description:**  
** Display top 10 ranked cryptos on dashboard or market page

**Success Response Example:**

```json
{
  "data": [
    {
      "symbol": "BTCUSDT",
      "price": 74834.75,
      "priceChange": 1256.32,
      "priceChangePercent": 1.7,
      "highPrice": 75000.0,
      "lowPrice": 73500.0,
      "volume": 25000.45,
      "quoteAssetVolume": 1250000000.0,
      "timestamp": 1776187034126
    },
    {
      "symbol": "ETHUSDT",
      "price": 2338.75,
      "priceChange": 45.32,
      "priceChangePercent": 1.98,
      "highPrice": 2400.0,
      "lowPrice": 2250.0,
      "volume": 50000.32,
      "quoteAssetVolume": 280000000.0,
      "timestamp": 1776187034126
    },
    {
      "symbol": "BNBUSDT",
      "price": 619.77,
      "priceChange": 8.45,
      "priceChangePercent": 1.39,
      "highPrice": 630.0,
      "lowPrice": 610.0,
      "volume": 12000.45,
      "quoteAssetVolume": 94000000.0,
      "timestamp": 1776187034126
    },
    {
      "symbol": "SOLUSDT",
      "price": 85.23,
      "priceChange": 1.85,
      "priceChangePercent": 2.22,
      "highPrice": 87.0,
      "lowPrice": 83.0,
      "volume": 8000000.0,
      "quoteAssetVolume": 680000000.0,
      "timestamp": 1776187034126
    },
    {
      "symbol": "ADAUSDT",
      "price": 0.2449,
      "priceChange": 0.0045,
      "priceChangePercent": 1.86,
      "highPrice": 0.25,
      "lowPrice": 0.24,
      "volume": 8000000.0,
      "quoteAssetVolume": 1950800.0,
      "timestamp": 1776187034126
    },
    {
      "symbol": "XRPUSDT",
      "price": 1.3707,
      "priceChange": 0.0234,
      "priceChangePercent": 1.72,
      "highPrice": 1.4,
      "lowPrice": 1.35,
      "volume": 4500000.0,
      "quoteAssetVolume": 6168150.0,
      "timestamp": 1776187034126
    },
    {
      "symbol": "TRXUSDT",
      "price": 0.3221,
      "priceChange": 0.0056,
      "priceChangePercent": 1.77,
      "highPrice": 0.33,
      "lowPrice": 0.32,
      "volume": 5000000.0,
      "quoteAssetVolume": 1610500.0,
      "timestamp": 1776187034126
    },
    {
      "symbol": "DOGEUSDT",
      "price": 0.4567,
      "priceChange": 0.0089,
      "priceChangePercent": 1.99,
      "highPrice": 0.47,
      "lowPrice": 0.45,
      "volume": 3500000.0,
      "quoteAssetVolume": 1598450.0,
      "timestamp": 1776187034126
    },
    {
      "symbol": "LTCUSDT",
      "price": 112.45,
      "priceChange": 2.12,
      "priceChangePercent": 1.92,
      "highPrice": 114.0,
      "lowPrice": 110.0,
      "volume": 2500000.0,
      "quoteAssetVolume": 281125000.0,
      "timestamp": 1776187034126
    },
    {
      "symbol": "MATICUSDT",
      "price": 0.8934,
      "priceChange": 0.0157,
      "priceChangePercent": 1.79,
      "highPrice": 0.91,
      "lowPrice": 0.88,
      "volume": 6000000.0,
      "quoteAssetVolume": 5360400.0,
      "timestamp": 1776187034126
    }
  ],
  "count": 10,
  "timestamp": 1776187034126
}

**Features:**

- ⚡ Fresh data every 2 seconds from background polling
- 🎯 Automatically ranked by 24h price change %
- 💾 Cached in Redis for instant response
- 📊 Includes all 24h statistics

**Use Case:** Display top 10 ranked cryptos on dashboard or market page

**cURL Example:**
```

---

### Get Top 3 Famous Cryptocurrencies ✨ **NEW**

**Endpoint:** `GET /api/crypto/top-3/famous`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30 requests/minute  

**Description:**  
** Display BTC, ETH, BNB at top of Markets screen

**Success Response Example:**

```json
{
  "data": [
    {
      "symbol": "BTCUSDT",
      "name": "Bitcoin",
      "currentPrice": 74834.75,
      "priceChange": 1256.32,
      "priceChangePercent": 1.7,
      "highPrice": 75000.0,
      "lowPrice": 73500.0,
      "volume": 25000.45,
      "marketCap": 1250000000.0,
      "isFamous": true
    },
    {
      "symbol": "ETHUSDT",
      "name": "Ethereum",
      "currentPrice": 2338.75,
      "priceChange": 45.32,
      "priceChangePercent": 1.98,
      "highPrice": 2400.0,
      "lowPrice": 2250.0,
      "volume": 50000.32,
      "marketCap": 280000000.0,
      "isFamous": true
    },
    {
      "symbol": "BNBUSDT",
      "name": "Binance Coin",
      "currentPrice": 619.77,
      "priceChange": 8.45,
      "priceChangePercent": 1.39,
      "highPrice": 630.0,
      "lowPrice": 610.0,
      "volume": 12000.45,
      "marketCap": 94000000.0,
      "isFamous": true
    }
  ],
  "count": 3,
  "timestamp": 1776187034126
}

**Use Case:** Display BTC, ETH, BNB at top of Markets screen

**cURL Example:**
```

---

### Get Trade History

**Endpoint:** `GET /api/crypto/trades?page=1&limit=20`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
** Show transaction history with pagination

**Query Parameters:**

| Parameter | Description |
| --- | --- |
| `page` | URL query variable | 
| `limit` | URL query variable | 

**Success Response Example:**

```json
{
  "data": [
    {
      "id": 2,
      "symbol": "BTCUSDT",
      "side": "SELL",
      "quantity": 0.5,
      "price": "75000.00",
      "status": "OPEN",
      "pnl": "125.00",
      "created_at": "2026-04-14T11:46:43.000Z",
      "closed_at": null
    },
    {
      "id": 1,
      "symbol": "BTCUSDT",
      "side": "BUY",
      "quantity": 0.5,
      "price": "74834.75",
      "status": "OPEN",
      "pnl": "0.00",
      "created_at": "2026-04-14T11:46:27.000Z",
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

**Use Case:** Show transaction history with pagination

**cURL Examples:**
```

---

### Get Trending Cryptos (Filtered) ✨ **NEW**

**Endpoint:** `GET /api/crypto/trending/all?minPercent=0`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30 requests/minute  

**Description:**  
Trending (filtered)

**Query Parameters:**

| Parameter | Description |
| --- | --- |
| `minPercent` | URL query variable | 

**Success Response Example:**

```json
**cURL Example:**
```

---

### Get Top 10 Trending Cryptocurrencies ✨ **NEW**

**Endpoint:** `GET /api/crypto/trending/top-10`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30 requests/minute  

**Description:**  
** Show trending cryptos sorted by price change %

**Success Response Example:**

```json
{
  "data": [
    {
      "symbol": "ADAUSDT",
      "name": "Cardano",
      "currentPrice": 0.2449,
      "priceChange": 0.0045,
      "priceChangePercent": 1.86,
      "volume24h": 8000000.0,
      "marketCap": 8500000.0,
      "isTrending": true
    },
    {
      "symbol": "XRPUSDT",
      "name": "XRP",
      "currentPrice": 1.3707,
      "priceChange": 0.0234,
      "priceChangePercent": 1.72,
      "volume24h": 4500000.0,
      "marketCap": 73000000.0,
      "isTrending": true
    }
  ],
  "count": 10,
  "timestamp": 1776187034126
}

**Use Case:** Show trending cryptos sorted by price change %

**cURL Example:**
```

---

## 📂 Crypto Trading

### Buy Cryptocurrency

**Endpoint:** `POST /api/crypto/buy`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5 requests/minute  

**Description:**  
Buy order (legacy)

**Success Response Example:**

```json
{
  "message": "Buy order created successfully",
  "trade": {
    "id": 1,
    "user_id": 2,
    "symbol": "BTCUSDT",
    "side": "BUY",
    "quantity": 0.5,
    "price": "74834.75",
    "status": "OPEN",
    "created_at": "2026-04-14T11:46:27.000Z"
  }
}

**Error Response (400) - Insufficient Balance:**

{
  "message": "Insufficient balance. Required: 37417.375, Available: 25000.00"
}

**Error Response (400) - Invalid Symbol:**

{
  "message": "Symbol XXXUSDT not supported"
}

**Error Response (401) - Missing Token:**

{
  "message": "Missing authorization token"
}

**Validation:**

- Sufficient balance required
- Symbol must be supported
- Quantity & price must be positive

**cURL Example:**
```

---

### Get User Portfolio

**Endpoint:** `GET /api/crypto/portfolio`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
** Display portfolio summary with holdings

**Success Response Example:**

```json
{
  "balance": 125087.5,
  "positions": [
    {
      "symbol": "BTCUSDT",
      "quantity": "0.5",
      "avgPrice": 74834.75,
      "currentPrice": 74834.75,
      "value": 37417.375,
      "pnl": 0.0,
      "pnlPercent": "0.00"
    },
    {
      "symbol": "ETHUSDT",
      "quantity": "2",
      "avgPrice": 2338.75,
      "currentPrice": 2338.75,
      "value": 4677.5,
      "pnl": 0.0,
      "pnlPercent": "0.00"
    }
  ],
  "timestamp": 1776187034126
}

**Fields:**

- `balance`: Available cash balance
- `quantity`: Amount of crypto held
- `avgPrice`: Average purchase price
- `currentPrice`: Real-time market price
- `value`: Current position value (quantity × currentPrice)
- `pnl`: Profit/Loss in USD
- `pnlPercent`: Profit/Loss in percentage

**Use Case:** Display portfolio summary with holdings

**cURL Example:**
```

---

### Sell Cryptocurrency

**Endpoint:** `POST /api/crypto/sell`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5 requests/minute  

**Description:**  
Sell order (legacy)

**Success Response Example:**

```json
{
  "message": "Sell order created successfully",
  "trade": {
    "id": 2,
    "user_id": 2,
    "symbol": "BTCUSDT",
    "side": "SELL",
    "quantity": 0.5,
    "price": "75000.00",
    "status": "OPEN",
    "created_at": "2026-04-14T11:46:43.000Z"
  }
}

**Error Response (400) - Insufficient Position:**

{
  "message": "Insufficient position. Available: 0.5, Requested: 1"
}

**Validation:**

- User must have sufficient position
- Position validation prevents overselling
- Same symbol validation as buy

**cURL Example:**
```

---

## 📂 Crypto Orders & Positions

### Get User Orders

**Endpoint:** `GET /api/crypto/orders?status=OPEN&symbol=BTCUSDT&page=1&limit=20`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** -  

**Description:**  
Get all orders with filter

**Query Parameters:**

| Parameter | Description |
| --- | --- |
| `status` | URL query variable | 
| `symbol` | URL query variable | 
| `page` | URL query variable | 
| `limit` | URL query variable | 

---

### Cancel Open Order

**Endpoint:** `POST /api/crypto/orders/:orderId/cancel`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5 requests/minute  

**Description:**  
Cancel open order

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `orderId` | Dynamic path variable | 

---

### Place Buy Order (Market / Limit)

**Endpoint:** `POST /api/crypto/orders/buy`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5 requests/minute  

**Description:**  
Place buy order (Market/Limit)

---

### Place Sell Order (Market / Limit)

**Endpoint:** `POST /api/crypto/orders/sell`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5 requests/minute  

**Description:**  
Place sell order (Market/Limit)

---

### Get Active Positions

**Endpoint:** `GET /api/crypto/positions`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** -  

**Description:**  
Get all active positions

---

### Get Position Details

**Endpoint:** `GET /api/crypto/positions/:positionId`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** -  

**Description:**  
Get position details

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `positionId` | Dynamic path variable | 

---

### Close Position

**Endpoint:** `POST /api/crypto/positions/:positionId/close`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5 requests/minute  

**Description:**  
Close position

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `positionId` | Dynamic path variable | 

---

### Check Position Liquidation Status

**Endpoint:** `GET /api/crypto/positions/:positionId/liquidation-check`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** -  

**Description:**  
Check & auto-liquidate

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `positionId` | Dynamic path variable | 

---

### Get Aggregated Position (One-Way Mode)

**Endpoint:** `GET /api/crypto/positions/aggregated/:symbol`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** -  

**Description:**  
** See net position combining all orders for symbol

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `symbol` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "symbol": "BTCUSDT",
  "hedgeMode": true,
  "mode": "HEDGE",
  "longPosition": {
    "quantity": 1.0,
    "averageEntry": 44000.0,
    "pnl": 11234.5,
    "leverage": 10
  },
  "shortPosition": {
    "quantity": 0.5,
    "averageEntry": 46000.0,
    "pnl": -3882.25,
    "leverage": 10
  },
  "netPosition": 0.5,
  "netSide": "LONG",
  "combinedPnl": 7352.25
}

**Use Case:** See net position combining all orders for symbol

**cURL Example:**
```

---

## 📂 Crypto Futures Advanced

### Get Maker/Taker Fees

**Endpoint:** `GET /api/crypto/fees/config/:symbol`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30/min  

**Description:**  
** See fee structure before placing orders

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `symbol` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "symbol": "BTCUSDT",
  "makerFeeRate": -0.0002,
  "makerFeePercent": "-0.02%",
  "takerFeeRate": 0.0004,
  "takerFeePercent": "0.04%",
  "fundingRateBase": 0.00001,
  "note": "Maker fee negative (rebate), taker fee positive (cost)"
}

**Use Case:** See fee structure before placing orders

**cURL Example:**
```

---

### Get Funding Payment History

**Endpoint:** `GET /api/crypto/funding/payments?limit=50&symbol=BTCUSDT`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** -  

**Description:**  
Get funding payment history

**Query Parameters:**

| Parameter | Description |
| --- | --- |
| `limit` | URL query variable | 
| `symbol` | URL query variable | 

**Success Response Example:**

```json
{
  "data": [
    {
      "id": 123,
      "positionId": 84,
      "symbol": "BTCUSDT",
      "side": "LONG",
      "fundingAmount": -40.5,
      "fundingRate": 0.00008,
      "quantity": 1.0,
      "settlementTime": "2026-05-14T08:00:00Z",
      "paidAt": "2026-05-14T08:00:15Z"
    }
  ],
  "total": 24,
  "page": 1
}

**Fields:**

- `fundingAmount`: Negative = user paid, Positive = user received
- `fundingRate`: Settlement rate for this period (% per 8h)
- `settlementTime`: When this funding period settled

**cURL Example:**
```

---

### Predict Funding Payment

**Endpoint:** `GET /api/crypto/funding/predict/:positionId`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** -  

**Description:**  
** See how much funding will be charged before next settlement

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `positionId` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "positionId": 84,
  "symbol": "BTCUSDT",
  "side": "LONG",
  "quantity": 1.0,
  "currentFundingRate": 0.00008,
  "predictedPayment": -40.5,
  "nextSettlementTime": "2026-05-14T16:00:00Z",
  "timeUntilSettlement": "5h 30m"
}

**Use Case:** See how much funding will be charged before next settlement

**cURL Example:**
```

---

### Get Current Funding Rate

**Endpoint:** `GET /api/crypto/funding/rates/:symbol`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30/min  

**Description:**  
** Check current funding rate before opening positions

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `symbol` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "symbol": "BTCUSDT",
  "fundingRate": 0.00008,
  "fundingRatePercent": "0.008",
  "markPrice": 45234.5,
  "nextSettlementTime": "2026-05-14T16:00:00Z",
  "longPositions": 1250,
  "shortPositions": 980,
  "imbalancePercent": "12.05",
  "settlementCycle": "8h"
}

**Use Case:** Check current funding rate before opening positions

**cURL Example:**
```

---

### Disable Hedge Mode

**Endpoint:** `POST /api/crypto/hedge-mode/disable`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5/min  

**Description:**  
Disable hedge mode

---

### Enable Hedge Mode

**Endpoint:** `POST /api/crypto/hedge-mode/enable`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5/min  

**Description:**  
** Enable ability to hold LONG + SHORT positions for same symbol

**Success Response Example:**

```json
{
  "success": true,
  "message": "Hedge mode enabled",
  "hedgeMode": true,
  "note": "You can now have LONG and SHORT positions simultaneously for the same symbol"
}

**Use Case:** Enable ability to hold LONG + SHORT positions for same symbol

**cURL Example:**
```

---

### Get Hedge Mode Status

**Endpoint:** `GET /api/crypto/hedge-mode/status`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** -  

**Description:**  
Get hedge mode status

---

### Get Margin Utilization

**Endpoint:** `GET /api/crypto/margin-utilization`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** -  

**Description:**  
** Monitor total margin usage across all positions

---

### Get Current Mark Price

**Endpoint:** `GET /api/crypto/mark-price/:symbol`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30/min  

**Description:**  
** Get fair mark price (from weighted orderbook, not last trade price) for accurate liquidation calculations

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `symbol` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "symbol": "BTCUSDT",
  "markPrice": 45234.5,
  "lastPrice": 45200.0,
  "bidPrice": 45220.25,
  "askPrice": 45250.75,
  "markPriceDifference": 34.5,
  "markPriceDifferencePercent": "0.08",
  "updatedAt": "2026-05-14T10:30:00Z"
}

**Use Case:** Get fair mark price (from weighted orderbook, not last trade price) for accurate liquidation calculations

**cURL Example:**
```

---

### Get Mark Price History

**Endpoint:** `GET /api/crypto/mark-price/:symbol/history?limit=100&interval=5m`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30/min  

**Description:**  
Mark price history

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `symbol` | Dynamic path variable | 

**Query Parameters:**

| Parameter | Description |
| --- | --- |
| `limit` | URL query variable | 
| `interval` | URL query variable | 

---

### Switch Margin Mode

**Endpoint:** `POST /api/crypto/positions/:positionId/margin-mode`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5/min  

**Description:**  
** Switch between:

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `positionId` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "success": true,
  "message": "Margin mode changed to ISOLATED",
  "positionId": 84,
  "marginMode": "ISOLATED",
  "isolatedMargin": 5000.0,
  "maxLoss": 5000.0
}

**Fields:**

- `mode`: "ISOLATED" or "CROSS"
- `isolatedMargin`: Required for ISOLATED mode (amount to lock for this position)

**Use Case:** Switch between:

- **ISOLATED**: Each position has separate margin (max loss = isolated amount)
- **CROSS**: Positions share user balance (default)

**cURL Example:**
```

---

### Update Reduce-Only Flag

**Endpoint:** `POST /api/crypto/positions/:positionId/reduce-only`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5/min  

**Description:**  
** Prevent accidental position increases (forces partial closes only)

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `positionId` | Dynamic path variable | 

---

### Set Stop Loss Level

**Endpoint:** `POST /api/crypto/positions/:positionId/stop-loss`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5/min  

**Description:**  
** Auto-close position if price falls below level (limits losses)

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `positionId` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "success": true,
  "message": "Stop loss set successfully",
  "positionId": 84,
  "stopPrice": 40000.0,
  "currentPrice": 45234.5,
  "lossIfExecuted": -5234.5,
  "lossPercentage": "-11.56"
}

**Use Case:** Auto-close position if price falls below level (limits losses)

**cURL Example:**
```

---

### Cancel Stop Loss

**Endpoint:** `DELETE /api/crypto/positions/:positionId/stop-loss`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5/min  

**Description:**  
Cancel stop loss

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `positionId` | Dynamic path variable | 

---

### Set Take Profit Target

**Endpoint:** `POST /api/crypto/positions/:positionId/take-profit`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5/min  

**Description:**  
** Auto-close position when price reaches target (exits on market close order)

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `positionId` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "success": true,
  "message": "Take profit set successfully",
  "positionId": 84,
  "targetPrice": 50000.0,
  "currentPrice": 45234.5,
  "profitIfExecuted": 47652.5,
  "profitPercentage": "10.51"
}

**Use Case:** Auto-close position when price reaches target (exits on market close order)

**cURL Example:**
```

---

### Cancel Take Profit

**Endpoint:** `DELETE /api/crypto/positions/:positionId/take-profit`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5/min  

**Description:**  
Cancel take profit

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `positionId` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "success": true,
  "message": "Take profit cancelled",
  "positionId": 84
}

**cURL Example:**
```

---

### Get Trigger Execution History

**Endpoint:** `GET /api/crypto/triggers/history?limit=50`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** -  

**Description:**  
** Review past trigger executions and profits/losses

**Query Parameters:**

| Parameter | Description |
| --- | --- |
| `limit` | URL query variable | 

---

## 📂 Indian Stocks & Trading

### Get Performance Metrics

**Endpoint:** `GET /api/stocks/in/performance`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
Performance metrics

**Success Response Example:**

```json
{
  "success": true,
  "data": {
    "consistencyScore": 78.5,
    "riskMeter": 82.0,
    "portfolioHealth": 75.3,
    "winRate": 68.5,
    "profitFactor": 1.85,
    "capitalEvaluation": 79.0,
    "overallScore": 76.5,
    "grade": "B",
    "totalTrades": 47,
    "winningTrades": 32,
    "losingTrades": 15,
    "averageWin": 450.5,
    "averageLoss": 220.3,
    "largestWin": 1250.0,
    "largestLoss": 450.0,
    "totalProfit": 14416.0,
    "totalLoss": 3304.5,
    "netPnl": 11111.5
  }
}

**Scoring System:**

- **Consistency Score (0-100):** Stability of performance over time
- **Risk Meter (0-100):** Risk management quality
- **Portfolio Health (0-100):** Overall account quality
- **Win Rate (%):** Percentage of winning trades
- **Profit Factor:** Gross Profit / Gross Loss ratio
- **Capital Evaluation (0-100):** Capital efficiency

**Grade Assignment:**

- Score >= 90: A (Expert Trader)
- Score >= 75: B (Good Trader)
- Score >= 60: C (Average Trader)
- Score >= 45: D (Below Average)
- Score < 45: F (Poor Trader)

**cURL Example:**
```

---

### Get Indian Stock Positions

**Endpoint:** `GET /api/stocks/in/positions?status=ACTIVE`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
List positions

**Query Parameters:**

| Parameter | Description |
| --- | --- |
| `status` | URL query variable | 

**Success Response Example:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "symbol": "INFY",
      "name": "Infosys Limited",
      "side": "BUY",
      "quantity": 10,
      "entryPrice": 1580.5,
      "currentPrice": 1600.0,
      "status": "ACTIVE",
      "unrealizedPnl": 195.0,
      "unrealizedPnlPercent": 1.23,
      "createdAt": "2026-05-07T12:00:00Z"
    }
  ],
  "summary": {
    "totalPositions": 1,
    "activePositions": 1,
    "totalUnrealizedPnl": 195.0,
    "totalInvested": 15805.0
  }
}

**cURL Example:**
```

---

### Get Position Details

**Endpoint:** `GET /api/stocks/in/positions/:positionId`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
Position details

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `positionId` | Dynamic path variable | 

---

### Exit Position

**Endpoint:** `POST /api/stocks/in/positions/:positionId/exit`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5 requests/minute  

**Description:**  
Exit position

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `positionId` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "success": true,
  "message": "Position exited successfully",
  "position": {
    "id": 1,
    "symbol": "INFY",
    "status": "CLOSED",
    "entryPrice": 1580.5,
    "exitPrice": 1600.0,
    "quantity": 10,
    "realizedPnl": 195.0,
    "realizedPnlPercent": 1.23,
    "exitTime": "2026-05-07T14:30:00Z"
  },
  "balance": {
    "previous": 134195,
    "current": 134390,
    "credited": 195
  }
}

**cURL Example:**
```

---

### Buy Indian Stock

**Endpoint:** `POST /api/stocks/in/trade/buy`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5 requests/minute  

**Description:**  
Buy Indian stock

**Success Response Example:**

```json
{
  "success": true,
  "message": "Buy order executed successfully",
  "position": {
    "id": 1,
    "symbol": "INFY",
    "side": "BUY",
    "quantity": 10,
    "entryPrice": 1580.5,
    "currentPrice": 1580.5,
    "status": "OPEN",
    "unrealizedPnl": 0,
    "createdAt": "2026-05-07T12:00:00Z"
  },
  "balance": {
    "previous": 150000,
    "current": 134195,
    "deducted": 15805
  }
}

**Error Response (400) - Insufficient Balance:**

{
  "success": false,
  "message": "Insufficient balance. Required: 15805, Available: 5000"
}

**cURL Example:**
```

---

### List Pending Indian Stock Orders

**Endpoint:** `GET /api/stocks/in/trade/orders`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** -  

**Description:**  
** Returns pending Indian stock `LIMIT` orders for the authenticated user.

---

### Process Pending Indian Stock Orders

**Endpoint:** `POST /api/stocks/in/trade/orders/process`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5 requests/minute  

**Description:**  
** Evaluates pending Indian stock `LIMIT` orders and fills any orders that meet market conditions.

---

### Sell Indian Stock

**Endpoint:** `POST /api/stocks/in/trade/sell`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5 requests/minute  

**Description:**  
Sell Indian stock

**Success Response Example:**

```json
{
  "success": true,
  "message": "Sell order executed successfully",
  "position": {
    "id": 2,
    "symbol": "INFY",
    "side": "SELL",
    "quantity": 10,
    "entryPrice": 1600.0,
    "status": "OPEN",
    "createdAt": "2026-05-07T12:00:00Z"
  }
}

**cURL Example:**
```

---

### Update Indian Stock Trade (Stub)

**Endpoint:** `PUT /api/stocks/in/trade/update`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 5 requests/minute  

**Description:**  
Update trade (not impl)

---

### Upstox OHLC Candlestick Data

**Endpoint:** `GET /api/upstox/ohlc/:symbol`  
**Authentication:** ❌ Public  
**Rate Limit:** 30 requests/minute  

**Description:**  
Fetch OHLC (Open, High, Low, Close) candlestick data from Upstox. Supports interval query param (e.g. 1m, 5m, 15m, 1d).

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `symbol` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "success": true,
  "data": [
    [1717000000, 2440.0, 2455.0, 2438.0, 2450.5, 50000]
  ]
}
```

---

### Upstox Options Chain Data

**Endpoint:** `GET /api/upstox/options/:symbol`  
**Authentication:** ❌ Public  
**Rate Limit:** 30 requests/minute  

**Description:**  
Fetch live options chain data from Upstox API.

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `symbol` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "success": true,
  "data": {
    "underlying": "RELIANCE",
    "expiryDates": ["2026-07-30"],
    "calls": [],
    "puts": []
  }
}
```

---

### Upstox Live Quote

**Endpoint:** `GET /api/upstox/quote/:symbol`  
**Authentication:** ❌ Public  
**Rate Limit:** 30 requests/minute  

**Description:**  
Fetch real-time stock quote from Upstox API.

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `symbol` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "success": true,
  "data": {
    "symbol": "RELIANCE",
    "lastPrice": 2450.5,
    "change": 12.3,
    "changePercent": 0.5
  }
}
```

---

## 📂 Commodities & Trading

### Get All Commodities

**Endpoint:** `GET /api/commodities`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 30 requests/minute  

**Description:**  
All commodities

**Success Response Example:**

```json
{
  "success": true,
  "data": [
    {
      "symbol": "GOLD",
      "name": "Gold",
      "subtitle": "Commodity",
      "price": 1850.75,
      "change": 12.3,
      "changePercent": 0.67,
      "currencySymbol": "$",
      "sparklineData": [1830, 1840, 1850, 1860, 1855, 1850, 1850.75]
    },
    {
      "symbol": "SILVER",
      "name": "Silver",
      "subtitle": "Commodity",
      "price": 24.85,
      "change": -0.45,
      "changePercent": -1.78,
      "currencySymbol": "$",
      "sparklineData": [25.5, 25.2, 25.0, 24.8, 24.9, 24.8, 24.85]
    },
    {
      "symbol": "OIL",
      "name": "Crude Oil",
      "subtitle": "Commodity",
      "price": 78.92,
      "change": 1.85,
      "changePercent": 2.4,
      "currencySymbol": "$",
      "sparklineData": [76, 77, 78, 79, 78.5, 78, 78.92]
    }
  ],
  "count": 5,
  "timestamp": "2026-05-07T12:00:00Z"
}

**Supported Commodities:**

- GOLD - Gold (XAU/USD)
- SILVER - Silver (XAG/USD)
- OIL - Crude Oil (WTI)
- COPPER - Copper
- NATGAS - Natural Gas

**cURL Example:**
```

---

## 📂 News, TradingView, and Options

### Advanced News Search with Filters

**Endpoint:** `GET /api/news/advanced`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 40 requests/minute  

**Description:**  
Advanced search with filters

**Success Response Example:**

```json
{
  "success": true,
  "meta": {
    "found": 567,
    "returned": 15,
    "limit": 15,
    "page": 1
  },
  "data": [...]
}

**Combined Request Example:**
```

---

### Get Cryptocurrency News

**Endpoint:** `GET /api/news/crypto`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 40 requests/minute  

**Description:**  
Cryptocurrency news

**Success Response Example:**

```json
{
  "success": true,
  "meta": {
    "found": 892,
    "returned": 20,
    "limit": 20,
    "page": 1
  },
  "data": [...]
}

**cURL Example:**
```

---

### Get News by Date Range

**Endpoint:** `GET /api/news/date-range`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 40 requests/minute  

**Description:**  
News by date range

**Success Response Example:**

```json
{
  "success": true,
  "meta": {
    "found": 120,
    "returned": 10,
    "limit": 10,
    "page": 1
  },
  "data": [...]
}

**cURL Example:**
```

---

### Get Latest Financial News

**Endpoint:** `GET /api/news/latest`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 40 requests/minute  

**Description:**  
Latest financial news

**Success Response Example:**

```json
{
  "success": true,
  "meta": {
    "found": 5474,
    "returned": 20,
    "limit": 20,
    "page": 1
  },
  "data": [
    {
      "uuid": "7be57f71-7af5-42ca-ad19-7c7f6f22b574",
      "title": "Tech Stock Surge: AAPL & MSFT Lead Market Rally",
      "description": "Apple and Microsoft shares rally on strong earnings reports...",
      "url": "https://example.com/article",
      "image_url": "https://example.com/image.jpg",
      "published_at": "2026-05-02T08:21:33.000000Z",
      "source": "cnbc.com",
      "language": "en",
      "entities": [
        {
          "symbol": "AAPL",
          "name": "Apple Inc.",
          "sentiment_score": 0.75
        }
      ]
    }
  ],
  "timestamp": "2026-05-02T08:30:00.000Z"
}

**cURL Example:**
```

---

### Search News by Keyword

**Endpoint:** `GET /api/news/search`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 40 requests/minute  

**Description:**  
Search news by keyword

**Success Response Example:**

```json
{
  "success": true,
  "meta": {
    "found": 456,
    "returned": 10,
    "limit": 10,
    "page": 1
  },
  "data": [...]
}

**Error Response (400):**

{
  "message": "Search query (q) is required"
}

**cURL Example:**
```

---

### Get Stock Market News

**Endpoint:** `GET /api/news/stocks`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 40 requests/minute  

**Description:**  
Stock market news

**Success Response Example:**

```json
{
  "success": true,
  "meta": {
    "found": 1234,
    "returned": 20,
    "limit": 20,
    "page": 1
  },
  "data": [...]
}

**cURL Example:**
```

---

### Get News for Specific Symbols

**Endpoint:** `GET /api/news/symbols`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 40 requests/minute  

**Description:**  
News for specific symbols

**Success Response Example:**

```json
{
  "success": true,
  "meta": {
    "found": 234,
    "returned": 15,
    "limit": 15,
    "page": 1
  },
  "data": [...]
}

**cURL Example:**
```

---

### Get Trending News

**Endpoint:** `GET /api/news/trending`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** 40 requests/minute  

**Description:**  
Top trending articles

---

## 📂 Admin and Market Controls

### Create Market Holiday (Admin)

**Endpoint:** `POST /api/admin/market-holidays`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
Create holiday

---

### Get All Market Holidays (Admin)

**Endpoint:** `GET /api/admin/market-holidays?marketType=indian_stock&year=2026`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
All holidays (admin)

**Query Parameters:**

| Parameter | Description |
| --- | --- |
| `marketType` | URL query variable | 
| `year` | URL query variable | 

---

### Get Market Holiday by ID

**Endpoint:** `GET /api/admin/market-holidays/:id`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
Retrieve a specific market holiday entry details (Admin only).

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `id` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Christmas",
    "date": "2026-12-25",
    "marketType": "NSE"
  }
}
```

---

### Update Market Holiday

**Endpoint:** `PUT /api/admin/market-holidays/:id`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
Update details of an existing market holiday (Admin only).

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `id` | Dynamic path variable | 

**Request Body:**

```json
{
  "name": "Updated Holiday Name",
  "date": "2026-12-25",
  "marketType": "NSE"
}
```

**Success Response Example:**

```json
{
  "success": true,
  "message": "Market holiday updated successfully"
}
```

---

### Delete Market Holiday

**Endpoint:** `DELETE /api/admin/market-holidays/:id`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
Delete a market holiday by ID (Admin only).

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `id` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "success": true,
  "message": "Market holiday deleted successfully"
}
```

---

### Bulk Create Holidays (Admin)

**Endpoint:** `POST /api/admin/market-holidays/bulk-create`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
Bulk create holidays

---

### Get All Market Hours (Admin)

**Endpoint:** `GET /api/admin/market-hours`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
All market hours (admin)

---

### Update Market Hours

**Endpoint:** `PUT /api/admin/market-hours/:id`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
Update start and end times for a specific market type (Admin only).

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `id` | Dynamic path variable | 

**Request Body:**

```json
{
  "openTime": "09:15",
  "closeTime": "15:30",
  "isEnabled": true
}
```

**Success Response Example:**

```json
{
  "success": true,
  "message": "Market hours updated successfully"
}
```

---

### Get Market Hours Update History

**Endpoint:** `GET /api/admin/market-hours/:id/history`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
Get historical logs of market hours configuration updates (Admin only).

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `id` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "success": true,
  "data": []
}
```

---

### Get Market Hours by Type (Admin)

**Endpoint:** `GET /api/admin/market-hours/:marketType`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
Market hours by type

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `marketType` | Dynamic path variable | 

---

### Get Public Holidays List

**Endpoint:** `GET /api/market-holidays/:marketType?year=2026`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
Public holidays list

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `marketType` | Dynamic path variable | 

**Query Parameters:**

| Parameter | Description |
| --- | --- |
| `year` | URL query variable | 

**Success Response Example:**

```json
{
  "success": true,
  "market_type": "indian_stock",
  "year": "2026",
  "count": 15,
  "data": [
    {
      "holiday_date": "2026-01-26",
      "holiday_name": "Republic Day",
      "description": "National holiday",
      "closure_type": "FULL_DAY"
    },
    {
      "holiday_date": "2026-08-15",
      "holiday_name": "Independence Day",
      "description": "National holiday",
      "closure_type": "FULL_DAY"
    }
  ]
}

**cURL Example:**
```

---

### Check if Today is Holiday (Public)

**Endpoint:** `GET /api/market-holidays/check/:marketType`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
Check today holiday

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `marketType` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "success": true,
  "is_holiday": false,
  "market_type": "indian_stock",
  "today": "2026-05-07",
  "message": "Market is open today"
}

**cURL Example:**
```

---

### Check Market Status (Public)

**Endpoint:** `GET /api/market-hours/status/:marketType`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** N/A  

**Description:**  
Check market status

**Path Parameters:**

| Parameter | Description |
| --- | --- |
| `marketType` | Dynamic path variable | 

**Success Response Example:**

```json
{
  "success": true,
  "data": {
    "market_type": "indian_stock",
    "market_name": "NSE Equity",
    "is_open": true,
    "current_time": "14:30:00",
    "open_time": "09:15:00",
    "close_time": "15:30:00",
    "timezone": "Asia/Kolkata",
    "time_remaining": "01:00:00",
    "next_opening": "2026-05-08T09:15:00+05:30",
    "message": "Market is currently open"
  }
}

**cURL Example:**
```

---

## 📂 Utilities & Health Checks

### Health Check

**Endpoint:** `GET /api/health`  
**Authentication:** 🔒 Required (JWT Bearer Token)  
**Rate Limit:** ** None  

**Description:**  
** Verify API is running

**Success Response Example:**

```json
{
  "status": "ok",
  "service": "paper-trading-backend"
}

**Use Case:** Verify API is running

**cURL Example:**
```

---


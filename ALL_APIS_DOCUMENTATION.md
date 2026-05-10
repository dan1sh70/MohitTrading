# 🎯 Complete API Documentation (Crypto, Stocks, Forex, News, Admin, Commodities, Market Hours & Holidays)

**Backend URL:** `http://localhost:8808`  
**Version:** 2.3  
**Status:** ✅ Production Ready  
**Total Endpoints:** 79 ✨

---

## 📚 Table of Contents

1. [Quick Reference](#quick-reference-table-category-wise)
2. [Data Services](#data-services-integration)
3. [Detailed API Documentation](#detailed-api-documentation)

---

## 📊 QUICK REFERENCE TABLE (Category-wise)

### 🔐 Authentication (5)

| #   | Endpoint                      | Method | Auth | Rate Limit | Purpose                |
| --- | ----------------------------- | ------ | ---- | ---------- | ---------------------- |
| 1   | `/api/auth/login`             | POST   | ❌   | 10/min     | Get JWT token          |
| 2   | `/api/auth/register`          | POST   | ❌   | 10/min     | Register user          |
| 69  | `/api/auth/forgot-password`   | POST   | ❌   | 5/min      | Request password reset |
| 70  | `/api/auth/reset-password`    | POST   | ❌   | 5/min      | Reset password         |
| 71  | `/api/auth/verify-reset-token/:token` | GET | ❌   | 10/min     | Verify reset token     |

### 💹 Crypto APIs (20)

| #   | Endpoint                         | Method | Auth | Rate Limit | Purpose                |
| --- | -------------------------------- | ------ | ---- | ---------- | ---------------------- |
| 2   | `/api/crypto/prices`             | GET    | ❌   | 30/min     | All crypto prices      |
| 3   | `/api/crypto/prices/:symbol`     | GET    | ❌   | 30/min     | Single price           |
| 4   | `/api/crypto/stats/:symbol`      | GET    | ❌   | 30/min     | 24h statistics         |
| 5   | `/api/crypto/top-3/famous`       | GET    | ❌   | 30/min     | Top 3 (BTC, ETH, BNB)  |
| 6   | `/api/crypto/trending/top-10`    | GET    | ❌   | 30/min     | Top 10 trending        |
| 7   | `/api/crypto/trending/all`       | GET    | ❌   | 30/min     | Trending (filtered)    |
| 8   | `/api/crypto/top-10/ranked`      | GET    | ❌   | 30/min     | Top 10 ranked (cached) |
| 9   | `/api/crypto/all/stats`          | GET    | ❌   | 30/min     | All stats (cached)     |
| 10  | `/api/crypto/:symbol/chart`      | GET    | ❌   | 30/min     | Candlestick chart      |
| 11  | `/api/crypto/:symbol/historical` | GET    | ❌   | 30/min     | Historical OHLCV       |
| 12  | `/api/crypto/:symbol/indicators` | GET    | ❌   | 30/min     | Technical indicators   |
| 13  | `/api/crypto/buy`                | POST   | ✅   | 5/min      | Buy order              |
| 14  | `/api/crypto/sell`               | POST   | ✅   | 5/min      | Sell order             |
| 15  | `/api/crypto/portfolio`          | GET    | ✅   | -          | Portfolio & holdings   |
| 16  | `/api/crypto/trades`             | GET    | ✅   | -          | Trade history          |
| 76  | `/api/crypto/lot-size/:symbol`    | GET    | ❌   | 30/min     | Get LOT_SIZE filters   |
| 77  | `/api/crypto/lot-sizes/all`      | GET    | ❌   | 30/min     | All LOT_SIZE filters   |
| 78  | `/api/crypto/lot-sizes/validate` | GET    | ❌   | 30/min     | Validate quantity      |
| 79  | `/api/crypto/lot-sizes/stats`    | GET    | ❌   | 30/min     | LOT_SIZE statistics    |

### 🇺🇸 US Stocks APIs (5 - Alpha Vantage)

| #   | Endpoint                       | Method | Auth | Rate Limit | Purpose              |
| --- | ------------------------------ | ------ | ---- | ---------- | -------------------- |
| 17  | `/api/stocks/us`               | GET    | ❌   | 30/min     | All supported stocks |
| 18  | `/api/stocks/us/:symbol`       | GET    | ❌   | 30/min     | Stock price          |
| 19  | `/api/stocks/us/:symbol/daily` | GET    | ❌   | 30/min     | Daily OHLCV          |
| 20  | `/api/stocks/us/:symbol/sma`   | GET    | ❌   | 30/min     | SMA indicator        |
| 21  | `/api/stocks/us/:symbol/rsi`   | GET    | ❌   | 30/min     | RSI indicator        |

### 💱 Forex APIs (4 - Alpha Vantage)

| #   | Endpoint                    | Method | Auth | Rate Limit | Purpose              |
| --- | --------------------------- | ------ | ---- | ---------- | -------------------- |
| 22  | `/api/forex/pairs`          | GET    | ❌   | 30/min     | All 35 pairs         |
| 23  | `/api/forex/pairs/tested`   | GET    | ❌   | 30/min     | 5 tested pairs ✅    |
| 24  | `/api/forex/pairs/upcoming` | GET    | ❌   | 30/min     | 30 upcoming pairs 🚀 |
| 25  | `/api/forex/rate/:from/:to` | GET    | ❌   | 30/min     | Exchange rate        |

### 🇮🇳 Indian Stocks APIs (5 - DhanHQ)

| #   | Endpoint                          | Method | Auth | Rate Limit | Purpose              |
| --- | --------------------------------- | ------ | ---- | ---------- | -------------------- |
| 26  | `/api/stocks/in`                  | GET    | ❌   | 30/min     | All supported stocks |
| 27  | `/api/stocks/in/top`              | GET    | ❌   | 30/min     | Top stocks           |
| 28  | `/api/stocks/in/:symbol`          | GET    | ❌   | 30/min     | Stock price          |
| 29  | `/api/stocks/in/:symbol/intraday` | GET    | ❌   | 30/min     | Intraday data        |
| 30  | `/api/stocks/in/:symbol/daily`    | GET    | ❌   | 30/min     | Daily OHLCV          |

### 📰 News APIs (8 - MarketAux)

| #   | Endpoint               | Method | Auth | Rate Limit | Purpose                      |
| --- | ---------------------- | ------ | ---- | ---------- | ---------------------------- |
| 31  | `/api/news/latest`     | GET    | ❌   | 40/min     | Latest financial news        |
| 32  | `/api/news/search`     | GET    | ❌   | 40/min     | Search news by keyword       |
| 33  | `/api/news/symbols`    | GET    | ❌   | 40/min     | News for specific symbols    |
| 34  | `/api/news/trending`   | GET    | ❌   | 40/min     | Top trending articles        |
| 35  | `/api/news/date-range` | GET    | ❌   | 40/min     | News by date range           |
| 36  | `/api/news/crypto`     | GET    | ❌   | 40/min     | Cryptocurrency news          |
| 37  | `/api/news/stocks`     | GET    | ❌   | 40/min     | Stock market news            |
| 38  | `/api/news/advanced`   | GET    | ❌   | 40/min     | Advanced search with filters |

### 🛡️ Admin APIs (8)

| #   | Endpoint                      | Method | Auth | Rate Limit | Purpose          |
| --- | ----------------------------- | ------ | ---- | ---------- | ---------------- |
| 39  | `/api/admin/stats`            | GET    | ✅   | -          | Admin statistics |
| 40  | `/api/admin/audit-logs`       | GET    | ✅   | -          | Audit logs       |
| 41  | `/api/admin/users`            | GET    | ✅   | -          | All users        |
| 42  | `/api/admin/users`            | POST   | ✅   | -          | Create user      |
| 43  | `/api/admin/positions`        | GET    | ✅   | -          | All positions    |
| 44  | `/api/admin/trades`           | GET    | ✅   | -          | All trades       |
| 45  | `/api/admin/trades`           | POST   | ✅   | -          | Create trade     |
| 46  | `/api/admin/trades/:id/close` | PATCH  | ✅   | -          | Close trade      |

### ⛽ Commodities APIs (1)

| #   | Endpoint         | Method | Auth | Rate Limit | Purpose          |
| --- | ---------------- | ------ | ---- | ---------- | ---------------- |
| 47  | `/api/commodities` | GET    | ❌   | 30/min     | All commodities  |

### 🇮🇳 Indian Stock Trading APIs (7)

| #   | Endpoint                               | Method | Auth | Rate Limit | Purpose                    |
| --- | -------------------------------------- | ------ | ---- | ---------- | -------------------------- |
| 48  | `/api/stocks/in/trade/buy`             | POST   | ✅   | 5/min      | Buy Indian stock           |
| 49  | `/api/stocks/in/trade/sell`            | POST   | ✅   | 5/min      | Sell Indian stock          |
| 50  | `/api/stocks/in/trade/update`          | PUT    | ✅   | 5/min      | Update trade (not impl)    |
| 51  | `/api/stocks/in/positions`             | GET    | ✅   | -          | List positions             |
| 52  | `/api/stocks/in/positions/:id`         | GET    | ✅   | -          | Position details           |
| 53  | `/api/stocks/in/positions/:id/exit`    | POST   | ✅   | 5/min      | Exit position              |
| 54  | `/api/stocks/in/performance`           | GET    | ✅   | -          | Performance metrics        |

### 📦 Indian Stock Lot Size APIs (4) - DhanHQ

| #   | Endpoint                               | Method | Auth | Rate Limit | Purpose                    |
| --- | -------------------------------------- | ------ | ---- | ---------- | -------------------------- |
| 72  | `/api/stocks/in/lot-size/:symbol`       | GET    | ❌   | 30/min     | Get lot size for symbol    |
| 73  | `/api/stocks/in/lot-sizes/all`         | GET    | ❌   | 30/min     | Get all lot sizes          |
| 74  | `/api/stocks/in/lot-sizes/validate`    | GET    | ❌   | 30/min     | Validate lot multiple      |
| 75  | `/api/stocks/in/lot-sizes/stats`       | GET    | ❌   | 30/min     | Lot size statistics        |

### ⏰ Market Hours APIs (6)

| #   | Endpoint                               | Method | Auth | Rate Limit | Purpose                    |
| --- | -------------------------------------- | ------ | ---- | ---------- | -------------------------- |
| 55  | `/api/admin/market-hours`              | GET    | ✅   | -          | All market hours (admin)   |
| 56  | `/api/admin/market-hours/:marketType`  | GET    | ✅   | -          | Market hours by type       |
| 57  | `/api/admin/market-hours/:id`          | PUT    | ✅   | -          | Update market hours        |
| 58  | `/api/admin/market-hours/:id/history`  | GET    | ✅   | -          | Hours update history       |
| 59  | `/api/market-hours/status/:marketType` | GET    | ❌   | -          | Check market status        |

### 📅 Market Holidays APIs (8)

| #   | Endpoint                                    | Method | Auth | Rate Limit | Purpose                    |
| --- | ------------------------------------------- | ------ | ---- | ---------- | -------------------------- |
| 60  | `/api/admin/market-holidays`                | GET    | ✅   | -          | All holidays (admin)       |
| 61  | `/api/admin/market-holidays/:id`            | GET    | ✅   | -          | Holiday by ID              |
| 62  | `/api/admin/market-holidays`              | POST   | ✅   | -          | Create holiday             |
| 63  | `/api/admin/market-holidays/:id`          | PUT    | ✅   | -          | Update holiday             |
| 64  | `/api/admin/market-holidays/:id`          | DELETE | ✅   | -          | Delete holiday             |
| 65  | `/api/admin/market-holidays/bulk-create`  | POST   | ✅   | -          | Bulk create holidays       |
| 66  | `/api/market-holidays/check/:marketType`  | GET    | ❌   | -          | Check today holiday        |
| 67  | `/api/market-holidays/:marketType`        | GET    | ❌   | -          | Public holidays list       |

### 🏥 Health Check (1)

| #   | Endpoint      | Method | Auth | Rate Limit | Purpose           |
| --- | ------------- | ------ | ---- | ---------- | ----------------- |
| 68  | `/api/health` | GET    | ❌   | -          | API health status |

---

## 📊 DATA SERVICES INTEGRATION

### 📊 Alpha Vantage Service (US Stocks & Forex)

**US Stocks (10 symbols):**

- AAPL, MSFT, GOOGL, AMZN, NVDA, META, TSLA, JPM, V, JNJ
- ✅ Real-time prices & 24h statistics
- ✅ Daily OHLCV data
- ✅ Technical indicators: SMA, RSI
- ✅ Full historical data support
- ✅ Mock data fallback for free tier

**Forex Pairs (35 total):**

- ✅ **Tested (5):** EUR/USD, GBP/USD, USD/JPY, USD/CHF, USD/CAD
- 🚀 **Upcoming (30):** Emerging Markets, Cross Pairs, Exotic Pairs
- ✅ Exchange rates with bid/ask spreads
- ✅ Mock data fallback for free tier

---

### 🇮🇳 DhanHQ Service (Indian Stocks)

**NSE Stocks (15 symbols):**

- INFY, TCS, RELIANCE, HDFC, ICICIBANK, SBIN, WIPRO, MARUTI, BAJAJFINSV, LT, HINDUNILVR, SUNPHARMA, ADANIGREEN, BHARTIARTL, HDFCBANK
- ✅ Real-time stock prices
- ✅ Intraday data (1min, 5min, 15min intervals)
- ✅ Daily OHLCV data
- ✅ Top stocks ranking (by volume, price change, price)
- ✅ Mock data fallback for free tier

**📦 Lot Size API (New):**

- ✅ **Real NSE F&O lot sizes** via DhanHQ Instrument API
- ✅ **Dynamic lot size lookup** for 200+ F&O instruments
- ✅ **Lot validation** - ensures quantity is multiple of lot size
- ✅ **Lot-to-quantity conversion** - calculate shares from lots
- ✅ **Redis caching** - 24-hour cache for lot sizes (they rarely change)
- ✅ **Fallback to equity** (lot size = 1) if symbol not found in F&O

**API Endpoints:**
- `GET /api/stocks/in/lot-size/:symbol` - Get lot size for any symbol
- `GET /api/stocks/in/lot-sizes/all` - Get all F&O lot sizes
- `GET /api/stocks/in/lot-sizes/validate` - Validate quantity/lots
- `GET /api/stocks/in/lot-sizes/stats` - Statistics on lot sizes

---

### 💹 Binance Service (Cryptocurrencies - Real-time)

**Cryptocurrencies (10 symbols):**

- BTC, ETH, BNB, SOL, XRP, TRX, ADA, DOGE, LTC, MATIC
- ✅ Real-time prices via Binance API
- ✅ 24h statistics (high, low, volume, change %)
- ✅ Candlestick chart data (1h, 1d, 1w, 1m, 1y)
- ✅ Technical indicators (SMA20, RSI, MACD, Bollinger Bands)
- ✅ Historical OHLCV data
- ⚡ **Redis Caching:** Auto-update every 2 seconds
- ✅ Top 3 famous, Top 10 trending, Top 10 ranked (cached)

**📦 LOT_SIZE Filters (New):**

- ✅ **Real Binance LOT_SIZE filters** via exchangeInfo API
- ✅ **minQty/maxQty validation** - Ensures quantity is within limits
- ✅ **stepSize validation** - Quantity must be multiple of step size
- ✅ **minNotional validation** - Minimum order value (typically $10 USDT)
- ✅ **Auto-rounding** - Rounds quantity to valid step size
- ✅ **Redis caching** - 24-hour cache for exchange info (rarely changes)

**API Endpoints:**
- `GET /api/crypto/lot-size/:symbol` - Get LOT_SIZE filters for symbol
- `GET /api/crypto/lot-sizes/all` - Get all LOT_SIZE filters
- `GET /api/crypto/lot-sizes/validate` - Validate quantity against filters
- `GET /api/crypto/lot-sizes/stats` - Statistics on LOT_SIZE filters

**Example LOT_SIZE Response:**
```json
{
  "symbol": "BTC",
  "binanceSymbol": "BTCUSDT",
  "minQty": 0.00001,
  "maxQty": 9000.0,
  "stepSize": 0.00001,
  "minNotional": 10,
  "precision": 5,
  "source": "Binance"
}
```

---

### 📰 MarketAux Service (Financial News)

**Coverage:**

- ✅ Global stock market & finance news from 5,000+ quality sources
- ✅ 30+ languages supported
- ✅ Over 200,000 entities tracked (stocks, crypto, ETFs, commodities, etc.)
- ✅ Advanced sentiment analysis & NLP processing
- ✅ Real-time news from major financial news providers

**Features:**

- 📰 Latest financial news (paginated)
- 🔍 Search news by keyword
- 📊 News filtered by stock symbols (e.g., AAPL, TSLA, BTC, etc.)
- 📈 Trending financial articles
- 📅 News by date range
- 🪙 Crypto-specific news (BTC, ETH, BNB, SOL, XRP, DOGE)
- 💼 Stock market news (AAPL, MSFT, GOOGL, AMZN, TSLA, META)
- 🔗 Advanced search with multiple filters
- ✅ Mock data fallback for free tier

**API Key:**

- Get free key at: [marketaux.com/register](https://www.marketaux.com/register)
- Free tier: 100 API calls/day
- Paid plans: Up to 10,000+ calls/day

---

## 🔐 DETAILED API DOCUMENTATION

# 🎯 Complete Crypto Trading API Documentation

**Backend URL:** `http://localhost:8808`  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

---

## 📊 API Summary

**Total Endpoints: 17**

- 8 Market Data APIs (including cached real-time data)
- 3 Chart/Analysis APIs
- 2 Trading APIs
- 2 Portfolio APIs
- 1 Authentication API
- 1 Health Check API

---

## 🔐 AUTHENTICATION (1)

### 1. Login - Get JWT Token

```
POST /api/auth/login
```

**Rate Limit:** 10 requests/minute  
**Authentication:** Not required  
**Content-Type:** `application/json`

**Request Body:**

```json
{
  "email": "trader1@papertrading.local",
  "password": "Trader123!"
}
```

**Success Response (200):**

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
```

**Error Response (401):**

```json
{
  "message": "Invalid email or password"
}
```

**Token Usage:**

```
Header: Authorization: Bearer <token>
Expiry: 24 hours
```

**cURL Example:**

```bash
curl -X POST http://localhost:8808/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trader1@papertrading.local","password":"Trader123!"}'
```

---

## 💹 MARKET DATA APIS (6)

### 2. Get All Crypto Prices

```
GET /api/crypto/prices
```

**Rate Limit:** 30 requests/minute  
**Authentication:** Not required

**Response (200):**

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
```

**cURL Example:**

```bash
curl http://localhost:8808/api/crypto/prices
```

---

### 3. Get Specific Crypto Price

```
GET /api/crypto/prices/:symbol
```

**Example:** `GET /api/crypto/prices/BTCUSDT`  
**Rate Limit:** 30 requests/minute  
**Authentication:** Not required

**Response (200):**

```json
{
  "symbol": "BTCUSDT",
  "price": 74834.75,
  "timestamp": 1776186993270
}
```

**Error Response (400):**

```json
{
  "message": "Symbol XXXUSDT not supported. Supported symbols: BTCUSDT, ETHUSDT, BNBUSDT, SOLUSDT, XRPUSDT, TRXUSDT, ADAUSDT"
}
```

**cURL Example:**

```bash
curl http://localhost:8808/api/crypto/prices/BTCUSDT
```

---

### 4. Get 24h Statistics

```
GET /api/crypto/stats/:symbol
```

**Example:** `GET /api/crypto/stats/BTCUSDT`  
**Rate Limit:** 30 requests/minute  
**Authentication:** Not required

**Response (200):**

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
```

**cURL Example:**

```bash
curl http://localhost:8808/api/crypto/stats/BTCUSDT
```

---

### 5. Get Top 3 Famous Cryptocurrencies ✨ **NEW**

```
GET /api/crypto/top-3/famous
```

**Rate Limit:** 30 requests/minute  
**Authentication:** Not required

**Response (200):**

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
```

**Use Case:** Display BTC, ETH, BNB at top of Markets screen

**cURL Example:**

```bash
curl http://localhost:8808/api/crypto/top-3/famous
```

---

### 6. Get Top 10 Trending Cryptocurrencies ✨ **NEW**

```
GET /api/crypto/trending/top-10
```

**Rate Limit:** 30 requests/minute  
**Authentication:** Not required

**Response (200):**

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
```

**Use Case:** Show trending cryptos sorted by price change %

**cURL Example:**

```bash
curl http://localhost:8808/api/crypto/trending/top-10
```

---

### 7. Get Trending Cryptos (Filtered) ✨ **NEW**

```
GET /api/crypto/trending/all?minPercent=0
```

**Rate Limit:** 30 requests/minute  
**Authentication:** Not required

**Query Parameters:**

- `minPercent` (optional): Minimum price change % (default: 0)

**Example:** `GET /api/crypto/trending/all?minPercent=1.5`

**Response (200):** Same as Top 10, filtered by minPercent

**cURL Example:**

```bash
curl http://localhost:8808/api/crypto/trending/all?minPercent=1.0
```

---

### 8. Get Top 10 Ranked Cryptos (Cached) ⚡ **NEW**

```
GET /api/crypto/top-10/ranked
```

**Rate Limit:** 30 requests/minute  
**Authentication:** Not required

**⚡ Performance:** Data is cached in Redis and automatically updated every 2 seconds  
**Data Source:** Binance API only

**Response (200):**

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
```

**Features:**

- ⚡ Fresh data every 2 seconds from background polling
- 🎯 Automatically ranked by 24h price change %
- 💾 Cached in Redis for instant response
- 📊 Includes all 24h statistics

**Use Case:** Display top 10 ranked cryptos on dashboard or market page

**cURL Example:**

```bash
curl http://localhost:8808/api/crypto/top-10/ranked
```

---

### 9. Get All Crypto Statistics (Cached) ⚡ **NEW**

```
GET /api/crypto/all/stats
```

**Rate Limit:** 30 requests/minute  
**Authentication:** Not required

**⚡ Performance:** Data is cached in Redis and automatically updated every 2 seconds  
**Data Source:** Binance API only

**Response (200):**

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
```

**Features:**

- ⚡ Fresh data every 2 seconds from background polling
- 💾 Cached in Redis for instant response
- 📊 All 10 supported cryptos with full statistics
- 🔄 Automatically updated in the background

**Use Case:** Get bulk crypto data for tables, grids, or market overview

**cURL Example:**

```bash
curl http://localhost:8808/api/crypto/all/stats
```

---

## 📊 CHART & TECHNICAL ANALYSIS APIS (3)

### 10. Get Candlestick Chart Data ✨ **NEW**

```
GET /api/crypto/:symbol/chart?timeframe=1d&limit=100
```

**Example:** `GET /api/crypto/BTCUSDT/chart?timeframe=1d&limit=100`  
**Rate Limit:** 30 requests/minute  
**Authentication:** Not required

**Query Parameters:**

- `timeframe`: `1h`, `1d`, `1w`, `1m`, `1y` (default: `1d`)
- `limit`: 1-1000 (default: 100)

**Response (200):**

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
```

**Timeframe Options:**

- `1h`: Hourly candles
- `1d`: Daily candles
- `1w`: Weekly candles
- `1m`: Monthly candles
- `1y`: Yearly candles

**Use Case:** Display candlestick chart with TradingView

**cURL Examples:**

```bash
# Daily chart (100 candles)
curl http://localhost:8808/api/crypto/BTCUSDT/chart?timeframe=1d&limit=100

# Hourly chart (24 candles for 1 day)
curl http://localhost:8808/api/crypto/ETHUSDT/chart?timeframe=1h&limit=24

# Weekly chart (52 candles for 1 year)
curl http://localhost:8808/api/crypto/BNBUSDT/chart?timeframe=1w&limit=52
```

---

### 11. Get Historical OHLCV Data ✨ **NEW**

```
GET /api/crypto/:symbol/historical?timeframe=1d&days=30
```

**Example:** `GET /api/crypto/BTCUSDT/historical?timeframe=1d&days=30`  
**Rate Limit:** 30 requests/minute  
**Authentication:** Not required

**Query Parameters:**

- `timeframe`: `1h`, `1d`, `1w`, `1m`, `1y` (default: `1d`)
- `days`: 1-365 (default: 30)

**Response (200):**

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
```

**Use Case:** Get historical price data for analysis

**cURL Examples:**

```bash
# 30-day history
curl http://localhost:8808/api/crypto/BTCUSDT/historical?timeframe=1d&days=30

# 365-day history
curl http://localhost:8808/api/crypto/ETHUSDT/historical?timeframe=1d&days=365

# 24-hour hourly history
curl http://localhost:8808/api/crypto/BNBUSDT/historical?timeframe=1h&days=1
```

---

### 12. Get Technical Indicators ✨ **NEW**

```
GET /api/crypto/:symbol/indicators?timeframe=1d
```

**Example:** `GET /api/crypto/BTCUSDT/indicators?timeframe=1d`  
**Rate Limit:** 30 requests/minute  
**Authentication:** Not required

**Query Parameters:**

- `timeframe`: `1h`, `1d`, `1w`, `1m` (default: `1d`)

**Response (200):**

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
```

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

```bash
curl http://localhost:8808/api/crypto/BTCUSDT/indicators?timeframe=1d
```

---

## 💳 TRADING APIS (2)

### 11. Buy Cryptocurrency

```
POST /api/crypto/buy
```

**Rate Limit:** 5 requests/minute  
**Authentication:** Required (JWT Bearer token)  
**Content-Type:** `application/json`

**Request Body:**

```json
{
  "symbol": "BTCUSDT",
  "quantity": 0.5,
  "price": 74834.75
}
```

**Success Response (201):**

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
```

**Error Response (400) - Insufficient Balance:**

```json
{
  "message": "Insufficient balance. Required: 37417.375, Available: 25000.00"
}
```

**Error Response (400) - Invalid Symbol:**

```json
{
  "message": "Symbol XXXUSDT not supported"
}
```

**Error Response (401) - Missing Token:**

```json
{
  "message": "Missing authorization token"
}
```

**Validation:**

- Sufficient balance required
- Symbol must be supported
- Quantity & price must be positive

**cURL Example:**

```bash
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:8808/api/crypto/buy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "symbol": "BTCUSDT",
    "quantity": 0.5,
    "price": 74834.75
  }'
```

---

### 12. Sell Cryptocurrency

```
POST /api/crypto/sell
```

**Rate Limit:** 5 requests/minute  
**Authentication:** Required (JWT Bearer token)

**Request Body:**

```json
{
  "symbol": "BTCUSDT",
  "quantity": 0.5,
  "price": 75000.0
}
```

**Success Response (201):**

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
```

**Error Response (400) - Insufficient Position:**

```json
{
  "message": "Insufficient position. Available: 0.5, Requested: 1"
}
```

**Validation:**

- User must have sufficient position
- Position validation prevents overselling
- Same symbol validation as buy

**cURL Example:**

```bash
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:8808/api/crypto/sell \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "symbol": "BTCUSDT",
    "quantity": 0.5,
    "price": 75000.00
  }'
```

---

## 👤 PORTFOLIO APIS (2)

### 13. Get User Portfolio

```
GET /api/crypto/portfolio
```

**Authentication:** Required (JWT Bearer token)

**Response (200):**

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
```

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

```bash
TOKEN="your_jwt_token_here"

curl http://localhost:8808/api/crypto/portfolio \
  -H "Authorization: Bearer $TOKEN"
```

---

### 14. Get Trade History

```
GET /api/crypto/trades?page=1&limit=20
```

**Authentication:** Required (JWT Bearer token)

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response (200):**

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
```

**Use Case:** Show transaction history with pagination

**cURL Examples:**

```bash
TOKEN="your_jwt_token_here"

# Page 1, 20 items
curl http://localhost:8808/api/crypto/trades?page=1&limit=20 \
  -H "Authorization: Bearer $TOKEN"

# Page 2, 50 items per page (max: 100)
curl http://localhost:8808/api/crypto/trades?page=2&limit=50 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🏥 HEALTH CHECK APIS (2)

### 15. Health Check

```
GET /api/health
```

**Rate Limit:** None  
**Authentication:** Not required

**Response (200):**

```json
{
  "status": "ok",
  "service": "paper-trading-backend"
}
```

**Use Case:** Verify API is running

**cURL Example:**

```bash
curl http://localhost:8808/api/health
```

---

## 📋 QUICK REFERENCE TABLE

| #   | Endpoint                       | Method | Auth | Rate Limit | Purpose                |
| --- | ------------------------------ | ------ | ---- | ---------- | ---------------------- |
| 1   | /api/auth/login                | POST   | ❌   | 10/min     | Login                  |
| 2   | /api/crypto/prices             | GET    | ❌   | 30/min     | All prices             |
| 3   | /api/crypto/prices/:symbol     | GET    | ❌   | 30/min     | Single price           |
| 4   | /api/crypto/stats/:symbol      | GET    | ❌   | 30/min     | 24h stats              |
| 5   | /api/crypto/top-3/famous       | GET    | ❌   | 30/min     | Top 3                  |
| 6   | /api/crypto/trending/top-10    | GET    | ❌   | 30/min     | Top 10                 |
| 7   | /api/crypto/trending/all       | GET    | ❌   | 30/min     | Trending filter        |
| 8   | /api/crypto/top-10/ranked      | GET    | ❌   | 30/min     | Top 10 ranked (cached) |
| 9   | /api/crypto/all/stats          | GET    | ❌   | 30/min     | All stats (cached)     |
| 10  | /api/crypto/:symbol/chart      | GET    | ❌   | 30/min     | Chart data             |
| 11  | /api/crypto/:symbol/historical | GET    | ❌   | 30/min     | Historical             |
| 12  | /api/crypto/:symbol/indicators | GET    | ❌   | 30/min     | Indicators             |
| 13  | /api/crypto/buy                | POST   | ✅   | 5/min      | Buy order              |
| 14  | /api/crypto/sell               | POST   | ✅   | 5/min      | Sell order             |
| 15  | /api/crypto/portfolio          | GET    | ✅   | -          | Portfolio              |
| 16  | /api/crypto/trades             | GET    | ✅   | -          | Trade history          |
| 17  | /api/health                    | GET    | ❌   | -          | Health check           |

---

## 🔒 AUTHENTICATION HEADER

Add to all authenticated requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📊 RATE LIMITS

| Endpoint Type   | Limit      | Window     |
| --------------- | ---------- | ---------- |
| Login           | 10 req/min | 60 seconds |
| Prices & Charts | 30 req/min | 60 seconds |
| Trading         | 5 req/min  | 60 seconds |

**Response on exceeding (429):**

```json
{
  "message": "Too many requests. Try again shortly."
}
```

---

## ⚠️ ERROR CODES

| Code | Meaning      | Example           |
| ---- | ------------ | ----------------- |
| 200  | Success      | Price fetched     |
| 201  | Created      | Trade created     |
| 400  | Bad Request  | Invalid input     |
| 401  | Unauthorized | Invalid token     |
| 429  | Rate Limited | Too many requests |
| 500  | Server Error | API error         |

---

## 🧪 TEST CREDENTIALS

```
User 1:
Email: trader1@papertrading.local
Password: Trader123!
Balance: $150,000

User 2:
Email: trader2@papertrading.local
Password: Trader123!
Balance: $120,000
```

---

## 🔗 SUPPORTED SYMBOLS

**Famous 3 (Always Show):**

- BTCUSDT - Bitcoin
- ETHUSDT - Ethereum
- BNBUSDT - Binance Coin

**Trending 10:**

- SOLUSDT - Solana
- XRPUSDT - XRP
- TRXUSDT - TRON
- ADAUSDT - Cardano
- DOGEUSDT - Dogecoin
- LTCUSDT - Litecoin
- MATICUSDT - Polygon
- (3 more selectable)

---

## 🎯 EXAMPLE WORKFLOWS

### Workflow 1: View Market Data

```bash
# Get top 3 famous
curl http://localhost:8808/api/crypto/top-3/famous

# Get top 10 trending
curl http://localhost:8808/api/crypto/trending/top-10

# Get single price
curl http://localhost:8808/api/crypto/prices/BTCUSDT
```

### Workflow 2: Login & Check Portfolio

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8808/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trader1@papertrading.local","password":"Trader123!"}' \
  | jq -r '.token')

# View portfolio
curl http://localhost:8808/api/crypto/portfolio \
  -H "Authorization: Bearer $TOKEN"
```

### Workflow 3: Buy & Sell

```bash
# Buy BTC
curl -X POST http://localhost:8808/api/crypto/buy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"symbol":"BTCUSDT","quantity":0.5,"price":74834.75}'

# Sell BTC
curl -X POST http://localhost:8808/api/crypto/sell \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"symbol":"BTCUSDT","quantity":0.5,"price":75000.00}'
```

### Workflow 4: View Charts & Indicators

```bash
# Get candlestick
curl http://localhost:8808/api/crypto/BTCUSDT/chart?timeframe=1d&limit=100

# Get indicators
curl http://localhost:8808/api/crypto/BTCUSDT/indicators?timeframe=1d
```

---

## 🎯 FRONTEND HELPER SERVICE

### Overview

A pre-built React helper service is available at **`apps/admin/src/api/crypto.service.js`** that simplifies all API calls for the frontend team.

### Available Functions

#### 1. Get All Crypto Prices

```javascript
import { getAllCryptoPrices } from "../api/crypto.service";

const prices = await getAllCryptoPrices();
// Returns array of { symbol, price, timestamp }
```

#### 2. Get All Crypto Statistics

```javascript
import { getAllCryptoStats } from "../api/crypto.service";

const stats = await getAllCryptoStats();
// Returns array of { symbol, price, priceChange, priceChangePercent, ... }
```

#### 3. Get Top 10 Ranked Cryptos ⚡ **RECOMMENDED**

```javascript
import { getTop10RankedCryptos } from "../api/crypto.service";

const top10 = await getTop10RankedCryptos();
// Returns top 10 cryptos ranked by 24h price change
// Fresh data every 2 seconds!
```

#### 4. Get Specific Crypto Price

```javascript
import { getCryptoPrice } from "../api/crypto.service";

const btc = await getCryptoPrice("BTCUSDT");
// Returns { symbol, price, timestamp }
```

#### 5. Get Specific Crypto Statistics

```javascript
import { getCryptoStats } from "../api/crypto.service";

const stats = await getCryptoStats("BTCUSDT");
// Returns { symbol, price, priceChange, priceChangePercent, ... }
```

### React Component Example

```javascript
import { useEffect, useState } from "react";
import { getTop10RankedCryptos } from "../api/crypto.service";

function CryptoMarketWidget() {
  const [top10, setTop10] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMarketData() {
      try {
        setLoading(true);
        const data = await getTop10RankedCryptos();
        setTop10(data);
      } catch (error) {
        console.error("Failed to load market data:", error);
      } finally {
        setLoading(false);
      }
    }

    // Load immediately
    loadMarketData();

    // Refresh every 2 seconds to match backend polling
    const interval = setInterval(loadMarketData, 2000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading market data...</div>;

  return (
    <div className="market-widget">
      <h2>Top 10 Cryptos</h2>
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Price</th>
            <th>24h Change %</th>
            <th>High</th>
            <th>Low</th>
            <th>Volume</th>
          </tr>
        </thead>
        <tbody>
          {top10.map((crypto) => (
            <tr key={crypto.symbol}>
              <td>{crypto.symbol}</td>
              <td>${crypto.price.toFixed(2)}</td>
              <td
                style={{
                  color: crypto.priceChangePercent >= 0 ? "green" : "red",
                }}
              >
                {crypto.priceChangePercent.toFixed(2)}%
              </td>
              <td>${crypto.highPrice.toFixed(2)}</td>
              <td>${crypto.lowPrice.toFixed(2)}</td>
              <td>{crypto.volume.toFixed(0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default CryptoMarketWidget;
```

### Data Caching Strategy

✅ **Automatic Backend Updates**

- All crypto data is automatically fetched from Binance every 2 seconds
- Data is cached in Redis for instant response
- No direct Binance API calls needed from frontend

✅ **Frontend Polling** (Optional)

- For real-time updates, call the helper functions every 2 seconds
- Or call once when component mounts for static display

```javascript
// Option 1: Static (call once)
useEffect(() => {
  getTop10RankedCryptos().then(setTop10);
}, []);

// Option 2: Real-time (refresh every 2 seconds)
useEffect(() => {
  const interval = setInterval(() => {
    getTop10RankedCryptos().then(setTop10);
  }, 2000);
  return () => clearInterval(interval);
}, []);
```

### Key Features

✨ **Performance**

- Response time: < 50ms (cached from Redis)
- Data freshness: 2 seconds (backend polling)
- Rate limited: 30 requests/minute per endpoint

✨ **Reliability**

- All prices from Binance only
- Automatic error handling
- Fallback to empty array on error

✨ **Developer Experience**

- Simple async/await syntax
- TypeScript-ready (add types if needed)
- Consistent response format
- Zero configuration needed

---

## 📰 FINANCIAL NEWS APIs (8 - MarketAux)

### 31. Get Latest Financial News

```
GET /api/news/latest
```

**Rate Limit:** 40 requests/minute  
**Authentication:** Not required

**Query Parameters:**

| Parameter | Type   | Default | Max | Description              |
| --------- | ------ | ------- | --- | ------------------------ |
| limit     | number | 20      | 100 | Number of articles       |
| page      | number | 1       | -   | Page number (pagination) |

**Response (200):**

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
```

**cURL Example:**

```bash
curl "http://localhost:8808/api/news/latest?limit=20&page=1"
```

---

### 32. Search News by Keyword

```
GET /api/news/search
```

**Rate Limit:** 40 requests/minute  
**Authentication:** Not required

**Query Parameters:**

| Parameter | Type   | Required | Description          |
| --------- | ------ | -------- | -------------------- |
| q         | string | ✅       | Search query keyword |
| limit     | number | ❌       | Results per page     |
| page      | number | ❌       | Page number          |

**Response (200):**

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
```

**Error Response (400):**

```json
{
  "message": "Search query (q) is required"
}
```

**cURL Example:**

```bash
curl "http://localhost:8808/api/news/search?q=Tesla%20earnings&limit=10"
```

---

### 33. Get News for Specific Symbols

```
GET /api/news/symbols
```

**Rate Limit:** 40 requests/minute  
**Authentication:** Not required

**Query Parameters:**

| Parameter | Type   | Required | Description                                        |
| --------- | ------ | -------- | -------------------------------------------------- |
| symbols   | string | ✅       | Comma-separated symbols (e.g., AAPL,MSFT,TSLA,BTC) |
| limit     | number | ❌       | Results per page                                   |
| page      | number | ❌       | Page number                                        |

**Response (200):**

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
```

**cURL Example:**

```bash
curl "http://localhost:8808/api/news/symbols?symbols=AAPL,MSFT,TSLA&limit=15"
```

---

### 34. Get Trending News

```
GET /api/news/trending
```

**Rate Limit:** 40 requests/minute  
**Authentication:** Not required

**Response:** Top 50 most trending financial news articles

```json
{
  "success": true,
  "meta": {
    "found": 5474,
    "returned": 50,
    "limit": 50,
    "page": 1
  },
  "data": [...]
}
```

**cURL Example:**

```bash
curl "http://localhost:8808/api/news/trending"
```

---

### 35. Get News by Date Range

```
GET /api/news/date-range
```

**Rate Limit:** 40 requests/minute  
**Authentication:** Not required

**Query Parameters:**

| Parameter | Type   | Required | Format            | Description      |
| --------- | ------ | -------- | ----------------- | ---------------- |
| startDate | string | ✅       | ISO 8601 datetime | Start date       |
| endDate   | string | ✅       | ISO 8601 datetime | End date         |
| limit     | number | ❌       | 1-100             | Results per page |
| page      | number | ❌       | Positive integer  | Page number      |

**Response (200):**

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
```

**cURL Example:**

```bash
curl "http://localhost:8808/api/news/date-range?startDate=2026-04-01T00:00:00Z&endDate=2026-05-02T23:59:59Z&limit=20"
```

---

### 36. Get Cryptocurrency News

```
GET /api/news/crypto
```

**Rate Limit:** 40 requests/minute  
**Authentication:** Not required

**Query Parameters:**

| Parameter | Type   | Default | Description      |
| --------- | ------ | ------- | ---------------- |
| limit     | number | 20      | Results per page |
| page      | number | 1       | Page number      |

**Included Symbols:** BTC, ETH, BNB, SOL, XRP, DOGE

**Response (200):**

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
```

**cURL Example:**

```bash
curl "http://localhost:8808/api/news/crypto?limit=20"
```

---

### 37. Get Stock Market News

```
GET /api/news/stocks
```

**Rate Limit:** 40 requests/minute  
**Authentication:** Not required

**Query Parameters:**

| Parameter | Type   | Default | Description      |
| --------- | ------ | ------- | ---------------- |
| limit     | number | 20      | Results per page |
| page      | number | 1       | Page number      |

**Included Symbols:** AAPL, MSFT, GOOGL, AMZN, TSLA, META

**Response (200):**

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
```

**cURL Example:**

```bash
curl "http://localhost:8808/api/news/stocks?limit=20&page=1"
```

---

### 38. Advanced News Search with Filters

```
GET /api/news/advanced
```

**Rate Limit:** 40 requests/minute  
**Authentication:** Not required

**Query Parameters:**

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| query     | string | ❌       | Search keyword                 |
| symbols   | string | ❌       | Comma-separated symbols        |
| startDate | string | ❌       | ISO 8601 start date            |
| endDate   | string | ❌       | ISO 8601 end date              |
| limit     | number | ❌       | Results per page (default: 10) |
| page      | number | ❌       | Page number (default: 1)       |

**Response (200):**

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
```

**Combined Request Example:**

```bash
curl "http://localhost:8808/api/news/advanced?query=earnings&symbols=AAPL,MSFT&startDate=2026-04-01T00:00:00Z&endDate=2026-05-02T23:59:59Z&limit=20"
```

---

## ✨ NEWS API FEATURE HIGHLIGHTS

✅ Global financial news from 5,000+ quality sources  
✅ 30+ languages supported  
✅ Advanced sentiment analysis  
✅ Real-time news feed  
✅ Search by keyword  
✅ Filter by stock symbols or crypto  
✅ Date range filtering  
✅ Trending articles  
✅ Entity extraction & matching  
✅ 40 requests/minute rate limit  
✅ Simple pagination  
✅ Production ready

---

## ✨ FEATURE HIGHLIGHTS

✅ Real-time Binance price feeds  
✅ Automatic 2-second data polling with Redis caching  
✅ Top 10 ranked cryptos (auto-updated every 2 seconds)  
✅ Candlestick chart data for charting  
✅ Technical indicators (SMA, RSI, MACD, Bollinger)  
✅ Historical OHLCV data (up to 1 year)  
✅ Top 3 famous cryptos  
✅ Top 10 trending cryptos  
✅ Buy/Sell orders with balance validation  
✅ Portfolio tracking with P&L  
✅ Trade history with pagination  
✅ JWT authentication  
✅ Rate limiting per endpoint  
✅ Redis caching for performance  
✅ Complete error handling  
✅ Frontend helper service (crypto.service.js)  
✅ Production ready

---

---

## ⛽ COMMODITIES APIs (1)

### 47. Get All Commodities

```
GET /api/commodities
```

**Rate Limit:** 30 requests/minute  
**Authentication:** Not required

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "symbol": "GOLD",
      "name": "Gold",
      "subtitle": "Commodity",
      "price": 1850.75,
      "change": 12.30,
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
      "changePercent": 2.40,
      "currencySymbol": "$",
      "sparklineData": [76, 77, 78, 79, 78.5, 78, 78.92]
    }
  ],
  "count": 5,
  "timestamp": "2026-05-07T12:00:00Z"
}
```

**Supported Commodities:**

- GOLD - Gold (XAU/USD)
- SILVER - Silver (XAG/USD)
- OIL - Crude Oil (WTI)
- COPPER - Copper
- NATGAS - Natural Gas

**cURL Example:**

```bash
curl http://localhost:8808/api/commodities
```

---

## 🇮🇳 INDIAN STOCK TRADING APIs (7)

Complete trading system for Indian stocks (NSE) with real-time balance management, P&L calculation, and performance metrics.

### 48. Buy Indian Stock

```
POST /api/stocks/in/trade/buy
```

**Rate Limit:** 5 requests/minute  
**Authentication:** Required (JWT Bearer token)  
**Content-Type:** `application/json`

**Request Body:**

```json
{
  "symbol": "INFY",
  "quantity": 10,
  "price": 1580.50,
  "orderType": "MARKET"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Buy order executed successfully",
  "position": {
    "id": 1,
    "symbol": "INFY",
    "side": "BUY",
    "quantity": 10,
    "entryPrice": 1580.50,
    "currentPrice": 1580.50,
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
```

**Error Response (400) - Insufficient Balance:**

```json
{
  "success": false,
  "message": "Insufficient balance. Required: 15805, Available: 5000"
}
```

**cURL Example:**

```bash
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:8808/api/stocks/in/trade/buy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "symbol": "INFY",
    "quantity": 10,
    "price": 1580.50,
    "orderType": "MARKET"
  }'
```

---

### 49. Sell Indian Stock

```
POST /api/stocks/in/trade/sell
```

**Rate Limit:** 5 requests/minute  
**Authentication:** Required (JWT Bearer token)

**Request Body:**

```json
{
  "symbol": "INFY",
  "quantity": 10,
  "price": 1600.00,
  "orderType": "MARKET"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Sell order executed successfully",
  "position": {
    "id": 2,
    "symbol": "INFY",
    "side": "SELL",
    "quantity": 10,
    "entryPrice": 1600.00,
    "status": "OPEN",
    "createdAt": "2026-05-07T12:00:00Z"
  }
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:8808/api/stocks/in/trade/sell \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "symbol": "INFY",
    "quantity": 10,
    "price": 1600.00
  }'
```

---

### 50. Update Indian Stock Trade (Stub)

```
PUT /api/stocks/in/trade/update
```

**Rate Limit:** 5 requests/minute  
**Authentication:** Required (JWT Bearer token)

**Note:** This endpoint is currently not implemented. Use exit position instead.

**Response (501):**

```json
{
  "success": false,
  "message": "Update trade endpoint not yet implemented. Use exit position instead."
}
```

---

### 51. Get Indian Stock Positions

```
GET /api/stocks/in/positions?status=ACTIVE
```

**Authentication:** Required (JWT Bearer token)

**Query Parameters:**

| Parameter | Type   | Default | Description                    |
| --------- | ------ | ------- | ------------------------------ |
| status    | string | ACTIVE  | ACTIVE, CLOSED, or ALL         |

**Response (200):**

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
      "entryPrice": 1580.50,
      "currentPrice": 1600.00,
      "status": "ACTIVE",
      "unrealizedPnl": 195.00,
      "unrealizedPnlPercent": 1.23,
      "createdAt": "2026-05-07T12:00:00Z"
    }
  ],
  "summary": {
    "totalPositions": 1,
    "activePositions": 1,
    "totalUnrealizedPnl": 195.00,
    "totalInvested": 15805.00
  }
}
```

**cURL Example:**

```bash
curl http://localhost:8808/api/stocks/in/positions?status=ACTIVE \
  -H "Authorization: Bearer $TOKEN"
```

---

### 52. Get Position Details

```
GET /api/stocks/in/positions/:positionId
```

**Authentication:** Required (JWT Bearer token)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "symbol": "INFY",
    "name": "Infosys Limited",
    "side": "BUY",
    "quantity": 10,
    "entryPrice": 1580.50,
    "currentPrice": 1600.00,
    "status": "ACTIVE",
    "unrealizedPnl": 195.00,
    "unrealizedPnlPercent": 1.23,
    "marketValue": 16000.00,
    "investedAmount": 15805.00,
    "createdAt": "2026-05-07T12:00:00Z",
    "lastUpdated": "2026-05-07T14:30:00Z"
  }
}
```

---

### 53. Exit Position

```
POST /api/stocks/in/positions/:positionId/exit
```

**Rate Limit:** 5 requests/minute  
**Authentication:** Required (JWT Bearer token)

**Request Body:**

```json
{
  "exitPrice": 1600.00,
  "exitReason": "Target achieved"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Position exited successfully",
  "position": {
    "id": 1,
    "symbol": "INFY",
    "status": "CLOSED",
    "entryPrice": 1580.50,
    "exitPrice": 1600.00,
    "quantity": 10,
    "realizedPnl": 195.00,
    "realizedPnlPercent": 1.23,
    "exitTime": "2026-05-07T14:30:00Z"
  },
  "balance": {
    "previous": 134195,
    "current": 134390,
    "credited": 195
  }
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:8808/api/stocks/in/positions/1/exit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "exitPrice": 1600.00,
    "exitReason": "Target achieved"
  }'
```

---

### 54. Get Performance Metrics

```
GET /api/stocks/in/performance
```

**Authentication:** Required (JWT Bearer token)

**Response (200):**

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
    "averageWin": 450.50,
    "averageLoss": 220.30,
    "largestWin": 1250.00,
    "largestLoss": 450.00,
    "totalProfit": 14416.00,
    "totalLoss": 3304.50,
    "netPnl": 11111.50
  }
}
```

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

```bash
curl http://localhost:8808/api/stocks/in/performance \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⏰ MARKET HOURS APIs (6)

Admin-controlled market opening/closing times and public market status checks.

### 55. Get All Market Hours (Admin)

```
GET /api/admin/market-hours
```

**Authentication:** Required (JWT Bearer token + Admin role)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "market_type": "indian_stock",
      "market_name": "NSE Equity",
      "open_time": "09:15:00",
      "close_time": "15:30:00",
      "timezone": "Asia/Kolkata",
      "is_active": true,
      "notes": "Regular trading hours",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-05-07T10:00:00Z"
    },
    {
      "id": 2,
      "market_type": "us_stock",
      "market_name": "NYSE",
      "open_time": "09:30:00",
      "close_time": "16:00:00",
      "timezone": "America/New_York",
      "is_active": true,
      "notes": "Eastern Time",
      "created_at": "2026-01-01T00:00:00Z",
      "updated_at": "2026-05-07T10:00:00Z"
    }
  ]
}
```

---

### 56. Get Market Hours by Type (Admin)

```
GET /api/admin/market-hours/:marketType
```

**Authentication:** Required (JWT Bearer token + Admin role)

**Example:** `GET /api/admin/market-hours/indian_stock`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "market_type": "indian_stock",
    "market_name": "NSE Equity",
    "open_time": "09:15:00",
    "close_time": "15:30:00",
    "timezone": "Asia/Kolkata",
    "is_active": true,
    "notes": "Regular trading hours"
  }
}
```

---

### 57. Update Market Hours (Admin)

```
PUT /api/admin/market-hours/:id
```

**Authentication:** Required (JWT Bearer token + Admin role)

**Request Body:**

```json
{
  "open_time": "09:15:00",
  "close_time": "15:30:00",
  "is_active": true,
  "notes": "Special extended hours",
  "reason": "Market volatility adjustment"
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Market hours updated successfully",
  "data": {
    "id": 1,
    "market_type": "indian_stock",
    "open_time": "09:15:00",
    "close_time": "15:30:00",
    "is_active": true,
    "updated_at": "2026-05-07T14:30:00Z"
  }
}
```

---

### 58. Get Market Hours History (Admin)

```
GET /api/admin/market-hours/:id/history
```

**Authentication:** Required (JWT Bearer token + Admin role)

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "market_hours_id": 1,
      "previous_open_time": "09:15:00",
      "previous_close_time": "15:30:00",
      "new_open_time": "09:00:00",
      "new_close_time": "15:30:00",
      "changed_by": 1,
      "reason": "Early opening for special session",
      "created_at": "2026-05-01T10:00:00Z"
    }
  ]
}
```

---

### 59. Check Market Status (Public)

```
GET /api/market-hours/status/:marketType
```

**Authentication:** Not required

**Example:** `GET /api/market-hours/status/indian_stock`

**Response (200):**

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
```

**cURL Example:**

```bash
curl http://localhost:8808/api/market-hours/status/indian_stock
```

---

## 📅 MARKET HOLIDAYS APIs (8)

Admin-controlled special market closures (holidays, events) with public access to holiday lists.

### 60. Get All Market Holidays (Admin)

```
GET /api/admin/market-holidays?marketType=indian_stock&year=2026
```

**Authentication:** Required (JWT Bearer token + Admin role)

**Query Parameters:**

| Parameter  | Type   | Default      | Description              |
| ---------- | ------ | ------------ | ------------------------ |
| marketType | string | indian_stock | Market type filter       |
| year       | string | Current year | Year filter              |

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "market_type": "indian_stock",
      "holiday_date": "2026-01-26",
      "holiday_name": "Republic Day",
      "description": "National holiday",
      "closure_type": "FULL_DAY",
      "is_recurring": true,
      "recurring_pattern": "January 26",
      "is_active": true,
      "created_at": "2026-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "market_type": "indian_stock",
      "holiday_date": "2026-08-15",
      "holiday_name": "Independence Day",
      "description": "National holiday",
      "closure_type": "FULL_DAY",
      "is_recurring": true,
      "recurring_pattern": "August 15",
      "is_active": true,
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### 61. Get Market Holiday by ID (Admin)

```
GET /api/admin/market-holidays/:id
```

**Authentication:** Required (JWT Bearer token + Admin role)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "market_type": "indian_stock",
    "holiday_date": "2026-01-26",
    "holiday_name": "Republic Day",
    "description": "National holiday",
    "closure_type": "FULL_DAY",
    "custom_open_time": null,
    "custom_close_time": null,
    "is_recurring": true,
    "recurring_pattern": "January 26",
    "is_active": true,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  }
}
```

---

### 62. Create Market Holiday (Admin)

```
POST /api/admin/market-holidays
```

**Authentication:** Required (JWT Bearer token + Admin role)

**Request Body:**

```json
{
  "market_type": "indian_stock",
  "holiday_date": "2026-10-02",
  "holiday_name": "Gandhi Jayanti",
  "description": "National holiday",
  "closure_type": "FULL_DAY",
  "custom_open_time": null,
  "custom_close_time": null,
  "is_recurring": true,
  "recurring_pattern": "October 2"
}
```

**Closure Types:**

- `FULL_DAY` - Market closed entire day
- `MORNING` - Market closed in morning
- `EVENING` - Market closed in evening
- `PARTIAL` - Custom hours (specify custom_open_time and custom_close_time)

**Response (201):**

```json
{
  "success": true,
  "message": "Holiday created successfully",
  "data": {
    "id": 3,
    "market_type": "indian_stock",
    "holiday_date": "2026-10-02",
    "holiday_name": "Gandhi Jayanti",
    "closure_type": "FULL_DAY",
    "is_active": true,
    "created_at": "2026-05-07T14:30:00Z"
  }
}
```

---

### 63. Update Market Holiday (Admin)

```
PUT /api/admin/market-holidays/:id
```

**Authentication:** Required (JWT Bearer token + Admin role)

**Request Body:**

```json
{
  "holiday_date": "2026-10-02",
  "holiday_name": "Gandhi Jayanti (Updated)",
  "description": "National holiday - Non-trading day",
  "closure_type": "FULL_DAY",
  "is_recurring": true,
  "is_active": true
}
```

**Response (200):**

```json
{
  "success": true,
  "message": "Holiday updated successfully",
  "data": {
    "id": 3,
    "market_type": "indian_stock",
    "holiday_date": "2026-10-02",
    "holiday_name": "Gandhi Jayanti (Updated)",
    "is_active": true,
    "updated_at": "2026-05-07T14:30:00Z"
  }
}
```

---

### 64. Delete Market Holiday (Admin)

```
DELETE /api/admin/market-holidays/:id
```

**Authentication:** Required (JWT Bearer token + Admin role)

**Response (200):**

```json
{
  "success": true,
  "message": "Holiday deleted successfully"
}
```

---

### 65. Bulk Create Holidays (Admin)

```
POST /api/admin/market-holidays/bulk-create
```

**Authentication:** Required (JWT Bearer token + Admin role)

**Request Body:**

```json
{
  "market_type": "indian_stock",
  "holidays": [
    {
      "holiday_date": "2026-10-02",
      "holiday_name": "Gandhi Jayanti",
      "description": "National holiday",
      "closure_type": "FULL_DAY",
      "is_recurring": true,
      "recurring_pattern": "October 2"
    },
    {
      "holiday_date": "2026-11-14",
      "holiday_name": "Diwali",
      "description": "Festival of lights",
      "closure_type": "FULL_DAY",
      "is_recurring": false
    }
  ]
}
```

**Response (201):**

```json
{
  "success": true,
  "message": "2 holidays created successfully",
  "data": {
    "created": 2,
    "failed": 0,
    "holidays": [
      {"id": 4, "holiday_name": "Gandhi Jayanti"},
      {"id": 5, "holiday_name": "Diwali"}
    ]
  }
}
```

---

### 66. Check if Today is Holiday (Public)

```
GET /api/market-holidays/check/:marketType
```

**Authentication:** Not required

**Example:** `GET /api/market-holidays/check/indian_stock`

**Response (200) - When Today is Holiday:**

```json
{
  "success": true,
  "is_holiday": true,
  "market_type": "indian_stock",
  "today": "2026-01-26",
  "holiday": {
    "id": 1,
    "holiday_name": "Republic Day",
    "description": "National holiday",
    "closure_type": "FULL_DAY"
  },
  "message": "Market is closed today for Republic Day"
}
```

**Response (200) - When Today is Not Holiday:**

```json
{
  "success": true,
  "is_holiday": false,
  "market_type": "indian_stock",
  "today": "2026-05-07",
  "message": "Market is open today"
}
```

**cURL Example:**

```bash
curl http://localhost:8808/api/market-holidays/check/indian_stock
```

---

### 67. Get Public Holidays List

```
GET /api/market-holidays/:marketType?year=2026
```

**Authentication:** Not required

**Example:** `GET /api/market-holidays/indian_stock?year=2026`

**Response (200):**

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
```

**cURL Example:**

```bash
curl http://localhost:8808/api/market-holidays/indian_stock?year=2026
```

---

---

## 🔐 AUTHENTICATION APIs (5)

Complete authentication system with secure password reset functionality.

### 1. Login - Get JWT Token

```
POST /api/auth/login
```

**Rate Limit:** 10 requests/minute  
**Authentication:** Not required  
**Content-Type:** `application/json`

**Request Body:**

```json
{
  "email": "trader1@papertrading.local",
  "password": "Trader123!"
}
```

**Success Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 2,
    "name": "Aarav Patel",
    "email": "trader1@papertrading.local",
    "role": "trader"
  }
}
```

**Error Response (401):**

```json
{
  "message": "Invalid email or password"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:8808/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trader1@papertrading.local","password":"Trader123!"}'
```

---

### 2. Register - Create New Account

```
POST /api/auth/register
```

**Rate Limit:** 10 requests/minute  
**Authentication:** Not required

**Request Body:**

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "trader"
}
```

**Success Response (201):**

```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 3,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "trader"
  }
}
```

---

### 69. Forgot Password - Request Reset Link

```
POST /api/auth/forgot-password
```

**Rate Limit:** 5 requests/minute  
**Authentication:** Not required

Initiates the password reset process by sending a reset link to the user's email. For security, this endpoint always returns a success response to prevent email enumeration attacks.

**Request Body:**

```json
{
  "email": "trader1@papertrading.local"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password reset link has been sent to your email address."
}
```

**Development Mode Response (includes token for testing):**

```json
{
  "success": true,
  "message": "Password reset link has been sent to your email address.",
  "resetToken": "a1b2c3d4e5f6...",
  "note": "This token is only exposed in development mode. In production, it would be sent via email."
}
```

**Error Response (400) - Invalid Email:**

```json
{
  "success": false,
  "message": "Please provide a valid email address"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:8808/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"trader1@papertrading.local"}'
```

**Security Features:**

- ✅ Rate limited to prevent abuse
- ✅ Tokens expire after 1 hour
- ✅ Previous tokens are invalidated when new one is requested
- ✅ Tokens are SHA-256 hashed before storage
- ✅ Email enumeration protection (always returns success)
- ✅ Audit logging for all reset requests

---

### 70. Reset Password - Complete Password Reset

```
POST /api/auth/reset-password
```

**Rate Limit:** 5 requests/minute  
**Authentication:** Not required

Completes the password reset process using the token received via email.

**Request Body:**

```json
{
  "token": "a1b2c3d4e5f6...",
  "newPassword": "NewSecurePass123!"
}
```

**Password Requirements:**

- Minimum 8 characters
- Maximum 128 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

**Error Response (400) - Invalid/Expired Token:**

```json
{
  "success": false,
  "message": "Invalid or expired reset token."
}
```

**Error Response (400) - Already Used Token:**

```json
{
  "success": false,
  "message": "This reset token has already been used. Please request a new one."
}
```

**Error Response (400) - Weak Password:**

```json
{
  "success": false,
  "message": "Password must contain at least one uppercase letter"
}
```

**cURL Example:**

```bash
curl -X POST http://localhost:8808/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "a1b2c3d4e5f6...",
    "newPassword": "NewSecurePass123!"
  }'
```

---

### 71. Verify Reset Token - Check Token Validity

```
GET /api/auth/verify-reset-token/:token
```

**Rate Limit:** 10 requests/minute  
**Authentication:** Not required

Verifies if a reset token is valid before allowing the user to enter a new password. Useful for frontend validation on the password reset page.

**URL Parameters:**

| Parameter | Type   | Required | Description              |
| --------- | ------ | -------- | ------------------------ |
| token     | string | ✅       | The reset token to verify |

**Success Response (200) - Valid Token:**

```json
{
  "success": true,
  "valid": true,
  "email": "trader1@papertrading.local",
  "message": "Token is valid."
}
```

**Error Response (400) - Invalid Token:**

```json
{
  "success": false,
  "valid": false,
  "message": "Invalid reset token."
}
```

**Error Response (400) - Expired Token:**

```json
{
  "success": false,
  "valid": false,
  "message": "Reset token has expired."
}
```

**Error Response (400) - Used Token:**

```json
{
  "success": false,
  "valid": false,
  "message": "This reset token has already been used."
}
```

**cURL Example:**

```bash
curl http://localhost:8808/api/auth/verify-reset-token/a1b2c3d4e5f6...
```

---

## 🔄 PASSWORD RESET WORKFLOW

### Complete Flow Example

```bash
# Step 1: Request password reset
curl -X POST http://localhost:8808/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"trader1@papertrading.local"}'

# Response: { "success": true, "resetToken": "abc123..." }

# Step 2: Verify token (optional, for frontend validation)
curl http://localhost:8808/api/auth/verify-reset-token/abc123...

# Step 3: Reset password with token
curl -X POST http://localhost:8808/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123...",
    "newPassword": "NewSecurePass123!"
  }'

# Step 4: Login with new password
curl -X POST http://localhost:8808/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"trader1@papertrading.local","password":"NewSecurePass123!"}'
```

---

**Status:** ✅ All 71 endpoints tested and production ready  
**Last Updated:** May 7, 2026  
**Version:** 2.3

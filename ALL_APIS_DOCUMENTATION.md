# 🎯 Complete API Documentation (Crypto, Stocks, Forex, News, Admin)

**Backend URL:** `http://localhost:8808`  
**Version:** 2.1  
**Status:** ✅ Production Ready  
**Total Endpoints:** 47 ✨

---

## 📚 Table of Contents

1. [Quick Reference](#quick-reference-table-category-wise)
2. [Data Services](#data-services-integration)
3. [Detailed API Documentation](#detailed-api-documentation)

---

## 📊 QUICK REFERENCE TABLE (Category-wise)

### 🔐 Authentication (1)

| #   | Endpoint          | Method | Auth | Rate Limit | Purpose       |
| --- | ----------------- | ------ | ---- | ---------- | ------------- |
| 1   | `/api/auth/login` | POST   | ❌   | 10/min     | Get JWT token |

### 💹 Crypto APIs (16)

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

### � News APIs (8 - MarketAux)

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

### 🏥 Health Check (1)

| #   | Endpoint      | Method | Auth | Rate Limit | Purpose           |
| --- | ------------- | ------ | ---- | ---------- | ----------------- |
| 47  | `/api/health` | GET    | ❌   | -          | API health status |

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

**Status:** ✅ All 47 endpoints tested and production ready  
**Last Updated:** May 2, 2026  
**Version:** 2.1

# Paper Trading Backend

A Node.js and Express backend for paper trading, market data, and admin operations. The service exposes REST APIs for crypto, stocks, forex, Indian stock trading workflows, Upstox integration, news feeds, and operational controls.

## Overview

- Application entry point: `src/server.js`
- Express app setup: `src/app.js`
- API router: `src/routes/index.js`
- Database layer: `src/db/`
- Authentication and authorization: `src/middleware/auth.js`, `src/utils/jwt.js`
- Validation: Zod schemas in `src/modules/**`
- Realtime services: `src/services/socketio.service.js`, `src/services/websocket.service.js`

## Requirements

- Node.js 18 or newer
- MySQL-compatible database
- Redis recommended for caching and realtime coordination
- Valid environment configuration in `.env`

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and set the values for your environment.

Required variables:

- `JWT_SECRET`
- Database configuration via either `DATABASE_URL` or `DB_HOST`, `DB_USER`, and `DB_NAME`

Common variables:

- `PORT` defaults to `8808`
- `CLIENT_ORIGIN` defaults to `http://localhost:5173`
- `REDIS_URL`
- `JWT_EXPIRES_IN`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `TRADER_PASSWORD`
- `ALPHA_VANTAGE_API_KEY`
- `MARKETAUX_API_KEY`
- `UPSTOX_API_KEY`
- `UPSTOX_API_SECRET`
- `UPSTOX_REDIRECT_URI`

See `.env.example` for the full list.

## Run Locally

Initialize the database and start the API:

```bash
npm run db:init
npm run dev
```

Production start:

```bash
npm start
```

The API base URL is:

```text
http://localhost:8808/api
```

## API Conventions

- JSON is used for request and response bodies.
- Authentication uses JWT bearer tokens in the `Authorization` header.
- Most protected endpoints require `Authorization: Bearer <token>`.
- Admin endpoints require both authentication and the admin role.
- Rate limits are applied to login, trading, market data, and news endpoints.

## Authentication

### Register

`POST /api/auth/register`

Request body:

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "Password123!"
}
```

### Login

`POST /api/auth/login`

Request body:

```json
{
  "email": "john@example.com",
  "password": "Password123!"
}
```

### Forgot password

`POST /api/auth/forgot-password`

Request body:

```json
{
  "email": "john@example.com"
}
```

### Reset password

`POST /api/auth/reset-password`

Request body:

```json
{
  "token": "reset-token",
  "newPassword": "NewPassword123!"
}
```

### Verify reset token

`GET /api/auth/verify-reset-token/:token`

### Reset account

`POST /api/auth/reset-account` requires authentication.

### Upstox OAuth

- `GET /api/auth/upstox/login`
- `GET /api/auth/upstox/callback`
- `GET /api/auth/upstox/connected`

## Health

`GET /api/health`

Returns the current service health and cached status if available.

## Crypto API

### Public crypto market data

- `GET /api/crypto/prices`
- `GET /api/crypto/prices/:symbol`
- `GET /api/crypto/stats/:symbol`
- `GET /api/crypto/lot-size/:symbol`
- `GET /api/crypto/lot-sizes/all`
- `GET /api/crypto/lot-sizes/validate`
- `GET /api/crypto/lot-sizes/stats`
- `GET /api/crypto/stream/prices`
- `GET /api/crypto/stream/prices/:symbol`
- `GET /api/crypto/:symbol/historical`
- `GET /api/crypto/:symbol/chart`
- `GET /api/crypto/:symbol/indicators`
- `GET /api/crypto/top-3/famous`
- `GET /api/crypto/trending/top-10`
- `GET /api/crypto/trending/all`
- `GET /api/crypto/top-10/ranked`
- `GET /api/crypto/all/stats`

### Authenticated crypto trading

- `POST /api/crypto/buy`
- `POST /api/crypto/sell`
- `GET /api/crypto/portfolio`
- `GET /api/crypto/closed-positions`
- `GET /api/crypto/trades`

Sample trade body:

```json
{
  "symbol": "BTC",
  "quantity": 0.01,
  "price": 65000
}
```

### Crypto order management

These routes live under the nested crypto orders router and require authentication.

- `POST /api/crypto/orders/buy`
- `POST /api/crypto/orders/sell`
- `GET /api/crypto/orders`
- `POST /api/crypto/orders/:orderId/cancel`
- `GET /api/crypto/positions`
- `GET /api/crypto/positions/:positionId`
- `POST /api/crypto/positions/:positionId/close`
- `GET /api/crypto/positions/:positionId/liquidation-check`
- `GET /api/crypto/performance`
- `GET /api/crypto/trades`
- `GET /api/crypto/account/balance`
- `GET /api/crypto/orderbook/:symbol`

Sample order body:

```json
{
  "symbol": "BTCUSDT",
  "quantity": 1,
  "price": 65000,
  "leverage": 2,
  "tradingMode": "SPOT",
  "orderType": "LIMIT"
}
```

## Stocks and Forex

### US stocks

- `GET /api/stocks/us`
- `GET /api/stocks/us/:symbol`
- `GET /api/stocks/us/:symbol/daily`
- `GET /api/stocks/us/:symbol/sma`
- `GET /api/stocks/us/:symbol/rsi`

### Forex

- `GET /api/forex/pairs`
- `GET /api/forex/pairs/tested`
- `GET /api/forex/pairs/upcoming`
- `GET /api/forex/rate/:from/:to`
- `GET /api/forex/chart/:from/:to`

### Commodities

- `GET /api/commodities`

## Indian Stocks

### Market data

- `GET /api/stocks/in`
- `GET /api/stocks/in/top`
- `GET /api/stocks/in/batch`
- `GET /api/stocks/in/:symbol/intraday`
- `GET /api/stocks/in/:symbol/daily`
- `GET /api/stocks/in/:symbol`
- `GET /api/stocks/in/lot-size/:symbol`
- `GET /api/stocks/in/lot-sizes/all`
- `GET /api/stocks/in/lot-sizes/stats`
- `GET /api/stocks/in/lot-sizes/validate`
- `GET /api/stocks/in/instruments/equity`
- `GET /api/stocks/in/instruments/futures`
- `GET /api/stocks/in/instruments/options`

### Trading

All of the following require authentication:

- `POST /api/stocks/in/trade/buy`
- `POST /api/stocks/in/trade/sell`
- `GET /api/stocks/in/trade/orders`
- `POST /api/stocks/in/trade/orders/process`
- `PUT /api/stocks/in/trade/update`
- `GET /api/stocks/in/positions`
- `GET /api/stocks/in/positions/:positionId`
- `POST /api/stocks/in/positions/:positionId/exit`
- `GET /api/stocks/in/performance`

Sample Indian trade body:

```json
{
  "symbol": "RELIANCE",
  "quantity": 10,
  "entryPrice": 2850,
  "orderType": "MARKET",
  "timeFrame": "Intraday",
  "marginUsed": 5000,
  "charges": 12
}
```

## News

- `GET /api/news/latest`
- `GET /api/news/search`
- `GET /api/news/symbols`
- `GET /api/news/trending`
- `GET /api/news/date-range`
- `GET /api/news/crypto`
- `GET /api/news/stocks`
- `GET /api/news/advanced`

## TradingView and Options

- `GET /api/tv/search`
- `GET /api/tv/resolve`
- `GET /api/tv/history`
- `GET /api/options/chain`
- `GET /api/options/analytics`

## Utilities

- `GET /api/proxy-image?url=...`
- `POST /api/candles/aggregate`
- `GET /api/upstox/quote/:symbol`
- `GET /api/upstox/ohlc/:symbol`
- `GET /api/upstox/options/:symbol`
- `GET /api/upstox/token-status`
- `GET /api/debug/upstox/instruments`

Sample candle aggregation body:

```json
{
  "symbol": "BTCUSDT",
  "fromResolution": "1m",
  "toResolution": "5m",
  "fromTs": 1717000000,
  "toTs": 1717003600,
  "candles": [
    [1717000000, 65000, 65100, 64950, 65080, 12]
  ]
}
```

## Admin API

All admin routes require authentication and the admin role.

- `GET /api/admin/stats`
- `GET /api/admin/audit-logs`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `GET /api/admin/positions`
- `GET /api/admin/trades`
- `POST /api/admin/trades`
- `PATCH /api/admin/trades/:id/close`
- `GET /api/admin/market-hours`
- `GET /api/admin/market-hours/:marketType`
- `PUT /api/admin/market-hours/:id`
- `GET /api/admin/market-hours/:id/history`
- `GET /api/admin/market-holidays`
- `GET /api/admin/market-holidays/:id`
- `POST /api/admin/market-holidays`
- `PUT /api/admin/market-holidays/:id`
- `DELETE /api/admin/market-holidays/:id`
- `POST /api/admin/market-holidays/bulk-create`
- `GET /api/admin/upstox/token-status`

Sample admin user body:

```json
{
  "fullName": "Admin User",
  "email": "admin@example.com",
  "role": "admin",
  "balance": 250000,
  "password": "Admin123!"
}
```

## Postman Collection

A ready-to-import Postman collection is available at:

- `postman/PaperTrading-API.postman_collection.json`

Import it into Postman and set the collection variables:

- `base_url` to your API host, for example `http://localhost:8808`
- `auth_token` after logging in

## Testing Notes

- Login and trading endpoints are rate-limited.
- Some market data endpoints require external provider keys to return live data.
- Upstox routes require a valid OAuth setup and cached token state.
- If Redis is unavailable, the service continues with reduced caching behavior.

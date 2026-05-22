# Paper Trading — Backend Documentation

## Overview

This document describes the Paper Trading backend located in the `backend/` folder. The backend is a Node.js Express application providing:

- Public market data (crypto, US stocks, forex, Indian stocks)
- Trading APIs for crypto and Indian stock simulations
- Admin endpoints for management and audit
- Real-time feeds via WebSocket and Socket.IO
- Background polling services for market data and Upstox integration

Main entrypoint: `src/server.js` (starts DB init, polling services, websockets, and the HTTP server).

## Requirements

- Node 18+ (app uses ES modules)
- MySQL-compatible database (configured via `DATABASE_URL` or DB_HOST/DB_USER/DB_NAME)
- Redis (recommended, enabled via `REDIS_URL` but optional — code will continue if Redis is down)

## Install & Run

1. Install dependencies:

   npm install

2. Environment: copy `.env.example` → `.env` and set required variables (see Environment variables).

3. Init DB (creates tables + seeds admin/trader users):

   npm run db:init

4. Development server:

   npm run dev

5. Production start:

   npm start

## Important files (entry / config)

- `package.json` — scripts and dependencies
- `src/server.js` — boot logic: DB init, Redis check, start polling services, start HTTP server and sockets
- `src/app.js` — Express app, middleware, `/api` mount, error handler
- `src/config/env.js` — environment parsing/validation
- `src/db/*` — MySQL pool, Redis helper, DB init and schema SQL files

## Environment variables

Required at runtime (checked by `src/config/env.js`):

- `REDIS_URL` — Redis connection string (required; but cache disabled gracefully if unreachable)
- `JWT_SECRET` — Secret used for signing and verifying JWTs

Other configurable variables (defaults shown in code):

- `PORT` (8808)
- `DATABASE_URL` or `DB_HOST`, `DB_USER`, `DB_NAME`, `DB_PASSWORD`, `DB_PORT`
- `CLIENT_ORIGIN` — CORS origin
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `TRADER_PASSWORD` — seeded credentials
- `ALPHA_VANTAGE_API_KEY`, `MARKETAUX_API_KEY` — external data providers
- `UPSTOX_API_KEY`, `UPSTOX_API_SECRET`, `UPSTOX_REDIRECT_URI` — Upstox OAuth
- `ENABLE_FOREX_POLLING` — set to `false` to disable forex polling

Refer to `.env.example` for the canonical list.

## Database

- Schema files: `src/db/schema.sql`, `src/db/crypto-schema.sql`, `src/db/crypto-futures-migration.sql`.
- DB initialization: `src/db/init-db.js` runs SQL files and seeds admin/trader users. It is idempotent and skips existing objects.
- DB access: `src/db/mysql.js` exports `pool` and `sql(query, params)` — `sql` implements simple Postgres-style placeholder conversion and returns arrays with `rows`/`rowCount` compatibility.

## Caching

- Redis integration is in `src/db/redis.js` with `cacheGet`, `cacheSet`, `cacheDel` and `isCacheEnabled()`.
- The code disables caching automatically on Redis errors and continues operating without cache.

## Authentication & Authorization

- JWT-based auth implemented in `src/utils/jwt.js` (`signAdminToken` / `verifyToken`).
- `requireAuth` and `requireAdmin` middleware in `src/middleware/auth.js` enforce authentication and admin role.

## Audit Logging

- Writes to DB via `src/utils/audit-log.js` (table `audit_logs`) using `writeAuditLog({ actorUserId, action, targetType, targetId, details })`.
- Admin endpoints expose `GET /api/admin/audit-logs` to list logs (requires admin role).

## API Overview (high-level)

Base path: `/api`

- Auth:
  - `POST /api/auth/login` — login (rate-limited)
  - `POST /api/auth/register`
  - `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`
  - Upstox OAuth: `GET /api/auth/upstox/login`, `GET /api/auth/upstox/callback`, `GET /api/auth/upstox/connected`

- Crypto (public & authenticated):
  - Price endpoints: `GET /api/crypto/prices`, `GET /api/crypto/prices/:symbol`, `GET /api/crypto/:symbol/chart` etc.
  - Trading: `POST /api/crypto/buy`, `POST /api/crypto/sell` (requires auth)
  - Streaming: `GET /api/crypto/stream/prices` (server-sent websocket-style endpoints)

- Stocks & Forex:
  - US Stocks (Alpha Vantage): `GET /api/stocks/us`, `GET /api/stocks/us/:symbol` etc.
  - Forex: `GET /api/forex/pairs`, `GET /api/forex/rate/:from/:to`

- Indian Stocks (Upstox-backed + demo fallbacks):
  - Data: `GET /api/stocks/in`, `GET /api/stocks/in/:symbol`, intraday/daily endpoints
  - Trading (authenticated): `POST /api/stocks/in/trade/buy`, `POST /api/stocks/in/trade/sell`, `GET /api/stocks/in/positions`, `POST /api/stocks/in/positions/:id/exit`

- Admin:
  - `GET /api/admin/users`, `POST /api/admin/users` (create user), `GET /api/admin/audit-logs`, `GET /api/admin/stats` (all require admin)

For a full, detailed listing of every route, see `src/routes/index.js` and the module controllers under `src/modules/*`.

## Background services and realtime

- Crypto polling: `src/services/crypto-polling.service.js` — collects crypto prices at intervals.
- Forex polling: `src/services/forex-polling.service.js` — optional, controlled by `ENABLE_FOREX_POLLING`.
- Upstox polling: `src/services/upstox-polling.service.js` — refreshes market-related feeds and token management.
- WebSockets:
  - Legacy WebSocket server: `src/services/websocket.service.js` (ws)
  - Socket.IO server: `src/services/socketio.service.js` (scalable realtime feeds, supports Redis adapter)

## Third-party integrations

- Upstox: OAuth2 flows, market quotes, instrument assets (see `src/services/upstox.*`). The service has robust retry, caching and proactive token refresh behavior but stores tokens in Redis / memory — review token persistence for production.
- Alpha Vantage: US stocks & forex (API key via env)
- MarketAux: news API (API key via env)

## Security & Secrets

- Secrets must be provided via environment variables. The code contains fallback defaults for some keys (e.g., `UPSTOX_API_KEY` in `env.js`) — these defaults should be treated as placeholders and removed or replaced before production.
- Action items for handover: ensure `JWT_SECRET` and provider keys are stored in the target environment (secrets manager), rotate keys if needed.

## Testing & Debugging

- There are several small test scripts at repository root: `test_db_connection.js`, `test_fix.js`, `test_indian_stocks.js`.
- Postman testing guide: `POSTMAN_TESTING_GUIDE.md` and `API_TESTING_REPORT.md` in backend root.

## Handover checklist

- Provide production environment variables and secrets (DB, Redis, JWT, provider keys).
- Confirm DB backup and restore procedure for MySQL instance.
- Confirm Upstox OAuth client credentials and redirect URIs.
- Share any scheduled/cron jobs or Render/Docker deploy configs (`render.yaml`, `Dockerfile`, `docker-compose.yml`).
- Run `npm run db:init` on the target DB to create schema and seed admin/trader accounts.
- Verify Redis connectivity; if not used, set `REDIS_URL` to a reachable endpoint or document expected behavior.

## Where to start for the next developer

1. Read `src/server.js` and `src/app.js` to understand startup flow.
2. Review `src/routes/index.js` for API surface area and map controllers to functionality in `src/modules/*`.
3. Check `src/services/*` for background processes and integrations.
4. Run the app locally with `npm run dev`, then use Postman or the provided tests to verify critical endpoints.

---

Generated on: 2026-05-22

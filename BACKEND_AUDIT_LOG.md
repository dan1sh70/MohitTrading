# Backend Audit Log — Findings & Recommended Actions

Generated: 2026-05-22

This audit log lists important backend files, a short description of their purpose, immediate findings, and recommended next steps for handover.

Summary of critical findings:

- Secrets/default keys present in code or defaults (Upstox keys in `env.js`) — rotate and remove defaults.
- Redis is required (`REDIS_URL`) — app tolerates Redis failure but ensure production Redis availability or disable caching explicitly.
- No automated tests or CI seen in backend folder — add basic integration tests for auth, DB init, and key APIs.

Files reviewed (selection)

- `package.json`
  - Purpose: dependency list and run scripts.
  - Findings: `type: module`, `main: src/server.js`, start/dev/db:init scripts present.
  - Action: ensure Node version used by target environment supports ESM (Node 18+).

- `src/server.js`
  - Purpose: application startup, DB init, start polling services and websockets.
  - Findings: starts multiple background services unconditionally (crypto, upstox, forex conditional), schedules health monitor interval.
  - Risks: long-running timers / polling could interfere with graceful shutdown; no signal handlers for SIGTERM implemented.
  - Action: add graceful shutdown handlers to close DB pool, redis, and stop background timers when running in containers.

- `src/app.js`
  - Purpose: Express app wiring.
  - Findings: CORS configured permissively (origin '\*'), helmet enabled, global error handler logs errors.
  - Action: restrict `CLIENT_ORIGIN` in production and consider adding stricter CSP.

- `src/config/env.js`
  - Purpose: validate required env vars and provide defaults.
  - Findings: requires `REDIS_URL` and `JWT_SECRET`; contains hard-coded demo Upstox API defaults — potential secret leakage.
  - Action: remove sensitive defaults and fail fast with clear message if provider keys are missing.

- `src/db/mysql.js` and `src/db/init-db.js`
  - Purpose: DB pool and schema initialization.
  - Findings: `sql()` helper converts $n placeholders to `?` and handles `RETURNING` heuristically. `init-db` is idempotent and seeds admin user.
  - Risks: `multipleStatements: true` increases risk for SQL injection if untrusted input makes it into queries.
  - Action: keep using parameterized queries, consider disabling `multipleStatements` unless required.

- `src/db/redis.js`
  - Purpose: Redis client with safe-fail behaviour.
  - Findings: disables cache on error and disconnects. Good defensive behavior.
  - Action: add monitoring/metrics for Redis availability and latency.

- `src/utils/audit-log.js` and `src/modules/audit/audit.service.js`
  - Purpose: central audit logging to `audit_logs` table.
  - Findings: writes JSON serialized `details` column. Ensure `audit_logs` schema exists in `schema.sql`.
  - Action: verify index on `actor_user_id` and `created_at` for fast admin listing.

- `src/middleware/auth.js` and `src/utils/jwt.js`
  - Purpose: JWT verification, requireAuth/requireAdmin middlewares.
  - Findings: `verifyToken` uses `env.jwtSecret`. No token revocation mechanism.
  - Action: document token lifetime, consider revocation/blacklist strategy for compromised tokens.

- `src/services/upstox.*` (service, token manager, polling, market engine)
  - Purpose: Upstox integration — OAuth handling, token refresh, instrument fetch, market data.
  - Findings: proactive token refresh scheduling, Redis-backed token persistence, many fallbacks for instrument fetching.
  - Risks: tokens cached in-memory + Redis; ensure Redis is secured and only accessible by the app.
  - Action: validate storage policy for refresh tokens and consider encryption at rest in Redis or DB.

- `src/services/*` (matching-engine, trade-execution, pnl-liquidation, etc.)
  - Purpose: trading logic and market simulations.
  - Findings: complex services implementing matching engine and P&L. These must be carefully tested before production handover.
  - Action: add unit/integration tests for trade flows and edge cases (concurrent matching, partial fills, rounding).

Other observations

- Logging is console-based (`console.log`, `console.error`) — for production, integrate structured logging and central log aggregation.
- Rate limiting is configured in `src/routes/index.js` per-route using `express-rate-limit` — review limits for production traffic and IP trust settings.
- Image proxy endpoint (`/api/proxy-image`) fetches arbitrary URLs — this can be abused. Consider whitelist or content-size limits.

Recommended immediate tasks for handover

1. Remove placeholder API keys in code and add instruction to populate real secrets in the environment.
2. Add graceful shutdown logic in `src/server.js` to stop timers, close DB pool and Redis cleanly.
3. Add basic smoke tests (auth login, DB init, one crypto price, one upstox route) and CI pipeline.
4. Secure Redis and DB endpoints; ensure FIREWALL/ACL rules exist for production.
5. Add monitoring/alerts for background polling failures and token refresh failures.
6. Review `/api/proxy-image` and restrict for safety.

Questions for the original maintainer (to pass to new developer)

- Are there any undocumented environment values or secrets stored externally? (e.g., Render, Docker secrets)
- Are scheduled jobs (if any) managed externally or by `server.js` process?
- Are there expectations for uptime/SLAs for the polling services?

Appendix: quick file checklist

- DB schema: `src/db/schema.sql`, `src/db/crypto-schema.sql`, `src/db/crypto-futures-migration.sql`
- Entrypoints: `src/server.js`, `src/app.js`
- Routes: `src/routes/index.js` (controller mapping)
- Auth: `src/modules/auth/*`, `src/utils/jwt.js`, `src/middleware/auth.js`
- Upstox: `src/services/upstox.service.js`, `src/services/upstox-token-manager.js`, `src/services/upstox-polling.service.js`, `src/services/upstox-market-engine.js`
- Realtime: `src/services/websocket.service.js`, `src/services/socketio.service.js`
- Audit: `src/utils/audit-log.js`, `src/modules/audit/*`

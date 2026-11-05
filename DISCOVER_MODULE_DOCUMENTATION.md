# Stock Market Discover Module - Backend Implementation & Progress Report

## 1. Executive Summary
The backend for the **Discover Module** of the Paper Trading platform has been designed, implemented, and fully tested in accordance with the specifications in the master prompt.

It introduces a dedicated, modular folder at `src/modules/discover/` adhering to the application's native ES Module architecture, MySQL database, Redis caching strategy, and Socket.IO real-time broadcast engine.

---

## 2. Five Delivered Modules & REST Endpoints

### Module 1: Option Chain
Manages multi-strike, multi-expiry option chains with Greek estimations, intrinsic/time values, and advanced sentiment analytics.
- `GET /api/v1/discover/option-chain/symbols` - List derivative underlyings (NIFTY, BANKNIFTY, FINNIFTY, RELIANCE, TCS, etc.) with strike intervals and lot sizes.
- `GET /api/v1/discover/option-chain/:symbol` - Full option chain with Call/Put LTP, price changes, OI, change in OI, volume, bid/ask quantities, and moneyness (ITM/ATM/OTM).
- `GET /api/v1/discover/option-chain/:symbol/expiries` - Available weekly and monthly expiry dates.
- `GET /api/v1/discover/option-chain/:symbol/contracts` - Flattened list of option contracts for search/selection.
- `GET /api/v1/discover/option-chain/:symbol/analytics` - Put-Call Ratio (PCR), Max Pain, ATM strike, top Call/Put OI strikes, and strike-by-strike OI buildup interpretations (Long Buildup, Short Covering, etc.).
- `GET /api/v1/discover/option-chain/:symbol/history` - Historical analytics snapshots.

### Module 2: Top Gainers / Losers
Dynamic market scanner evaluating stock movements across exchanges, sectors, and cap categories.
- `GET /api/v1/discover/gainers` - Ranked positive movers with configurable limits (`limit=5, 10, 20, 50`) and index/sector filters.
- `GET /api/v1/discover/losers` - Ranked negative movers.
- `GET /api/v1/discover/gainers/filters` - Available filter options (Exchanges, Indices, Sectors, Caps, Limits).
- `GET /api/v1/discover/losers/filters` - Filter parameters for losers.
- `GET /api/v1/discover/market-movers` - Combined dataset with gainers, losers, and universe statistics.

### Module 3: FII / DII Institutional Data
Institutional activity tracker pulling official daily and historical trading flows.
- `GET /api/v1/discover/fii-dii` - Summary of latest institutional trading and rolling sentiment.
- `GET /api/v1/discover/fii-dii/daily` - Single-day breakdown for FII and DII (Gross Buy, Gross Sell, Net Investment).
- `GET /api/v1/discover/fii-dii/monthly` - Monthly aggregated investments and active trading day counts.
- `GET /api/v1/discover/fii-dii/history` - Historical time series with date range filtering.
- `GET /api/v1/discover/fii-dii/analytics` - Consecutive buying/selling day streaks, 5-day rolling net totals, and institutional sentiment.

### Module 4: Global Indices
Monitors domestic and international benchmarks across timezones and trading hours.
- `GET /api/v1/discover/global-indices` - Comprehensive list of Indian and international indices.
- `GET /api/v1/discover/global-indices/india` - Domestic indices: NIFTY 50, BANK NIFTY, FIN SERVICES, NIFTY IT, NIFTY MIDCAP 50, SENSEX, BANKEX.
- `GET /api/v1/discover/global-indices/international` - Global indices: NASDAQ Composite, NASDAQ 100, S&P 500, Dow Jones, FTSE 100, DAX, Nikkei 225, Hang Seng, Shanghai Composite, CAC 40.
- `GET /api/v1/discover/global-indices/:symbol` - Detailed quote and status for a single index.
- `GET /api/v1/discover/global-indices/:symbol/history` - OHLCV historical candle series with custom intervals and ranges.

### Module 5: Market Heatmap
Sectoral and index heatmap visualization engine with market breadth analysis.
- `GET /api/v1/discover/heatmap` - Universal heatmap endpoint with index categories (`NIFTY_50`, `NIFTY_100`, `NIFTY_500`, `BANK_NIFTY`).
- `GET /api/v1/discover/heatmap/nifty-50` - NIFTY 50 heatmap with color intensities.
- `GET /api/v1/discover/heatmap/nifty-100` - NIFTY 100 heatmap.
- `GET /api/v1/discover/heatmap/nifty-500` - NIFTY 500 heatmap.
- `GET /api/v1/discover/heatmap/bank-nifty` - Banking sector heatmap.
- `GET /api/v1/discover/heatmap/sectors` - Sector-wise grouped performance and market capitalization weights.
- `GET /api/v1/discover/heatmap/market-breadth` - Advance/Decline counts and ratio.

---

## 3. Standard API Response Structure
All 28 endpoints strictly conform to the master prompt's response envelope:
```json
{
  "success": true,
  "message": "Market data retrieved successfully",
  "data": { ... },
  "meta": {
    "source": "YAHOO_FINANCE",
    "timestamp": "2026-11-05T07:24:29.123Z",
    "data_status": "live",
    "is_delayed": false
  }
}
```

---

## 4. Database Migrations & Schemas
Stored in `src/db/discover-schema.sql` and auto-migrated during server startup:
1. `market_data_providers`: Provider registry, active status, priority, and health tracking.
2. `provider_sync_logs`: Audit trail for provider synchronization jobs.
3. `market_indices`: Global and domestic market indices with timezone and market status tracking.
4. `market_indices_history`: OHLCV index snapshots.
5. `discover_option_expiries`: Tracked expiries by symbol.
6. `discover_option_snapshots`: Option contract price and OI snapshots.
7. `discover_option_analytics`: Historical PCR, Max Pain, and sentiment metrics.
8. `fii_dii_records`: Institutional gross buy, gross sell, and net values with unique `(reporting_date, category, market_type)` constraint.
9. `heatmap_snapshots`: Point-in-time stock intensity and percentage movements.
10. `market_breadth_snapshots`: Advance/Decline records.

---

## 5. Automated Verification Results
Test runner script: `scripts/test-discover-suite.js`
- **Total Endpoints Tested:** 28
- **Passed:** 28 (100%)
- **Failed:** 0
- **Postman Collection:** `postman/Discover_Module_APIs.postman_collection.json`

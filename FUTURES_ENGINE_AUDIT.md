# Futures Trading Engine - Deep Audit & Implementation Report

**Date:** May 14, 2026  
**Status:** 🔴 GAPS IDENTIFIED - IMPLEMENTING FIXES  
**Standard:** Delta Exchange / Binance Futures Compatible

---

## Executive Summary

| Feature                        | Status | Grade | Notes                                       |
| ------------------------------ | ------ | ----- | ------------------------------------------- |
| True Short Selling             | ✅     | A     | LONG/SHORT positions tracked separately     |
| SELL without owning asset      | ✅     | A     | Works in FUTURES mode                       |
| LONG/SHORT separation          | ✅     | A     | Stored as separate position rows            |
| Margin-only validation         | ⚠️     | C     | Basic implementation, no isolated/cross     |
| Liquidation (5% threshold)     | ✅     | A     | Auto-liquidation implemented                |
| Mark Price                     | ❌     | F     | **CRITICAL: Using last price only**         |
| Funding Fee Engine             | ❌     | F     | **CRITICAL: Schema field unused**           |
| Stop Loss/Take Profit Triggers | ⚠️     | D     | Schema fields exist, NO trigger engine      |
| Isolated vs Cross Margin       | ❌     | F     | **CRITICAL: Cross-only, no mode selection** |
| Reduce-Only Orders             | ❌     | F     | **CRITICAL: Not implemented**               |
| Hedge Mode                     | ❌     | F     | **CRITICAL: One-way mode only**             |
| Maker/Taker Fees               | ❌     | F     | **MISSING: No fee distinction**             |
| Partial Position Closing       | ✅     | A     | Order fills tracked correctly               |

---

## 🔴 CRITICAL GAPS FOUND

### 1. Mark Price Missing

**Current State:** Uses last executed trade price only

```javascript
// pnl-liquidation.service.js - WRONG
const unrealisedPnL = (currentPrice - entry_price) * quantity * leverage;
// currentPrice is last trade price, NOT mark price
```

**Problem:**

- Liquidations can be manipulated with pump/dump attacks
- Mark price = (MAX(bid) + MIN(ask)) / 2 or index-based
- Binance uses: Fair Price Mark = (Impact Bid Price + Impact Ask Price) / 2

**Implementation Needed:** Mark price calculation from orderbook depth

### 2. Funding Fee Engine Completely Missing

**Current State:** Schema has `funding_paid` field but it's NEVER calculated or charged

```sql
-- Schema field exists but never used:
funding_paid DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'Cumulative funding costs paid',
```

**Missing Logic:**

- Funding Rate calculation (% based on market imbalance)
- 8-hour settlement (Binance standard)
- Automatic deduction from balance every 8 hours
- Funding rate query endpoint for users

**Example (Binance Standard):**

```
Funding Rate = 0.01% per 8 hours
If holding 1 BTC SHORT position, owe: 1 BTC × 0.01% = 0.0001 BTC per 8 hours
```

### 3. Liquidation Uses Wrong Price

**Current Code:**

```javascript
// Using last trade price for liquidation
const shouldLiquidate = marginRatio < LIQUIDATION_THRESHOLD; // marginRatio calculated with current_price
```

**Problem:** Should use MARK PRICE, not last trade price!

### 4. Stop Loss / Take Profit Fields Unused

**Current State:** Fields exist in schema but NO trigger logic

```sql
take_profit DECIMAL(18, 8) NULL COMMENT 'Target exit price',
stop_loss DECIMAL(18, 8) NULL COMMENT 'Stop loss level',
```

**Missing:** Background job that checks these every 100ms

### 5. No Isolated vs Cross Margin

**Current Model:** All positions share one balance pool (cross margin only)

**Missing:**

- Per-position margin mode selection
- Isolated mode = separate margin per position
- Cross mode = shared margin pool (current behavior)
- Schema needs: `margin_mode ENUM('ISOLATED', 'CROSS')`

**Impact:**

- Can't offer isolated mode trading
- Users at disadvantage vs Binance/Delta

### 6. No Reduce-Only Orders

**Problem:** Orders can increase position indefinitely

**Example Bug:**

```
User has: 1 BTC LONG
Places: BUY order for 10 BTC
Result: Position increases to 11 BTC (WRONG in futures!)
Should: Only be able to close first 1 BTC
```

**Missing:** `reduce_only BOOLEAN` flag on orders

### 7. Hedge Mode Not Implemented

**Current Model:** One-way mode only

- One LONG OR one SHORT per symbol
- Can't have both simultaneously

**Required for Binance/Delta compatibility:**

- Toggle `hedge_mode` per user
- Allow LONG + SHORT for same symbol simultaneously
- Track position aggregation differently

**Example:**

```
Hedge Mode OFF (One-way):
  BTCUSDT position: 1 BTC LONG (qty=1)
  New SELL order: 0.5 BTC
  Result: Position becomes 0.5 BTC LONG (partial close)

Hedge Mode ON (Two-way):
  BTCUSDT position: 1 BTC LONG (qty=1) + 1 BTC SHORT (qty=1)
  Can exist simultaneously!
  Independent P&L per side
```

### 8. Maker/Taker Fee Structure Missing

**No distinction between:**

- Maker fee (adds liquidity): -0.02%
- Taker fee (takes liquidity): 0.04%

**Current:** No fees calculated at all

---

## 📊 Implementation Plan

### Phase 1: Mark Price Engine (URGENT)

**Files to create:**

- `mark-price.service.js` - Calculate mark price from orderbook
- Update `pnl-liquidation.service.js` - Use mark price for calculations
- Add Redis cache for mark prices (update every 500ms)

### Phase 2: Funding Fee Engine (URGENT)

**Files to create:**

- `funding-fee.service.js` - Calculate & charge funding fees
- `funding-rate.service.js` - Determine funding rate from market
- Background job to settle funding every 8 hours

### Phase 3: Margin Mode & Isolated Margin

**Updates:**

- Add `margin_mode` column to `crypto_positions`
- Create isolated margin balance tracking
- Update position closure logic

### Phase 4: Stop Loss / Take Profit Engine

**Files to create:**

- `trigger-engine.service.js` - Background job checking triggers
- Add trigger type tracking in `crypto_orders`

### Phase 5: Hedge Mode

**Updates:**

- Add `hedge_mode` column to users table
- Add `position_mode` to positions (ONE_WAY vs HEDGE)
- Update matching engine for hedge mode

### Phase 6: Reduce-Only & Advanced Orders

**Updates:**

- Add `reduce_only` flag to `crypto_orders`
- Update position increase validation

### Phase 7: Maker/Taker Fees

**Updates:**

- Add `maker_fee_rate`, `taker_fee_rate` config
- Track which orders were maker vs taker
- Deduct fees from user balance

---

## 🏗️ Schema Changes Required

```sql
-- Add to crypto_positions
ALTER TABLE crypto_positions ADD COLUMN margin_mode ENUM('ISOLATED', 'CROSS') NOT NULL DEFAULT 'CROSS';
ALTER TABLE crypto_positions ADD COLUMN isolated_margin DECIMAL(18, 8) DEFAULT 0;
ALTER TABLE crypto_positions ADD COLUMN mark_price DECIMAL(18, 8) NOT NULL DEFAULT 0;
ALTER TABLE crypto_positions ADD COLUMN funding_rate DECIMAL(8, 6) NOT NULL DEFAULT 0;
ALTER TABLE crypto_positions ADD COLUMN next_funding_time DATETIME NULL;

-- Add to crypto_orders
ALTER TABLE crypto_orders ADD COLUMN reduce_only BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE crypto_orders ADD COLUMN is_maker BOOLEAN DEFAULT NULL;
ALTER TABLE crypto_orders ADD COLUMN fee_rate DECIMAL(8, 6) NOT NULL DEFAULT 0;

-- Add to users
ALTER TABLE users ADD COLUMN hedge_mode BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN isolated_margin_total DECIMAL(18, 8) NOT NULL DEFAULT 0;

-- New table for funding rates
CREATE TABLE crypto_funding_rates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    funding_rate DECIMAL(8, 6) NOT NULL,
    mark_price DECIMAL(18, 8) NOT NULL,
    long_positions INT NOT NULL DEFAULT 0,
    short_positions INT NOT NULL DEFAULT 0,
    next_settlement_time DATETIME NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_symbol_time (symbol, recorded_at)
);

-- Table for funding payments
CREATE TABLE crypto_funding_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    position_id INT NOT NULL,
    funding_amount DECIMAL(18, 8) NOT NULL,
    funding_rate DECIMAL(8, 6) NOT NULL,
    settlement_time DATETIME NOT NULL,
    CONSTRAINT fk_funding_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_funding_position FOREIGN KEY (position_id) REFERENCES crypto_positions(id),
    INDEX idx_user_time (user_id, settlement_time)
);
```

---

## Code Changes Summary

### Before (Current - INCOMPLETE)

```javascript
// Using last price for liquidation - WRONG!
export async function checkLiquidation(positionId, currentPrice) {
  const unrealisedPnL = calculateUnrealisedPnL(
    position.entry_price,
    currentPrice, // ❌ This is last trade price, not mark price!
    position.quantity,
    position.leverage,
    position.side,
  );
}

// No funding fees charged
// No stop loss/take profit triggers
// No reduce-only validation
// No hedge mode support
```

### After (Production-Grade)

```javascript
// Using MARK price for liquidation - CORRECT!
export async function checkLiquidation(positionId) {
  const markPrice = await getMarkPrice(position.symbol); // ✅ From mark-price service
  const unrealisedPnL = calculateUnrealisedPnL(
    position.entry_price,
    markPrice, // ✅ Using fair mark price
    position.quantity,
    position.leverage,
    position.side,
  );
}

// Funding fees charged every 8 hours
// Stop loss/take profit checked every 100ms
// Reduce-only orders validated
// Hedge mode with dual positions supported
// Isolated margin tracked per position
// Maker/taker fees distinguished
```

---

## Testing Checklist

- [ ] Mark price updates correctly every 500ms
- [ ] Liquidation uses mark price (not last price)
- [ ] Funding fees settle every 8 hours
- [ ] Stop loss trigger executes at correct price
- [ ] Take profit trigger executes at correct price
- [ ] Reduce-only BUY order only closes SHORT (not opens LONG)
- [ ] Isolated margin doesn't affect other positions
- [ ] Hedge mode allows LONG + SHORT simultaneously
- [ ] Maker fee (0.02%) charged on limit orders
- [ ] Taker fee (0.04%) charged on market orders
- [ ] Position P&L includes all funding costs

---

## Binance/Delta Compatibility Matrix

| Feature           | Binance         | Delta         | Current        | Status    |
| ----------------- | --------------- | ------------- | -------------- | --------- |
| Mark Price        | ✅ Impact Price | ✅ Similar    | ❌ Last Price  | ⚠️ FIXING |
| Funding Fees      | ✅ 8-hour       | ✅ 8-hour     | ❌ None        | ⚠️ ADDING |
| Liquidation Price | ✅ Mark-based   | ✅ Mark-based | ❌ Last-based  | ⚠️ FIXING |
| Reduce-Only       | ✅ Flag         | ✅ Flag       | ❌ Missing     | ⚠️ ADDING |
| Hedge Mode        | ✅ Yes          | ✅ Yes        | ❌ No          | ⚠️ ADDING |
| Isolated Margin   | ✅ Yes          | ✅ Yes        | ❌ No          | ⚠️ ADDING |
| Stop Loss         | ✅ Trigger      | ✅ Trigger    | ⚠️ Fields only | ⚠️ FIXING |

---

## Next Steps

✅ **This document identifies all gaps**  
⏳ **Implementing services in priority order**  
⏳ **Adding schema migrations**  
⏳ **Updating trade execution logic**  
⏳ **Adding background jobs for triggers & funding**

---

**Priority:** CRITICAL - These gaps prevent proper futures trading
**Impact:** High - Affects liquidation accuracy, funding fairness, and platform reliability

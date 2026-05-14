-- ═════════════════════════════════════════════════════════════════════════════
-- CRYPTO FUTURES TRADING - SCHEMA MIGRATION
-- ═════════════════════════════════════════════════════════════════════════════
-- Adds production-grade futures features:
-- - Mark price tracking
-- - Funding fee support
-- - Stop loss / take profit triggers
-- - Isolated vs Cross margin modes
-- - Hedge mode support
-- - Maker/Taker fees
-- - Reduce-only orders

-- Run this migration after crypto-schema.sql

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 1: POSITIONS TABLE ENHANCEMENTS
-- ═════════════════════════════════════════════════════════════════════════════

-- Add margin mode support
ALTER TABLE crypto_positions
ADD COLUMN IF NOT EXISTS margin_mode ENUM('ISOLATED', 'CROSS') NOT NULL DEFAULT 'CROSS' COMMENT 'Margin mode: isolated (per-position) or cross (shared)';

-- Add isolated margin tracking
ALTER TABLE crypto_positions
ADD COLUMN IF NOT EXISTS isolated_margin DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'Isolated margin amount for this position';

-- Add mark price tracking
ALTER TABLE crypto_positions
ADD COLUMN IF NOT EXISTS mark_price DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'Fair mark price (used for liquidation, not last trade price)';

-- Add funding rate info
ALTER TABLE crypto_positions
ADD COLUMN IF NOT EXISTS funding_rate DECIMAL(8, 6) NOT NULL DEFAULT 0 COMMENT 'Current funding rate for this position (% per 8h)';

-- Add next funding settlement time
ALTER TABLE crypto_positions
ADD COLUMN IF NOT EXISTS next_funding_time DATETIME NULL COMMENT 'Next funding settlement time';

-- Add position mode (for hedge mode tracking)
ALTER TABLE crypto_positions
ADD COLUMN IF NOT EXISTS position_mode ENUM('ONE_WAY', 'HEDGE') NOT NULL DEFAULT 'ONE_WAY' COMMENT 'Position mode (one-way or hedge)';

-- Add exit_price column (was missing!)
ALTER TABLE crypto_positions
ADD COLUMN IF NOT EXISTS exit_price DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'Exit price when position closed';

-- Create index for finding positions that need liquidation check
CREATE INDEX IF NOT EXISTS idx_crypto_pos_margin_ratio ON crypto_positions (user_id, margin_ratio, status);

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 2: ORDERS TABLE ENHANCEMENTS
-- ═════════════════════════════════════════════════════════════════════════════

-- Add reduce-only flag
ALTER TABLE crypto_orders
ADD COLUMN IF NOT EXISTS reduce_only BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'If true, order only reduces position, never increases';

-- Add maker/taker indicator
ALTER TABLE crypto_orders
ADD COLUMN IF NOT EXISTS is_maker BOOLEAN DEFAULT NULL COMMENT 'NULL=unknown, TRUE=maker (added liquidity), FALSE=taker (removed liquidity)';

-- Add fee rate for this specific order
ALTER TABLE crypto_orders
ADD COLUMN IF NOT EXISTS fee_rate DECIMAL(8, 6) NOT NULL DEFAULT 0.0004 COMMENT 'Taker fee rate (maker fee lower)';

-- Add exchange order ID (for API connections)
ALTER TABLE crypto_orders
ADD COLUMN IF NOT EXISTS exchange_order_id VARCHAR(100) NULL COMMENT 'External exchange order ID';

-- Create index for reduce-only orders
CREATE INDEX IF NOT EXISTS idx_crypto_order_reduce_only ON crypto_orders (user_id, reduce_only, status);

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 3: USERS TABLE ENHANCEMENTS
-- ═════════════════════════════════════════════════════════════════════════════

-- Add hedge mode toggle
ALTER TABLE users
ADD COLUMN IF NOT EXISTS hedge_mode BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Can have LONG and SHORT simultaneously for same symbol';

-- Add isolated margin total tracking
ALTER TABLE users
ADD COLUMN IF NOT EXISTS isolated_margin_total DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'Total isolated margin locked across positions';

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 4: NEW TABLES FOR ADVANCED FEATURES
-- ═════════════════════════════════════════════════════════════════════════════

-- Mark Price History Table
CREATE TABLE IF NOT EXISTS mark_price_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    mark_price DECIMAL(18, 8) NOT NULL,
    bid_price DECIMAL(18, 8) NOT NULL DEFAULT 0,
    ask_price DECIMAL(18, 8) NOT NULL DEFAULT 0,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mark_history_symbol FOREIGN KEY (symbol) REFERENCES crypto_orders (symbol),
    INDEX idx_mark_history_symbol_time (symbol, recorded_at),
    INDEX idx_mark_history_time (recorded_at)
) COMMENT = 'Historical mark prices for analytics';

-- Funding Rates Table
CREATE TABLE IF NOT EXISTS crypto_funding_rates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    funding_rate DECIMAL(8, 6) NOT NULL COMMENT 'Rate per 8-hour period',
    mark_price DECIMAL(18, 8) NOT NULL,
    long_positions INT NOT NULL DEFAULT 0,
    short_positions INT NOT NULL DEFAULT 0,
    long_quantity DECIMAL(18, 8) NOT NULL DEFAULT 0,
    short_quantity DECIMAL(18, 8) NOT NULL DEFAULT 0,
    next_settlement_time DATETIME NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_funding_symbol_time (symbol, recorded_at),
    INDEX idx_funding_settlement (next_settlement_time)
) COMMENT = 'Funding rates history for perpetual futures';

-- Funding Payments Table
CREATE TABLE IF NOT EXISTS crypto_funding_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    position_id INT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side ENUM('LONG', 'SHORT') NOT NULL,
    funding_amount DECIMAL(18, 8) NOT NULL COMMENT 'Positive=paid, Negative=received',
    funding_rate DECIMAL(8, 6) NOT NULL,
    quantity DECIMAL(18, 8) NOT NULL,
    settlement_time DATETIME NOT NULL,
    paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_funding_payment_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_funding_payment_position FOREIGN KEY (position_id) REFERENCES crypto_positions (id) ON DELETE CASCADE,
    INDEX idx_funding_payment_user (user_id),
    INDEX idx_funding_payment_user_time (user_id, paid_at),
    INDEX idx_funding_payment_position (position_id),
    INDEX idx_funding_payment_settlement (settlement_time)
) COMMENT = 'Funding fee payments for positions';

-- Trigger Events Table
CREATE TABLE IF NOT EXISTS trigger_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    position_id INT NOT NULL,
    user_id INT NOT NULL,
    trigger_type ENUM('TAKE_PROFIT', 'STOP_LOSS') NOT NULL,
    trigger_price DECIMAL(18, 8) NOT NULL,
    execution_price DECIMAL(18, 8) NOT NULL,
    pnl DECIMAL(18, 8) NOT NULL,
    executed_at DATETIME NOT NULL,
    CONSTRAINT fk_trigger_position FOREIGN KEY (position_id) REFERENCES crypto_positions (id) ON DELETE CASCADE,
    CONSTRAINT fk_trigger_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_trigger_user (user_id),
    INDEX idx_trigger_position (position_id),
    INDEX idx_trigger_executed (executed_at)
) COMMENT = 'History of triggered stop loss and take profit orders';

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 5: FEE CONFIGURATION TABLE
-- ═════════════════════════════════════════════════════════════════════════════

-- Fee Configuration
CREATE TABLE IF NOT EXISTS crypto_fee_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    maker_fee_rate DECIMAL(8, 6) NOT NULL DEFAULT 0.0002 COMMENT '-0.02%',
    taker_fee_rate DECIMAL(8, 6) NOT NULL DEFAULT 0.0004 COMMENT '0.04%',
    funding_rate_base DECIMAL(8, 6) NOT NULL DEFAULT 0.00001 COMMENT 'Base funding rate',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_fee_symbol FOREIGN KEY (symbol) REFERENCES crypto_orders (symbol),
    UNIQUE INDEX idx_fee_symbol (symbol)
) COMMENT = 'Fee rates and funding configuration per symbol';

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 6: POSITION MODE TRACKING
-- ═════════════════════════════════════════════════════════════════════════════

-- Add column to track position mode at creation time
ALTER TABLE crypto_trades
ADD COLUMN IF NOT EXISTS position_mode ENUM('ONE_WAY', 'HEDGE') NOT NULL DEFAULT 'ONE_WAY' COMMENT 'Mode at time of trade';

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 7: INDEXES FOR PERFORMANCE
-- ═════════════════════════════════════════════════════════════════════════════

-- Indexes for finding positions that need processing
CREATE INDEX IF NOT EXISTS idx_crypto_pos_active_futures ON crypto_positions (symbol, status, trading_mode);

CREATE INDEX IF NOT EXISTS idx_crypto_pos_isolated ON crypto_positions (user_id, margin_mode, status);

CREATE INDEX IF NOT EXISTS idx_crypto_pos_triggers ON crypto_positions (
    status,
    take_profit,
    stop_loss
);

-- Indexes for funding settlement
CREATE INDEX IF NOT EXISTS idx_funding_settlement_needed ON crypto_funding_rates (next_settlement_time, symbol);

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 8: DEFAULT CONFIGURATIONS
-- ═════════════════════════════════════════════════════════════════════════════

-- Insert default fee configs for supported symbols
INSERT IGNORE INTO
    crypto_fee_config (
        symbol,
        maker_fee_rate,
        taker_fee_rate,
        funding_rate_base
    )
VALUES (
        'BTCUSDT',
        0.0002,
        0.0004,
        0.00001
    ),
    (
        'ETHUSDT',
        0.0002,
        0.0004,
        0.00001
    ),
    (
        'BNBUSDT',
        0.0002,
        0.0004,
        0.00001
    ),
    (
        'SOLUSDT',
        0.0002,
        0.0004,
        0.00001
    ),
    (
        'XRPUSDT',
        0.0002,
        0.0004,
        0.00001
    ),
    (
        'TRXUSDT',
        0.0002,
        0.0004,
        0.00001
    ),
    (
        'ADAUSDT',
        0.0002,
        0.0004,
        0.00001
    ),
    (
        'DOGEUSDT',
        0.0002,
        0.0004,
        0.00001
    ),
    (
        'LTCUSDT',
        0.0002,
        0.0004,
        0.00001
    ),
    (
        'MATICUSDT',
        0.0002,
        0.0004,
        0.00001
    );

-- ═════════════════════════════════════════════════════════════════════════════
-- SECTION 9: VIEWS FOR ANALYTICS
-- ═════════════════════════════════════════════════════════════════════════════

-- View for current position P&L with all factors
CREATE OR REPLACE VIEW v_position_pnl_with_funding AS
SELECT
    p.id,
    p.user_id,
    p.symbol,
    p.side,
    p.quantity,
    p.entry_price,
    p.mark_price as current_price,
    CASE
        WHEN p.side = 'LONG' THEN (p.mark_price - p.entry_price) * p.quantity * p.leverage
        WHEN p.side = 'SHORT' THEN (p.entry_price - p.mark_price) * p.quantity * p.leverage
    END as unrealised_pnl,
    p.funding_paid,
    p.margin_used,
    p.liquidation_price,
    p.margin_ratio,
    p.take_profit,
    p.stop_loss,
    p.status,
    CASE
        WHEN p.margin_ratio < 5 THEN 'LIQUIDATION_RISK'
        WHEN p.margin_ratio < 15 THEN 'DANGER'
        WHEN p.margin_ratio < 30 THEN 'WARNING'
        ELSE 'SAFE'
    END as risk_level
FROM crypto_positions p;

-- View for funding statistics
CREATE OR REPLACE VIEW v_funding_stats AS
SELECT
    fr.symbol,
    fr.funding_rate,
    fr.mark_price,
    fr.long_positions,
    fr.short_positions,
    fr.long_quantity,
    fr.short_quantity,
    ROUND(
        (
            fr.long_quantity - fr.short_quantity
        ) / (
            fr.long_quantity + fr.short_quantity
        ) * 100,
        2
    ) as imbalance_percent,
    fr.next_settlement_time,
    COUNT(fp.id) as payments_today
FROM
    crypto_funding_rates fr
    LEFT JOIN crypto_funding_payments fp ON fr.symbol = fp.symbol
    AND DATE(fp.paid_at) = DATE(fr.recorded_at)
GROUP BY
    fr.id;

-- ═════════════════════════════════════════════════════════════════════════════
-- VERIFY MIGRATION
-- ═════════════════════════════════════════════════════════════════════════════

-- Check that all new columns exist
SELECT
    'Migration Status' as check_name,
    CASE
        WHEN (
            SELECT COUNT(*)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE
                TABLE_NAME = 'crypto_positions'
                AND COLUMN_NAME IN (
                    'margin_mode',
                    'isolated_margin',
                    'mark_price',
                    'funding_rate',
                    'position_mode'
                )
        ) = 5 THEN '✅ ALL COLUMNS ADDED'
        ELSE '❌ MISSING COLUMNS'
    END as status;

-- Migration complete
-- Next: Update trade-execution.service.js to use mark prices and funding fees
-- Next: Update pnl-liquidation.service.js to use mark prices
-- Next: Start background jobs for funding settlement and trigger checking
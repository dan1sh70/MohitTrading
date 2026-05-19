-- ===== COMPREHENSIVE DATABASE SCHEMA =====
--
-- TRADING TYPES SUPPORTED:
-- 1. indian_stock - Indian stock/futures trading
-- 2. crypto - Cryptocurrency trading
-- 3. other - Other derivatives (reserved)
--
-- NEW TABLES FOR INDIAN STOCK TRADING:
-- 1. indian_stock_positions: Tracks all active and exited positions
-- 2. indian_stock_performance: Stores comprehensive performance metrics
--
-- UPDATED TABLES:
-- 1. trades: Added trading_type ENUM field to support multiple trading types
--
-- KEY FEATURES:
-- - Automatic P&L calculation on position exit
-- - Real-time balance management
-- - Performance metric tracking with 6 scoring systems
-- - Support for multiple trading types in single system
--
-- ===== MARKET HOURS TABLE =====
-- Admin-controlled trading hours for Indian stocks

CREATE TABLE IF NOT EXISTS market_hours (
    id INT AUTO_INCREMENT PRIMARY KEY,
    market_type VARCHAR(50) NOT NULL DEFAULT 'indian_stock',
    market_name VARCHAR(100) NOT NULL DEFAULT 'Indian Stock Market (NSE/BSE)',
    open_time TIME NOT NULL DEFAULT '09:15:00',
    close_time TIME NOT NULL DEFAULT '15:30:00',
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    notes TEXT,
    UNIQUE KEY unique_market (market_type)
);

-- Insert default Indian stock market hours
INSERT INTO
    market_hours (
        market_type,
        market_name,
        open_time,
        close_time,
        timezone,
        notes
    )
VALUES (
        'indian_stock',
        'Indian Stock Market (NSE/BSE)',
        '09:15:00',
        '15:30:00',
        'Asia/Kolkata',
        'Standard Indian stock market trading hours. Pre-market: 9:00-9:15, Regular: 9:15-15:30, Post-market: 15:40-16:00'
    )
ON DUPLICATE KEY UPDATE
    market_name = VALUES(market_name),
    notes = VALUES(notes);

-- ===== MARKET HOURS AUDIT TABLE =====
CREATE TABLE IF NOT EXISTS market_hours_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    market_hours_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_open_time TIME,
    new_open_time TIME,
    old_close_time TIME,
    new_close_time TIME,
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    FOREIGN KEY (market_hours_id) REFERENCES market_hours (id)
);

-- ===== USERS TABLE =====
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    role ENUM('trader', 'admin') NOT NULL DEFAULT 'trader',
    balance DECIMAL(14, 2) NOT NULL DEFAULT 1000000,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===== GENERIC TRADES TABLE =====
-- First, ensure the table exists with all columns
CREATE TABLE IF NOT EXISTS trades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    trading_type ENUM(
        'indian_stock',
        'crypto',
        'other'
    ) NOT NULL DEFAULT 'crypto',
    symbol VARCHAR(20) NOT NULL,
    side ENUM('BUY', 'SELL') NOT NULL,
    quantity DECIMAL(18, 8) NOT NULL,
    price DECIMAL(14, 2) NOT NULL,
    status ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    pnl DECIMAL(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    CONSTRAINT fk_trades_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_trades_user_id (user_id),
    INDEX idx_trades_symbol (symbol),
    INDEX idx_trades_type (trading_type)
);

-- ===== INDIAN STOCK POSITIONS TABLE =====
CREATE TABLE IF NOT EXISTS indian_stock_positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    entry_price DECIMAL(14, 2) NOT NULL,
    current_price DECIMAL(14, 2) NOT NULL DEFAULT 0,
    pnl DECIMAL(14, 2) NOT NULL DEFAULT 0,
    pnl_percent DECIMAL(6, 2) NOT NULL DEFAULT 0,
    trade_type ENUM('BUY', 'SELL') NOT NULL,
    time_frame VARCHAR(20) NOT NULL,
    entry_time DATETIME NOT NULL,
    exit_time DATETIME NULL,
    status ENUM('ACTIVE', 'EXITED') NOT NULL DEFAULT 'ACTIVE',
    exit_price DECIMAL(14, 2) NULL,
    margin_used DECIMAL(14, 2) NOT NULL DEFAULT 0,
    charges DECIMAL(14, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_isp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_isp_user_id (user_id),
    INDEX idx_isp_symbol (symbol),
    INDEX idx_isp_status (status)
);

-- ===== INDIAN STOCK PERFORMANCE TABLE =====
CREATE TABLE IF NOT EXISTS indian_stock_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_profit_loss DECIMAL(14, 2) NOT NULL DEFAULT 0,
    realised_pnl DECIMAL(14, 2) NOT NULL DEFAULT 0,
    unrealised_pnl DECIMAL(14, 2) NOT NULL DEFAULT 0,
    total_trades INT NOT NULL DEFAULT 0,
    winning_trades INT NOT NULL DEFAULT 0,
    losing_trades INT NOT NULL DEFAULT 0,
    win_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    avg_profit DECIMAL(14, 2) NOT NULL DEFAULT 0,
    avg_loss DECIMAL(14, 2) NOT NULL DEFAULT 0,
    profit_factor DECIMAL(8, 2) NOT NULL DEFAULT 0,
    consistency_score INT NOT NULL DEFAULT 0,
    risk_meter INT NOT NULL DEFAULT 0,
    portfolio_health INT NOT NULL DEFAULT 0,
    win_loss_ratio DECIMAL(8, 2) NOT NULL DEFAULT 0,
    capital_evaluation_score INT NOT NULL DEFAULT 0,
    overall_grade VARCHAR(5) NOT NULL DEFAULT 'D',
    overall_score INT NOT NULL DEFAULT 0,
    rank_percentile DECIMAL(5, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_isp_perf_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE KEY unique_user (user_id)
);

-- ===== AUDIT LOGS TABLE =====
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id INT NULL,
    action VARCHAR(80) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(120),
    details JSON,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_actor_user FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_audit_logs_created_at (created_at),
    INDEX idx_audit_logs_action (action)
);

-- ===== MARKET HOLIDAYS & SPECIAL EVENTS TABLE =====
-- Admin-controlled special market closures (holidays, events, etc.)

CREATE TABLE IF NOT EXISTS market_holidays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    market_type VARCHAR(50) NOT NULL DEFAULT 'indian_stock',
    holiday_date DATE NOT NULL,
    holiday_name VARCHAR(100) NOT NULL,
    description TEXT,
    closure_type ENUM(
        'FULL_DAY',
        'HALF_DAY',
        'CUSTOM_HOURS'
    ) NOT NULL DEFAULT 'FULL_DAY',
    custom_open_time TIME NULL,
    custom_close_time TIME NULL,
    is_recurring BOOLEAN DEFAULT FALSE, -- For annual holidays like Diwali
    recurring_pattern VARCHAR(50), -- e.g., 'DIWALI', 'REPUBLIC_DAY'
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_holiday (market_type, holiday_date),
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL,
    INDEX idx_market_holidays_date (holiday_date),
    INDEX idx_market_holidays_active (is_active)
);

-- Insert some default Indian market holidays for 2024-2025
INSERT INTO
    market_holidays (
        market_type,
        holiday_date,
        holiday_name,
        description,
        closure_type,
        is_recurring,
        recurring_pattern
    )
VALUES (
        'indian_stock',
        '2024-01-26',
        'Republic Day',
        'National holiday celebrating the adoption of the Constitution of India',
        'FULL_DAY',
        TRUE,
        'REPUBLIC_DAY'
    ),
    (
        'indian_stock',
        '2024-03-25',
        'Holi',
        'Festival of Colors',
        'FULL_DAY',
        TRUE,
        'HOLI'
    ),
    (
        'indian_stock',
        '2024-04-11',
        'Eid-ul-Fitr',
        'Islamic festival marking the end of Ramadan',
        'FULL_DAY',
        TRUE,
        'EID_AL_FITR'
    ),
    (
        'indian_stock',
        '2024-04-14',
        'Dr. Baba Saheb Ambedkar Jayanti',
        'Birth anniversary of Dr. B.R. Ambedkar',
        'FULL_DAY',
        TRUE,
        'AMBEDKAR_JAYANTI'
    ),
    (
        'indian_stock',
        '2024-05-01',
        'Maharashtra Day',
        'Formation day of Maharashtra state',
        'FULL_DAY',
        TRUE,
        'MAHARASHTRA_DAY'
    ),
    (
        'indian_stock',
        '2024-06-17',
        'Bakri Id',
        'Islamic festival of sacrifice',
        'FULL_DAY',
        TRUE,
        'BAKRI_ID'
    ),
    (
        'indian_stock',
        '2024-07-17',
        'Muharram',
        'Islamic New Year',
        'FULL_DAY',
        TRUE,
        'MUHARRAM'
    ),
    (
        'indian_stock',
        '2024-08-15',
        'Independence Day',
        'National holiday celebrating independence from British rule',
        'FULL_DAY',
        TRUE,
        'INDEPENDENCE_DAY'
    ),
    (
        'indian_stock',
        '2024-10-02',
        'Mahatma Gandhi Jayanti',
        'Birth anniversary of Mahatma Gandhi',
        'FULL_DAY',
        TRUE,
        'GANDHI_JAYANTI'
    ),
    (
        'indian_stock',
        '2024-10-12',
        'Dussehra',
        'Hindu festival celebrating victory of good over evil',
        'FULL_DAY',
        TRUE,
        'DUSSEHRA'
    ),
    (
        'indian_stock',
        '2024-11-01',
        'Diwali Laxmi Pujan',
        'Main day of Diwali festival',
        'FULL_DAY',
        TRUE,
        'DIWALI'
    ),
    (
        'indian_stock',
        '2024-11-02',
        'Diwali Balipratipada',
        'Second day of Diwali',
        'FULL_DAY',
        TRUE,
        'DIWALI_2'
    ),
    (
        'indian_stock',
        '2024-11-15',
        'Guru Nanak Jayanti',
        'Birth anniversary of Guru Nanak Dev Ji',
        'FULL_DAY',
        TRUE,
        'GURU_NANAK_JAYANTI'
    ),
    (
        'indian_stock',
        '2024-12-25',
        'Christmas',
        'Christian festival celebrating birth of Jesus Christ',
        'FULL_DAY',
        TRUE,
        'CHRISTMAS'
    )
ON DUPLICATE KEY UPDATE
    holiday_name = VALUES(holiday_name),
    description = VALUES(description),
    is_recurring = VALUES(is_recurring),
    recurring_pattern = VALUES(recurring_pattern);

-- ===== PASSWORD RESET TOKENS TABLE =====
-- Stores tokens for password reset functionality

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    INDEX idx_reset_tokens_token (token),
    INDEX idx_reset_tokens_expires (expires_at)
);

-- ===== INSTRUMENTS MASTER =====
CREATE TABLE IF NOT EXISTS instruments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(64) NOT NULL,
    exchange VARCHAR(32) NOT NULL,
    instrument_key VARCHAR(255),
    lot_size INT DEFAULT 1,
    instrument_type ENUM('EQ', 'FUT', 'OPT', 'IDX') DEFAULT 'EQ',
    expiry_date DATE NULL,
    strike_price DECIMAL(12, 2) NULL,
    option_type ENUM('CE', 'PE') NULL,
    raw JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_instrument (
        exchange,
        symbol,
        instrument_key
    )
);

-- ===== CANDLES TABLE =====
CREATE TABLE IF NOT EXISTS candles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(64) NOT NULL,
    timeframe VARCHAR(16) NOT NULL,
    ts BIGINT NOT NULL,
    open DECIMAL(18, 6) NOT NULL,
    high DECIMAL(18, 6) NOT NULL,
    low DECIMAL(18, 6) NOT NULL,
    close DECIMAL(18, 6) NOT NULL,
    volume BIGINT DEFAULT 0,
    open_interest BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_candles_symbol_tf_ts (symbol, timeframe, ts),
    INDEX idx_candles_ts (ts)
);

-- ===== OPTION CHAIN CACHE =====
CREATE TABLE IF NOT EXISTS option_chain_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(64) NOT NULL,
    expiry DATE NOT NULL,
    payload JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_oc (symbol, expiry)
);

-- ===== FUTURES DATA =====
CREATE TABLE IF NOT EXISTS futures_data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(64) NOT NULL,
    expiry DATE NOT NULL,
    lot_size INT DEFAULT 1,
    contract_size INT DEFAULT 1,
    margin_info JSON NULL,
    rollover_info JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_fut (symbol, expiry)
);

-- ===== WATCHLISTS =====
CREATE TABLE IF NOT EXISTS watchlists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    items JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- ===== WEBSOCKET SESSIONS =====
CREATE TABLE IF NOT EXISTS websocket_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    socket_id VARCHAR(128) NOT NULL,
    user_id INT NULL,
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    meta JSON NULL,
    INDEX idx_ws_socket (socket_id)
);

-- ===== MARKET DEPTH (ORDER BOOK SNAPSHOTS) =====
CREATE TABLE IF NOT EXISTS market_depth (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(64) NOT NULL,
    ts BIGINT NOT NULL,
    bids JSON NULL,
    asks JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_md_symbol_ts (symbol, ts)
);

-- ===== HISTORICAL REQUESTS (audit) =====
CREATE TABLE IF NOT EXISTS historical_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    symbol VARCHAR(64) NOT NULL,
    timeframe VARCHAR(32) NOT NULL,
    from_ts BIGINT NOT NULL,
    to_ts BIGINT NOT NULL,
    request_params JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_hist_symbol (symbol)
);
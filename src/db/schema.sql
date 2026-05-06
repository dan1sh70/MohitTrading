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
-- ===== USERS TABLE =====
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    role ENUM('trader', 'admin') NOT NULL DEFAULT 'trader',
    balance DECIMAL(14, 2) NOT NULL DEFAULT 100000,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===== GENERIC TRADES TABLE =====
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
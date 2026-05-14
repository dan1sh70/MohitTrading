-- ===== CRYPTO TRADING SYSTEM SCHEMA =====
-- Comprehensive schema for Delta/Binance/Bybit-style crypto trading platform
-- Supports: Spot, Futures, Options with leverage and liquidation

-- ===== CRYPTO POSITIONS TABLE =====
CREATE TABLE IF NOT EXISTS crypto_positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    symbol VARCHAR(20) NOT NULL COMMENT 'e.g., BTCUSDT, ETHUSDT',
    side ENUM('LONG', 'SHORT') NOT NULL COMMENT 'LONG = buy position, SHORT = short position',

-- Entry information
entry_price DECIMAL(18, 8) NOT NULL COMMENT 'Price at which position was opened',
quantity DECIMAL(18, 8) NOT NULL COMMENT 'Amount of base asset',
leverage DECIMAL(4, 2) NOT NULL DEFAULT 1 COMMENT '1x = spot, 2x-20x = futures',

-- Current state
current_price DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'Latest market price',
unrealised_pnl DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'Current unrealised P&L',
unrealised_pnl_percent DECIMAL(8, 4) NOT NULL DEFAULT 0 COMMENT 'Unrealised P&L percentage',
realised_pnl DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'P&L from partial closes',

-- Margin & Liquidation
margin_used DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'Collateral locked for this position',
available_margin DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'Remaining margin for this position',
liquidation_price DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'Price at which position gets liquidated',
margin_ratio DECIMAL(6, 4) NOT NULL DEFAULT 0 COMMENT 'Current margin ratio (0-100%)',

-- Risk management
take_profit DECIMAL(18, 8) NULL COMMENT 'Target exit price',
stop_loss DECIMAL(18, 8) NULL COMMENT 'Stop loss level',

-- Trading type
trading_mode ENUM('SPOT', 'FUTURES', 'OPTIONS') NOT NULL DEFAULT 'SPOT',

-- Timestamps
entry_time DATETIME NOT NULL,
last_update DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
exit_time DATETIME NULL,

-- Status tracking
status ENUM(
    'ACTIVE',
    'CLOSING',
    'CLOSED',
    'LIQUIDATED'
) NOT NULL DEFAULT 'ACTIVE',

-- Fees & costs
entry_fee DECIMAL(18, 8) NOT NULL DEFAULT 0,

-- Funding costs for futures (daily interest on borrowed amount)
funding_paid DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'Cumulative funding costs paid',
    
    CONSTRAINT fk_crypto_pos_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_crypto_pos_user (user_id),
    INDEX idx_crypto_pos_symbol (symbol),
    INDEX idx_crypto_pos_status (status),
    INDEX idx_crypto_pos_entry_time (entry_time)
);

-- ===== CRYPTO ORDERS TABLE =====
-- Unified order table for market, limit, and conditional orders

CREATE TABLE IF NOT EXISTS crypto_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    position_id INT NULL COMMENT 'Reference to position if order is for position management',
    
    symbol VARCHAR(20) NOT NULL COMMENT 'Trading pair, e.g., BTCUSDT',
    side ENUM('BUY', 'SELL') NOT NULL,

-- Order type classification
order_type ENUM(
    'MARKET',
    'LIMIT',
    'STOP_LOSS',
    'TAKE_PROFIT'
) NOT NULL,

-- Quantities & Pricing
original_quantity DECIMAL(18, 8) NOT NULL COMMENT 'Quantity when order was placed',
filled_quantity DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'Amount already filled',
remaining_quantity DECIMAL(18, 8) NOT NULL COMMENT 'Qty awaiting fill',
price DECIMAL(18, 8) NULL COMMENT 'Limit price (NULL for market orders)',
trigger_price DECIMAL(18, 8) NULL COMMENT 'Trigger price for stop/take profit orders',

-- Leverage & trading mode
leverage DECIMAL(4, 2) NOT NULL DEFAULT 1,
trading_mode ENUM('SPOT', 'FUTURES', 'OPTIONS') NOT NULL DEFAULT 'SPOT',

-- Order Status & Execution
status ENUM(
    'PENDING',
    'OPEN',
    'PARTIALLY_FILLED',
    'FILLED',
    'CANCELLED',
    'REJECTED'
) NOT NULL DEFAULT 'OPEN',
time_in_force ENUM('GTC', 'IOC', 'FOK', 'PO') NOT NULL DEFAULT 'GTC' COMMENT 'GTC=Good Till Cancel, IOC=Immediate Or Cancel, FOK=Fill Or Kill, PO=Post Only',

-- Fees
commission DECIMAL(18, 8) NOT NULL DEFAULT 0,
commission_asset VARCHAR(10) DEFAULT 'USDT',

-- Timestamps
created_at DATETIME NOT NULL, filled_at DATETIME NULL,

-- Tracking
exchange_order_id VARCHAR(100) NULL COMMENT 'External exchange order ID if applicable',
    
    CONSTRAINT fk_crypto_order_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_crypto_order_position FOREIGN KEY (position_id) REFERENCES crypto_positions(id) ON DELETE SET NULL,
    INDEX idx_crypto_order_user (user_id),
    INDEX idx_crypto_order_symbol (symbol),
    INDEX idx_crypto_order_status (status),
    INDEX idx_crypto_order_created (created_at)
);

-- ===== CRYPTO ORDER FILLS TABLE =====
-- Tracks individual fills for orders (can have multiple fills due to partial execution)
CREATE TABLE IF NOT EXISTS crypto_order_fills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    side ENUM('BUY', 'SELL') NOT NULL,
    quantity DECIMAL(18, 8) NOT NULL COMMENT 'Quantity filled in this execution',
    price DECIMAL(18, 8) NOT NULL COMMENT 'Execution price',
    commission DECIMAL(18, 8) NOT NULL DEFAULT 0,
    commission_asset VARCHAR(10) DEFAULT 'USDT',
    fill_time DATETIME NOT NULL,
    CONSTRAINT fk_crypto_fill_order FOREIGN KEY (order_id) REFERENCES crypto_orders (id) ON DELETE CASCADE,
    INDEX idx_crypto_fill_order (order_id),
    INDEX idx_crypto_fill_time (fill_time)
);

-- ===== CRYPTO TRADES TABLE =====
-- Closed trades with full P&L information

CREATE TABLE IF NOT EXISTS crypto_trades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    position_id INT NULL,
    
    symbol VARCHAR(20) NOT NULL,
    trading_mode ENUM('SPOT', 'FUTURES', 'OPTIONS') NOT NULL DEFAULT 'SPOT',

-- Entry information
entry_order_id INT NOT NULL,
entry_price DECIMAL(18, 8) NOT NULL,
entry_quantity DECIMAL(18, 8) NOT NULL,
entry_time DATETIME NOT NULL,

-- Exit information
exit_order_id INT NOT NULL,
exit_price DECIMAL(18, 8) NOT NULL,
exit_quantity DECIMAL(18, 8) NOT NULL,
exit_time DATETIME NOT NULL,

-- P&L Calculation
gross_pnl DECIMAL(18, 8) NOT NULL DEFAULT 0,
fees_paid DECIMAL(18, 8) NOT NULL DEFAULT 0,
net_pnl DECIMAL(18, 8) NOT NULL DEFAULT 0,
pnl_percent DECIMAL(8, 4) NOT NULL DEFAULT 0,

-- Leverage info
leverage DECIMAL(4, 2) NOT NULL DEFAULT 1,
margin_used DECIMAL(18, 8) NOT NULL DEFAULT 0,

-- Trade duration
duration_seconds INT NOT NULL DEFAULT 0,
    
    CONSTRAINT fk_crypto_trade_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_crypto_trade_position FOREIGN KEY (position_id) REFERENCES crypto_positions(id) ON DELETE SET NULL,
    CONSTRAINT fk_crypto_trade_entry FOREIGN KEY (entry_order_id) REFERENCES crypto_orders(id),
    CONSTRAINT fk_crypto_trade_exit FOREIGN KEY (exit_order_id) REFERENCES crypto_orders(id),
    INDEX idx_crypto_trade_user (user_id),
    INDEX idx_crypto_trade_symbol (symbol),
    INDEX idx_crypto_trade_exit_time (exit_time),
    INDEX idx_crypto_trade_pnl (net_pnl)
);

-- ===== CRYPTO PERFORMANCE TABLE =====
CREATE TABLE IF NOT EXISTS crypto_performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,

-- Totals
total_trades INT NOT NULL DEFAULT 0,
total_volume DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'Sum of all trade quantities',

-- P&L metrics
total_realised_pnl DECIMAL(18, 8) NOT NULL DEFAULT 0,
total_unrealised_pnl DECIMAL(18, 8) NOT NULL DEFAULT 0,
total_fees_paid DECIMAL(18, 8) NOT NULL DEFAULT 0,

-- Win/Loss tracking
winning_trades INT NOT NULL DEFAULT 0,
losing_trades INT NOT NULL DEFAULT 0,
win_rate DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT 'Winning trades percentage',

-- P&L statistics
avg_profit DECIMAL(18, 8) NOT NULL DEFAULT 0,
avg_loss DECIMAL(18, 8) NOT NULL DEFAULT 0,
max_profit DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'Biggest single profit',
max_loss DECIMAL(18, 8) NOT NULL DEFAULT 0 COMMENT 'Biggest single loss',

-- Risk metrics
profit_factor DECIMAL(8, 2) NOT NULL DEFAULT 0 COMMENT 'Total profit / Total loss',
win_loss_ratio DECIMAL(8, 2) NOT NULL DEFAULT 0,

-- Consistency
consistency_score INT NOT NULL DEFAULT 0 COMMENT 'Score based on consistency (0-100)',
risk_meter INT NOT NULL DEFAULT 0 COMMENT 'Risk assessment (0-100)',
portfolio_health INT NOT NULL DEFAULT 0 COMMENT 'Overall health (0-100)',

-- Streaks
current_streak INT NOT NULL DEFAULT 0 COMMENT 'Consecutive wins (+) or losses (-)',
max_consecutive_wins INT NOT NULL DEFAULT 0,
max_consecutive_losses INT NOT NULL DEFAULT 0,

-- Time metrics
avg_trade_duration DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT 'In seconds',

-- Overall grade
overall_grade VARCHAR(5) NOT NULL DEFAULT 'D' COMMENT 'A+, A, B, C, D, F',
    overall_score INT NOT NULL DEFAULT 0 COMMENT '0-100',
    rank_percentile DECIMAL(5, 2) NOT NULL DEFAULT 0,
    
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_crypto_perf_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===== CRYPTO ACCOUNT BALANCE TRACKING =====
-- Track balance changes due to trades, fees, withdrawals, etc.
CREATE TABLE IF NOT EXISTS crypto_balance_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    asset VARCHAR(10) NOT NULL DEFAULT 'USDT' COMMENT 'Asset denomination',
    previous_balance DECIMAL(18, 8) NOT NULL,
    new_balance DECIMAL(18, 8) NOT NULL,
    change_amount DECIMAL(18, 8) NOT NULL,
    reason ENUM(
        'TRADE_FEE',
        'LIQUIDATION',
        'FUNDING_COST',
        'DEPOSIT',
        'WITHDRAWAL',
        'PNL_SETTLEMENT'
    ) NOT NULL,
    related_trade_id INT NULL,
    related_position_id INT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_balance_hist_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_balance_hist_trade FOREIGN KEY (related_trade_id) REFERENCES crypto_trades (id) ON DELETE SET NULL,
    CONSTRAINT fk_balance_hist_position FOREIGN KEY (related_position_id) REFERENCES crypto_positions (id) ON DELETE SET NULL,
    INDEX idx_balance_user (user_id),
    INDEX idx_balance_changed (changed_at)
);

-- ===== LIQUIDATION EVENTS TABLE =====
-- Tracks all liquidation events for risk management and analytics

CREATE TABLE IF NOT EXISTS crypto_liquidations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    position_id INT NOT NULL,
    
    symbol VARCHAR(20) NOT NULL,
    side ENUM('LONG', 'SHORT') NOT NULL,

-- Position info at liquidation
entry_price DECIMAL(18, 8) NOT NULL,
liquidation_price DECIMAL(18, 8) NOT NULL,
quantity DECIMAL(18, 8) NOT NULL,
leverage DECIMAL(4, 2) NOT NULL,

-- Loss info
loss_amount DECIMAL(18, 8) NOT NULL COMMENT 'How much was lost in liquidation',
    
    liquidated_at DATETIME NOT NULL,
    
    CONSTRAINT fk_liquidation_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_liquidation_position FOREIGN KEY (position_id) REFERENCES crypto_positions(id) ON DELETE CASCADE,
    INDEX idx_liquidation_user (user_id),
    INDEX idx_liquidation_time (liquidated_at)
);

-- ===== INDEXES FOR PERFORMANCE =====
-- Additional composite indexes for common queries
CREATE INDEX idx_crypto_pos_user_status ON crypto_positions (user_id, status);

CREATE INDEX idx_crypto_pos_user_symbol ON crypto_positions (user_id, symbol);

CREATE INDEX idx_crypto_order_user_status ON crypto_orders (user_id, status);

CREATE INDEX idx_crypto_trade_user_time ON crypto_trades (user_id, exit_time);
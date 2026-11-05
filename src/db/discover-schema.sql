-- ═══════════════════════════════════════════════════════════════════════════
-- DISCOVER MODULE DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Market Data Providers & Sync Logs
CREATE TABLE IF NOT EXISTS market_data_providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider_code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 1,
  config JSON NULL,
  health_status ENUM('HEALTHY', 'DEGRADED', 'DOWN') DEFAULT 'HEALTHY',
  last_health_check TIMESTAMP NULL,
  error_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS provider_sync_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  provider_code VARCHAR(32) NOT NULL,
  module_name VARCHAR(64) NOT NULL,
  sync_type VARCHAR(32) NOT NULL,
  records_synced INT DEFAULT 0,
  duration_ms INT DEFAULT 0,
  status ENUM('SUCCESS', 'PARTIAL', 'FAILED') DEFAULT 'SUCCESS',
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sync_module (module_name, created_at),
  INDEX idx_sync_provider (provider_code, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Global and Domestic Market Indices
CREATE TABLE IF NOT EXISTS market_indices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  category ENUM('INDIA', 'INTERNATIONAL') NOT NULL,
  country VARCHAR(64) NOT NULL,
  exchange VARCHAR(32) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  current_value DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
  previous_close DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
  price_change DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
  change_percent DECIMAL(8, 4) NOT NULL DEFAULT 0.0000,
  day_high DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
  day_low DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
  market_open_time VARCHAR(10) DEFAULT '09:15',
  market_close_time VARCHAR(10) DEFAULT '15:30',
  timezone VARCHAR(64) DEFAULT 'Asia/Kolkata',
  market_status ENUM('OPEN', 'CLOSED', 'PRE_MARKET', 'POST_MARKET') DEFAULT 'CLOSED',
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_indices_cat (category),
  INDEX idx_indices_sym (symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Historical Index Snapshots
CREATE TABLE IF NOT EXISTS market_indices_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(32) NOT NULL,
  recorded_at TIMESTAMP NOT NULL,
  open_val DECIMAL(14, 4) NOT NULL,
  high_val DECIMAL(14, 4) NOT NULL,
  low_val DECIMAL(14, 4) NOT NULL,
  close_val DECIMAL(14, 4) NOT NULL,
  volume BIGINT DEFAULT 0,
  INDEX idx_index_hist (symbol, recorded_at),
  UNIQUE KEY uq_sym_time (symbol, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Option Chain Management & Snapshots
CREATE TABLE IF NOT EXISTS discover_option_expiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(32) NOT NULL,
  expiry_date DATE NOT NULL,
  is_weekly BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_symbol_expiry (symbol, expiry_date),
  INDEX idx_exp_symbol (symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS discover_option_snapshots (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(32) NOT NULL,
  underlying_price DECIMAL(14, 4) NOT NULL,
  expiry_date DATE NOT NULL,
  strike_price DECIMAL(12, 2) NOT NULL,
  option_type ENUM('CE', 'PE') NOT NULL,
  ltp DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  price_change DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  percentage_change DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  open_interest BIGINT NOT NULL DEFAULT 0,
  change_in_oi BIGINT NOT NULL DEFAULT 0,
  volume BIGINT NOT NULL DEFAULT 0,
  implied_volatility DECIMAL(8, 4) NOT NULL DEFAULT 0.0000,
  bid_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  ask_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  bid_quantity INT NOT NULL DEFAULT 0,
  ask_quantity INT NOT NULL DEFAULT 0,
  intrinsic_value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  time_value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_snap_query (symbol, expiry_date, strike_price),
  INDEX idx_snap_time (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS discover_option_analytics (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  symbol VARCHAR(32) NOT NULL,
  expiry_date DATE NOT NULL,
  underlying_price DECIMAL(14, 4) NOT NULL,
  pcr DECIMAL(8, 4) NOT NULL DEFAULT 0.0000,
  max_pain DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  atm_strike DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  highest_ce_oi_strike DECIMAL(12, 2) DEFAULT 0.00,
  highest_pe_oi_strike DECIMAL(12, 2) DEFAULT 0.00,
  highest_ce_oi_change_strike DECIMAL(12, 2) DEFAULT 0.00,
  highest_pe_oi_change_strike DECIMAL(12, 2) DEFAULT 0.00,
  total_ce_oi BIGINT DEFAULT 0,
  total_pe_oi BIGINT DEFAULT 0,
  total_ce_volume BIGINT DEFAULT 0,
  total_pe_volume BIGINT DEFAULT 0,
  sentiment VARCHAR(32) DEFAULT 'NEUTRAL',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_opt_analytics (symbol, expiry_date, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. FII / DII Institutional Tracking
CREATE TABLE IF NOT EXISTS fii_dii_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reporting_date DATE NOT NULL,
  category ENUM('FII', 'DII') NOT NULL,
  market_type ENUM('CASH', 'DERIVATIVES') NOT NULL DEFAULT 'CASH',
  buy_value DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  sell_value DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  net_value DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  is_provisional BOOLEAN DEFAULT FALSE,
  source VARCHAR(64) NOT NULL DEFAULT 'NSE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_date_cat_market (reporting_date, category, market_type),
  INDEX idx_fii_date (reporting_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Heatmap Snapshots & Market Breadth
CREATE TABLE IF NOT EXISTS heatmap_snapshots (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(32) NOT NULL, -- 'NIFTY_50', 'NIFTY_100', 'BANK_NIFTY', 'SECTORS'
  symbol VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL,
  sector VARCHAR(64) NOT NULL,
  current_price DECIMAL(12, 2) NOT NULL,
  previous_close DECIMAL(12, 2) NOT NULL,
  price_change DECIMAL(12, 2) NOT NULL,
  percentage_change DECIMAL(8, 2) NOT NULL,
  market_cap DECIMAL(18, 2) NOT NULL DEFAULT 0.00,
  cap_category ENUM('LARGE_CAP', 'MID_CAP', 'SMALL_CAP') NOT NULL DEFAULT 'LARGE_CAP',
  volume BIGINT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_heat_cat (category, recorded_at),
  INDEX idx_heat_sym (symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS market_breadth_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exchange VARCHAR(10) NOT NULL DEFAULT 'NSE',
  index_name VARCHAR(32) NOT NULL DEFAULT 'NIFTY 50',
  advances INT NOT NULL DEFAULT 0,
  declines INT NOT NULL DEFAULT 0,
  unchanged INT NOT NULL DEFAULT 0,
  advance_decline_ratio DECIMAL(6, 3) NOT NULL DEFAULT 1.000,
  total_traded INT NOT NULL DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_breadth_time (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


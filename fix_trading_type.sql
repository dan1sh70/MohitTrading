-- Fix missing trading_type column in trades table
ALTER TABLE trades ADD COLUMN IF NOT EXISTS trading_type ENUM('indian_stock', 'crypto', 'other') NOT NULL DEFAULT 'crypto';

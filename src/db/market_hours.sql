-- ═══════════════════════════════════════════════════════════════════════════
-- MARKET HOURS TABLE FOR INDIAN STOCKS
-- Admin-controlled opening and closing times
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS market_hours (
  id INT PRIMARY KEY AUTO_INCREMENT,
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
INSERT INTO market_hours (market_type, market_name, open_time, close_time, timezone, notes) 
VALUES (
  'indian_stock', 
  'Indian Stock Market (NSE/BSE)', 
  '09:15:00', 
  '15:30:00', 
  'Asia/Kolkata',
  'Standard Indian stock market trading hours. Pre-market: 9:00-9:15, Regular: 9:15-15:30, Post-market: 15:40-16:00'
) ON DUPLICATE KEY UPDATE 
  market_name = VALUES(market_name),
  notes = VALUES(notes);

-- Create audit log table for market hours changes
CREATE TABLE IF NOT EXISTS market_hours_audit (
  id INT PRIMARY KEY AUTO_INCREMENT,
  market_hours_id INT NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_open_time TIME,
  new_open_time TIME,
  old_close_time TIME,
  new_close_time TIME,
  changed_by INT,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  FOREIGN KEY (market_hours_id) REFERENCES market_hours(id)
);

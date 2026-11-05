-- ═══════════════════════════════════════════════════════════════════════════
-- PRO ZONE, SUBSCRIPTIONS, REFERRALS & PREMIUM ACCESS SCHEMA MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(64) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  duration_days INT NOT NULL DEFAULT 30, -- 0 for Free unlimited
  is_active BOOLEAN DEFAULT TRUE,
  is_popular BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Subscription Plan Features
CREATE TABLE IF NOT EXISTS subscription_plan_features (
  id INT AUTO_INCREMENT PRIMARY KEY,
  plan_id INT NOT NULL,
  feature_key VARCHAR(64) NOT NULL, -- 'option_chain', 'gainers_losers', 'fii_dii', 'global_indices', 'market_heatmap'
  is_included BOOLEAN DEFAULT TRUE,
  quota_limit INT NULL, -- NULL = unlimited
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_plan_feature (plan_id, feature_key),
  INDEX idx_plan_feat (plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. User Subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  plan_id INT NOT NULL,
  status ENUM('FREE', 'PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'PAYMENT_FAILED', 'SUSPENDED', 'REFUNDED') NOT NULL DEFAULT 'FREE',
  start_date TIMESTAMP NULL,
  end_date TIMESTAMP NULL,
  auto_renew BOOLEAN DEFAULT FALSE,
  cancellation_reason TEXT NULL,
  cancelled_at TIMESTAMP NULL,
  granted_by_admin_id INT NULL,
  admin_grant_reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_sub (user_id, status),
  INDEX idx_sub_end (end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Subscription Transactions
CREATE TABLE IF NOT EXISTS subscription_transactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subscription_id BIGINT NULL,
  plan_id INT NOT NULL,
  order_id VARCHAR(100) NOT NULL UNIQUE,
  payment_gateway ENUM('RAZORPAY', 'CASHFREE', 'MANUAL_ADMIN', 'REFERRAL_REWARD') NOT NULL,
  gateway_payment_id VARCHAR(100) NULL,
  gateway_signature VARCHAR(255) NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  status ENUM('CREATED', 'SUCCESS', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'CREATED',
  error_message TEXT NULL,
  raw_response JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tx_order (order_id),
  INDEX idx_tx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Subscription Extensions (Audit of extensions via referrals, admin gifts)
CREATE TABLE IF NOT EXISTS subscription_extensions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  subscription_id BIGINT NOT NULL,
  extension_days INT NOT NULL,
  reason_type ENUM('REFERRAL_REWARD', 'ADMIN_GRANT', 'PROMOTIONAL', 'RENEWAL') NOT NULL,
  previous_end_date TIMESTAMP NULL,
  new_end_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ext_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Subscription Cancellations & Refunds
CREATE TABLE IF NOT EXISTS subscription_refunds (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  transaction_id BIGINT NOT NULL,
  user_id INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT NOT NULL,
  processed_by_admin_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Feature Entitlements & User Overrides
CREATE TABLE IF NOT EXISTS feature_entitlements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  feature_key VARCHAR(64) NOT NULL UNIQUE,
  feature_name VARCHAR(128) NOT NULL,
  description TEXT NULL,
  is_premium_only BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_entitlements (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  feature_key VARCHAR(64) NOT NULL,
  is_granted BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMP NULL,
  granted_by_admin_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_feature (user_id, feature_key),
  INDEX idx_ent_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Referral Campaigns & Configurable Rewards
CREATE TABLE IF NOT EXISTS referral_campaigns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campaign_name VARCHAR(128) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  referrer_reward_type ENUM('PRO_DAYS', 'DIAMONDS', 'DISCOUNT_PERCENT', 'WALLET_CREDIT') NOT NULL DEFAULT 'PRO_DAYS',
  referrer_reward_value INT NOT NULL DEFAULT 7,
  referred_reward_type ENUM('PRO_DAYS', 'DIAMONDS', 'DISCOUNT_PERCENT', 'WALLET_CREDIT') NOT NULL DEFAULT 'PRO_DAYS',
  referred_reward_value INT NOT NULL DEFAULT 3,
  eligibility_condition ENUM('REGISTRATION', 'FIRST_TRADE', 'FIRST_SUBSCRIPTION') NOT NULL DEFAULT 'REGISTRATION',
  max_referrals_per_user INT DEFAULT 100,
  start_date TIMESTAMP NULL,
  end_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Referral Rewards & Claims Audit
CREATE TABLE IF NOT EXISTS referral_reward_transactions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  referrer_id INT NOT NULL,
  referred_id INT NOT NULL,
  campaign_id INT NULL,
  reward_type ENUM('PRO_DAYS', 'DIAMONDS', 'DISCOUNT_PERCENT', 'WALLET_CREDIT') NOT NULL,
  referrer_reward_amount INT NOT NULL,
  referred_reward_amount INT NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'REVOKED') NOT NULL DEFAULT 'APPROVED',
  admin_review_reason VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ref_pair (referrer_id, referred_id),
  INDEX idx_reward_referrer (referrer_id),
  INDEX idx_reward_referred (referred_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(64) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  transaction_id BIGINT NOT NULL,
  plan_name VARCHAR(64) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  billing_name VARCHAR(128) NOT NULL,
  billing_email VARCHAR(180) NOT NULL,
  status ENUM('PAID', 'REFUNDED', 'VOID') DEFAULT 'PAID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_inv_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. System Settings & Admin Notifications
CREATE TABLE IF NOT EXISTS system_settings (
  setting_key VARCHAR(64) PRIMARY KEY,
  setting_value JSON NOT NULL,
  updated_by_admin_id INT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(128) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(64) NOT NULL, -- 'SUBSCRIPTION_ACTIVATED', 'REFERRAL_REWARD', etc.
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_user (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


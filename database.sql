-- ============================================================================
-- ZAYVORA PAYMENT INFRASTRUCTURE - DATABASE SCHEMA
-- ============================================================================

-- ============================================================================
-- TABLE 1: payment_intents
-- ============================================================================
-- Tracks all payment intents created by users
CREATE TABLE IF NOT EXISTS payment_intents (
  intent_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_expires_at (expires_at)
);

-- ============================================================================
-- TABLE 2: payment_ledger
-- ============================================================================
-- Immutable ledger of all payment transactions
CREATE TABLE IF NOT EXISTS payment_ledger (
  ledger_id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id TEXT UNIQUE NOT NULL,
  intent_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  credits INTEGER NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL,
  payment_timestamp TIMESTAMP,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (intent_id) REFERENCES payment_intents(intent_id),
  INDEX idx_intent_id (intent_id),
  INDEX idx_user_id (user_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_received_at (received_at)
);

-- ============================================================================
-- TABLE 3: user_wallets
-- ============================================================================
-- Tracks user credit balances
CREATE TABLE IF NOT EXISTS user_wallets (
  user_id TEXT PRIMARY KEY,
  total_credits BIGINT NOT NULL DEFAULT 0,
  available_credits BIGINT NOT NULL DEFAULT 0,
  pending_credits BIGINT NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_user_id (user_id)
);

-- ============================================================================
-- TABLE 4: credit_transactions
-- ============================================================================
-- Tracks all credit movements (grants, usage, refunds)
CREATE TABLE IF NOT EXISTS credit_transactions (
  transaction_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  intent_id TEXT,
  action TEXT NOT NULL,
  credits INTEGER NOT NULL,
  balance_before BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES user_wallets(user_id),
  FOREIGN KEY (intent_id) REFERENCES payment_intents(intent_id),
  INDEX idx_user_id (user_id),
  INDEX idx_intent_id (intent_id),
  INDEX idx_created_at (created_at)
);

-- ============================================================================
-- TABLE 5: payment_listener_state
-- ============================================================================
-- Tracks Mac Mini payment listener state for recovery
CREATE TABLE IF NOT EXISTS payment_listener_state (
  listener_id TEXT PRIMARY KEY,
  last_check TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_sms_id TEXT,
  last_webhook_id TEXT,
  pending_intents INT DEFAULT 0,
  paid_intents INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',

  INDEX idx_last_check (last_check)
);

-- ============================================================================
-- TABLE 6: security_log
-- ============================================================================
-- Logs all security events (rejections, mismatches, expirations)
CREATE TABLE IF NOT EXISTS security_log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  intent_id TEXT,
  user_id TEXT,
  event_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  details JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_intent_id (intent_id),
  INDEX idx_user_id (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Fast lookup of pending intents
CREATE INDEX idx_pending_intents ON payment_intents(status, expires_at) WHERE status = 'pending';

-- Fast lookup of user's payment history
CREATE INDEX idx_user_payments ON payment_ledger(user_id, received_at DESC);

-- Fast lookup of recent transactions for reconciliation
CREATE INDEX idx_recent_ledger ON payment_ledger(received_at DESC);

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- View: Current pending intents needing verification
CREATE OR REPLACE VIEW pending_intents_view AS
SELECT
  intent_id,
  user_id,
  amount,
  credits,
  TIMESTAMPDIFF(SECOND, created_at, NOW()) as age_seconds,
  TIMESTAMPDIFF(SECOND, NOW(), expires_at) as expires_in_seconds
FROM payment_intents
WHERE status = 'pending'
  AND expires_at > NOW()
ORDER BY created_at ASC;

-- View: User wallet summary
CREATE OR REPLACE VIEW user_wallet_summary AS
SELECT
  w.user_id,
  w.total_credits,
  w.available_credits,
  w.pending_credits,
  COUNT(DISTINCT l.transaction_id) as total_payments,
  MAX(l.received_at) as last_payment
FROM user_wallets w
LEFT JOIN payment_ledger l ON w.user_id = l.user_id
GROUP BY w.user_id;

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- Procedure: Create payment intent
DELIMITER $$
CREATE PROCEDURE create_payment_intent(
  IN p_intent_id TEXT,
  IN p_user_id TEXT,
  IN p_credits INT,
  IN p_amount INT
)
BEGIN
  INSERT INTO payment_intents
    (intent_id, user_id, credits, amount, status, created_at, expires_at)
  VALUES
    (p_intent_id, p_user_id, p_credits, p_amount, 'pending', NOW(), DATE_ADD(NOW(), INTERVAL 15 MINUTE));
END$$
DELIMITER ;

-- Procedure: Verify and mark payment as paid
DELIMITER $$
CREATE PROCEDURE verify_payment(
  IN p_intent_id TEXT,
  IN p_verified_at TIMESTAMP
)
BEGIN
  UPDATE payment_intents
  SET status = 'paid', verified_at = p_verified_at
  WHERE intent_id = p_intent_id AND status = 'pending';
END$$
DELIMITER ;

-- Procedure: Grant credits to user
DELIMITER $$
CREATE PROCEDURE grant_credits(
  IN p_user_id TEXT,
  IN p_intent_id TEXT,
  IN p_credits INT
)
BEGIN
  DECLARE v_balance_before BIGINT;
  DECLARE v_balance_after BIGINT;
  DECLARE v_transaction_id TEXT;

  -- Get current balance
  SELECT COALESCE(available_credits, 0) INTO v_balance_before
  FROM user_wallets WHERE user_id = p_user_id;

  SET v_balance_after = v_balance_before + p_credits;
  SET v_transaction_id = CONCAT('TX_', UNIX_TIMESTAMP(), '_', SUBSTRING(MD5(RAND()), 1, 8));

  -- Create wallet if doesn't exist
  INSERT IGNORE INTO user_wallets (user_id, total_credits, available_credits)
  VALUES (p_user_id, 0, 0);

  -- Update wallet
  UPDATE user_wallets
  SET total_credits = total_credits + p_credits,
      available_credits = available_credits + p_credits
  WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO credit_transactions
    (transaction_id, user_id, intent_id, action, credits, balance_before, balance_after, description, created_at)
  VALUES
    (v_transaction_id, p_user_id, p_intent_id, 'GRANT', p_credits, v_balance_before, v_balance_after, 'Payment verified', NOW());
END$$
DELIMITER ;

-- Procedure: Expire old intents
DELIMITER $$
CREATE PROCEDURE expire_old_intents()
BEGIN
  UPDATE payment_intents
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  -- Log expirations
  INSERT INTO security_log (intent_id, event_type, reason, details)
  SELECT intent_id, 'EXPIRATION', 'Intent expired after 15 minutes',
         JSON_OBJECT('expires_at', expires_at, 'expired_at', NOW())
  FROM payment_intents
  WHERE status = 'expired'
    AND verified_at IS NULL;
END$$
DELIMITER ;

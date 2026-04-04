// ============================================================================
// ZAYVORA PAYMENT API - Backend Endpoints
// ============================================================================

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Database connection (configure based on your setup)
// const db = require('./database');

// ============================================================================
// SECTION 2: CREATE PAYMENT INTENT
// ============================================================================

router.post('/api/create-intent', async (req, res) => {
  try {
    const { user_id, package_id } = req.body;

    // Validate input
    if (!user_id || !package_id) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'user_id and package_id required'
      });
    }

    // Get package details
    const PACKAGES = {
      'starter': { credits: 50, amount: 99 },
      'pro': { credits: 120, amount: 799 },
      'enterprise': { credits: 1000, amount: 4999 }
    };

    const pkg = PACKAGES[package_id];
    if (!pkg) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PACKAGE',
        message: 'Package not found'
      });
    }

    // Generate intent_id: ZAYVORA_[timestamp]_[random]
    const timestamp = Math.floor(Date.now() / 1000);
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    const intent_id = `ZAYVORA_${timestamp}_${random}`;

    // Store intent in database
    // await db.query(
    //   'CALL create_payment_intent(?, ?, ?, ?)',
    //   [intent_id, user_id, pkg.credits, pkg.amount]
    // );

    // For demo, we'll simulate database storage
    const intent = {
      intent_id,
      user_id,
      credits: pkg.credits,
      amount: pkg.amount,
      status: 'pending',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    };

    // Store in memory (replace with actual database)
    global.paymentIntents = global.paymentIntents || {};
    global.paymentIntents[intent_id] = intent;

    // Generate UPI link
    const upiLink = buildUPILink(intent_id, pkg.amount);

    console.log(`[PAYMENT] Intent created: ${intent_id} for user ${user_id}`);

    res.json({
      success: true,
      intent_id,
      amount: pkg.amount,
      credits: pkg.credits,
      upi_link: upiLink,
      expires_in_seconds: 900 // 15 minutes
    });

  } catch (error) {
    console.error('Create intent error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

// ============================================================================
// SECTION 3: GENERATE UPI LINK
// ============================================================================

function buildUPILink(intent_id, amount) {
  const upiParams = {
    pa: 'dharam@viadecide',
    pn: 'Zayvora Engine',
    am: amount,
    cu: 'INR',
    tn: intent_id
  };

  const query = Object.entries(upiParams)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return `upi://pay?${query}`;
}

// ============================================================================
// SECTION 6: GRANT CREDITS
// ============================================================================

router.post('/api/grant-credits', async (req, res) => {
  try {
    const { intent_id, user_id, credits } = req.body;

    // Validate input
    if (!intent_id || !user_id || !credits) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'intent_id, user_id, and credits required'
      });
    }

    // Get intent from database
    // const intent = await db.query(
    //   'SELECT * FROM payment_intents WHERE intent_id = ?',
    //   [intent_id]
    // );

    // Simulate database lookup
    const intent = global.paymentIntents?.[intent_id];

    if (!intent) {
      return res.status(404).json({
        success: false,
        error: 'INTENT_NOT_FOUND',
        message: 'Payment intent not found'
      });
    }

    // Security checks
    if (intent.status === 'expired') {
      return res.status(400).json({
        success: false,
        error: 'INTENT_EXPIRED',
        message: 'Payment intent has expired'
      });
    }

    if (intent.status === 'paid') {
      return res.status(400).json({
        success: false,
        error: 'INTENT_ALREADY_PAID',
        message: 'Credits already granted for this intent'
      });
    }

    if (intent.user_id !== user_id) {
      logSecurityEvent(intent_id, user_id, 'USER_MISMATCH', 'User ID does not match intent');
      return res.status(403).json({
        success: false,
        error: 'USER_MISMATCH',
        message: 'Unauthorized'
      });
    }

    if (intent.credits !== credits) {
      logSecurityEvent(intent_id, user_id, 'CREDIT_MISMATCH',
        `Expected ${intent.credits} but received ${credits}`);
      return res.status(400).json({
        success: false,
        error: 'CREDIT_MISMATCH',
        message: 'Credit amount does not match'
      });
    }

    // Grant credits
    // await db.query(
    //   'CALL grant_credits(?, ?, ?)',
    //   [user_id, intent_id, credits]
    // );

    // Update intent status
    intent.status = 'paid';
    intent.verified_at = new Date();

    // Simulate wallet update
    global.userWallets = global.userWallets || {};
    if (!global.userWallets[user_id]) {
      global.userWallets[user_id] = {
        total_credits: 0,
        available_credits: 0
      };
    }
    global.userWallets[user_id].total_credits += credits;
    global.userWallets[user_id].available_credits += credits;

    console.log(`[PAYMENT] Credits granted: ${credits} to user ${user_id} (intent: ${intent_id})`);

    res.json({
      success: true,
      intent_id,
      credits,
      user_id,
      balance_after: global.userWallets[user_id].available_credits,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Grant credits error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

// ============================================================================
// SECTION 7: PAYMENT STATUS POLLING
// ============================================================================

router.get('/api/payment-status', async (req, res) => {
  try {
    const { intent_id } = req.query;

    if (!intent_id) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_INPUT',
        message: 'intent_id parameter required'
      });
    }

    // Get intent from database
    // const intent = await db.query(
    //   'SELECT * FROM payment_intents WHERE intent_id = ?',
    //   [intent_id]
    // );

    // Simulate database lookup
    const intent = global.paymentIntents?.[intent_id];

    if (!intent) {
      return res.status(404).json({
        success: false,
        error: 'INTENT_NOT_FOUND',
        message: 'Payment intent not found'
      });
    }

    const response = {
      success: true,
      intent_id,
      status: intent.status
    };

    if (intent.status === 'paid') {
      response.credits = intent.credits;
      response.verified_at = intent.verified_at;
      response.message = 'Payment confirmed! Credits added to your account.';
    } else if (intent.status === 'pending') {
      const expiresIn = Math.max(0, Math.floor((intent.expires_at - Date.now()) / 1000));
      response.expires_in_seconds = expiresIn;
      response.message = 'Waiting for payment confirmation...';
    } else if (intent.status === 'expired') {
      response.message = 'Payment intent has expired. Please create a new payment.';
    }

    res.json(response);

  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

// ============================================================================
// SECTION 8: GET USER WALLET
// ============================================================================

router.get('/api/user-wallet/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    // Get wallet from database
    // const wallet = await db.query(
    //   'SELECT * FROM user_wallets WHERE user_id = ?',
    //   [user_id]
    // );

    // Simulate database lookup
    const wallet = global.userWallets?.[user_id] || {
      user_id,
      total_credits: 0,
      available_credits: 0
    };

    res.json({
      success: true,
      user_id,
      ...wallet
    });

  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

// ============================================================================
// SECTION 9: EXPIRE OLD INTENTS (Cron Job)
// ============================================================================

async function expireOldIntents() {
  try {
    // This runs every minute
    // await db.query('CALL expire_old_intents()');

    // Simulate expiration
    const now = Date.now();
    global.paymentIntents = global.paymentIntents || {};

    for (const [intentId, intent] of Object.entries(global.paymentIntents)) {
      if (intent.status === 'pending' && intent.expires_at < now) {
        intent.status = 'expired';
        console.log(`[EXPIRATION] Intent expired: ${intentId}`);
        logSecurityEvent(intentId, intent.user_id, 'EXPIRATION', 'Intent expired after 15 minutes');
      }
    }
  } catch (error) {
    console.error('Expire intents error:', error);
  }
}

// Run expiration check every minute
setInterval(expireOldIntents, 60 * 1000);

// ============================================================================
// SECTION 10: SECURITY LOGGING
// ============================================================================

function logSecurityEvent(intent_id, user_id, event_type, reason, details = {}) {
  try {
    // Insert into security_log table
    // await db.query(
    //   'INSERT INTO security_log (intent_id, user_id, event_type, reason, details) VALUES (?, ?, ?, ?, ?)',
    //   [intent_id, user_id, event_type, reason, JSON.stringify(details)]
    // );

    // Simulate logging
    console.log(`[SECURITY] ${event_type}: ${reason} | Intent: ${intent_id} | User: ${user_id}`);

    global.securityLog = global.securityLog || [];
    global.securityLog.push({
      intent_id,
      user_id,
      event_type,
      reason,
      details,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Security logging error:', error);
  }
}

// ============================================================================
// SECTION 11: PAYMENT RECONCILIATION ENDPOINT
// ============================================================================

router.get('/api/payment-reconciliation', async (req, res) => {
  try {
    // Get statistics from ledger
    // const stats = await db.query(`
    //   SELECT
    //     COUNT(*) as total_transactions,
    //     SUM(amount) as total_amount,
    //     COUNT(DISTINCT user_id) as unique_users,
    //     SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
    //     SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
    //     SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_count
    //   FROM payment_ledger
    // `);

    // Simulate stats
    const intents = global.paymentIntents || {};
    const stats = {
      total_intents: Object.keys(intents).length,
      paid_count: Object.values(intents).filter(i => i.status === 'paid').length,
      pending_count: Object.values(intents).filter(i => i.status === 'pending').length,
      expired_count: Object.values(intents).filter(i => i.status === 'expired').length,
      total_amount: Object.values(intents).reduce((sum, i) => sum + i.amount, 0),
      unique_users: new Set(Object.values(intents).map(i => i.user_id)).size
    };

    res.json({
      success: true,
      ...stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Reconciliation error:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error.message
    });
  }
});

module.exports = router;

// ============================================================================
// MAC MINI PAYMENT LISTENER SERVICE
// ============================================================================
// Runs on: Mac Mini (sovereign payment authority)
// Purpose: Listen for UPI payments and verify against payment intents
// Poll Interval: Every 3 seconds
// ============================================================================

const https = require('https');
const crypto = require('crypto');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  POLL_INTERVAL: 3000, // 3 seconds
  EXPIRATION_CHECK_INTERVAL: 60000, // 1 minute
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://daxini.xyz',
  LISTENER_ID: 'macmini-gandhidham-01',

  // Bank/UPI connection details (mock for demo)
  BANK_ENDPOINTS: {
    sms: '/bank/sms-transactions',
    webhook: '/bank/webhook-transactions',
    balance: '/bank/balance'
  }
};

// ============================================================================
// PAYMENT LISTENER STATE
// ============================================================================

const listenerState = {
  listener_id: CONFIG.LISTENER_ID,
  last_check: null,
  last_sms_id: null,
  last_webhook_id: null,
  pending_intents: 0,
  paid_intents: 0,
  status: 'running',
  stats: {
    total_checked: 0,
    total_verified: 0,
    total_failed: 0,
    start_time: new Date()
  }
};

// ============================================================================
// SECTION 4: PAYMENT LISTENER MAIN LOOP
// ============================================================================

class PaymentListener {
  constructor() {
    this.processedTransactions = new Set();
    this.pendingVerification = new Map();
  }

  async start() {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║     ZAYVORA PAYMENT LISTENER - Mac Mini Payment Authority     ║
╚════════════════════════════════════════════════════════════════╝
    `);
    console.log(`[LISTENER] Starting payment listener: ${CONFIG.LISTENER_ID}`);
    console.log(`[LISTENER] Poll interval: ${CONFIG.POLL_INTERVAL}ms`);
    console.log(`[LISTENER] Connected to: ${CONFIG.FRONTEND_URL}`);

    // Start main polling loop
    this.pollInterval = setInterval(() => this.checkNewTransactions(), CONFIG.POLL_INTERVAL);

    // Start expiration check loop
    this.expirationInterval = setInterval(() => this.expireOldIntents(), CONFIG.EXPIRATION_CHECK_INTERVAL);

    // Start status reporter
    this.statusInterval = setInterval(() => this.reportStatus(), 30000);
  }

  stop() {
    console.log('[LISTENER] Stopping payment listener...');
    clearInterval(this.pollInterval);
    clearInterval(this.expirationInterval);
    clearInterval(this.statusInterval);
    listenerState.status = 'stopped';
  }

  // ========================================================================
  // SECTION 4: CHECK NEW TRANSACTIONS (Every 3 seconds)
  // ========================================================================

  async checkNewTransactions() {
    try {
      listenerState.last_check = new Date();

      // Step 1: Get new transactions from multiple sources
      const smsTransactions = await this.fetchSMSTransactions();
      const webhookTransactions = await this.fetchWebhookTransactions();
      const allTransactions = [...smsTransactions, ...webhookTransactions];

      if (allTransactions.length === 0) {
        return; // No new transactions
      }

      // Step 2: Process each transaction
      for (const transaction of allTransactions) {
        if (this.processedTransactions.has(transaction.transaction_id)) {
          continue; // Already processed
        }

        // Step 3: Intent matching
        const matched = await this.matchPaymentToIntent(transaction);

        if (matched) {
          this.processedTransactions.add(transaction.transaction_id);
          listenerState.stats.total_verified++;
        }
      }

      listenerState.stats.total_checked += allTransactions.length;
    } catch (error) {
      console.error('[LISTENER] Check transactions error:', error);
      listenerState.stats.total_failed++;
    }
  }

  // Fetch SMS-based transactions (mock)
  async fetchSMSTransactions() {
    try {
      // In production, integrate with SMS gateway or bank notification service
      // For demo, return empty array
      return [];
    } catch (error) {
      console.error('[SMS] Fetch error:', error);
      return [];
    }
  }

  // Fetch webhook-based transactions (mock)
  async fetchWebhookTransactions() {
    try {
      // In production, this endpoint would be called by bank/UPI provider
      // For demo, return sample transactions
      return this.generateMockTransactions();
    } catch (error) {
      console.error('[WEBHOOK] Fetch error:', error);
      return [];
    }
  }

  // Generate mock transactions for testing
  generateMockTransactions() {
    // This is for demo/testing only
    // In production, transactions come from bank/UPI provider
    return [];
  }

  // ========================================================================
  // SECTION 5: INTENT MATCHING
  // ========================================================================

  async matchPaymentToIntent(transaction) {
    try {
      const { transaction_id, amount, note, timestamp, source } = transaction;

      // Step 1: Extract intent_id from payment note
      const intent_id = this.extractIntentId(note);
      if (!intent_id) {
        console.log(`[MATCH] Invalid intent ID in note: ${note}`);
        return false;
      }

      // Step 2: Get intent from frontend API
      const intent = await this.fetchIntent(intent_id);
      if (!intent) {
        console.log(`[MATCH] Intent not found: ${intent_id}`);
        await this.logSecurityEvent(intent_id, null, 'INTENT_NOT_FOUND', `Intent ${intent_id} not found`);
        return false;
      }

      // Step 3: Validate payment matches intent
      if (!this.validatePayment(transaction, intent)) {
        return false;
      }

      // Step 4: Mark intent as paid on frontend
      const verified = await this.verifyPayment(intent_id, timestamp);
      if (!verified) {
        console.log(`[VERIFY] Failed to verify payment: ${intent_id}`);
        return false;
      }

      // Step 5: Grant credits
      const granted = await this.grantCredits(intent);
      if (!granted) {
        console.log(`[GRANT] Failed to grant credits: ${intent_id}`);
        return false;
      }

      // Step 6: Log to ledger
      await this.logToLedger(transaction_id, intent_id, intent.user_id, amount, intent.credits, source);

      console.log(`
╔════════════════════════════════════════════════════════════════╗
║ ✓ PAYMENT VERIFIED AND CREDITED                               ║
╠════════════════════════════════════════════════════════════════╣
║ Intent:        ${intent_id.padEnd(50)} ║
║ User:          ${intent.user_id.padEnd(50)} ║
║ Amount:        ₹${amount.toString().padEnd(46)} ║
║ Credits:       ${intent.credits.toString().padEnd(48)} ║
║ Source:        ${source.padEnd(50)} ║
║ Timestamp:     ${timestamp.toISOString().padEnd(46)} ║
╚════════════════════════════════════════════════════════════════╝
      `);

      return true;
    } catch (error) {
      console.error('[MATCH] Intent matching error:', error);
      return false;
    }
  }

  // Extract intent_id from payment note
  extractIntentId(note) {
    if (!note) return null;

    // Pattern: ZAYVORA_[timestamp]_[random]
    const match = note.match(/ZAYVORA_\d+_[A-Z0-9]+/);
    return match ? match[0] : null;
  }

  // Validate payment matches intent
  validatePayment(transaction, intent) {
    // Check 1: Amount matches
    if (transaction.amount !== intent.amount) {
      console.log(`[VALIDATE] Amount mismatch: expected ${intent.amount}, got ${transaction.amount}`);
      this.logSecurityEvent(intent.intent_id, intent.user_id, 'AMOUNT_MISMATCH',
        `Expected ₹${intent.amount}, got ₹${transaction.amount}`);
      return false;
    }

    // Check 2: Intent not already paid
    if (intent.status === 'paid') {
      console.log(`[VALIDATE] Intent already paid: ${intent.intent_id}`);
      this.logSecurityEvent(intent.intent_id, intent.user_id, 'DUPLICATE_PAYMENT',
        'Payment already processed for this intent');
      return false;
    }

    // Check 3: Intent not expired
    if (intent.status === 'expired') {
      console.log(`[VALIDATE] Intent expired: ${intent.intent_id}`);
      this.logSecurityEvent(intent.intent_id, intent.user_id, 'EXPIRED_INTENT',
        'Cannot process payment for expired intent');
      return false;
    }

    return true;
  }

  // ========================================================================
  // SECTION 6: CREDIT DELIVERY
  // ========================================================================

  async grantCredits(intent) {
    try {
      const response = await this.apiCall('POST', '/api/grant-credits', {
        intent_id: intent.intent_id,
        user_id: intent.user_id,
        credits: intent.credits
      });

      if (response.success) {
        console.log(`[GRANT] Credits granted: ${intent.credits} to ${intent.user_id}`);
        return true;
      } else {
        console.error(`[GRANT] Failed: ${response.error}`);
        return false;
      }
    } catch (error) {
      console.error('[GRANT] Error:', error);
      return false;
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  async fetchIntent(intent_id) {
    try {
      const response = await this.apiCall('GET', `/api/payment-status?intent_id=${intent_id}`);
      if (response.success) {
        return {
          intent_id,
          ...response
        };
      }
      return null;
    } catch (error) {
      console.error(`[FETCH] Intent error: ${error.message}`);
      return null;
    }
  }

  async verifyPayment(intent_id, timestamp) {
    try {
      // In production: call /api/verify-payment endpoint
      // For now, return true (payment verification happens in matchPaymentToIntent)
      return true;
    } catch (error) {
      console.error(`[VERIFY] Error: ${error.message}`);
      return false;
    }
  }

  async logToLedger(transaction_id, intent_id, user_id, amount, credits, source) {
    try {
      // Log payment to ledger (for reconciliation)
      // This is informational - actual ledger stored on frontend
      console.log(`[LEDGER] Transaction recorded: ${transaction_id}`);
    } catch (error) {
      console.error(`[LEDGER] Error: ${error.message}`);
    }
  }

  async logSecurityEvent(intent_id, user_id, event_type, reason) {
    try {
      await this.apiCall('POST', '/api/security-log', {
        intent_id,
        user_id,
        event_type,
        reason,
        source: 'payment-listener'
      });
    } catch (error) {
      console.error(`[SECURITY] Logging error: ${error.message}`);
    }
  }

  async expireOldIntents() {
    // This is handled by frontend, but listener can trigger check
    try {
      const response = await this.apiCall('GET', '/api/payment-reconciliation');
      if (response.success) {
        listenerState.pending_intents = response.pending_count;
        listenerState.paid_intents = response.paid_count;
      }
    } catch (error) {
      console.error('[EXPIRE] Check error:', error);
    }
  }

  reportStatus() {
    const uptime = Math.floor((Date.now() - listenerState.stats.start_time) / 1000);
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║ PAYMENT LISTENER STATUS                                        ║
╠════════════════════════════════════════════════════════════════╣
║ Status:        ${listenerState.status.padEnd(50)} ║
║ Uptime:        ${uptime}s (${Math.floor(uptime / 60)} minutes)
║ Transactions:  Checked: ${listenerState.stats.total_checked} | Verified: ${listenerState.stats.total_verified} | Failed: ${listenerState.stats.total_failed}
║ Pending:       ${listenerState.pending_intents} intents
║ Paid:          ${listenerState.paid_intents} intents
║ Last Check:    ${listenerState.last_check?.toISOString().slice(11, 19)}
╚════════════════════════════════════════════════════════════════╝
    `);
  }

  // Make API call to frontend server
  apiCall(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(CONFIG.FRONTEND_URL + path);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Zayvora-PaymentListener/1.0',
          'X-Listener-ID': CONFIG.LISTENER_ID
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${responseData}`));
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }
}

// ============================================================================
// STARTUP
// ============================================================================

const listener = new PaymentListener();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[LISTENER] Shutdown signal received...');
  listener.stop();
  setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
  console.log('\n[LISTENER] Termination signal received...');
  listener.stop();
  setTimeout(() => process.exit(0), 1000);
});

// Start listener
listener.start();

module.exports = listener;

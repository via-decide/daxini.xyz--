# Zayvora Instant Payment Verification System

## Overview

The Zayvora payment system enables **instant credit delivery (<3 seconds)** using a Mac Mini as the sovereign payment authority. Payments are verified through UPI deep links and a polling-based architecture that doesn't depend on third-party APIs.

---

## System Architecture

```
User
  ↓
Visit /zayvora-pricing
  ↓
Click "Buy Selected Credits"
  ↓
POST /api/create-intent
  ↓
Intent created (status: pending)
  ↓
Generate UPI deep link
  ↓
User opens UPI app and pays
  ↓
Mac Mini payment listener detects transaction
  ↓
Extract intent_id from payment note
  ↓
Match to database record
  ↓
Verify amount matches
  ↓
Update intent status: paid
  ↓
POST /api/grant-credits
  ↓
Credits added to user wallet
  ↓
Frontend polls /api/payment-status
  ↓
Payment confirmed → Credits appear in account
```

---

## Database Schema

### Table 1: payment_intents

Tracks all payment intents created by users.

```sql
CREATE TABLE payment_intents (
  intent_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  credits INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, paid, expired
  created_at TIMESTAMP,
  verified_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

**Status Values:**
- `pending` — Waiting for payment
- `paid` — Payment verified and credits granted
- `expired` — Intent older than 15 minutes (auto-expired)

### Table 2: payment_ledger

Immutable ledger of all transactions (for reconciliation).

```sql
CREATE TABLE payment_ledger (
  ledger_id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id TEXT UNIQUE,
  intent_id TEXT FOREIGN KEY,
  user_id TEXT,
  amount INTEGER,
  credits INTEGER,
  status TEXT,
  source TEXT,  -- 'sms', 'webhook', 'bank_notification'
  payment_timestamp TIMESTAMP,
  received_at TIMESTAMP
);
```

### Table 3: user_wallets

Current user credit balances.

```sql
CREATE TABLE user_wallets (
  user_id TEXT PRIMARY KEY,
  total_credits BIGINT,
  available_credits BIGINT,
  pending_credits BIGINT,
  last_updated TIMESTAMP
);
```

### Table 4: credit_transactions

All credit movements (grants, usage, refunds).

```sql
CREATE TABLE credit_transactions (
  transaction_id TEXT PRIMARY KEY,
  user_id TEXT,
  intent_id TEXT,
  action TEXT,  -- 'GRANT', 'USE', 'REFUND'
  credits INTEGER,
  balance_before BIGINT,
  balance_after BIGINT,
  created_at TIMESTAMP
);
```

### Table 5: security_log

Security events (rejections, mismatches, expirations).

```sql
CREATE TABLE security_log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  intent_id TEXT,
  user_id TEXT,
  event_type TEXT,  -- 'AMOUNT_MISMATCH', 'DUPLICATE_PAYMENT', etc.
  reason TEXT,
  details JSON,
  created_at TIMESTAMP
);
```

---

## API Endpoints

### 1. POST /api/create-intent

Create a new payment intent.

**Request:**
```json
{
  "user_id": "demo",
  "package_id": "starter"  // starter, pro, enterprise
}
```

**Response:**
```json
{
  "success": true,
  "intent_id": "ZAYVORA_1712332444_A82D",
  "amount": 99,
  "credits": 50,
  "upi_link": "upi://pay?pa=dharam@viadecide&pn=Zayvora%20Engine&am=99&cu=INR&tn=ZAYVORA_1712332444_A82D",
  "expires_in_seconds": 900
}
```

**Intent ID Format:**
```
ZAYVORA_[unix_timestamp]_[random_hex]
ZAYVORA_1712332444_A82D
```

### 2. GET /api/payment-status

Poll for payment verification status.

**Request:**
```
GET /api/payment-status?intent_id=ZAYVORA_1712332444_A82D
```

**Response (Pending):**
```json
{
  "success": true,
  "intent_id": "ZAYVORA_1712332444_A82D",
  "status": "pending",
  "expires_in_seconds": 420,
  "message": "Waiting for payment confirmation..."
}
```

**Response (Paid):**
```json
{
  "success": true,
  "intent_id": "ZAYVORA_1712332444_A82D",
  "status": "paid",
  "credits": 50,
  "verified_at": "2026-04-04T10:20:00Z",
  "message": "Payment confirmed! Credits added to your account."
}
```

**Response (Expired):**
```json
{
  "success": true,
  "intent_id": "ZAYVORA_1712332444_A82D",
  "status": "expired",
  "message": "Payment intent has expired. Please create a new payment."
}
```

### 3. POST /api/grant-credits

Grant credits after payment verification.

**Request:**
```json
{
  "intent_id": "ZAYVORA_1712332444_A82D",
  "user_id": "demo",
  "credits": 50
}
```

**Response:**
```json
{
  "success": true,
  "intent_id": "ZAYVORA_1712332444_A82D",
  "credits": 50,
  "user_id": "demo",
  "balance_after": 150,
  "timestamp": "2026-04-04T10:20:00Z"
}
```

### 4. GET /api/user-wallet/:user_id

Get user's current credit balance.

**Response:**
```json
{
  "success": true,
  "user_id": "demo",
  "total_credits": 150,
  "available_credits": 150,
  "pending_credits": 0
}
```

### 5. GET /api/payment-reconciliation

Get payment system statistics (for monitoring).

**Response:**
```json
{
  "success": true,
  "total_intents": 42,
  "paid_count": 38,
  "pending_count": 2,
  "expired_count": 2,
  "total_amount": 15850,
  "unique_users": 12,
  "timestamp": "2026-04-04T10:20:00Z"
}
```

---

## Mac Mini Payment Listener

### Overview

The payment listener runs as a service on the Mac Mini and:
1. Polls for new transactions every 3 seconds
2. Extracts intent_id from payment note
3. Matches payment to intent in database
4. Validates amount matches
5. Grants credits instantly
6. Logs to ledger for reconciliation

### Configuration

**File:** `payment-listener.js`

```javascript
const CONFIG = {
  POLL_INTERVAL: 3000,              // Check every 3 seconds
  EXPIRATION_CHECK_INTERVAL: 60000,  // Expire intents every minute
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  FRONTEND_URL: 'https://daxini.xyz',
  LISTENER_ID: 'macmini-gandhidham-01'
};
```

### Startup

```bash
# Install dependencies
npm install

# Start listener
node payment-listener.js

# Expected output:
# [LISTENER] Starting payment listener: macmini-gandhidham-01
# [LISTENER] Poll interval: 3000ms
# [LISTENER] Connected to: https://daxini.xyz
```

### How It Works

#### Step 1: Poll for Transactions (Every 3 seconds)

```javascript
async checkNewTransactions() {
  // Fetch from multiple sources
  const smsTransactions = await fetchSMSTransactions();
  const webhookTransactions = await fetchWebhookTransactions();
  
  // Process each transaction
  for (const transaction of allTransactions) {
    await matchPaymentToIntent(transaction);
  }
}
```

#### Step 2: Intent Matching

```javascript
async matchPaymentToIntent(transaction) {
  // Extract intent_id from payment note
  const intent_id = extractIntentId(transaction.note);
  // "ZAYVORA_1712332444_A82D" → extracted from UPI note field
  
  // Fetch intent from database
  const intent = await fetchIntent(intent_id);
  
  // Validate
  if (transaction.amount !== intent.amount) {
    logSecurityEvent('AMOUNT_MISMATCH');
    return;
  }
  
  if (intent.status !== 'pending') {
    logSecurityEvent('DUPLICATE_PAYMENT');
    return;
  }
  
  // Grant credits
  await grantCredits(intent);
}
```

#### Step 3: Credit Delivery

```javascript
async grantCredits(intent) {
  // Call frontend API
  const response = await apiCall('POST', '/api/grant-credits', {
    intent_id: intent.intent_id,
    user_id: intent.user_id,
    credits: intent.credits
  });
  
  // Credits now available in user wallet
  console.log('✓ Credits granted: ' + intent.credits);
}
```

### Monitoring

The listener reports status every 30 seconds:

```
╔════════════════════════════════════════════════════════════════╗
║ PAYMENT LISTENER STATUS                                        ║
╠════════════════════════════════════════════════════════════════╣
║ Status:        running
║ Uptime:        3542s (59 minutes)
║ Transactions:  Checked: 1245 | Verified: 1189 | Failed: 12
║ Pending:       3 intents
║ Paid:          1189 intents
║ Last Check:    10:20:42
╚════════════════════════════════════════════════════════════════╝
```

---

## UPI Deep Link Format

### Structure

```
upi://pay?pa=[payee_address]&pn=[payee_name]&am=[amount]&cu=[currency]&tn=[transaction_note]
```

### Example

```
upi://pay?pa=dharam@viadecide&pn=Zayvora%20Engine&am=99&cu=INR&tn=ZAYVORA_1712332444_A82D
```

### Parameters

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `pa` | `dharam@viadecide` | UPI ID (payee address) |
| `pn` | `Zayvora Engine` | Payee name |
| `am` | `99` | Amount in INR |
| `cu` | `INR` | Currency |
| `tn` | `ZAYVORA_1712332444_A82D` | **Transaction note (intent_id)** |

**Critical:** The `tn` parameter contains the intent_id, which allows the payment listener to match payments to intents.

---

## Frontend Payment Status Page

### URL

```
/payment-status?intent_id=ZAYVORA_1712332444_A82D
```

### Polling Behavior

**File:** `payment-status.html`

```javascript
// Poll every 3 seconds
setInterval(checkPaymentStatus, 3000);

async function checkPaymentStatus() {
  const response = await fetch(
    `/api/payment-status?intent_id=${intent_id}`
  );
  const data = await response.json();
  
  if (data.status === 'paid') {
    showSuccessMessage();
    stopPolling();
  } else if (data.status === 'pending') {
    updateCountdown(data.expires_in_seconds);
  } else if (data.status === 'expired') {
    showExpiredMessage();
    stopPolling();
  }
}
```

### User Experience

1. **Click "Buy Selected Credits"** on pricing page
2. **Redirect to /payment-status?intent_id=ZAYVORA_...**
3. **Page shows spinner** "Waiting for payment..."
4. **User opens UPI app** and completes payment within 15 minutes
5. **Mac Mini listener detects payment** and verifies it matches intent
6. **Credits granted instantly** (within 3 seconds)
7. **Frontend polls detect status = 'paid'**
8. **UI updates:** Shows ✓ Payment Confirmed! + Credits badge
9. **User can view credits** or return to pricing page

---

## Intent Expiration System

### How It Works

```javascript
// Run every minute
setInterval(expireOldIntents, 60 * 1000);

async function expireOldIntents() {
  // Find intents older than 15 minutes with status = pending
  const expiredIntents = db.query(
    'UPDATE payment_intents SET status = "expired" 
     WHERE status = "pending" AND expires_at < NOW()'
  );
  
  // Log expiration events
  for (const intent of expiredIntents) {
    logSecurityEvent(intent.id, 'EXPIRATION', 'Intent expired');
  }
}
```

### Timeline

- **T+0s** — Intent created, status = pending, expires_at = T+900s
- **T+1-900s** — User can pay, listener matches payment
- **T+900s** — Intent auto-expires if not paid, status = expired
- **T+900s+** — Cannot grant credits for expired intent

---

## Security Validations

### Payment Rejection Criteria

A payment is rejected if ANY of the following are true:

1. **Amount Mismatch**
   - Expected: ₹799
   - Received: ₹799.50
   - Action: Log `AMOUNT_MISMATCH`, reject payment

2. **Intent Not Found**
   - Payment note: `ZAYVORA_1712332444_A82D`
   - Database lookup: No result
   - Action: Log `INTENT_NOT_FOUND`, reject

3. **Intent Expired**
   - Created: 10:00:00
   - Payment received: 10:20:00 (20 minutes later)
   - Expires at: 10:15:00
   - Action: Log `EXPIRED_INTENT`, reject

4. **Duplicate Payment**
   - Intent status: `paid` (already verified)
   - New payment received for same intent
   - Action: Log `DUPLICATE_PAYMENT`, reject

5. **User Mismatch**
   - Intent created by: user_id = "alice"
   - User requesting credit grant: user_id = "bob"
   - Action: Log `USER_MISMATCH`, reject

### Security Logging

All rejected payments are logged to `security_log`:

```sql
INSERT INTO security_log (intent_id, user_id, event_type, reason, details)
VALUES (
  'ZAYVORA_1712332444_A82D',
  'demo',
  'AMOUNT_MISMATCH',
  'Expected ₹799, got ₹798',
  JSON_OBJECT('expected', 799, 'received', 798)
);
```

---

## Reconciliation & Ledger

### Payment Ledger

All transactions are recorded in an immutable ledger:

```sql
INSERT INTO payment_ledger (
  transaction_id,
  intent_id,
  user_id,
  amount,
  credits,
  status,
  source,
  payment_timestamp,
  received_at
) VALUES (
  'TXN_1712332444_ABC123',
  'ZAYVORA_1712332444_A82D',
  'demo',
  799,
  120,
  'paid',
  'upi_sms',
  '2026-04-04T10:20:00Z',
  '2026-04-04T10:20:01Z'
);
```

### Reconciliation Queries

**Get all payments for user:**
```sql
SELECT * FROM payment_ledger
WHERE user_id = 'demo'
ORDER BY received_at DESC;
```

**Get today's revenue:**
```sql
SELECT 
  COUNT(*) as transaction_count,
  SUM(amount) as total_revenue,
  SUM(credits) as total_credits_sold
FROM payment_ledger
WHERE DATE(received_at) = CURDATE()
  AND status = 'paid';
```

**Find rejected payments:**
```sql
SELECT * FROM security_log
WHERE event_type IN ('AMOUNT_MISMATCH', 'DUPLICATE_PAYMENT', 'EXPIRED_INTENT')
ORDER BY created_at DESC;
```

---

## Testing

### Manual Test Flow

1. **Create Intent:**
   ```bash
   curl -X POST http://localhost:3000/api/create-intent \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "demo",
       "package_id": "starter"
     }'
   ```

2. **Response:**
   ```json
   {
     "intent_id": "ZAYVORA_1712332444_A82D",
     "amount": 99,
     "credits": 50,
     "upi_link": "upi://pay?pa=dharam@viadecide&..."
   }
   ```

3. **Check Status (Pending):**
   ```bash
   curl http://localhost:3000/api/payment-status?intent_id=ZAYVORA_1712332444_A82D
   ```

4. **Simulate Payment (Listener detects it):**
   - In production: User completes payment via UPI app
   - Mac Mini listener matches payment to intent
   - Listener calls /api/grant-credits

5. **Check Status (Paid):**
   ```bash
   curl http://localhost:3000/api/payment-status?intent_id=ZAYVORA_1712332444_A82D
   # Returns: { status: "paid", credits: 50 }
   ```

6. **Verify User Wallet:**
   ```bash
   curl http://localhost:3000/api/user-wallet/demo
   # Returns: { available_credits: 50 }
   ```

---

## Monitoring & Alerts

### Key Metrics

- **Payment Verification Latency:** Should be <3 seconds
- **Intent Expiration Rate:** Should be low (<5%)
- **Security Event Rate:** Any increase indicates potential issues
- **Listener Uptime:** Should be >99.9%

### Health Check Endpoint

```
GET /api/payment-reconciliation
```

Returns:
```json
{
  "total_intents": 1250,
  "paid_count": 1189,
  "pending_count": 45,
  "expired_count": 16,
  "total_amount": 847350,
  "unique_users": 342
}
```

---

## Production Deployment

### Prerequisites

- Mac Mini with Node.js 16+
- MySQL or PostgreSQL database
- HTTPS enabled on daxini.xyz
- UPI integration configured

### Steps

1. **Set up database:**
   ```bash
   mysql < database.sql
   ```

2. **Install dependencies:**
   ```bash
   npm install express mysql2
   ```

3. **Start API server:**
   ```bash
   node server.js  # Includes payment-api.js routes
   ```

4. **Start payment listener (on Mac Mini):**
   ```bash
   node payment-listener.js
   ```

5. **Monitor:**
   ```bash
   tail -f listener.log  # Watch for payment verifications
   ```

---

## Summary

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Intent Creation** | Node.js/Express | Create payment intents on demand |
| **UPI Links** | UPI Deep Link Protocol | Launch user's UPI app with payment details |
| **Payment Listener** | Mac Mini Service | Detect and verify payments in real-time |
| **Polling** | Frontend JavaScript | Check payment status every 3 seconds |
| **Database** | MySQL/PostgreSQL | Store intents, ledger, wallets, security logs |
| **Ledger** | Immutable log | Reconciliation and audit trail |

**Result:** Instant credit delivery without third-party payment gateway dependency.

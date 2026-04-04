# Zayvora Credit Delivery API

## Endpoint: POST /api/credits/grant

**Purpose:** Grant credits to a user after successful UPI payment verification.

### Request Payload

```json
{
  "intent_id": "550e8400-e29b-41d4-a716-446655440000",
  "credits": 50
}
```

### Request Headers
```
Content-Type: application/json
```

### Response Success (200 OK)

```json
{
  "success": true,
  "intent_id": "550e8400-e29b-41d4-a716-446655440000",
  "credits": 50,
  "balance_after": 150,
  "timestamp": 1712233838000,
  "message": "Credits successfully added to account"
}
```

### Response Error (400/403)

```json
{
  "success": false,
  "error": "INVALID_INTENT",
  "message": "Intent not found or already processed"
}
```

---

## Implementation Requirements

### 1. Intent Verification
- Validate `intent_id` exists in payment intents table
- Check that intent status is `PENDING` (not already `COMPLETED`)
- Verify intent hasn't expired (max 24 hours old)

### 2. Credit Addition
- Look up user from authenticated session
- Add `credits` to user's account atomically
- Record transaction in audit log

### 3. Intent Status Update
- Mark intent as `COMPLETED`
- Store timestamp and user_id reference
- Prevent duplicate processing

### 4. Response Format
- Always return the new balance after credit addition
- Include timestamp for verification
- Return the same intent_id for audit trail

---

## Security Considerations

1. **Authentication Required**: Only authenticated users can grant credits
2. **Intent Signing**: Validate HMAC-SHA256 signature in payment payload
3. **Idempotency**: Implement idempotent processing (same intent_id = same response)
4. **Rate Limiting**: Limit credit grant requests to 1 per second per user
5. **Audit Trail**: Log all credit transactions with user_id, intent_id, timestamp

---

## Payment Intent Structure

The payment intent includes:
- `intent_id` — UUID (unique per transaction)
- `package_id` — Package identifier (starter, pro, enterprise)
- `credits` — Number of credits to grant
- `amount` — Price in INR (e.g., 99)
- `timestamp` — Unix timestamp of intent creation
- `node_id` — Server node identifier

### Signature Verification

```
payload_v1 = base64(JSON.stringify(intent))
signature = HMAC-SHA256(payload_v1 + intent_id, SECRET_KEY)
```

The client sends:
- `payload` — Base64-encoded intent
- `sig` — Hex-encoded HMAC-SHA256 signature
- `intent` — UUID for quick lookup

---

## Database Schema

### payment_intents Table

```sql
CREATE TABLE payment_intents (
  intent_id UUID PRIMARY KEY,
  user_id VARCHAR(255),
  package_id VARCHAR(50),
  credits INT,
  amount INT,
  status ENUM('PENDING', 'COMPLETED', 'FAILED'),
  payload_hash VARCHAR(256),
  signature_hash VARCHAR(256),
  created_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

### credit_transactions Table

```sql
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255),
  intent_id UUID FOREIGN KEY,
  credits INT,
  action ENUM('GRANT', 'USE', 'REFUND'),
  balance_before INT,
  balance_after INT,
  timestamp TIMESTAMP,
  created_at TIMESTAMP
);
```

---

## Example Flow

1. **Client Creates Intent**
   ```
   intent_id = uuid()
   payload = base64({intent_id, package_id, credits, amount, timestamp})
   signature = HMAC-SHA256(payload + intent_id, SECRET_KEY)
   upiLink = upi://pay?pa=dharam@viadecide&am=99&tn=ZAYVORA_uuid
   ```

2. **User Pays via UPI**
   - UPI payment confirmed by PhonePe/Bank

3. **Client Calls Credit Grant**
   ```
   POST /api/credits/grant
   {
     "intent_id": "...",
     "credits": 50
   }
   ```

4. **Server Validates & Grants**
   - Verify intent exists and is PENDING
   - Update user's credit balance
   - Mark intent as COMPLETED
   - Return new balance

---

## Error Codes

| Code | Meaning |
|------|---------|
| `INVALID_INTENT` | Intent ID not found |
| `EXPIRED_INTENT` | Intent older than 24 hours |
| `ALREADY_PROCESSED` | Intent already marked as COMPLETED |
| `INVALID_SIGNATURE` | Signature verification failed |
| `UNAUTHENTICATED` | User not logged in |
| `INVALID_AMOUNT` | Credits amount is invalid |
| `RATE_LIMIT` | Too many requests |

---

## Testing

### Manual Test Curl Request

```bash
curl -X POST http://localhost:3000/api/credits/grant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN" \
  -d '{
    "intent_id": "550e8400-e29b-41d4-a716-446655440000",
    "credits": 50
  }'
```

### Expected Response

```json
{
  "success": true,
  "intent_id": "550e8400-e29b-41d4-a716-446655440000",
  "credits": 50,
  "balance_after": 150,
  "timestamp": 1712233838000,
  "message": "Credits successfully added to account"
}
```

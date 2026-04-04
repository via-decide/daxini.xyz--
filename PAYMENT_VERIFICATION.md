# Zayvora Payment Engine - Verification Guide

## Overview

This guide verifies that the Zayvora AI credit store implements:
1. ✅ Stateless payment intents with cryptographic signing
2. ✅ UPI payment deep links without page redirects
3. ✅ Correct credit pricing mathematics
4. ✅ Secure payment verification
5. ✅ Credit delivery workflow

---

## Section 1: Package Definitions Verification

### Expected Behavior

The pricing page should display 3 packages with explicit pricing:

```javascript
const PACKAGES = [
  { id: 'starter', credits: 50, price: 99, description: 'Getting Started' },
  { id: 'pro', credits: 120, price: 799, description: 'Heavy Users', bonus: '20%' },
  { id: 'enterprise', credits: 1000, price: 4999, description: 'Enterprise' }
];
```

### Verification Steps

1. **Load pricing page**: Visit `https://daxini.xyz/zayvora-pricing`
2. **Check card display**: Verify 3 cards appear with correct credit amounts
3. **Verify per-credit calculation**:
   - Starter: ₹99 ÷ 50 = ₹1.98 per credit ✓
   - Pro: ₹799 ÷ 120 = ₹6.66 per credit ✓
   - Enterprise: ₹4999 ÷ 1000 = ₹4.99 per credit ✓
4. **Check bonus badge**: Pro package should show "20% Extra Credits"
5. **Dynamic rendering**: All values should be calculated, not hardcoded

### Test Command (Browser Console)

```javascript
// Verify packages
console.log(PACKAGES);
// Expected: Array with 3 packages

// Verify per-credit math
PACKAGES.forEach(pkg => {
  const perCredit = (pkg.price / pkg.credits).toFixed(2);
  console.log(`${pkg.id}: ₹${perCredit} per credit`);
});
```

**Expected Output:**
```
starter: ₹1.98 per credit
pro: ₹6.66 per credit
enterprise: ₹4.99 per credit
```

---

## Section 2: Payment Intent Creation

### Expected Behavior

Clicking "Buy Selected Credits" should:
1. NOT redirect page
2. Create stateless payment intent with UUID
3. Generate base64-encoded payload
4. Create HMAC-SHA256 signature
5. Return intent object with `intent_id`, `payload`, `signature`

### Verification Steps

1. **Select a package**: Click on any pricing card to select
2. **Open DevTools**: Press F12, go to Console tab
3. **Click Buy button**: Click "Buy Selected Credits"
4. **Check console logs**:
   - Should see: `Payment Intent: {intent, payload, signature, signed}`
   - Should NOT redirect to homepage
   - `signature` should be 64 hex characters (SHA256)

### Test Command (Browser Console)

```javascript
// After clicking Buy, check currentPaymentIntent
console.log(currentPaymentIntent);
```

**Expected Structure:**
```javascript
{
  intent: {
    intent_id: "550e8400-e29b-41d4-a716-446655440000",  // UUID
    package_id: "starter",
    credits: 50,
    amount: 99,
    timestamp: 1712233838000,
    node_id: "macmini-gandhidham-01"
  },
  payload: "eyJpbnRlbnRfaWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJwYWNrYWdlX2lkIjoic3RhcnRlciIsImNyZWRpdHMiOjUwLCJhbW91bnQiOjk5LCJ0aW1lc3RhbXAiOjE3MTIyMzM4MzgwMDAsIm5vZGVfaWQiOiJtYWNtaW5pLWdhbmRoaWRoYW0tMDEifQ==",  // Base64
  signature: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",  // 64 hex chars
  signed: true
}
```

### Verification Checklist

- [ ] `intent_id` is valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
- [ ] `payload` is base64-encoded (ends with = or ==)
- [ ] `signature` is 64 hex characters (0-9, a-f)
- [ ] `timestamp` is current Unix timestamp (13 digits)
- [ ] `node_id` matches "macmini-gandhidham-01"
- [ ] No page redirect occurred

---

## Section 3: UPI Payment Link Generation

### Expected Behavior

After intent creation, should generate UPI deep link in format:
```
upi://pay?pa=dharam@viadecide&pn=Zayvora%20Engine&am=[amount]&cu=INR&tn=ZAYVORA_[uuid-prefix]
```

### Verification Steps

1. **Check console for UPI link**: Look for log message
   ```
   UPI Link: upi://pay?pa=dharam@viadecide&pn=Zayvora%20Engine&am=99&cu=INR&tn=ZAYVORA_550e8400
   ```

2. **Verify UPI link components**:
   - `pa` (payee address): `dharam@viadecide` ✓
   - `pn` (payee name): `Zayvora%20Engine` ✓
   - `am` (amount): Matches selected package price ✓
   - `cu` (currency): `INR` ✓
   - `tn` (transaction note): `ZAYVORA_[8-char UUID prefix]` ✓

3. **Test UPI link validity** (optional):
   ```javascript
   // Decode the UPI link
   const upiLink = currentPaymentIntent.upiLink;
   const params = new URLSearchParams(upiLink.split('?')[1]);
   console.log({
     payee: params.get('pa'),
     name: decodeURIComponent(params.get('pn')),
     amount: params.get('am'),
     currency: params.get('cu'),
     tn: params.get('tn')
   });
   ```

### Test Command (Browser Console)

```javascript
// Verify UPI link for current intent
const upiLink = buildUPILink(currentPaymentIntent);
console.log('UPI Link:', upiLink);
```

**Expected Output:**
```
UPI Link: upi://pay?pa=dharam@viadecide&pn=Zayvora%20Engine&am=99&cu=INR&tn=ZAYVORA_550e8400
```

---

## Section 4: Sovereign Deep Link Generation

### Expected Behavior

Should also generate sovereign deep link in format:
```
sov://macmini-gandhidham-01/REVENUE_SETTLEMENT?payload=[base64]&sig=[hex]&intent=[uuid]
```

### Verification Steps

1. **Check console for sovereign link**:
   ```javascript
   const sovereignLink = buildSovereignLink(currentPaymentIntent);
   console.log('Sovereign Link:', sovereignLink);
   ```

2. **Verify link structure**:
   - Protocol: `sov://` ✓
   - Node ID: `macmini-gandhidham-01` ✓
   - Path: `/REVENUE_SETTLEMENT` ✓
   - Query params: `payload`, `sig`, `intent` ✓

3. **Parse and verify**:
   ```javascript
   const url = new URL(sovereignLink.replace('sov://', 'http://'));
   console.log({
     payload: url.searchParams.get('payload'),
     signature: url.searchParams.get('sig'),
     intent: url.searchParams.get('intent')
   });
   ```

---

## Section 5: QR Code Fallback

### Expected Behavior

If UPI app not available on desktop:
1. QR code modal should appear
2. QR should encode the UPI link
3. User can copy UPI link as fallback

### Verification Steps

1. **On desktop (no UPI app)**: 
   - Click "Buy Selected Credits"
   - Modal should appear with QR code
   - Modal should have "Copy UPI Link" button
   - Modal should display UPI link text

2. **Verify QR content**:
   ```javascript
   // The QR should contain the UPI link
   const qrText = currentPaymentIntent.upiLink;
   console.log('QR encodes:', qrText);
   ```

3. **Mobile device (with UPI)**: 
   - Should redirect directly to UPI app
   - NO modal should appear

---

## Section 6: Credit Grant Flow

### Expected Behavior

After successful UPI payment:
1. Client calls `/api/credits/grant` with `intent_id` and `credits`
2. Server verifies intent
3. Server adds credits to user account
4. Server marks intent as COMPLETED
5. Client receives new balance

### Verification Steps

1. **Mock the API call** (DevTools Network tab):
   ```javascript
   // Simulate payment completion
   const intentId = currentPaymentIntent.intent.intent_id;
   const credits = currentPaymentIntent.intent.credits;
   
   const response = await fetch('/api/credits/grant', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ intent_id: intentId, credits: credits })
   });
   
   const data = await response.json();
   console.log('Grant Response:', data);
   ```

2. **Expected Response**:
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

3. **Verify no redirect**: Page should remain on pricing page
4. **Check balance update**: User balance should reflect new total

---

## Section 7: Security Verification

### Signature Verification

1. **Verify HMAC-SHA256 signature**:
   ```javascript
   // The signature should be created as:
   // HMAC-SHA256(payload + intent_id, SECRET_KEY)
   
   const { payload, signature } = currentPaymentIntent;
   const { intent_id } = currentPaymentIntent.intent;
   
   // On server, verify:
   // const serverSig = HMAC-SHA256(payload + intent_id, SECRET_KEY);
   // serverSig === signature ? valid : invalid
   
   console.log('Signature (64 hex chars):', signature);
   console.log('Length:', signature.length); // Should be 64
   ```

2. **Verify payload integrity**:
   ```javascript
   const payload = currentPaymentIntent.payload;
   const decoded = JSON.parse(atob(payload));
   
   console.log('Decoded Payload:', decoded);
   // Should match currentPaymentIntent.intent
   ```

### Idempotency Check

1. **Same intent_id should return same state**:
   ```javascript
   // First grant
   const grant1 = await grantCredits(intentId, 50);
   
   // Second grant (same intent_id)
   const grant2 = await grantCredits(intentId, 50);
   
   // grant2 should return same balance, not double-add
   console.assert(grant1.balance_after === grant2.balance_after);
   ```

---

## Test Checklist

### ✅ Pricing & Math
- [ ] 3 packages display correctly
- [ ] Per-credit prices calculated correctly
- [ ] No hardcoded values in pricing display
- [ ] Bonus badge shows on Pro package

### ✅ Payment Intent
- [ ] Intent created with valid UUID
- [ ] Payload base64-encoded
- [ ] Signature is 64 hex characters
- [ ] No page redirect on button click

### ✅ UPI Links
- [ ] UPI link format correct
- [ ] Amount matches selected package
- [ ] Payee is dharam@viadecide
- [ ] Transaction note includes UUID

### ✅ Sovereign Link
- [ ] Sovereign link format correct
- [ ] Node ID: macmini-gandhidham-01
- [ ] Payload and signature present
- [ ] Intent ID included

### ✅ QR Fallback
- [ ] QR modal appears on desktop
- [ ] QR encodes UPI link
- [ ] Copy button works
- [ ] Modal can be closed

### ✅ Credit Delivery
- [ ] /api/credits/grant endpoint called
- [ ] Intent ID sent in request
- [ ] Credits sent in request
- [ ] Balance updated after grant
- [ ] No duplicate credit on re-call

### ✅ Security
- [ ] Signature verifiable
- [ ] Payload matches intent
- [ ] Idempotent processing
- [ ] No sensitive data in logs

---

## Debugging

### View All Intent Data
```javascript
console.log(JSON.stringify(currentPaymentIntent, null, 2));
```

### Decode Base64 Payload
```javascript
const decoded = atob(currentPaymentIntent.payload);
console.log(JSON.parse(decoded));
```

### Test Signature Generation
```javascript
// Verify signature matches expected format
const sig = currentPaymentIntent.signature;
console.log('Signature is valid hex:', /^[a-f0-9]{64}$/.test(sig));
```

### Monitor Network Requests
1. Open DevTools → Network tab
2. Click "Buy Selected Credits"
3. Look for requests to:
   - `/api/credits/grant` (after payment success)
   - Any payment provider APIs

---

## Success Criteria

✅ **All of the following must be true:**

1. Pricing page displays 3 packages with correct mathematics
2. Clicking "Buy" creates payment intent (no redirect)
3. Intent includes cryptographically signed payload
4. UPI link generated in correct format
5. QR fallback available on desktop
6. Credit grant endpoint callable with intent_id
7. Credits appear in user wallet without redirect
8. Same intent_id cannot grant credits twice
9. All sensitive data excluded from logs
10. Payment flow never redirects to homepage

---

## Performance Benchmarks

- Intent creation: < 100ms
- Signature generation: < 50ms
- QR generation: < 200ms
- Page remains responsive during payment: ✓

---

## Known Limitations (v1.0)

- QR fallback for desktop only (mobile uses UPI intent)
- Payment callback currently manual (production would use PhonePe webhook)
- SECRET_KEY stored in frontend (production: use server-side verification)
- No retry logic for failed grants (production: implement queue)

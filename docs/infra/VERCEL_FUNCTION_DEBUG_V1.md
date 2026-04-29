# VERCEL_FUNCTION_DEBUG_V1

## Problem Summary

- **Error:** 500 INTERNAL_SERVER_ERROR
- **Code:** FUNCTION_INVOCATION_FAILED
- **Platform:** Vercel serverless
- **Network:** OK
- **Vercel infra:** OK
- **Root issue:** Function crash

---

## Debug Strategy

### 1. Check Vercel Logs (CRITICAL FIRST STEP)

Run one of the following:

```bash
vercel logs daxini.xyz
```

Or check: **Vercel Dashboard → Functions → Logs**

Identify:

- Stack trace
- Runtime error
- Timeout
- Memory crash

---

## 2. Common Root Causes

### Runtime Crash

- Undefined variables
- Missing imports
- Bad async handling

### Environment Variables

- Missing `.env` keys
- Undefined API keys

**Action:** Verify all required env vars exist in the Vercel dashboard under **Settings → Environment Variables**.

### Dependency Issues

- Package not installed
- Incompatible version

**Action:**

```bash
npm install
# then redeploy
```

### Timeout / Heavy Logic

- Long-running function (>10s default limit)

**Action:**

- Move heavy logic to a background job
- Optimize execution path

### Memory Overflow

- Large payload or model load

**Action:**

- Reduce memory usage
- Stream responses instead of buffering

---

## 3. Entry Point Verification

Check:

- `/api/*` route files or serverless entry file
- Correct export format

**Example (Node.js):**

```js
export default async function handler(req, res) {
  res.status(200).json({ ok: true });
}
```

---

## 4. Minimal Reproduction

Replace the function body temporarily with:

```js
export default function handler(req, res) {
  res.status(200).send("OK");
}
```

If this works → the problem is inside the original logic, not the infrastructure.

---

## 5. Framework-Specific Checks

### Next.js

- API route location: `/pages/api/*`
- Watch for Edge vs Node runtime mismatch

### Edge Functions

- Unsupported Node.js APIs (e.g., `fs`, `path`, `child_process`)
- Use Web APIs only (`fetch`, `Request`, `Response`)

---

## 6. Deployment Validation

Clear build cache and force a fresh deploy:

```bash
vercel --force
```

---

## 7. Observability

Add structured logging around the failure point:

```js
console.log("START");
try {
  // logic
} catch (e) {
  console.error("FUNCTION ERROR:", e);
  throw e;
}
```

---

## 8. Fail-Safe Handling

Ensure all code paths return a response:

- No hanging promises
- No missing `res.end()`
- Wrap top-level async handlers in try/catch

---

## Constraints

- Must respond within Vercel execution limits (10s default, 60s Pro, 900s Enterprise)
- Must not crash silently
- Must log all failures with context

---

## Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Silent crashes | Add `console.error` logging everywhere |
| Env mismatch | Validate required env vars on startup |
| Heavy computation | Offload to background or optimize |
| Edge runtime mismatch | Enforce correct runtime in route config |

---

## Expected Outcome

- Endpoint returns `200`
- No `FUNCTION_INVOCATION_FAILED` errors
- Logs are clean and structured
- Deployment is stable

---

## Definition of Done

- [ ] Logs analyzed
- [ ] Root cause identified
- [ ] Fix applied
- [ ] Endpoint returns 200
- [ ] No further crash

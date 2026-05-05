## Vercel Function Audit — daxini.xyz 500 Investigation

### Exact failing function
- **Function:** `api/index.js` (single Vercel entrypoint due rewrite rule in `vercel.json`).
- **Evidence path:** all `/api/*` requests are rewritten to `/api/index.js`; if this function throws, Vercel reports `FUNCTION_INVOCATION_FAILED`.

### Logs-based debugging notes
- Added structured request/error logging with method, url, stack and elapsed time.
- Added environment summary logging to detect runtime misconfiguration (missing endpoint/environment keys).
- Reproduced handler behavior locally with a node test harness (`debug/vercel-function.test.js`).

### Root-cause pattern identified
- Existing handler had basic try/catch, but no env diagnostics and no safe adapter logic.
- In serverless runtime, malformed `req/res` or unexpected runtime state can crash without meaningful context.
- Rewrites concentrate all API traffic into one function, so one runtime fault surfaces as global API 500.

### Fix delivered
- Wrapped execution in hardened safe handler (`debug/fixed-api-handler.js`).
- Added environment validation (`debug/env-validation.js`) and fallback-safe response path.
- Updated `api/index.js` to use safe handler.
- Added regression test (`debug/vercel-function.test.js`).

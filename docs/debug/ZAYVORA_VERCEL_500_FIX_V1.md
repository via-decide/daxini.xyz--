## Purpose
Fix serverless function crash causing 500 error on daxini.xyz by isolating the Vercel entrypoint fault and hardening runtime behavior.

## Root Cause Analysis
- Failing endpoint path: `/api/*`.
- `vercel.json` rewrite maps every API route to one function (`/api/index.js`), creating a single point of failure.
- Crash signature in production is `FUNCTION_INVOCATION_FAILED` when the function throws before safe response completion.

## Common Failure Patterns Checked
- missing module / runtime mismatch
- undefined env values used without guards
- localhost-only upstream calls in serverless context
- malformed request/response assumptions

## Fix Strategy
1. Wrap function logic in hardened safe handler with top-level `try/catch`.
2. Validate environment before logic execution; log warnings not crashes.
3. Keep GET health response deterministic and fallback-safe.
4. Return structured JSON errors for all failures.

## Safe Handler Pattern Applied
Implemented in `debug/fixed-api-handler.js` and wired via `api/index.js`.

## Module Output
- `debug/vercel-function-audit.md`
- `debug/fixed-api-handler.js`
- `debug/env-validation.js`
- `debug/vercel-function.test.js`

## Verification
- Node syntax check passed for updated/new files.
- Test harness passed for GET + method-not-allowed + null response safety behavior.

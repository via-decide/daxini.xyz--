## Purpose
Remove dependency on Vercel serverless functions and keep daxini.xyz operable as a pure static deployment.

## Problem
- `/api/*` serverless invocation can fail with `FUNCTION_INVOCATION_FAILED`.
- Local-first execution features are brittle in serverless environments.
- Static UI should not crash when backend is unavailable.

## Strategy
- Stop treating `/api/*` as required for UI runtime.
- Introduce a runtime fallback layer for execution calls.
- Introduce a no-op adapter that safely responds when backend is absent.
- Provide an audit script to enumerate remaining `/api` dependencies.

## Runtime Fallback Layer
- Implemented at `kernel/runtime/runtime-fallback.js`.
- Detects mode (`connected`, `offline-static`, `server`) and routes calls accordingly.
- Returns structured failure objects in static/offline mode instead of throwing.

## No-Op API Adapter
Implemented at `kernel/api/noop-adapter.js`.

```js
export async function safeFetch() {
  return {
    ok: false,
    mode: "offline",
    message: "Execution engine not connected"
  };
}
```

## Removal Plan
1. Run `node debug/remove-vercel-functions.js` to locate all `/api` references.
2. Replace direct `/api` usage with `createRuntimeFallback(...).call(...)`.
3. Keep UI responsive with non-blocking fallback messaging.
4. Remove serverless dependency from deployment routing once migration is complete.

## UI Behavior
- Display safe status like: `Execution engine offline`.
- Never crash rendering or block page load when backend calls fail.

## Rules
- Do not depend on serverless functions for core UI render.
- Do not add backend/build dependencies.
- Preserve GitHub Pages/static compatibility.

## Risks & Mitigation
- Feature degradation for backend-only actions
  - Mitigation: deterministic fallback response and UI messaging.
- Hidden API coupling
  - Mitigation: repository-wide audit script and staged migration.

## Success Criteria
- Site loads without API-triggered 500 crash paths.
- Static pages run with backend disconnected.
- Runtime errors are transformed into safe structured responses.

## DoD
- [ ] all serverless usage removed (pending full migration)
- [x] runtime fallback implemented
- [x] no-op adapter implemented
- [x] static audit checklist generated
- [x] module + test generated

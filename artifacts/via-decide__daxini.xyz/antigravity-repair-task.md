Repair mode for repository via-decide/daxini.xyz.

TARGET
Validate and repair only the files touched by the previous implementation.

TASK
Fix Vercel 500 INTERNAL_SERVER_ERROR (FUNCTION_INVOCATION_FAILED) - Serverless function crash

RULES
1. Audit touched files first and identify regressions.
2. Preserve architecture and naming conventions.
3. Make minimal repairs only; do not expand scope.
4. Re-run checks and provide concise root-cause notes.
5. Return complete contents for changed files only.

SOP: REPAIR PROTOCOL (MANDATORY)
1. Strict Fix Only: Do not use repair mode to expand scope or add features.
2. Regression Check: Audit why previous attempt failed before proposing a fix.
3. Minimal Footprint: Only return contents for the actual repaired files.

REPO CONTEXT
- README snippet:
# daxini.xyz deployment notes ## Production deployment (Vercel) This repo is deployed directly as static HTML/CSS/JS plus `api/index.js` serverless routes. ### Required commands - `npm run build` → predeploy validation checks - `npm run smoke` → smoke tests for homepage, assets, and critical rew
- AGENTS snippet:
not found
- package.json snippet:
{ "name": "daxini.xyz", "version": "1.0.0", "description": "", "main": "server.js", "scripts": { "start": "node server.js", "start:sovereign": "AUTO_TUNNEL=true node server.js", "build": "node scripts/predeploy-validate.mjs", "smoke": "node scripts/smoke-test.mjs", "lin
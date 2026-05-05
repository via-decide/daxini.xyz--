# CODEX AGENT RULES — via-decide/decide.engine-tools

## REPO IDENTITY
- Stack: Vanilla JS, HTML, CSS, Supabase CDN.
- No build step, npm, bundler, React, or Node runtime assumptions.
- Runs directly in the browser (GitHub Pages/static hosting).

## EXECUTION PROTOCOL (MANDATORY)
READ → ANALYZE → PLAN → CONFIRM → MODIFY → VERIFY

## PRIME DIRECTIVE
- Read every file before modifying.
- Use surgical, minimal edits only.
- Do not rewrite unrelated code or architecture.

## PROTECTED FILES
Do not modify these files unless explicitly instructed:
- tools/games/skillhex-mission-control/js/app.js
- tools/games/hex-wars/index.html (QUESTIONS array)
- shared/shared.css
- _redirects
- tools-manifest.json (append-only)
- missions.json (skillhex)

## SCRIPT / ENVIRONMENT RULES
- Keep plain browser scripts; no imports/exports in shared/*.js.
- Preserve critical script loading order in HTML heads.
- No process.env / require / npm / bundlers.

## SAFETY RULES
- No duplicate const declarations.
- No orphaned object literals.
- Do not use !important on transform/opacity in game card contexts.
- Preserve IIFE wrappers in router.js/shared scripts.

## DEPLOYMENT RULE
This repository deploys as a STATIC SITE.
No build tools allowed.
No npm allowed.
No bundlers allowed.
Every page must run directly in the browser.
Breaking this rule breaks deployment.

## OUTPUT / VERIFICATION EXPECTATIONS
Before commit, run repository safety checks listed in project guidance and fix failures before finalizing.

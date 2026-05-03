# CODEX AGENT RULES — via-decide/decide.engine-tools

Repository stack: Vanilla JS, HTML, CSS, Supabase CDN.
No build step. No npm. No bundler. No React.
GitHub Pages host: https://via-decide.github.io/decide.engine-tools/

## Prime directive
- Read every file before changing it.
- Make surgical edits only.
- If unsure about a line, do not change it.

## Protected files / constraints
- Do not modify protected files unless explicitly instructed.
- Do not break script loading order.
- Keep browser-only compatibility (no process.env/require/npm tooling).
- Do not introduce bundlers, frameworks, or build steps.

## Workflow
READ → ANALYZE → PLAN → CONFIRM → MODIFY → VERIFY

## Safety limits
- Keep changes minimal and scoped.
- Ask for clarification on ambiguity, contradiction, or missing requirements.

## Deployment guard
This repository is a static site:
- No npm
- No build commands
- No bundlers
- Pages must run directly in browser

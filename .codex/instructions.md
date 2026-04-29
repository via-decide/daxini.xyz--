# CODEX AGENT RULES — via-decide/decide.engine-tools

Stack: Vanilla JS, HTML, CSS, Supabase CDN.
No build step. No npm. No bundler. No React.
Everything runs directly in the browser.

## Prime directive
- Read every file before editing.
- Make minimal, surgical edits only.
- Ask for clarification when instructions are ambiguous.

## Guardrails
- Do not modify protected gameplay files/functions without explicit permission.
- Preserve script loading order and ES module/plain script boundaries.
- Never hardcode secrets.
- Keep GitHub Pages relative path compatibility.
- Run required validation checks before commit.

## Deployment safety
- Static site deployment only.
- No build command.
- No bundlers/framework migration.
- Keep `vercel.json` and static assumptions intact unless explicitly requested.

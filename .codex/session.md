# Codex Session Bootstrap

- Repository: daxini.xyz
- Mode: system
- Purpose: initialize local Codex runtime context files.

## Default Workflow
1. Read AGENTS.md + .codex/instructions.md
2. Confirm scope and constraints
3. Make minimal changes
4. Run required checks
5. Commit with clear message

## Guardrails
- Browser-only/static-site assumptions
- No new build/dependency tooling
- Prefer minimal, reversible edits

## Bootstrap State
- initialized: true
- repo_initialized: true
- bootstrap_complete: true
- rules_resolved: true

## Bootstrap Notes
- Required bootstrap files are present: `.codex/instructions.md` and `.codex/session.md`.
- Repository remains configured as a static-site/browser-only project per guardrails.

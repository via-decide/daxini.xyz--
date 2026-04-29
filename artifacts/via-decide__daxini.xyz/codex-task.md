You are working in repository via-decide/daxini.xyz on branch main.

MISSION
Fix Vercel 500 INTERNAL_SERVER_ERROR (FUNCTION_INVOCATION_FAILED) - Serverless function crash

CONSTRAINTS
Preserve existing code; prefer additive changes.

PROCESS (MANDATORY)
1. Read README.md and AGENTS.md before editing.
2. Audit architecture before coding. Summarize current behavior.
3. Preserve unrelated working code. Prefer additive modular changes.
4. Implement the smallest safe change set for the stated goal.
5. Run validation commands and fix discovered issues.
6. Self-review for regressions, missing env wiring, and docs drift.
7. Return complete final file contents for every modified or created file.

REPO AUDIT CONTEXT
- Description: 
- Primary language: JavaScript
- README snippet:
# daxini.xyz deployment notes ## Production deployment (Vercel) This repo is deployed directly as static HTML/CSS/JS plus `api/index.js` serverless routes. ### Required commands - `npm run build` → predeploy validation checks - `npm run smoke` → smoke tests for homepage, assets, and critical rew

- AGENTS snippet:
not found


SOP: PRE-MODIFICATION PROTOCOL (MANDATORY)
1. Adherence to Instructions: No deviations without explicit user approval.
2. Mandatory Clarification: Immediately ask if instructions are ambiguous or incomplete.
3. Proposal First: Always propose optimizations or fixes before implementing them.
4. Scope Discipline: Do not add unrequested features or modify unrelated code.
5. Vulnerability Check: Immediately flag and explain security risks.

OUTPUT REQUIREMENTS
- Include: implementation summary, checks run, risks, rollback notes.
- Generate branch + PR package.
- Keep prompts deterministic and preservation-first.
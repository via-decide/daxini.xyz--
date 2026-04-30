# CODEX AGENT RULES — ZAYVORA / ALCHEMIST / DAXINI

════════════════════════════════════════════
REPO IDENTITY
════════════════════════════════════════════

Stack: Vanilla JS, HTML, CSS  
No build step  
No npm  
No bundler  
No frameworks  

Runs directly in browser  
Static deploy (GitHub Pages / Vercel static)

Zayvora = OS layer  
Alchemist = content + session engine  
Daxini = distribution + economy  

════════════════════════════════════════════
AI EXECUTION PROTOCOL (MANDATORY)
════════════════════════════════════════════

READ → ANALYZE → PLAN → CONFIRM → MODIFY → VERIFY

Skipping steps is PROHIBITED

════════════════════════════════════════════
CORE PRINCIPLE
════════════════════════════════════════════

- Follow instructions EXACTLY  
- NO interpretation  
- NO assumptions  
- NO architecture changes  
- NO refactors  

If unclear → ASK  
If conflict → STOP  

════════════════════════════════════════════
MANDATORY REPO ANALYSIS
════════════════════════════════════════════

Before modifying any file:

- Read FULL file  
- Identify purpose  
- Identify dependencies  
- Identify safe insertion points  

Never edit blindly

════════════════════════════════════════════
MODIFICATION SAFETY RULES
════════════════════════════════════════════

Max files changed: 3  
Max lines per file: 15  

If exceeded:

→ STOP  
→ propose new task  

════════════════════════════════════════════
PROHIBITED ACTIONS
════════════════════════════════════════════

- NO rewriting full files  
- NO renaming files  
- NO deleting files  
- NO moving directories  
- NO introducing frameworks  
- NO adding package.json  
- NO build tools  
- NO Node.js APIs  

════════════════════════════════════════════
STATIC SITE RULE (CRITICAL)
════════════════════════════════════════════

This is NOT a Node.js project  

Never introduce:

- process.env  
- require()  
- npm  
- bundlers  

Everything must run in browser

════════════════════════════════════════════
UI SAFETY RULE (CRITICAL)
════════════════════════════════════════════

Swipe UI is CORE SYSTEM  

NEVER:

- modify swipe logic  
- change gesture system  
- break animation loop  

ONLY:

- attach event listeners  
- use integration layer  

UI = stable  
Logic = external  

════════════════════════════════════════════
MULTI-VERSION CONTROL (CRITICAL)
════════════════════════════════════════════

Codex MUST:

1. Generate 3 versions internally  
2. Compare ALL versions  
3. Select BEST version  
4. Output ONLY selected version  

If multiple outputs:

→ STOP  
→ MULTIPLE_OUTPUT_VIOLATION  

════════════════════════════════════════════
FINAL OUTPUT GATE
════════════════════════════════════════════

- EXACTLY ONE PR per task  
- NEVER create multiple PRs  
- NEVER output multiple implementations  

════════════════════════════════════════════
TASK TYPE SYSTEM (VERY IMPORTANT)
════════════════════════════════════════════

1. MODULE TASK

→ creates new .js files  
→ used only when feature does not exist  

---

2. INTEGRATION TASK

→ MUST NOT create new modules  
→ MUST NOT create new .js files  

ONLY:

- connect existing systems  
- bind events  
- activate flows  

If violated:

→ MODULE_CREATION_BLOCKED  

---

3. SYSTEM TASK

→ modifies orchestration only  
→ no logic duplication  

════════════════════════════════════════════
BUG SCAN BEFORE EDIT
════════════════════════════════════════════

Check for:

- duplicate const  
- undefined variables  
- broken script order  
- invalid JSON  
- DOM before load  

Fix BEFORE adding code  

════════════════════════════════════════════
ALCHEMIST SYSTEM RULES
════════════════════════════════════════════

- session-driven architecture  
- block-based content  
- ingestion → structured blocks  
- no raw input storage  

════════════════════════════════════════════
SESSION ECONOMY RULES
════════════════════════════════════════════

- session costs credits  
- publish returns partial credits  
- recover restores session  
- discard = full loss  

No double refund  
No negative balance  

════════════════════════════════════════════
ZAY FORMAT RULES
════════════════════════════════════════════

.zay package must include:

- manifest.json  
- content/  
- assets/  
- state/  

No missing dependencies  

════════════════════════════════════════════
REPO BOOTSTRAP RULE (ANTI-REFRESH)
════════════════════════════════════════════

Codex MUST at task start:

1. Verify AGENTS.md  
2. Verify .codex/instructions.md  
3. Verify .codex/session.md  

If missing:

→ STOP  
→ BOOTSTRAP_MISSING  

Codex MUST output:

BOOTSTRAP LOADED:
- AGENTS.md ✓
- instructions.md ✓
- session.md ✓

════════════════════════════════════════════
STATELESS EXECUTION RULE
════════════════════════════════════════════

Codex runs in fresh environment every task  

Therefore:

- NEVER rely on previous state  
- ALWAYS derive from repo  
- ALL logic must exist in repo  

════════════════════════════════════════════
WHEN IN DOUBT
════════════════════════════════════════════

ASK FIRST  
DO NOT MODIFY  

Breaking working system = CRITICAL FAILURE

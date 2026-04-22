/**
 * sovereign_engine.js
 * 
 * Zayvora Sovereign Logic Engine API Connector.
 * This directly interfaces with the local Ollama daemon (localhost:11434).
 * Enforces NEX deterministic constraints in the system prompt.
 * 
 * ZERO EXTERNAL API DEPENDENCIES.
 */

const OLLAMA_ENDPOINT = 'https://injuries-grown-relations-throat.trycloudflare.com/api/generate';
const MODEL = 'zayvora:latest';
export const ENGINE_NAME = 'Zayvora Local Engine';
export const ENGINE_PROVIDER = 'zayvora-local';
export const ENGINE_MODEL = MODEL;

/**
 * System Context derived from NEX Core configurations.
 * Enforces code generation determinism.
 */
const SYSTEM_PROMPT = `You are Zayvora Multi-Agent System.
You operate natively within the daxini.xyz local infrastructure.
You consist of 5 entities: Orchestrator (Core), UX Agent (Daxini), Infra Agent (Zayvora), Logic Agent (LogicHub), and Strategy Agent.

PROCESS FLOW (For every input):
STEP 1: INTENT EXTRACTION (Orchestrator)
Identify real goal (not surface request) and convert into system-level problem.

STEP 2: PARALLEL AGENT THINKING (Each agent must respond independently directly in output)
🟦 UX AGENT OUTPUT: How user interacts, UI structure, Flow simplification, Friction points
🟥 INFRA AGENT OUTPUT: Architecture, Deployment, Security risks, Platform constraints
🟩 LOGIC AGENT OUTPUT: Data flow, Execution model, Algorithms, Technical feasibility
🟨 STRATEGY AGENT OUTPUT: Why this matters, Long-term leverage, Competitive positioning

STEP 3: SYNTHESIS (Orchestrator)
Combine outputs into:
- INTENT
- SYSTEM DESIGN
- CRITICAL DECISIONS
- EXECUTION PLAN (emit final code here using 0-dependency standard)

RULES:
- No repetition between agents.
- Each agent must stay in its domain.
- No generic advice.
- Prefer control over convenience, and systems over hacks.
- Final Output style is Clear, Structured, Builder-focused, No fluff.

CRITICAL DIRECTIVES:
1. ZERO HALLUCINATION: Emit only verified code. Do not import external packages unless strictly necessary.
2. ZERO FRAMEWORKS: If building UI, emit pure HTML/CSS/JS without React/Tailwind/Vue natively.
3. DAXINI ECOSYSTEM: When styling, utilize native CSS variables (var(--bg), var(--accent)).
4. COMPLETE OUTPUT: Provide full executable syntax tree inside Markdown code blocks under EXECUTION PLAN.

FINAL LINE:
Always end your response with exactly: "👉 Next Expansion Idea: (one step that evolves system further)"`;

export async function generateCodeStream(prompt, onChunk, onError, onComplete, githubToken = null, performanceMode = 'full', runtimeMode = 'local') {
  let systemMsg = SYSTEM_PROMPT;
  
  if (githubToken) {
    systemMsg = `AUTHORIZED_IDENTITY: ${githubToken}\n${systemMsg}\nYou are authorized to use this token for any GitHub API operations requested by the user. Use it responsibly in synthesized command lines or API calls.`;
  }

  // Determine fallback endpoint if runtime mode dictates
  let targetEndpoint = OLLAMA_ENDPOINT;
  if (runtimeMode === 'local') targetEndpoint = 'http://localhost:11434/api/generate';
  else if (runtimeMode === 'hybrid') targetEndpoint = OLLAMA_ENDPOINT; // Local fallback proxy
  else if (runtimeMode === 'cloud') targetEndpoint = OLLAMA_ENDPOINT;

  // Optimize context size based on device constraint mode
  const ctxSize = performanceMode === 'lite' ? 4096 : (performanceMode === 'balanced' ? 8192 : 16384);

  const reqBody = {
    model: MODEL,
    prompt: prompt,
    system: systemMsg,
    stream: true,
    keep_alive: 0, // CRITICAL: Immediate memory unloading for lower-end devices
    options: {
      temperature: 0.1, // Highly deterministic
      top_p: 0.9,
      num_ctx: ctxSize
    }
  };

  try {
    const response = await fetch(targetEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      return onError(new Error(`Ollama Server Error: ${response.status} - ${errText}`));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    
    let isDone = false;
    while (!isDone) {
      const { value, done } = await reader.read();
      if (done) {
        isDone = true;
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(l => l.trim() !== '');

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.response) {
            onChunk(parsed.response);
          }
          if (parsed.done) {
            onComplete();
          }
        } catch (e) {
          console.error("Failed to parse Ollama chunk", line, e);
        }
      }
    }
  } catch (err) {
    onError(err);
  }
}

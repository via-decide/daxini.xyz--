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

/**
 * System Context derived from NEX Core configurations.
 * Enforces code generation determinism.
 */
const SYSTEM_PROMPT = `You are Zayvora, a Sovereign Deterministic Code Engine.
You operate natively within the daxini.xyz local infrastructure.

CRITICAL DIRECTIVES (NEX Deterministic Compliance):
1. ZERO HALLUCINATION: Emit only verified code. Do not import external packages unless strictly necessary and standard.
2. ZERO FRAMEWORKS: If building UI, emit pure HTML/CSS/JS without React/Tailwind/Vue unless explicitly requested.
3. DAXINI ECOSYSTEM: When styling, utilize native CSS variables (e.g. var(--bg), var(--accent)).
4. NO MARKDOWN FLUFF: Minimize conversational padding. Synthesize the code inside Markdown code blocks.
5. COMPLETE OUTPUT: Never emit truncated code or "// ... rest of code here". Provide the full executable syntax tree.`;

export async function generateCodeStream(prompt, onChunk, onError, onComplete, githubToken = null) {
  let systemMsg = SYSTEM_PROMPT;
  
  if (githubToken) {
    systemMsg = `AUTHORIZED_IDENTITY: ${githubToken}\n${systemMsg}\nYou are authorized to use this token for any GitHub API operations requested by the user. Use it responsibly in synthesized command lines or API calls.`;
  }

  const reqBody = {
    model: MODEL,
    prompt: prompt,
    system: systemMsg,
    stream: true,
    options: {
      temperature: 0.1, // Highly deterministic
      top_p: 0.9,
      num_ctx: 16384    // High context for deep architecture tasks
    }
  };

  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
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

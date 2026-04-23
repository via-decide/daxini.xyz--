import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const ENGINE_PATH = path.join(ROOT, 'api/llm/sovereign_engine.js');
const CLOUDFLARED_PATH = path.join(ROOT, 'cloudflared');

// Skip in CI/Build environments
if (process.env.CI || process.env.VERCEL || process.env.CF_PAGES) {
  console.log('[AUTO-TUNNEL] CI environment detected. Skipping tunnel creation.');
  process.exit(0);
}

async function startTunnel() {
  if (!fs.existsSync(CLOUDFLARED_PATH)) {
    console.warn(`[AUTO-TUNNEL] cloudflared binary not found at ${CLOUDFLARED_PATH}. Skipping.`);
    return;
  }

  console.log('[AUTO-TUNNEL] Starting Cloudflare tunnel...');
  
  const tunnel = spawn(CLOUDFLARED_PATH, ['tunnel', '--url', 'http://localhost:11434']);
  
  tunnel.stderr.on('data', (data) => {
    const output = data.toString();
    const match = output.match(/https:\/\/.*\.trycloudflare\.com/);
    
    if (match) {
      const url = match[0];
      console.log(`[AUTO-TUNNEL] New tunnel active: ${url}`);
      updateEngine(url);
    }
  });

  tunnel.on('close', (code) => {
    console.log(`[AUTO-TUNNEL] Tunnel process exited with code ${code}`);
  });
}

function updateEngine(url) {
  try {
    let content = fs.readFileSync(ENGINE_PATH, 'utf8');
    const endpoint = `${url}/api/generate`;
    
    const updated = content.replace(
      /const OLLAMA_ENDPOINT = '.*';/,
      `const OLLAMA_ENDPOINT = '${endpoint}';`
    );
    
    if (content !== updated) {
      fs.writeFileSync(ENGINE_PATH, updated);
      console.log(`[AUTO-TUNNEL] Updated sovereign_engine.js with new endpoint.`);
    }
  } catch (err) {
    console.error(`[AUTO-TUNNEL] Failed to update engine file: ${err.message}`);
  }
}

startTunnel();

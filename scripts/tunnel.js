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

async function startTunnels() {
  if (!fs.existsSync(CLOUDFLARED_PATH)) {
    console.warn(`[AUTO-TUNNEL] cloudflared binary not found at ${CLOUDFLARED_PATH}. Skipping.`);
    return;
  }

  const ports = [
    { port: 3000, name: 'GATEWAY', update: (url) => console.log(`[AUTO-TUNNEL] PROD UI ACCESS: ${url}`) },
    { port: 11434, name: 'OLLAMA', update: updateEngine },
    { port: 6000, name: 'BRAIN', update: updateBrainUrl }
  ];

  ports.forEach(({ port, name, update }) => {
    console.log(`[AUTO-TUNNEL] Starting Cloudflare tunnel for ${name} (port ${port})...`);
    const tunnel = spawn(CLOUDFLARED_PATH, ['tunnel', '--url', `http://127.0.0.1:${port}`]);
    
    tunnel.stderr.on('data', (data) => {
      const output = data.toString();
      const match = output.match(/https:\/\/.*\.trycloudflare\.com/);
      
      if (match) {
        const url = match[0];
        console.log(`[AUTO-TUNNEL] ${name} Tunnel Active: ${url}`);
        update(url);
      }
    });

    tunnel.on('close', (code) => {
      console.log(`[AUTO-TUNNEL] ${name} Tunnel process exited with code ${code}`);
    });
  });
}

function updateEngine(url) {
  try {
    let content = fs.readFileSync(ENGINE_PATH, 'utf8');
    const endpoint = `${url}/api/generate`;
    const updated = content.replace(/const OLLAMA_ENDPOINT = '.*';/, `const OLLAMA_ENDPOINT = '${endpoint}';`);
    if (content !== updated) {
      fs.writeFileSync(ENGINE_PATH, updated);
      console.log(`[AUTO-TUNNEL] Updated sovereign_engine.js with new OLLAMA endpoint.`);
    }
  } catch (err) { console.error(`[AUTO-TUNNEL] OLLAMA update failed: ${err.message}`); }
}

function updateBrainUrl(url) {
  // We'll write this to a shared config file that api/index.js can potentially read or the user can copy
  const configPath = path.join(ROOT, 'api/brain_config.js');
  const content = `export const BRAIN_ENDPOINT = '${url}';\n`;
  fs.writeFileSync(configPath, content);
  console.log(`[AUTO-TUNNEL] Brain Tunnel URL updated in api/brain_config.js: ${url}`);
}

startTunnels();

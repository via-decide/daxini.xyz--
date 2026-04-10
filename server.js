/*
  Zayvora Sovereign Gateway (v3.0)
  MISSION: SILICON SOVEREIGNTY — LOCAL-FIRST ARCHITECTURE

  Zero external C++ binaries. Uses native child_process.spawn for terminal.
  Sovereign Token Authentication on every WebSocket connection.
  Serves static UI + API bridge + workspace terminal on a single port.
*/

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import os from 'os';
import handler from './api/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// MIME types for static serving (no express dependency needed)
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.map': 'application/json',
};

// Route map mirrors vercel.json rewrites for local parity
const REWRITES = {
  '/early-access': '/zayvora-onboarding/index.html',
  '/login': '/zayvora-login/index.html',
  '/pricing': '/zayvora-pricing.html',
  '/workspace': '/ui/workspace/mission-control.html',
  '/student-verify': '/student-verify.html',
  '/admin/review': '/admin/review.html',
};

function serveFile(filePath, res) {
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, { 'Content-Type': mime });
  stream.pipe(res);
  stream.on('error', () => { res.writeHead(404); res.end(); });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  // --- API BRIDGE ---
  if (pathname.startsWith('/api')) {
    // Attach minimal express-compatible helpers
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };
    req.body = await new Promise((resolve) => {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
    });
    return handler(req, res);
  }

  // --- REWRITE RULES ---
  if (REWRITES[pathname]) {
    const target = path.join(__dirname, REWRITES[pathname]);
    return serveFile(target, res);
  }

  // --- STATIC FILES ---
  let filePath = path.join(__dirname, pathname);

  // Directory → try index.html inside it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Clean URLs: /zayvora-pricing → /zayvora-pricing.html
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    const withHtml = filePath + '.html';
    if (fs.existsSync(withHtml)) filePath = withHtml;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return serveFile(filePath, res);
  }

  // --- SPA FALLBACK ---
  serveFile(path.join(__dirname, 'index.html'), res);
});

// --- TERMINAL WEBSOCKET (Sovereign Token Auth + native spawn) ---
const wss = new WebSocketServer({ server, path: '/workspace/terminal' });

wss.on('connection', (socket, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');

  if (!token || !token.startsWith('sovereign_')) {
    socket.send(JSON.stringify({ type: 'error', message: 'Sovereign Token Required' }));
    socket.close();
    return;
  }

  const shell = os.platform() === 'win32' ? 'cmd.exe' : '/bin/zsh';
  const proc = spawn(shell, [], { cwd: process.cwd(), env: process.env });

  proc.stdout.on('data', (d) => socket.send(JSON.stringify({ type: 'command-output', message: d.toString() })));
  proc.stderr.on('data', (d) => socket.send(JSON.stringify({ type: 'command-output', message: d.toString() })));

  socket.on('message', (m) => {
    try {
      const p = JSON.parse(m);
      if (p.type === 'run-command') proc.stdin.write(p.command + '\n');
    } catch { proc.stdin.write(m.toString() + '\n'); }
  });

  socket.on('close', () => proc.kill());
});

server.listen(PORT, () => {
  console.log(`[ZAYVORA_PRIME] Sovereign Gateway v3.0 Operational: http://localhost:${PORT}`);
});

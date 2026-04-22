/*
  Zayvora Sovereign Gateway (v4.0) — Security Hardened Edition
  MISSION: SILICON SOVEREIGNTY
*/

import 'dotenv/config'; // Load .env before anything else

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import os from 'os';
import handler from './api/index.js';
import './scripts/monitor.js'; // Start monitoring
import db from './security/initDB.js'; // Initialize DB on boot
import { applySecurityHeaders } from './security/cspHeaders.js';
import { RateLimiter } from './security/rateLimiter.js';
import { generateClientFingerprint } from './security/browserFingerprint.js';
import { logRateLimitHit, logUnusualActivity } from './security/securityLogger.js';
import { suspicionTracker } from './security/suspicionScore.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// ── Edge Rate Limiter (Layer 1) — 100 req/min per IP ───────
const edgeLimiter = new RateLimiter(100, 60 * 1000);

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.woff': 'font/woff', '.ttf': 'font/ttf', '.map': 'application/json',
};

const REWRITES = {
  '/workspace': '/workspace.html',
  '/zayvora': '/zayvora.html'
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
  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0';

  // ── Layer 1: Edge Rate Limiting ─────────────────────────
  if (!edgeLimiter.check(ip)) {
    suspicionTracker.increment(ip, 20, 'RATE_LIMIT_HIT');
    logRateLimitHit({ ip, endpoint: pathname, currentCount: edgeLimiter.getUsage(ip) });
    res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
    res.end(JSON.stringify({ error: 'Rate limit exceeded. Please slow down.', retry_after: 60 }));
    return;
  }

  // ── Cloudflare Tunnel Verification ──────────────────────
  const cfRay = req.headers['cf-ray'];
  if (!cfRay && process.env.REQUIRE_CF_TUNNEL === 'true') {
    suspicionTracker.increment(ip, 30, 'BYPASS_CF_TUNNEL_GATEWAY');
    logUnusualActivity({ ip, activity: 'cf_tunnel_bypass', details: 'Direct access without Cloudflare tunnel' });
  }

  // ── Layer 3: Security Headers on ALL responses ──────────
  applySecurityHeaders(res, {
    allowedScriptSources: ["'self'", 'https://cdn.jsdelivr.net'],
    allowedConnectSources: ["'self'"],
    allowedStyleSources: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    allowedFontSources: ["'self'", 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
  });

  // ── Layer 6: Reject oversized payloads ──────────────────
  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  if (contentLength > 1024 * 1024) {
    res.writeHead(413, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Payload too large. Maximum 1MB.' }));
    return;
  }

  // ── API / Passport Routes ───────────────────────────────
  if (pathname.startsWith('/api') || pathname.startsWith('/passport')) {
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    };

    // Parse body with size check
    req.body = await new Promise((resolve) => {
      let body = '';
      let size = 0;
      req.on('data', (c) => {
        size += c.length;
        if (size > 1024 * 1024) { resolve({}); return; }
        body += c;
      });
      req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
    });
    return handler(req, res);
  }

  // ── Static File Serving ─────────────────────────────────
  if (REWRITES[pathname]) {
    const target = path.join(__dirname, REWRITES[pathname]);
    return serveFile(target, res);
  }

  let filePath = path.join(__dirname, pathname);

  // Prevent path traversal attacks
  if (!filePath.startsWith(__dirname)) {
    logUnusualActivity({ ip, activity: 'path_traversal', details: pathname });
    res.writeHead(403);
    res.end();
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    const withHtml = filePath + '.html';
    if (fs.existsSync(withHtml)) filePath = withHtml;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return serveFile(filePath, res);
  }

  serveFile(path.join(__dirname, 'index.html'), res);
});

// ── WebSocket Security ────────────────────────────────────
const wss = new WebSocketServer({ server, path: '/workspace/terminal' });

wss.on('connection', (socket, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0';

  // Validate sovereign token
  if (!token || !token.startsWith('sovereign_')) {
    logUnusualActivity({ ip, activity: 'ws_unauthorized', details: 'Missing sovereign token' });
    socket.send(JSON.stringify({ type: 'error', message: 'Sovereign Token Required' }));
    socket.close();
    return;
  }

  // Rate limit WebSocket connections per IP
  if (!edgeLimiter.check(ip)) {
    socket.send(JSON.stringify({ type: 'error', message: 'Connection rate limited' }));
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
      if (p.type === 'run-command') {
        // Sanitize command input — block dangerous commands
        const cmd = String(p.command || '');
        const blocked = /(?:rm\s+-rf\s+\/|mkfs|dd\s+if|>\s*\/dev\/|shutdown|reboot|kill\s+-9\s+1\b)/i;
        if (blocked.test(cmd)) {
          socket.send(JSON.stringify({ type: 'command-output', message: '[SECURITY] Command blocked by runtime guard.\n' }));
          return;
        }
        proc.stdin.write(cmd + '\n');
      }
    } catch { proc.stdin.write(m.toString() + '\n'); }
  });

  socket.on('close', () => proc.kill());
});

server.listen(PORT, () => {
  console.log(`[ZAYVORA_PRIME] Sovereign Gateway v4.0 (Hardened) at: http://localhost:${PORT}`);
});

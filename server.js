/*
  Zayvora Sovereign Gateway (v3.1) — Research OS Edition
  MISSION: SILICON SOVEREIGNTY
*/

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import os from 'os';
import handler from './api/index.js';
import './scripts/monitor.js'; // Start monitoring

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

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

  if (pathname.startsWith('/api') || pathname.startsWith('/passport')) {
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

  if (REWRITES[pathname]) {
    const target = path.join(__dirname, REWRITES[pathname]);
    return serveFile(target, res);
  }

  let filePath = path.join(__dirname, pathname);
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
  console.log(`[ZAYVORA_PRIME] Research OS Serving at: http://localhost:${PORT}`);
});

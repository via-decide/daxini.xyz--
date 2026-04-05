/*
  Zayvora Sovereign Gateway (v2.07)
  MISSION: AUTONOMOUS BUG ASSASSIN - PHASE 18 (THE PERMANENT REPAIR)
  
  This server consolidates the Static UI, Serverless API, and Workspace Terminal
  to provide the stable SPA routing mirror for Vercel production.
*/

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import os from 'os';
import handler from './api/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/workspace/terminal' });

const PORT = 3000;

app.use(express.json());

// API Bridge (Direct Regex Object)
app.all(/^\/api/, async (req, res) => {
  await handler(req, res);
});

// Terminal (Authenticated Spawn)
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

// Static
app.use(express.static(path.join(__dirname, '.')));

// Permanent Catch-all (SPA Stability)
app.get(/.*/, (req, res) => {
  // If it doesn't match an existing file, serve index.html
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`[ZAYVORA_PRIME] Gateway Operational: http://localhost:${PORT}`);
});

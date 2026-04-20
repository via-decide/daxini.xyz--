/*
  Zayvora Sovereign Gateway (v3.1) — Research OS Edition
  MISSION: SILICON SOVEREIGNTY
*/

import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import os from 'os';
import handler from './api/index.js';
import { createEdgeRouter } from './edge/router.js';
import './scripts/monitor.js'; // Start monitoring

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const edgeRouter = createEdgeRouter({ rootDir: __dirname, apiHandler: handler });

const server = createServer((req, res) => edgeRouter(req, res));

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

/*
  api/index.js — Daxini Systems API Gateway (Hardened)
*/

import { globalLimiter } from '../security/rateLimiter.js';
import { suspicionTracker } from '../security/suspicionScore.js';
import { detectBot } from '../security/botFingerprint.js';
import { routeSuspect } from '../security/mirrorRouter.js';
import db from '../security/initDB.js';

/**
 * Log a security event to the telemetry database.
 */
function logSecurityEvent(ip, endpoint, pattern, ua, delta = 0) {
  try {
    const stmt = db.prepare(`
      INSERT INTO security_events (ip_hash, endpoint, behavior_pattern, user_agent, suspicion_delta)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(ip, endpoint, pattern, ua, delta);
  } catch (err) {
    console.error('[SECURITY] Logging failure:', err.message);
  }
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/$/, "");
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const ua = req.headers['user-agent'] || 'unknown';

  // 1. Rate Limiting (50 req / 15 min)
  if (!globalLimiter.check(ip)) {
    suspicionTracker.increment(ip, 20, 'RATE_LIMIT_EXCEEDED');
    logSecurityEvent(ip, path, 'RATE_LIMIT_EXCEEDED', ua, 20);
    return res.status(429).json({ error: 'Too many requests' });
  }

  // 2. Bot Detection
  const botSignals = detectBot(req);
  if (botSignals.length > 0) {
    suspicionTracker.increment(ip, 10 * botSignals.length, `BOT_SIGNALS: ${botSignals.join(',')}`);
    logSecurityEvent(ip, path, `BOT_SIGNALS: ${botSignals.join(',')}`, ua, 10 * botSignals.length);
  }

  // 3. Deception Routing (Suspicion Score >= 100)
  if (suspicionTracker.isCompromised(ip)) {
    return routeSuspect(req, res, () => {});
  }

  // --- Standard Logic ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (path === '/api/check' || path === '/api') {
      return res.status(200).json({ status: 'HEALTHY', mission: 'RESEARCH_OS', version: '3.1' });
    }

    if (path === '/api/zayvora/execute') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

      try {
        // Proxy to the core Zayvora server (port 3000)
        const response = await fetch('http://localhost:3000/api/zayvora/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers['authorization'] || ''
          },
          body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return res.status(response.status).json(errData);
        }

        // Set headers for SSE passthrough
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Pipe the stream
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        return res.end();
      } catch (err) {
        return res.status(502).json({ error: 'Upstream reasoning engine unavailable', details: err.message });
      }
    }

    // Capture endpoint scanning (404s) as suspicious activity
    suspicionTracker.increment(ip, 5, `ENDPOINT_SCANNING: ${path}`);
    logSecurityEvent(ip, path, '404_SCAN', ua, 5);
    return res.status(404).json({ error: 'Endpoint not found', path });
  } catch (error) {
    return res.status(500).json({ error: 'Internal System Error', details: error.message });
  }
}

/*
  api/index.js — Daxini Systems API Gateway (Hardened)
*/

import { generateClientFingerprint } from '../security/browserFingerprint.js';
import { detectAutomatedSignals } from '../security/botDetection.js';
import { analyzeBehavior } from '../security/behaviorEngine.js';
import { logThreatEvent } from '../security/threatTelemetry.js';
import { serveMirroredResponse, routeToHoneypot } from '../security/mirrorRouter.js';
import db from '../security/initDB.js';

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/$/, "");
  const ua = req.headers['user-agent'] || 'unknown';
  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '0.0.0.0';

  // 1. Cloudflare Shielding Enforcement
  if (!req.headers['cf-ray']) {
    return res.status(403).json({ error: 'Direct access denied. Daxini infra is shielded by Cloudflare.' });
  }

  // 2. v2 Security Intelligence
  const fingerprint = generateClientFingerprint(req);
  const botSignals = detectAutomatedSignals(req);
  const passportToken = req.headers['authorization'] || null;
  const behavior = analyzeBehavior(req, fingerprint, passportToken);
  
  const totalThreatScore = Math.min(1.0, botSignals.risk_score + behavior.behavior_score);

  // 3. Telemetry Logging
  if (totalThreatScore > 0.1) {
    logThreatEvent({
        ip,
        fingerprint_id: fingerprint,
        threat_score: totalThreatScore,
        classification: behavior.classification,
        path_accessed: path,
        agent: ua
    });
  }

  // 4. Adaptive Diversity Routing
  // Malicious Tier (0.7+) -> Honeypot
  if (totalThreatScore >= 0.7) {
    console.warn(`[V2 MALICIOUS] ${ip} -> ${path} (Score: ${totalThreatScore})`);
    return routeToHoneypot(req, res);
  }

  // Suspicious Tier (0.4 - 0.7) -> Mirror
  if (totalThreatScore >= 0.4) {
    console.log(`[V2 SUSPICIOUS] ${ip} -> ${path} (Score: ${totalThreatScore})`);
    return serveMirroredResponse(res);
  }

  // 5. Standard Logic (Normal Tier < 0.4)
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

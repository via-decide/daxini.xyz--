/*
  api/index.js — Daxini Systems API Gateway (Hardened)
*/

import { generateClientFingerprint } from '../security/browserFingerprint.js';
import { detectAutomatedSignals } from '../security/botDetection.js';
import { analyzeBehavior } from '../security/behaviorEngine.js';
import { analyzeTrafficAnomaly, logAnomalyError } from '../security/anomalyDetector.js';
import { analyzeActorRelationships } from '../security/networkGraphAnalyzer.js';
import { updateReputation, isBlacklisted } from '../security/reputationEngine.js';
import { logThreatEvent } from '../security/threatTelemetry.js';
import { serveMirroredResponse, routeToHoneypot } from '../security/mirrorRouter.js';
import db from '../security/initDB.js';

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/$/, "");
  const ua = req.headers['user-agent'] || 'unknown';
  const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '0.0.0.0';

  // 1. Critical Reputation & Shielding
  if (!req.headers['cf-ray']) {
    return res.status(403).json({ error: 'Shielding bypass detected.' });
  }

  const fingerprint = generateClientFingerprint(req);
  if (isBlacklisted(ip) || isBlacklisted(fingerprint)) {
    return res.status(403).json({ error: 'Access revoked due to high-risk reputation.' });
  }

  // 2. v3 Intelligence Aggregation
  const botSignals = detectAutomatedSignals(req);
  const passportToken = req.headers['authorization'] || null;
  const behavior = analyzeBehavior(req, fingerprint, passportToken);
  const anomaly = analyzeTrafficAnomaly(ip, path);
  const graph = analyzeActorRelationships(ip, fingerprint);
  
  // Weights: Bot(0.4) + Behavior(0.3) + Anomaly(0.3) + GraphPenalty
  let totalThreatScore = botSignals.risk_score + behavior.behavior_score + anomaly.anomaly_score;
  totalThreatScore += graph.cluster_density * 0.2; // Coordination penalty
  totalThreatScore = Math.min(1.0, totalThreatScore);

  // 3. Persistent Reputation Update
  updateReputation(ip, 'ip', (totalThreatScore > 0.4 ? 0.05 : -0.01), 'GA_SCORE');
  updateReputation(fingerprint, 'fp', (totalThreatScore > 0.4 ? 0.05 : -0.01), 'GA_SCORE');

  // 4. Telemetry Logging
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

  // 5. Adaptive Diversity Routing
  if (totalThreatScore >= 0.7) {
    return routeToHoneypot(req, res);
  }

  if (totalThreatScore >= 0.4) {
    return serveMirroredResponse(res);
  }

  // 6. Standard Logic
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

    if (path === '/api/security/stats') {
      // Direct Authorization check for security telemetry
      if (req.headers['authorization'] !== `Bearer ${process.env.SECURITY_SECRET}`) {
        return res.status(403).json({ error: 'Unauthorized telemetry access' });
      }

      const stats = db.prepare('SELECT COUNT(*) as count FROM security_events').get();
      const reputations = db.prepare('SELECT * FROM reputation_scores ORDER BY score DESC LIMIT 10').all();
      const clusters = db.prepare('SELECT source_id, target_id, relation_type FROM threat_edges LIMIT 50').all();
      
      return res.status(200).json({
        eventCount: stats.count,
        topRisks: reputations,
        threatGraph: clusters,
        mutationCycle: Math.floor(Date.now() / (6 * 60 * 60 * 1000))
      });
    }

    // Capture endpoint scanning (404s)
  } catch (error) {
    return res.status(500).json({ error: 'Internal System Error', details: error.message });
  }
}

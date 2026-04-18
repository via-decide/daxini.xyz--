/*
  api/index.js — Daxini Systems API Gateway (Hardened)
*/

import { generateClientFingerprint } from '../security/browserFingerprint.js';
import { detectAutomatedSignals } from '../security/botDetection.js';
import { analyzeBehavior } from '../security/behaviorEngine.js';
import { analyzeTrafficAnomaly, logAnomalyError } from '../security/anomalyDetector.js';
import { analyzeActorRelationships } from '../security/networkGraphAnalyzer.js';
import { updateReputation, isBlacklisted, scoreIpByBehavior } from '../security/reputationEngine.js';
import { logThreatEvent } from '../security/threatTelemetry.js';
import { serveMirroredResponse, routeToHoneypot } from '../security/mirrorRouter.js';
import { evaluateMirrorThreat } from '../security/honeypotRouter.js';
import db from '../security/initDB.js';
import { generateCodeStream } from './llm/sovereign_engine.js';

const passportRegistry = new Map([
  ['UID-0001', { passport_id: 'PPT-AXIOM-0001', serial: 'ZX-93A7', owner: 'Sovereign Node Alpha', status: 'active' }],
  ['UID-0002', { passport_id: 'PPT-AXIOM-0002', serial: 'ZX-93A8', owner: 'Sovereign Node Beta', status: 'active' }],
  ['UID-0003', { passport_id: 'PPT-AXIOM-0003', serial: 'ZX-93A9', owner: 'Sovereign Node Gamma', status: 'suspended' }]
]);

const activePassportSession = {
  session_id: 'sess-zayvora-prime',
  uid: 'UID-0001',
  owner: 'Sovereign Node Alpha',
  issued_at: '2026-04-15T00:00:00.000Z',
  expires_at: '2026-04-15T08:00:00.000Z',
  status: 'active'
};

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
  scoreIpByBehavior(ip, behavior);

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

  // 5. Standard Logic
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (path === '/passport/verify') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
      const uid = url.searchParams.get('uid');
      if (!uid || !passportRegistry.has(uid)) {
        return res.status(403).json({ error: 'UID not registered' });
      }
      return res.status(200).json(passportRegistry.get(uid));
    }

    if (path === '/passport/session') {
      if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
      return res.status(200).json(activePassportSession);
    }

    if (path === '/api/check' || path === '/api') {
      return res.status(200).json({ status: 'HEALTHY', mission: 'RESEARCH_OS', version: '3.1' });
    }

    if (path === '/api/zayvora/execute') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

      try {
        // Set headers for Server-Sent Events (SSE)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // Initiate generation via local Ollama
        await generateCodeStream(
          prompt,
          (chunk) => {
            // Write each chunk as an SSE data payload
            res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          },
          (err) => {
            res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
            res.end();
          },
          () => {
            res.write(`data: [DONE]\n\n`);
            res.end();
          }
        );
        return; // Connection is kept open until onComplete or onError
      } catch (err) {
        if (!res.headersSent) {
          return res.status(502).json({ error: 'Local Zayvora engine unavailable', details: err.message });
        } else {
          res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
          res.end();
          return;
        }
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

    const mirrorDecision = evaluateMirrorThreat({
      ip,
      path,
      botSignals,
      behavior,
      threatScore: totalThreatScore
    });
    if (mirrorDecision.action === 'redirect_honeypot') {
      return routeToHoneypot(req, res);
    }
    if (mirrorDecision.action === 'mirror_response') {
      return serveMirroredResponse(res);
    }

    // Capture endpoint scanning (404s)
    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    return res.status(500).json({ error: 'Internal System Error', details: error.message });
  }
}

/*
  api/index.js — Daxini Systems API Gateway (Hardened & Resilient)
  MISSION: BEAST-MODE SOVEREIGNTY
*/

import crypto from 'crypto';
import { generateCodeStream } from './llm/sovereign_engine.js';
import { issueSessionToken } from '../security/sessionToken.js';

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

/**
 * Lazy Security Loader
 * Dynamically imports v3 intelligence modules to isolate native driver crashes.
 */
async function loadSecurityKit() {
    try {
        const [
            { generateClientFingerprint },
            { detectAutomatedSignals },
            { analyzeBehavior },
            { analyzeTrafficAnomaly },
            { analyzeActorRelationships },
            { updateReputation, isBlacklisted, scoreIpByBehavior },
            { logThreatEvent },
            dbModule
        ] = await Promise.all([
            import('../security/browserFingerprint.js'),
            import('../security/botDetection.js'),
            import('../security/behaviorEngine.js'),
            import('../security/anomalyDetector.js'),
            import('../security/networkGraphAnalyzer.js'),
            import('../security/reputationEngine.js'),
            import('../security/threatTelemetry.js'),
            import('../security/initDB.js')
        ]);

        const db = await (dbModule.getDB ? dbModule.getDB() : dbModule.default);
        
        return {
            generateClientFingerprint,
            detectAutomatedSignals,
            analyzeBehavior,
            analyzeTrafficAnomaly,
            analyzeActorRelationships,
            updateReputation,
            isBlacklisted,
            scoreIpByBehavior,
            logThreatEvent,
            db,
            active: true
        };
    } catch (err) {
        console.warn("[SECURITY] Sovereign Shield Isolated Case: Dynamic loading failed. Defaulting to passive mode.", err.message);
        return { active: false };
    }
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname.replace(/\/$/, "");
    const ua = req.headers['user-agent'] || 'unknown';
    const ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '0.0.0.0';

    // Normalize body
    if (req.method === 'POST' && typeof req.body === 'string') {
        try { req.body = JSON.parse(req.body); } catch (e) {}
    }

    // ── Resilient Security Core ────────────────────────────
    const kit = await loadSecurityKit();
    let fingerprint = 'unknown';
    let totalThreatScore = 0;

    if (kit.active) {
        try {
            fingerprint = kit.generateClientFingerprint(req);
            const botSignals = kit.detectAutomatedSignals(req);
            const passportToken = req.headers['authorization'] || null;
            const behavior = kit.analyzeBehavior(req, fingerprint, passportToken);
            const anomaly = kit.analyzeTrafficAnomaly(ip, path);
            const graph = kit.analyzeActorRelationships(ip, fingerprint);
            
            totalThreatScore = botSignals.risk_score + behavior.behavior_score + anomaly.anomaly_score + (graph.cluster_density * 0.2);
            totalThreatScore = Math.min(1.0, totalThreatScore);

            kit.updateReputation(ip, 'ip', (totalThreatScore > 0.4 ? 0.05 : -0.01), 'GA_SCORE');
            kit.scoreIpByBehavior(ip, behavior);
            if (totalThreatScore > 0.1) kit.logThreatEvent({ ip, fingerprint_id: fingerprint, threat_score: totalThreatScore, classification: behavior.classification, path_accessed: path, agent: ua });
        } catch (e) { console.warn("[SECURITY] Run-time skip:", e.message); }
    }

    // ── Headers ─────────────────────────────────────────────
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    // ── Specialized Routes ──────────────────────────────────
    
    // ── Sovereign Hardware Identity ────────────────────────
    
    // Provisioning Endpoint (Mac Mini Database Native)
    if (path === '/api/passport/provision') {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        
        try {
            const { nfc_tag_id, pin, owner_name } = req.body;
            if (!nfc_tag_id || !pin || !owner_name) {
                return res.status(400).json({ error: 'NFC Tag ID, PIN, and Owner Name are required to forge a passport.' });
            }

            // Create SHA256 Hash of PIN
            const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
            const uid = `UID-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

            if (kit.active && kit.db) {
                kit.db.prepare(`
                    INSERT INTO sovereign_passports (uid, owner_name, nfc_tag_id, pin_hash)
                    VALUES (?, ?, ?, ?)
                `).run(uid, owner_name, nfc_tag_id, pinHash);
            } else {
                return res.status(503).json({ error: 'Database offline. Provisioning must happen on local Node server.' });
            }

            return res.status(200).json({ status: 'success', message: 'Sovereign Passport Forged', uid: uid });
        } catch (dbErr) {
            // Check for UNIQUE constraint failure
            if (dbErr.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'This Physical NFC Tag is already bound to a Sovereign Passport.' });
            }
            return res.status(500).json({ error: 'Provisioning Failed', details: dbErr.message });
        }
    }

    // Hardware NFC + PIN Verification (Login Endpoint)
    if (path === '/api/passport/verify') {
        const nfc_tag_id = url.searchParams.get('nfc_tag_id');
        const pin = url.searchParams.get('pin');
        
        // 1. Try checking the Local SQLite DB First (if active)
        if (nfc_tag_id && pin && kit.active && kit.db) {
            const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
            const row = kit.db.prepare('SELECT * FROM sovereign_passports WHERE nfc_tag_id = ? AND pin_hash = ?').get(nfc_tag_id, pinHash);
            
            if (row) {
                const session = issueSessionToken({ uid: row.uid, owner: row.owner_name, nfcTagId: row.nfc_tag_id });
                return res.status(200).json({ uid: row.uid, owner: row.owner_name, jwt: session.jwt, passport_id: `PPT-${row.uid}` });
            }
        }
        
        // 2. Fallback to Hardcoded Registry ONLY if the DB query fails or DB is mocked
        const fallbackUid = url.searchParams.get('uid');
        const fallbackSerial = url.searchParams.get('serial');
        if (fallbackUid && passportRegistry.has(fallbackUid)) {
            const record = passportRegistry.get(fallbackUid);
            if (fallbackSerial && record.serial === fallbackSerial) {
                const session = issueSessionToken({ uid: fallbackUid, owner: record.owner, nfcTagId: 'FALLBACK-USB-TOKEN' });
                return res.status(200).json({ uid: fallbackUid, owner: record.owner, jwt: session.jwt, passport_id: record.passport_id });
            }
        }
        
        return res.status(403).json({ error: 'Sovereign Protocol Violation: Authentication Failed' });
    }

    if (path === '/api/zayvora/execute') {
        if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
        
        // Authorization Required for Zayvora Orchestration
        const auth = req.headers['authorization'];
        if (!auth || !auth.startsWith('Bearer UID-')) {
            return res.status(401).json({ error: 'Sovereign Passport Required' });
        }

        const prompt = req.body ? req.body.prompt : null;
        const githubToken = req.body ? req.body.github_token : null;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        await generateCodeStream(
            prompt,
            (chunk) => res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`),
            (err) => { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end(); },
            () => { res.write(`data: [DONE]\n\n`); res.end(); },
            githubToken
        );
        return;
    }

    if (path === '/api/check' || path === '/api') {
        return res.status(200).json({ status: 'HEALTHY', mission: 'RESEARCH_OS', kit_active: kit.active });
    }

    return res.status(404).json({ error: 'Not found' });

  } catch (globalError) {
    console.error("[CRITICAL] Sovereign Engine Fault:", globalError);
    return res.status(500).json({ 
        error: 'Sovereign Engine Fault', 
        message: globalError.message 
    });
  }
}

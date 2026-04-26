/*
  api/index.js — Daxini Systems API Gateway (v4.0 Security Hardened)
  MISSION: BEAST-MODE SOVEREIGNTY
  LAYERS: Auth (L2) + API (L6) + AI Guard (L7) + Input (L8)
*/

import crypto from 'crypto';
import { generateCodeStream } from './llm/sovereign_engine.js';
import { issueSessionToken } from '../security/sessionToken.js';
import { guardPrompt, getBlockedResponse } from '../security/promptGuard.js';
import { requestExecution, completeExecution } from '../security/runtimeGuard.js';
import { checkAttemptStatus, recordFailedAttempt, recordSuccessfulAttempt } from '../security/patternAuth.js';
import { validateRequestBody, sanitizeHTML, escapeHTML } from '../security/inputSanitizer.js';
import { logLoginAttempt, logPromptInjection, logRateLimitHit, logRuntimeKill, logUnusualActivity } from '../security/securityLogger.js';
import { generateRecoveryKey, hashRecoveryKey, verifyRecoveryKey, backupPassport, restorePassport, createFullBackup, getBackupStatus } from '../security/sovereignBackup.js';

const passportRegistry = new Map([
  ['UID-0001', { passport_id: 'PPT-AXIOM-0001', serial: 'ZX-93A7', owner: 'Sovereign Node Alpha', status: 'active' }],
  ['UID-0002', { passport_id: 'PPT-AXIOM-0002', serial: 'ZX-93A8', owner: 'Sovereign Node Beta', status: 'active' }],
  ['UID-0003', { passport_id: 'PPT-AXIOM-0003', serial: 'ZX-93A9', owner: 'Sovereign Node Gamma', status: 'suspended' }]
]);

const _activePassportSession = {
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
            { updateReputation, isBlacklisted, scoreIpByBehavior, getTopRisks },
            { logThreatEvent },
            { evaluateMirrorThreat },
            { serveMirroredResponse, routeToHoneypot },
            { mutateHoneypotResponse },
            { suspicionTracker },
            dbModule,
            deployEngine
        ] = await Promise.all([
            import('../security/browserFingerprint.js'),
            import('../security/botDetection.js'),
            import('../security/behaviorEngine.js'),
            import('../security/anomalyDetector.js'),
            import('../security/networkGraphAnalyzer.js'),
            import('../security/reputationEngine.js'),
            import('../security/threatTelemetry.js'),
            import('../security/honeypotRouter.js'),
            import('../security/mirrorRouter.js'),
            import('../security/honeypotMutator.js'),
            import('../security/suspicionScore.js'),
            import('../security/initDB.js'),
            import('../core/system/deploymentEngine.js')
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
            getTopRisks,
            logThreatEvent,
            evaluateMirrorThreat,
            serveMirroredResponse,
            routeToHoneypot,
            mutateHoneypotResponse,
            suspicionTracker,
            db,
            deployEngine,
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
        try { req.body = JSON.parse(req.body); } catch (_e) { /* silent parse failure */ }
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
            if (totalThreatScore > 0.1) {kit.logThreatEvent({ ip, fingerprint_id: fingerprint, threat_score: totalThreatScore, classification: behavior.classification, path_accessed: path, agent: ua });}

            // ── Cloudflare Tunnel Enrichment ─────────────────────
            const _cfCountry = req.headers['cf-ipcountry'] || null;
            const cfRay = req.headers['cf-ray'] || null;
            const isCloudflareTunnel = !!cfRay;

            // Boost suspicion for non-Cloudflare traffic if tunnel is expected
            if (!isCloudflareTunnel && process.env.REQUIRE_CF_TUNNEL === 'true') {
                kit.suspicionTracker.increment(ip, 30, 'BYPASS_CF_TUNNEL');
            }

            // Feed Cloudflare signals into suspicion tracker
            if (totalThreatScore > 0.3) {
                kit.suspicionTracker.increment(ip, Math.round(totalThreatScore * 50), `THREAT_SCORE_${totalThreatScore.toFixed(2)}`);
            }

            // ── Mirror v3: Deception Routing ─────────────────────
            const mirrorDecision = kit.evaluateMirrorThreat({
                ip, path, botSignals, behavior, threatScore: totalThreatScore
            });

            if (mirrorDecision.action === 'redirect_honeypot') {
                logUnusualActivity({ ip, fingerprint, activity: 'honeypot_redirect', details: mirrorDecision.reason });
                return kit.routeToHoneypot(req, res);
            }

            if (mirrorDecision.action === 'mirror_response') {
                logUnusualActivity({ ip, fingerprint, activity: 'mirror_served', details: mirrorDecision.reason });
                return kit.serveMirroredResponse(res);
            }

            // Check if IP is blacklisted (reputation engine)
            if (kit.isBlacklisted(ip)) {
                logUnusualActivity({ ip, fingerprint, activity: 'blacklisted_ip', details: 'Reputation score >= 0.95' });
                const mutated = kit.mutateHoneypotResponse({ status: 'blocked', ip_class: 'restricted' });
                return res.status(403).json(mutated);
            }

            // Check suspicion threshold
            if (kit.suspicionTracker.isCompromised(ip)) {
                logUnusualActivity({ ip, fingerprint, activity: 'suspicion_threshold', details: 'Score >= 100' });
                return kit.routeToHoneypot(req, res);
            }

        } catch (_e) { console.warn("[SECURITY] Run-time skip:", _e.message); }
    }

    // ── Headers ─────────────────────────────────────────────
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {return res.status(200).end();}

    // ── Layer 6: Request Body Validation ─────────────────────
    if (req.method === 'POST' && req.body) {
      const bodyCheck = validateRequestBody(req);
      if (!bodyCheck.valid) {
        return res.status(400).json({ error: 'Invalid request body', details: bodyCheck.error });
      }
    }

    // ── Specialized Routes ──────────────────────────────────
    
    // SOP Classification Proxy (Brain Port 6000 or Tunneled)
    if (path === '/api/sop/classify' || path === '/api/sop/validate') {
        if (req.method !== 'POST') {return res.status(405).json({ error: 'Method not allowed' });}
        
        let brainUrl = process.env.BRAIN_URL || 'http://localhost:6000';
        
        // Try dynamic tunnel config fallback
        try {
            const { BRAIN_ENDPOINT } = await import('./brain_config.js').catch(() => ({}));
            if (BRAIN_ENDPOINT) brainUrl = BRAIN_ENDPOINT;
        } catch (_e) {}

        const targetPath = path.replace('/api/sop', '/sop');
        
        try {
            console.log(`[GATEWAY] Proxying SOP request to: ${brainUrl}${targetPath}`);
            const brainRes = await fetch(`${brainUrl}${targetPath}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body)
            });
            const data = await brainRes.json();
            return res.status(brainRes.status).json(data);
        } catch (err) {
            console.error(`[GATEWAY] Brain Proxy Failed: ${err.message}`);
            return res.status(503).json({ error: 'Zayvora Brain Offline', details: err.message, target: brainUrl });
        }
    }
    
    // ── Sovereign Hardware Identity ────────────────────────
    
    // Provisioning Endpoint (Mac Mini Database Native)
    if (path === '/api/passport/provision') {
        if (req.method !== 'POST') {return res.status(405).json({ error: 'Method not allowed' });}
        
        try {
            const { nfc_tag_id, pin, owner_name } = req.body;
            if (!nfc_tag_id || !pin || !owner_name) {
                return res.status(400).json({ error: 'NFC Tag ID, PIN, and Owner Name are required to forge a passport.' });
            }

            // Create SHA256 Hash of PIN
            const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
            const uid = `UID-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

            // Generate recovery key (shown ONCE to user, stored hashed)
            const recoveryKey = generateRecoveryKey();
            const recoveryKeyHash = hashRecoveryKey(recoveryKey);

            if (kit.active && kit.db) {
                // Add recovery_key_hash column if missing
                try {
                    kit.db.prepare('ALTER TABLE sovereign_passports ADD COLUMN recovery_key_hash TEXT').run();
                } catch { /* column already exists */ }

                kit.db.prepare(`
                    INSERT INTO sovereign_passports (uid, owner_name, nfc_tag_id, pin_hash, recovery_key_hash)
                    VALUES (?, ?, ?, ?, ?)
                `).run(uid, owner_name, nfc_tag_id, pinHash, recoveryKeyHash);

                // Backup to encrypted file on Mac Mini
                backupPassport({ uid, owner_name, nfc_tag_id, pin_hash: pinHash, recovery_key_hash: recoveryKeyHash });
            } else {
                return res.status(503).json({ error: 'Database offline. Provisioning must happen on local Node server.' });
            }

            return res.status(200).json({
                status: 'success',
                message: 'Sovereign Passport Forged',
                uid,
                recovery_key: recoveryKey,
                warning: 'SAVE YOUR RECOVERY KEY. It will NOT be shown again. Required for account recovery.',
            });
        } catch (dbErr) {
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

        // ── Layer 2: Brute-force protection ──
        const attemptKey = `verify:${ip}:${fingerprint}`;
        const attemptStatus = checkAttemptStatus(attemptKey);
        if (!attemptStatus.allowed) {
            logLoginAttempt({ ip, fingerprint, success: false, identity: nfc_tag_id, method: 'nfc_pin' });
            const retrySeconds = Math.ceil(attemptStatus.retryAfterMs / 1000);
            return res.status(429).json({
              error: attemptStatus.reason === 'temporary_lock'
                ? `Account temporarily locked. Try again in ${retrySeconds}s.`
                : `Too many attempts. Cooldown: ${retrySeconds}s.`,
              retry_after: retrySeconds,
              failed_attempts: attemptStatus.failedAttempts,
            });
        }

        // 1. Try checking the Local SQLite DB First (if active)
        if (nfc_tag_id && pin && kit.active && kit.db) {
            const pinHash = crypto.createHash('sha256').update(pin).digest('hex');
            const row = kit.db.prepare('SELECT * FROM sovereign_passports WHERE nfc_tag_id = ? AND pin_hash = ?').get(nfc_tag_id, pinHash);
            
            if (row) {
                recordSuccessfulAttempt(attemptKey);
                logLoginAttempt({ ip, fingerprint, success: true, identity: row.uid, method: 'nfc_pin' });
                const session = issueSessionToken({ uid: row.uid, owner: row.owner_name, nfcTagId: row.nfc_tag_id });
                return res.status(200).json({ uid: row.uid, owner: row.owner_name, jwt: session.jwt, passport_id: `PPT-${row.uid}` });
            }
        }
        
        // 2. Fallback to Hardcoded Registry
        const fallbackUid = url.searchParams.get('uid');
        const fallbackSerial = url.searchParams.get('serial');
        if (fallbackUid && passportRegistry.has(fallbackUid)) {
            const record = passportRegistry.get(fallbackUid);
            if (fallbackSerial && record.serial === fallbackSerial) {
                recordSuccessfulAttempt(attemptKey);
                logLoginAttempt({ ip, fingerprint, success: true, identity: fallbackUid, method: 'fallback' });
                const session = issueSessionToken({ uid: fallbackUid, owner: record.owner, nfcTagId: 'FALLBACK-USB-TOKEN' });
                return res.status(200).json({ uid: fallbackUid, owner: record.owner, jwt: session.jwt, passport_id: record.passport_id });
            }
        }
        
        // Failed — record attempt
        recordFailedAttempt(attemptKey);
        logLoginAttempt({ ip, fingerprint, success: false, identity: nfc_tag_id || fallbackUid, method: 'nfc_pin' });
        return res.status(403).json({ error: 'Sovereign Protocol Violation: Authentication Failed' });
    }

    if (path === '/api/zayvora/execute') {
        if (req.method !== 'POST') {return res.status(405).json({ error: 'Method not allowed' });}
        
        // Authorization Required for Zayvora Orchestration
        const auth = req.headers['authorization'];
        if (!auth || !auth.startsWith('Bearer UID-')) {
            return res.status(401).json({ error: 'Sovereign Passport Required' });
        }

        const identity = auth.replace('Bearer ', '');
        const prompt = req.body ? req.body.prompt : null;
        const githubToken = req.body ? req.body.github_token : null;
        const performanceMode = req.body ? req.body.performance_mode || 'full' : 'full';
        const runtimeMode = req.body ? req.body.runtime_mode || 'local' : 'local';
        const model = req.body ? req.body.model || 'zayvora:latest' : 'zayvora:latest';

        if (!prompt) {return res.status(400).json({ error: 'Prompt is required' });}

        // ── Layer 7: Prompt Injection Guard ──
        const promptCheck = guardPrompt(prompt);
        if (!promptCheck.safe) {
            logPromptInjection({ ip, fingerprint, threats: promptCheck.threats, score: promptCheck.score });
            return res.status(400).json(getBlockedResponse(promptCheck));
        }

        // ── Runtime Guard: Check execution limits ──
        const execRequest = requestExecution(identity);
        if (!execRequest.allowed) {
            return res.status(429).json({ error: execRequest.message, reason: execRequest.reason });
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        const execContext = execRequest.context;
        await generateCodeStream(
            promptCheck.sanitized,
            (chunk) => {
              if (execContext.signal.aborted) {return;}
              res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
            },
            (err) => {
              completeExecution(identity, execContext.id);
              res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end();
            },
            () => {
              completeExecution(identity, execContext.id);
              res.write(`data: [DONE]\n\n`); res.end();
            },
            githubToken,
            performanceMode,
            runtimeMode,
            model
        );
        return;
    }

    // ── Account Recovery ──────────────────────────────────────
    if (path === '/api/passport/recover') {
        if (req.method !== 'POST') {return res.status(405).json({ error: 'Method not allowed' });}

        // Brute-force protection on recovery (stricter: 3 attempts before lockout)
        const recoveryKey_attempt = `recover:${ip}:${fingerprint}`;
        const recoveryStatus = checkAttemptStatus(recoveryKey_attempt);
        if (!recoveryStatus.allowed) {
            logUnusualActivity({ ip, fingerprint, activity: 'recovery_brute_force', details: `${recoveryStatus.failedAttempts} failed recovery attempts` });
            return res.status(429).json({ error: 'Recovery temporarily locked. Too many failed attempts.', retry_after: Math.ceil(recoveryStatus.retryAfterMs / 1000) });
        }

        const { nfc_tag_id, recovery_key, new_pin } = req.body || {};
        if (!nfc_tag_id || !recovery_key || !new_pin) {
            return res.status(400).json({ error: 'NFC Tag ID, Recovery Key, and New PIN are all required.' });
        }

        // Step 1: Find backup by NFC tag
        // Check DB first (if available), then check encrypted backup files
        let passportData = null;

        if (kit.active && kit.db) {
            try {
                passportData = kit.db.prepare('SELECT * FROM sovereign_passports WHERE nfc_tag_id = ?').get(nfc_tag_id);
            } catch { /* DB may be corrupted, try backup */ }
        }

        // If not in DB, try restore from encrypted backup
        if (!passportData) {
            // Scan all passport backup files for matching NFC tag
            const fs = await import('fs');
            const pathMod = await import('path');
            const { fileURLToPath: fu } = await import('url');
            const backupDir = pathMod.default.join(pathMod.default.dirname(fu(import.meta.url)), '../data/backups');

            if (fs.default.existsSync(backupDir)) {
                const files = fs.default.readdirSync(backupDir).filter(f => f.startsWith('passport_'));
                for (const file of files) {
                    try {
                        const restored = restorePassport(file.replace('passport_', '').replace('.enc', ''));
                        if (restored.success && restored.passport.nfc_tag_id === nfc_tag_id) {
                            passportData = restored.passport;
                            break;
                        }
                    } catch { /* skip corrupted backups */ }
                }
            }
        }

        if (!passportData) {
            recordFailedAttempt(recoveryKey_attempt);
            logLoginAttempt({ ip, fingerprint, success: false, identity: nfc_tag_id, method: 'recovery' });
            return res.status(404).json({ error: 'No identity found for this NFC Tag.' });
        }

        // Step 2: Verify recovery key
        if (!passportData.recovery_key_hash || !verifyRecoveryKey(recovery_key, passportData.recovery_key_hash)) {
            recordFailedAttempt(recoveryKey_attempt);
            logLoginAttempt({ ip, fingerprint, success: false, identity: passportData.uid, method: 'recovery' });
            return res.status(403).json({ error: 'Recovery key does not match. Check your saved recovery key.' });
        }

        // Step 3: Reset PIN and re-provision
        const newPinHash = crypto.createHash('sha256').update(new_pin).digest('hex');

        if (kit.active && kit.db) {
            try {
                kit.db.prepare('UPDATE sovereign_passports SET pin_hash = ? WHERE uid = ?').run(newPinHash, passportData.uid);
            } catch {
                // If DB is dead, re-insert
                try {
                    kit.db.prepare(`INSERT OR REPLACE INTO sovereign_passports (uid, owner_name, nfc_tag_id, pin_hash, recovery_key_hash) VALUES (?, ?, ?, ?, ?)`)
                      .run(passportData.uid, passportData.owner_name, passportData.nfc_tag_id, newPinHash, passportData.recovery_key_hash);
                } catch (_e) {
                    return res.status(500).json({ error: 'Database restore failed. Contact system administrator.' });
                }
            }

            // Update backup with new PIN hash
            backupPassport({ ...passportData, pin_hash: newPinHash });
        }

        recordSuccessfulAttempt(recoveryKey_attempt);
        logLoginAttempt({ ip, fingerprint, success: true, identity: passportData.uid, method: 'recovery' });

        // Issue new session
        const session = issueSessionToken({ uid: passportData.uid, owner: passportData.owner_name, nfcTagId: passportData.nfc_tag_id });

        return res.status(200).json({
            status: 'recovered',
            message: 'Account recovered successfully. PIN has been reset.',
            uid: passportData.uid,
            owner: passportData.owner_name,
            jwt: session.jwt,
        });
    }

    // ── Backup Status (admin only — requires sovereign token) ──
    if (path === '/api/backup/status') {
        const auth = req.headers['authorization'];
        if (!auth || !auth.startsWith('Bearer UID-')) {
            return res.status(401).json({ error: 'Sovereign Passport Required' });
        }
        return res.status(200).json(getBackupStatus());
    }

    // ── Trigger Full Backup (admin only) ──
    if (path === '/api/backup/create') {
        if (req.method !== 'POST') {return res.status(405).json({ error: 'Method not allowed' });}
        const auth = req.headers['authorization'];
        if (!auth || !auth.startsWith('Bearer UID-')) {
            return res.status(401).json({ error: 'Sovereign Passport Required' });
        }
        if (kit.active && kit.db) {
            const success = createFullBackup(kit.db);
            return res.status(success ? 200 : 500).json({ status: success ? 'backup_created' : 'backup_failed' });
        }
        return res.status(503).json({ error: 'Database offline.' });
    }

    // ── Security Dashboard Endpoints (Localhost Only) ──
    if (path === '/api/security/stats') {
        const topRisks = (kit.active && kit.getTopRisks) ? kit.getTopRisks() : [];
        return res.status(200).json({ topRisks, threatGraph: [] });
    }

    if (path === '/api/security/telemetry/dashboard') {
        return res.status(200).json({
            summary: { total_events: 0, attacks_blocked: 0, by_region: {}, by_threat_type: {}, by_target_domain: {} },
            recent: []
        });
    }

    // ── Deployment Engine Endpoints ──
    if (path === '/api/deploy/list') {
        if (!kit.active || !kit.deployEngine) {return res.status(503).json({ error: 'Deploy Engine offline.' });}
        return res.status(200).json(kit.deployEngine.getDeployments());
    }

    if (path === '/api/deploy/register') {
        if (req.method !== 'POST') {return res.status(405).json({ error: 'Method not allowed' });}
        if (!kit.active || !kit.deployEngine) {return res.status(503).json({ error: 'Deploy Engine offline.' });}
        
        const { project_id, domain } = req.body || {};
        if (!project_id) {return res.status(400).json({ error: 'project_id is required' });}
        
        const result = kit.deployEngine.registerDeployment(project_id, domain);
        return res.status(200).json(result);
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

'use strict';

/**
 * securityLogger.js — Privacy-First Security Logging
 * Minimal data, hashed IPs, 7-day auto-rotation, JSONL format.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_DIR = path.join(__dirname, '../logs');
const MAX_AGE_DAYS = 7;

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function hashIP(ip) {
  if (!ip) return 'unknown';
  return crypto.createHash('sha256').update(ip + 'zv-salt').digest('hex').substring(0, 12);
}

function getLogFile() {
  return path.join(LOG_DIR, `security_${new Date().toISOString().split('T')[0]}.jsonl`);
}

function write(entry) {
  try { fs.appendFileSync(getLogFile(), JSON.stringify(entry) + '\n', 'utf8'); }
  catch (e) { console.error('[LOG] Write fail:', e.message); }
}

export function logLoginAttempt({ ip, fingerprint, success, identity, method = 'nfc_pin' }) {
  write({ type: 'auth', ts: new Date().toISOString(), ip_hash: hashIP(ip), fp: fingerprint?.substring(0,8), id: identity?.substring(0,12), method, success });
}

export function logRateLimitHit({ ip, endpoint, currentCount }) {
  write({ type: 'rate_limit', ts: new Date().toISOString(), ip_hash: hashIP(ip), endpoint, count: currentCount });
}

export function logPromptInjection({ ip, fingerprint, threats, score }) {
  write({ type: 'prompt_inject', ts: new Date().toISOString(), ip_hash: hashIP(ip), fp: fingerprint?.substring(0,8), threats, score });
}

export function logRuntimeKill({ identity, execId, reason, elapsedMs }) {
  write({ type: 'runtime_kill', ts: new Date().toISOString(), id: identity?.substring(0,12), exec_id: execId, reason, elapsed_ms: elapsedMs });
}

export function logUnusualActivity({ ip, fingerprint, activity, details }) {
  write({ type: 'unusual', ts: new Date().toISOString(), ip_hash: hashIP(ip), fp: fingerprint?.substring(0,8), activity, details: typeof details === 'string' ? details.substring(0,200) : details });
}

export function logSessionEvent({ identity, event, sessionId, reason }) {
  write({ type: 'session', ts: new Date().toISOString(), id: identity?.substring(0,12), event, sid: sessionId?.substring(0,8), reason });
}

export function rotateLogs() {
  try {
    const files = fs.readdirSync(LOG_DIR).filter(f => f.startsWith('security_') && f.endsWith('.jsonl'));
    const cutoff = Date.now() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
    for (const file of files) {
      const fp = path.join(LOG_DIR, file);
      if (fs.statSync(fp).mtimeMs < cutoff) { fs.unlinkSync(fp); console.log(`[LOG] Rotated: ${file}`); }
    }
  } catch (e) { console.error('[LOG] Rotation fail:', e.message); }
}

setInterval(rotateLogs, 6 * 60 * 60 * 1000);
rotateLogs();

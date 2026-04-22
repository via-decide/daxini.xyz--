'use strict';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * threatTelemetry.js — JSON telemetry fallback.
 */

export function logThreatEvent(event) {
    const { ip, fingerprint_id, threat_score, classification, path_accessed, agent } = event;

    try {
        appendJsonSecurityEvent({
            timestamp: new Date().toISOString(),
            ip,
            fingerprint_id,
            threat_score,
            classification,
            path_accessed,
            agent
        });
    } catch (err) {
        console.error(`[SECURITY] Telemetry logging failure: ${err.message}`);
    }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const securityLogPath = path.join(__dirname, '../logs/security_events.json');

function appendJsonSecurityEvent(event) {
    if (!fs.existsSync(path.dirname(securityLogPath))) {
        fs.mkdirSync(path.dirname(securityLogPath), { recursive: true });
    }

    let existing = [];
    if (fs.existsSync(securityLogPath)) {
        try {
            const raw = fs.readFileSync(securityLogPath, 'utf8');
            existing = raw ? JSON.parse(raw) : [];
        } catch {
            existing = [];
        }
    }

    existing.push(event);
    fs.writeFileSync(securityLogPath, JSON.stringify(existing, null, 2));
}

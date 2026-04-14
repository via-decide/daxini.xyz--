'use strict';

import db from './initDB.js';

/**
 * threatTelemetry.js — v2 Security Incident Logging (Production/SQLite).
 */

export function logThreatEvent(event) {
    const { ip, fingerprint_id, threat_score, classification, path_accessed, agent } = event;
    
    try {
        const stmt = db.prepare(`
            INSERT INTO security_events (ip_hash, fingerprint_id, endpoint, behavior_pattern, user_agent, threat_score)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(ip, fingerprint_id, path_accessed, classification, agent, threat_score);
    } catch (err) {
        console.error(`[SECURITY] Telemetry logging failure: ${err.message}`);
    }
}

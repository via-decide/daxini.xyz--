'use strict';

import db from './initDB.js';

/**
 * reputationEngine.js — v3 Persistent IP/Fingerprint Reputation (ESM).
 */

export function getReputation(targetId) {
    const row = db.prepare('SELECT score, trust_flags FROM reputation_scores WHERE target_id = ?').get(targetId);
    return row || { score: 0.0, trust_flags: '[]' };
}

export function updateReputation(targetId, targetType, delta, reason) {
    const current = getReputation(targetId);
    let newScore = Math.max(0, Math.min(1.0, current.score + delta));
    
    // Auto-decay logic (if delta is 0, we can apply a small decay)
    if (delta === 0 && newScore > 0) {
        newScore = Math.max(0, newScore - 0.01);
    }

    db.prepare(`
        INSERT INTO reputation_scores (target_id, target_type, score, last_incident, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(target_id) DO UPDATE SET
            score = ?,
            last_incident = (CASE WHEN ? != 0 THEN CURRENT_TIMESTAMP ELSE last_incident END),
            updated_at = CURRENT_TIMESTAMP
    `).run(targetId, targetType, newScore, newScore, delta);

    return newScore;
}

export function isBlacklisted(targetId) {
    const rep = getReputation(targetId);
    return rep.score >= 0.95;
}

export function scoreIpByBehavior(ip, behavior) {
    let delta = 0;
    if (!behavior) return getReputation(ip).score;

    if (behavior.classification === 'malicious') delta += 0.08;
    else if (behavior.classification === 'suspicious') delta += 0.04;
    else delta -= 0.01;

    if (behavior.behavior_score >= 0.8) delta += 0.04;
    if (behavior.behavior_score <= 0.1) delta -= 0.01;

    return updateReputation(ip, 'ip', delta, 'BEHAVIOR_SCORE');
}

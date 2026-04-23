'use strict';

/**
 * reputationEngine.js — fallback in-memory reputation model.
 */

const scoreMap = new Map();

export function getReputation(targetId) {
    return scoreMap.get(targetId) || { score: 0.0, trust_flags: '[]' };
}

export function getTopRisks() {
    return Array.from(scoreMap.values())
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
}

export function updateReputation(targetId, targetType, delta, reason) {
    const current = getReputation(targetId);
    let newScore = Math.max(0, Math.min(1.0, (current.score || 0) + delta));
    if (delta === 0 && newScore > 0) {newScore = Math.max(0, newScore - 0.01);}

    scoreMap.set(targetId, {
        target_id: targetId,
        target_type: targetType,
        score: newScore,
        reason,
        updated_at: new Date().toISOString(),
        trust_flags: current.trust_flags || '[]'
    });

    return newScore;
}

export function isBlacklisted(targetId) {
    const rep = getReputation(targetId);
    return (rep.score || 0) >= 0.95;
}

export function scoreIpByBehavior(ip, behavior) {
    let delta = 0;
    if (!behavior) {return getReputation(ip).score;}

    if (behavior.classification === 'malicious') {delta += 0.08;}
    else if (behavior.classification === 'suspicious') {delta += 0.04;}
    else {delta -= 0.01;}

    if (behavior.behavior_score >= 0.8) {delta += 0.04;}
    if (behavior.behavior_score <= 0.1) {delta -= 0.01;}

    return updateReputation(ip, 'ip', delta, 'BEHAVIOR_SCORE');
}

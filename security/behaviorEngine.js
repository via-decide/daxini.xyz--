'use strict';

/**
 * behaviorEngine.js — v2 Sequence and Behavioral Analysis (ESM).
 */

const activityTracker = new Map();

export function analyzeBehavior(req, fingerprint, identityToken = null) {
    const now = Date.now();
    
    if (!activityTracker.has(fingerprint)) {
        activityTracker.set(fingerprint, {
            firstSeen: now,
            requests: [],
            pathViolations: 0,
            isPassportAuthenticated: false
        });
    }

    const stats = activityTracker.get(fingerprint);
    stats.requests.push({ timestamp: now, path: req.url });

    // Clean up old requests (last 5 minutes)
    stats.requests = stats.requests.filter(r => now - r.timestamp < 300000);

    let behaviorScore = 0;

    // Signal: Path Discovery
    const uniquePaths = new Set(stats.requests.map(r => r.path)).size;
    if (uniquePaths > 10) behaviorScore += 0.4;

    // Signal: Aggressive Rate
    const recentReqs = stats.requests.filter(r => now - r.timestamp < 60000);
    if (recentReqs.length > 50) behaviorScore += 0.3;

    // Signal: Sensitive Endpoint Probing
    const traps = ['/admin', '/db_dump', '/config', '/.env', '/internal_metrics'];
    if (traps.some(t => req.url.includes(t))) {
        stats.pathViolations++;
        behaviorScore += 0.5;
    }

    // IDENTITY TRUST SIGNAL (Daxini Passport)
    if (identityToken || stats.isPassportAuthenticated) {
        behaviorScore -= 0.3;
        stats.isPassportAuthenticated = true;
    }

    const finalScore = Math.max(0, Math.min(1.0, behaviorScore));

    return {
        fingerprint_id: fingerprint,
        behavior_score: finalScore,
        classification: finalScore > 0.7 ? "malicious" : (finalScore > 0.4 ? "suspicious" : "normal")
    };
}

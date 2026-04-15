'use strict';

import { globalLimiter } from './rateLimiter.js';

/**
 * honeypotRouter.js — Mirror Zayvora middleware decisions (ESM).
 */

export function evaluateMirrorThreat(context) {
    const { ip, path, botSignals, behavior, threatScore } = context;
    const allowedByRateLimit = globalLimiter.check(ip);

    if (!allowedByRateLimit) {
        return { action: 'redirect_honeypot', reason: 'rate_limit' };
    }

    if (botSignals.agent_type === 'bot' || behavior.classification === 'malicious') {
        return { action: 'redirect_honeypot', reason: 'bot_or_malicious_behavior' };
    }

    if (threatScore >= 0.4) {
        return { action: 'mirror_response', reason: 'elevated_risk' };
    }

    if (path.includes('/internal') || path.includes('/config')) {
        return { action: 'mirror_response', reason: 'sensitive_endpoint_probe' };
    }

    return { action: 'allow', reason: 'normal' };
}

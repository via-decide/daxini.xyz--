'use strict';

import crypto from 'crypto';

/**
 * browserFingerprint.js — Server-side client identification (ESM).
 */

export function generateClientFingerprint(req) {
    const signals = [
        req.headers['user-agent'] || 'unknown',
        req.headers['accept-language'] || 'unknown',
        req.headers['sec-ch-ua'] || 'none',
        req.headers['sec-ch-ua-platform'] || 'none',
        req.headers['cf-ipcountry'] || 'XX',
        req.headers['x-forwarded-for'] || req.socket.remoteAddress || '0.0.0.0'
    ];

    const hash = crypto.createHash('sha256')
        .update(signals.join('|'))
        .digest('hex');

    return hash.substring(0, 16);
}

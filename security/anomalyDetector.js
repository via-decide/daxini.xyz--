'use strict';

/**
 * anomalyDetector.js — fallback traffic analysis without persistence.
 */

export function analyzeTrafficAnomaly(targetId, path) {
    return {
        anomaly_score: 0,
        anomaly_type: 'normal',
        targetId,
        path
    };
}

export function logAnomalyError(targetId) {
    return { logged: false, targetId };
}

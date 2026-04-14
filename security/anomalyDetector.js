'use strict';

import db from './initDB.js';

/**
 * anomalyDetector.js — v3 Statistical Traffic Analysis (ESM).
 */

const WINDOW_SIZE_MS = 60 * 1000; // 1 minute windows

export function analyzeTrafficAnomaly(targetId, path) {
    const now = Date.now();
    const windowStart = Math.floor(now / WINDOW_SIZE_MS) * WINDOW_SIZE_MS;

    // 1. Get/Update Window Statistics
    let stats = db.prepare(`
        SELECT req_count, err_count, unique_endpoints 
        FROM security_statistics 
        WHERE target_id = ? AND window_start = ?
    `).get(targetId, windowStart);

    if (!stats) {
        db.prepare(`
            INSERT INTO security_statistics (target_id, window_start, req_count, unique_endpoints)
            VALUES (?, ?, 1, ?)
        `).run(targetId, windowStart, JSON.stringify([path]));
        return { anomaly_score: 0.0 };
    }

    const endpoints = JSON.parse(stats.unique_endpoints);
    if (!endpoints.includes(path)) endpoints.push(path);

    db.prepare(`
        UPDATE security_statistics 
        SET req_count = req_count + 1, unique_endpoints = ?
        WHERE target_id = ? AND window_start = ?
    `).run(JSON.stringify(endpoints), targetId, windowStart);

    // 2. Anomaly Scoring Logic
    let anomalyScore = 0;
    let type = "normal";

    // Signal: High Frequency Spike (> 40 req/min)
    if (stats.req_count > 40) {
        anomalyScore += 0.4;
        type = "traffic_spike";
    }

    // Signal: Endpoint Probing (> 8 unique paths/min)
    if (endpoints.length > 8) {
        anomalyScore += 0.5;
        type = "probing";
    }

    return {
        anomaly_score: Math.min(1.0, anomalyScore),
        anomaly_type: type
    };
}

export function logAnomalyError(targetId) {
    const windowStart = Math.floor(Date.now() / WINDOW_SIZE_MS) * WINDOW_SIZE_MS;
    db.prepare(`
        UPDATE security_statistics SET err_count = err_count + 1 
        WHERE target_id = ? AND window_start = ?
    `).run(targetId, windowStart);
}

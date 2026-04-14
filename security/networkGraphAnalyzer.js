'use strict';

import db from './initDB.js';

/**
 * networkGraphAnalyzer.js — v3 Actor Relationship Modeling (ESM).
 */

export function analyzeActorRelationships(ip, fingerprint) {
    // 1. Check for shared fingerprint (Multiple IPs using one FP)
    const siblings = db.prepare(`
        SELECT DISTINCT ip_hash FROM security_events 
        WHERE fingerprint_id = ? AND ip_hash != ?
        LIMIT 10
    `).all(fingerprint, ip);

    if (siblings.length > 0) {
        siblings.forEach(sibling => {
            db.prepare(`
                INSERT INTO threat_edges (source_id, target_id, relation_type, weight)
                VALUES (?, ?, 'SHARED_FINGERPRINT', 0.5)
                ON CONFLICT(source_id, target_id, relation_type) DO UPDATE SET
                    weight = MIN(1.0, weight + 0.1)
            `).run(ip, sibling.ip_hash);
        });
    }

    // 2. Aggregate Cluster Weight
    const cluster = db.prepare(`
        SELECT SUM(weight) as total_weight FROM threat_edges 
        WHERE source_id = ?
    `).get(ip);

    return {
        cluster_density: Math.min(1.0, (cluster.total_weight || 0) / 5),
        relationship_count: siblings.length
    };
}

export function getGraphData() {
    const nodes = db.prepare('SELECT DISTINCT target_id as id, target_type as type, score FROM reputation_scores').all();
    const edges = db.prepare('SELECT source_id as source, target_id as target, relation_type as type FROM threat_edges').all();
    return { nodes, edges };
}

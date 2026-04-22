'use strict';

/**
 * networkGraphAnalyzer.js — fallback in-memory actor relationship model.
 */

const relationships = new Map();

export function analyzeActorRelationships(ip, fingerprint) {
    const key = `${ip}:${fingerprint}`;
    const rel = relationships.get(key) || { cluster_density: 0, relationship_count: 0 };
    relationships.set(key, rel);
    return rel;
}

export function getGraphData() {
    return { nodes: [], edges: [] };
}

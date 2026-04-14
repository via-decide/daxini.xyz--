'use strict';

/**
 * mirrorRouter.js — v2 Production Deception Logic (ESM).
 */

export function serveMirroredResponse(res) {
    return res.status(200).json({
        status: "ok",
        node_id: "mirror-zn-04",
        decoupled: true,
        message: "Operating in high-integrity mirror mode."
    });
}

export function routeToHoneypot(req, res) {
    const path = req.url.toLowerCase();

    // Deception for specific targets
    if (path.includes('models')) {
        return res.status(200).json({
            total_models: 12,
            active: ["zayvora-axiom-prod-v3", "zayvora-praxis-stable"],
            last_sync: new Date().toISOString()
        });
    }

    if (path.includes('metrics') || path.includes('internal')) {
        return res.status(200).json({
            cpu_load: "42.5%",
            memory: "3072MB",
            status: "degraded_mirror"
        });
    }

    // Default Malicious response
    return res.status(403).json({
        error: "Access Restriction",
        reason: "Anomalous footprint detected.",
        trace_id: Math.random().toString(36).substring(7)
    });
}

'use strict';

/**
 * botDetection.js — v2 Advanced Automated Agent Detection (ESM).
 */

export function detectAutomatedSignals(req) {
    const userAgent = req.headers['user-agent'] || '';
    let risk = 0;

    // Signal: Headless Browser Signatures
    const headlessKeywords = [/headless/i, /puppeteer/i, /selenium/i, /playwright/i, /phantomjs/i];
    if (headlessKeywords.some(p => p.test(userAgent))) {
        risk += 0.6;
    }

    // Signal: Missing standard browser headers
    const criticalHeaders = ['accept', 'accept-encoding', 'accept-language'];
    criticalHeaders.forEach(h => {
        if (!req.headers[h]) {risk += 0.15;}
    });

    // Signal: Common bot libraries
    const botLibs = [/python-requests/i, /curl/i, /scrapy/i, /axios/i, /got/i];
    if (botLibs.some(p => p.test(userAgent))) {
        risk += 0.4;
    }

    return {
        agent_type: risk > 0.5 ? "bot" : (risk > 0.2 ? "unknown" : "human"),
        risk_score: Math.min(1.0, risk)
    };
}

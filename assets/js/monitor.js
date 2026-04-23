/**
 * ══════════════════════════════════════════════════════════
 * MONITOR.JS — Antigravity Performance & Health Monitoring
 * ══════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  const metrics = {
    pageLoadTime: performance.now(),
    firstMessageLatency: null,
    streakOfSuccessfulMessages: 0,
    averageMessageLatency: 0,
    errorCount: 0,
    offlineEvents: 0,
    lastHealthCheck: null,
    zayvoraStatus: 'unknown'
  };

  // ── Metrics API ──────────────────────────────────────────
  window.AntigravityMonitor = {
    logMessageSuccess: (latency) => {
      metrics.streakOfSuccessfulMessages++;
      if (metrics.firstMessageLatency === null) metrics.firstMessageLatency = latency;
      metrics.averageMessageLatency = 
        metrics.averageMessageLatency === 0 ? latency : (metrics.averageMessageLatency + latency) / 2;
      console.log(`[MONITOR] Message Success: ${latency.toFixed(2)}ms`);
    },

    logError: (type, error) => {
      metrics.errorCount++;
      console.error(`[MONITOR] Error: ${type}`, error);
      
      // Visual feedback trigger (if UI is available)
      if (window.DaxiniUI && window.DaxiniUI.notify) {
        window.DaxiniUI.notify(`System Error: ${type}`, 'error');
      }
    },

    logOffline: () => {
      metrics.offlineEvents++;
      console.warn('[MONITOR] Connection lost. Switching to Sovereign Offline Mode.');
    },

    getSnapshot: () => ({
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      ...metrics,
      memory: performance.memory ? {
        used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + 'MB',
        total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + 'MB',
        limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + 'MB'
      } : 'unsupported'
    })
  };

  // ── Auto-Monitoring ──────────────────────────────────────
  
  // 1. Health Check Loop
  async function checkHealth() {
    try {
      const start = performance.now();
      const res = await fetch('http://localhost:8000/health', { timeout: 2000 });
      metrics.zayvoraStatus = res.ok ? 'ready' : 'error';
      metrics.lastHealthCheck = performance.now() - start;
    } catch (e) {
      metrics.zayvoraStatus = 'unreachable';
    }
  }

  // 2. Event Listeners
  window.addEventListener('online', () => window.AntigravityMonitor.logMessageSuccess(0)); // Reset latency baseline
  window.addEventListener('offline', () => window.AntigravityMonitor.logOffline());

  // 3. Reporting Interval
  setInterval(() => {
    const snapshot = window.AntigravityMonitor.getSnapshot();
    console.groupCollapsed(`[DAILY METRICS] ${new Date().toLocaleTimeString()}`);
    console.table(snapshot);
    console.groupEnd();
  }, 5 * 60 * 1000); // Every 5 minutes

  // Expose global debug helper
  window.debugMetrics = window.AntigravityMonitor.getSnapshot;

  console.log('✅ Antigravity Monitor Initialized');
})();

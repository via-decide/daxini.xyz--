const metrics = {};

export function incrementMetric(name) {
  metrics[name] = (metrics[name] || 0) + 1;
}

export function getMetrics() {
  return metrics;
}

export function initializeCoreMetrics() {
  ['zayvora_requests', 'plugin_calls', 'module_launches', 'research_jobs'].forEach(function (name) {
    if (typeof metrics[name] === 'undefined') {
      metrics[name] = 0;
    }
  });
}

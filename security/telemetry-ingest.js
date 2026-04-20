const DEFAULT_WINDOW_SIZE = 5000;

const telemetryState = {
  events: []
};

function normalizeEvent(event) {
  const blocked = typeof event.blocked === 'boolean' ? event.blocked : true;
  return {
    id: event.id || `sec_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    timestamp: event.timestamp || new Date().toISOString(),
    source_domain: event.source_domain || 'unknown',
    target_domain: event.target_domain || 'unknown',
    source_ip_region: event.source_ip_region || 'unknown',
    threat_type: event.threat_type || 'unknown',
    blocked,
    details: event.details || {}
  };
}

export function ingestTelemetryEvent(event) {
  const normalized = normalizeEvent(event || {});
  telemetryState.events.push(normalized);

  if (telemetryState.events.length > DEFAULT_WINDOW_SIZE) {
    telemetryState.events.splice(0, telemetryState.events.length - DEFAULT_WINDOW_SIZE);
  }

  return normalized;
}

function countBy(list, key) {
  return list.reduce((acc, item) => {
    const bucket = item[key] || 'unknown';
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});
}

export function getTelemetrySummary() {
  const events = telemetryState.events;
  const blockedCount = events.filter((event) => event.blocked).length;

  return {
    total_events: events.length,
    attacks_blocked: blockedCount,
    by_region: countBy(events, 'source_ip_region'),
    by_threat_type: countBy(events, 'threat_type'),
    by_target_domain: countBy(events, 'target_domain')
  };
}

export function getDashboardModel() {
  const summary = getTelemetrySummary();
  const recent = telemetryState.events.slice(-100).reverse();

  return {
    summary,
    recent
  };
}

export function resetTelemetryState() {
  telemetryState.events.length = 0;
}

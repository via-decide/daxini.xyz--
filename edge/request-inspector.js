const RISK_PATTERNS = [/\.\./, /<script/i, /union\s+select/i, /\/etc\/passwd/i];

export function inspectRequest(req) {
  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  const hanuman = globalThis?.HanumanSecurity?.inspectRequest;
  if (typeof hanuman === 'function') return hanuman(req);

  const reasons = RISK_PATTERNS.filter((pattern) => pattern.test(pathname)).map((p) => p.toString());
  return {
    flagged: reasons.length > 0,
    reasons,
    telemetry: {
      path: pathname,
      ip: req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || '0.0.0.0',
      ua: req.headers['user-agent'] || 'unknown'
    }
  };
}

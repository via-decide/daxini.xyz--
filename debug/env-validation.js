export function validateFunctionEnv(env = process.env) {
  const missing = [];
  const optionalWarnings = [];

  if (!env.VERCEL_URL && !env.VERCEL_ENV) {
    optionalWarnings.push('Vercel environment variables not detected (running local or misconfigured runtime).');
  }

  if (!env.BRAIN_ENDPOINT && !env.ZAYVORA_BRAIN_ENDPOINT) {
    optionalWarnings.push('No upstream brain endpoint configured; API will return fallback payloads.');
  }

  return {
    ok: missing.length === 0,
    missing,
    warnings: optionalWarnings
  };
}

export function safeEnvSummary(env = process.env) {
  const keys = ['VERCEL', 'VERCEL_ENV', 'VERCEL_URL', 'NODE_ENV', 'BRAIN_ENDPOINT', 'ZAYVORA_BRAIN_ENDPOINT'];
  const summary = {};
  for (const key of keys) {
    const value = env[key];
    summary[key] = typeof value === 'string' && value.length > 0 ? 'set' : 'unset';
  }
  return summary;
}

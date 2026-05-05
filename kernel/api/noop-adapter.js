/**
 * MODULE_CONTRACT
 * Inputs: request descriptor { endpoint, method, body, headers }
 * Outputs: deterministic response object with safe fallback payload
 * Functions: createNoopAdapter(), safeFetch(), isApiEndpoint()
 * Constraints: no network side effects, browser-safe, no global mutation
 */

export function isApiEndpoint(endpoint = '') {
  return typeof endpoint === 'string' && (/^\/api\//.test(endpoint) || /\/api\//.test(endpoint));
}

export function createNoopAdapter(config = {}) {
  const mode = config.mode || 'offline';
  const engineStatus = config.engineStatus || 'disconnected';

  async function safeFetch(endpoint, options = {}) {
    const request = {
      endpoint: endpoint || '',
      method: options.method || 'GET',
      hasBody: Boolean(options.body),
      ts: Date.now()
    };

    return {
      ok: false,
      status: 503,
      mode,
      engineStatus,
      request,
      error: 'execution_engine_unavailable',
      message: 'Execution engine not connected',
      data: null
    };
  }

  return { safeFetch, isApiEndpoint };
}

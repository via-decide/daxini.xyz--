/**
 * MODULE_CONTRACT
 * Inputs: runtime hints { locationHref, hasWindow, backendUrl, fetchImpl }
 * Outputs: runtime controller { mode, call(), diagnostics() }
 * Functions: detectRuntimeMode(), createRuntimeFallback()
 * Constraints: deterministic mode detection, graceful failure, no DOM dependency
 */

import { createNoopAdapter, isApiEndpoint } from '../api/noop-adapter.js';

export function detectRuntimeMode(hints = {}) {
  const href = hints.locationHref || '';
  const hasWindow = typeof hints.hasWindow === 'boolean' ? hints.hasWindow : typeof window !== 'undefined';
  const backendUrl = hints.backendUrl || '';
  const isStaticHost = /github\.io|vercel\.app|netlify\.app/.test(href);

  if (!hasWindow) return 'server';
  if (!backendUrl) return 'offline-static';
  if (isStaticHost && !/https?:\/\//.test(backendUrl)) return 'offline-static';
  return 'connected';
}

export function createRuntimeFallback(hints = {}) {
  const mode = detectRuntimeMode(hints);
  const fetchImpl = hints.fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
  const noop = createNoopAdapter({ mode, engineStatus: mode === 'connected' ? 'ready' : 'disconnected' });

  async function call(endpoint, options = {}) {
    if (!isApiEndpoint(endpoint)) {
      return { ok: false, status: 400, error: 'invalid_endpoint', endpoint };
    }

    if (mode !== 'connected' || !fetchImpl) {
      return noop.safeFetch(endpoint, options);
    }

    try {
      const res = await fetchImpl(endpoint, options);
      const body = await res.text();
      return { ok: res.ok, status: res.status, mode, body };
    } catch (error) {
      return {
        ok: false,
        status: 503,
        mode,
        error: 'fetch_failed',
        message: error?.message || 'Unknown fetch failure'
      };
    }
  }

  function diagnostics() {
    return { mode, staticSafe: mode !== 'connected' };
  }

  return { mode, call, diagnostics };
}

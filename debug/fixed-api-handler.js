import { validateFunctionEnv, safeEnvSummary } from './env-validation.js';

function json(res, statusCode, payload) {
  if (!res || typeof res.status !== 'function' || typeof res.json !== 'function') {
    return;
  }
  return res.status(statusCode).json(payload);
}

export async function safeApiHandler(req, res) {
  const method = req?.method || 'UNKNOWN';
  const url = req?.url || 'UNKNOWN';
  const start = Date.now();

  try {
    console.log('[vercel-api] request', { method, url });

    const envState = validateFunctionEnv(process.env);
    if (envState.warnings.length) {
      console.warn('[vercel-api] env warnings', envState.warnings);
    }

    if (method === 'GET') {
      return json(res, 200, {
        status: 'ok',
        service: 'daxini',
        runtime: 'serverless',
        timestamp: Date.now(),
        env: safeEnvSummary(process.env)
      });
    }

    return json(res, 405, { error: 'method_not_allowed' });
  } catch (error) {
    console.error('[vercel-api] crash', {
      message: error?.message,
      stack: error?.stack,
      method,
      url,
      elapsed_ms: Date.now() - start
    });

    return json(res, 500, {
      error: 'internal_error',
      message: 'Function failed safely',
      request: { method, url }
    });
  }
}

import { inspectRequest } from '../edge/request-inspector.js';
import { loadAppFromDisk, loadStaticAsset } from './app-loader.js';
import { WorkerPool } from './worker-pool.js';
import { withRuntimeConfig } from './runtime-config.js';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8'
};

function getExt(p = '') {
  const idx = p.lastIndexOf('.');
  return idx >= 0 ? p.slice(idx).toLowerCase() : '';
}

function requestSize(req) {
  const raw = req.headers?.['content-length'];
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function createEdgeRuntime({ rootDir, config = {}, logger = console }) {
  const runtimeConfig = withRuntimeConfig(config);
  const apps = new Map();
  const responseCache = new Map();

  const pool = new WorkerPool({
    size: runtimeConfig.workerCount,
    memoryMb: runtimeConfig.maxWorkerMemoryMb,
    timeoutMs: runtimeConfig.maxExecutionMs
  });

  function getApp(appName) {
    if (!apps.has(appName)) {
      const app = loadAppFromDisk({
        rootDir,
        appsRoot: runtimeConfig.appsRoot,
        appName,
        maxAppCodeBytes: runtimeConfig.maxAppCodeBytes
      });
      apps.set(appName, app);
    }
    return apps.get(appName);
  }

  function cacheGet(key) {
    const item = responseCache.get(key);
    if (!item || item.expiresAt < Date.now()) {
      responseCache.delete(key);
      return null;
    }
    return item;
  }

  function cacheSet(key, value, ttlMs) {
    responseCache.set(key, { ...value, expiresAt: Date.now() + ttlMs });
  }

  return {
    async handle(req, res) {
      const security = inspectRequest(req);
      if (security.flagged) {
        logger.warn('[Hanuman] blocked edge runtime request', security.telemetry, security.reasons);
        res.writeHead(403, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'blocked', message: 'request blocked by Hanuman' }));
        return true;
      }

      if (requestSize(req) > runtimeConfig.maxRequestBytes) {
        res.writeHead(413, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'request-too-large' }));
        return true;
      }

      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] !== 'apps' || !parts[1]) return false;

      const appName = parts[1];
      const app = getApp(appName);
      const assetPath = parts.slice(2).join('/');

      if (!assetPath || assetPath === 'index.html') {
        const key = `ui:${appName}`;
        const cached = cacheGet(key);
        if (cached) {
          res.writeHead(200, cached.headers);
          res.end(cached.body);
          return true;
        }
        const body = app.html;
        const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' };
        cacheSet(key, { headers, body }, runtimeConfig.staticCacheTtlMs);
        res.writeHead(200, headers);
        res.end(body);
        return true;
      }

      if (/\.(png|jpg|jpeg|svg|css|js|json)$/i.test(assetPath)) {
        const key = `asset:${appName}:${assetPath}`;
        const cached = cacheGet(key);
        if (cached) {
          res.writeHead(200, cached.headers);
          res.end(cached.body);
          return true;
        }
        const file = loadStaticAsset({ app, assetPath });
        if (!file) {
          res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ status: 'not-found' }));
          return true;
        }
        const headers = {
          'content-type': CONTENT_TYPES[getExt(assetPath)] || 'application/octet-stream',
          'cache-control': 'public, max-age=300'
        };
        cacheSet(key, { headers, body: file }, runtimeConfig.staticCacheTtlMs);
        res.writeHead(200, headers);
        res.end(file);
        return true;
      }

      try {
        const execKey = `exec:${appName}:${req.method}:${url.pathname}${url.search}`;
        const cached = req.method === 'GET' ? cacheGet(execKey) : null;
        if (cached) {
          res.writeHead(cached.status, cached.headers);
          res.end(cached.body);
          return true;
        }

        const response = await pool.execute({
          code: app.appCode,
          request: {
            method: req.method,
            path: url.pathname,
            query: Object.fromEntries(url.searchParams.entries()),
            headers: req.headers
          }
        });

        const status = Number(response.status) || 200;
        const headers = response.headers || { 'content-type': 'application/json; charset=utf-8' };
        const body = typeof response.body === 'string' ? response.body : JSON.stringify(response.body ?? {});
        if (req.method === 'GET' && status < 400) cacheSet(execKey, { status, headers, body }, runtimeConfig.cacheTtlMs);
        res.writeHead(status, headers);
        res.end(body);
      } catch (error) {
        logger.error('[edge-runtime] app execution failed', { appName, error: error?.message || error });
        res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'runtime-error', message: 'app execution failed' }));
      }

      return true;
    },
    invalidate(appName) {
      apps.delete(appName);
      for (const key of responseCache.keys()) {
        if (key.includes(`:${appName}`) || key.endsWith(appName)) responseCache.delete(key);
      }
    },
    async close() {
      await pool.close();
    }
  };
}

import path from 'path';
import { inspectRequest } from './request-inspector.js';
import { resolveRoute } from './route-table.js';
import { serveFileWithCaching } from './response-handler.js';
import { createEdgeRuntime } from '../edge-runtime/runtime.js';

const ROOT_FILES = { '/': '/index.html', '/workspace': '/workspace.html', '/zayvora': '/zayvora.html', '/research': '/research.html' };

function fileForPath(rootDir, pathname, route) {
  if (ROOT_FILES[pathname]) return path.join(rootDir, ROOT_FILES[pathname]);
  if (route?.module === 'apps') return path.join(rootDir, 'apps', route.appName, 'index.html');
  if (pathname.startsWith('/games/mars')) return path.join(rootDir, 'modules/mars/index.html');
  if (pathname.startsWith('/games/orchade') || pathname === '/games') return path.join(rootDir, 'modules/orchade/index.html');
  return path.join(rootDir, pathname);
}

async function hydrateBody(req) {
  req.body = await new Promise((resolve) => { let body = ''; req.on('data', (c) => { body += c; }); req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } }); });
}

export function createEdgeRouter({ rootDir, apiHandler, edgeRuntimeConfig }) {
  const edgeRuntime = createEdgeRuntime({ rootDir, config: edgeRuntimeConfig || {} });
  return async function edgeRouter(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); const pathname = url.pathname.replace(/\/$/, '') || '/';
    const security = inspectRequest(req); if (security.flagged) { console.warn('[Hanuman] Blocked request', security.telemetry, security.reasons); res.writeHead(403, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ blocked: true })); return; }
    if (pathname.startsWith('/apps/') && await edgeRuntime.handle(req, res)) return;
    if (pathname.startsWith('/api') || pathname.startsWith('/passport')) { res.status = (code) => { res.statusCode = code; return res; }; res.json = (data) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); }; await hydrateBody(req); return apiHandler(req, res); }
    const route = resolveRoute(pathname); const filePath = fileForPath(rootDir, pathname, route);
    if (serveFileWithCaching(req, res, filePath)) return;
    if (!path.extname(filePath) && serveFileWithCaching(req, res, `${filePath}.html`)) return;
    if (serveFileWithCaching(req, res, path.join(rootDir, '404.html'), 404)) return;
    res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404 Not Found');
  };
}

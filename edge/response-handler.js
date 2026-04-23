import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

export function serveFileWithCaching(req, res, filePath, statusCode = 200) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {return false;}
  const ext = path.extname(filePath); const stat = fs.statSync(filePath); const etag = `W/"${stat.size}-${stat.mtimeMs}"`;
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, { ETag: etag }); res.end(); return true; }
  let body = fs.readFileSync(filePath); const acceptGzip = /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  const cacheControl = /(\/(assets|public|workspace|apps)\/|\.(js|css|png|jpg|svg|ico)$)/.test(filePath) ? 'public, max-age=86400' : 'no-cache';
  const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cacheControl, ETag: etag, Vary: 'Accept-Encoding' };
  if (acceptGzip && /^(text\/|application\/(javascript|json))/.test(headers['Content-Type'])) { body = zlib.gzipSync(body); headers['Content-Encoding'] = 'gzip'; }
  res.writeHead(statusCode, headers); res.end(body); return true;
}

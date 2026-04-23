import fs from 'fs';
import path from 'path';

const REQUIRED_FILES = ['index.html', 'app.js', 'manifest.json'];

function assertSafeAppName(appName) {
  if (!/^[a-z0-9-]+$/i.test(appName)) {throw new Error('invalid-app-name');}
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

export function loadAppFromDisk({ rootDir, appsRoot, appName, maxAppCodeBytes }) {
  assertSafeAppName(appName);
  const appDir = path.join(rootDir, appsRoot, appName);
  const missing = REQUIRED_FILES.filter((file) => !fs.existsSync(path.join(appDir, file)));
  if (missing.length > 0) {throw new Error(`app-missing-files:${missing.join(',')}`);}

  const appJsPath = path.join(appDir, 'app.js');
  const appCode = readUtf8(appJsPath);
  if (Buffer.byteLength(appCode, 'utf8') > maxAppCodeBytes) {throw new Error('app-code-too-large');}

  return {
    appName,
    appDir,
    appCode,
    html: readUtf8(path.join(appDir, 'index.html')),
    manifest: JSON.parse(readUtf8(path.join(appDir, 'manifest.json')))
  };
}

export function loadStaticAsset({ app, assetPath }) {
  const cleanPath = assetPath.replace(/^\/+/, '');
  if (cleanPath.includes('..')) {throw new Error('invalid-asset-path');}
  const resolved = path.join(app.appDir, cleanPath);
  if (!resolved.startsWith(app.appDir)) {throw new Error('invalid-asset-path');}
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {return null;}
  return fs.readFileSync(resolved);
}

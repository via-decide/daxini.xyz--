import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

const html = read('index.html');
assert(html.includes('<title>DAXINI'), 'Homepage title is missing.');
assert(html.includes('href="/zayvora"'), 'Homepage must link to /zayvora.');
assert(html.includes('href="/workspace"') || fs.existsSync(path.join(root, 'workspace.html')), 'Workspace route/file is missing.');

const criticalAssets = [
  'assets/css/base.css',
  'assets/css/layout.css',
  'assets/js/app.js',
  'assets/js/stack.js',
  'assets/js/zayvora-app.js',
  'manifest.json',
  'sw.js',
];

for (const asset of criticalAssets) {
  assert(fs.existsSync(path.join(root, asset)), `Missing critical asset: ${asset}`);
}

const vercel = JSON.parse(read('vercel.json'));
const rewriteSources = new Set((vercel.rewrites || []).map((entry) => entry.source));
for (const route of ['/zayvora', '/workspace']) {
  assert(rewriteSources.has(route), `Missing Vercel rewrite for ${route}`);
}

console.log('✅ Smoke test passed.');

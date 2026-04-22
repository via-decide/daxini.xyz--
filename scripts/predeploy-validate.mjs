import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'index.html',
  'workspace.html',
  'zayvora.html',
  'assets/css/base.css',
  'assets/js/app.js',
  'assets/js/zayvora-app.js',
  'sw.js',
  'manifest.json',
  'vercel.json',
];

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    fail(`Missing required deployment file: ${file}`);
  }
}

const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const marker of ['DAXINI', 'Zayvora', 'LogicHub', 'ViaDecide']) {
  if (!indexSource.includes(marker)) {
    fail(`Homepage is missing required brand marker: ${marker}`);
  }
}

const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
if (!Array.isArray(vercel.rewrites) || vercel.rewrites.length === 0) {
  fail('vercel.json must define rewrites for stable route handling.');
}

console.log('✅ Predeploy validation passed.');

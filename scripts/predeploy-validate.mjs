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

console.log('✅ Predeploy validation passed.');

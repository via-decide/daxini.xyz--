#!/usr/bin/env node
/**
 * Static deploy audit utility.
 * Scans repository for /api serverless dependencies and outputs a migration report.
 */
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(['.git', 'node_modules', 'training/adapters']);
const TARGET_EXT = new Set(['.js', '.mjs', '.cjs', '.ts', '.html', '.md', '.json']);
const API_PATTERNS = [/fetch\s*\(\s*['"]\/api\//g, /['"]\/api\//g, /https?:\/\/[^\s'"`]*\/api\//g];

function shouldSkip(relPath) {
  for (const entry of IGNORE_DIRS) {
    if (relPath === entry || relPath.startsWith(entry + path.sep)) return true;
  }
  return false;
}

function walk(dir, out = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    if (shouldSkip(rel)) continue;
    if (entry.isDirectory()) walk(full, out);
    else if (TARGET_EXT.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function scanFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const hits = [];
  const lines = text.split('\n');
  lines.forEach((line, idx) => {
    for (const p of API_PATTERNS) {
      if (p.test(line)) {
        hits.push({ line: idx + 1, text: line.trim() });
        p.lastIndex = 0;
        break;
      }
      p.lastIndex = 0;
    }
  });
  return hits;
}

const files = walk(ROOT);
const report = [];
for (const file of files) {
  const hits = scanFile(file);
  if (hits.length) report.push({ file: path.relative(ROOT, file), hits });
}

console.log('# /api dependency report');
if (!report.length) {
  console.log('No API dependencies detected.');
  process.exit(0);
}
for (const item of report) {
  console.log(`\n${item.file}`);
  for (const hit of item.hits) {
    console.log(`  L${hit.line}: ${hit.text}`);
  }
}

process.exit(1);

import { parseCodeFile } from '../code-analysis/code-parser.js';
import { loadCodebaseFiles, loadCodebaseRegistry } from './codebase-loader.js';

let activeIndex = [];
let activeMeta = { indexed_at: null, hashes: {} };

function hashContent(input = '') {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return String(hash >>> 0);
}

export async function buildCodebaseIndex(path) {
  const registry = await loadCodebaseRegistry(path);
  const files = await loadCodebaseFiles(registry);

  activeIndex = files.map((file) => parseCodeFile(file));
  activeMeta = {
    indexed_at: new Date().toISOString(),
    hashes: Object.fromEntries(files.map((file) => [file.file_path, hashContent(file.source || '')]))
  };

  return { index: activeIndex, meta: activeMeta, repos: registry.repos || [] };
}

export function getCodebaseIndex() {
  return { index: activeIndex, meta: activeMeta };
}

export function updateIndexIncremental(file) {
  const parsed = parseCodeFile(file);
  const nextHash = hashContent(file.source || '');
  const currentHash = activeMeta.hashes[file.file_path];
  if (currentHash === nextHash) return false;

  activeMeta.hashes[file.file_path] = nextHash;
  activeMeta.indexed_at = new Date().toISOString();
  const position = activeIndex.findIndex((entry) => entry.file_path === file.file_path);
  if (position >= 0) activeIndex[position] = parsed;
  else activeIndex.push(parsed);
  return true;
}

import { searchCodebase } from './search-index.js';

export function runCodeSearch(query) {
  const input = (query || '').trim();
  if (!input) return [];
  return searchCodebase(input, { limit: 12 });
}

export function findFunctions(query) {
  return runCodeSearch(query).filter((item) => (item.functions || []).length);
}

export function findSimilarModules(tags = []) {
  const keywords = Array.isArray(tags) ? tags : [tags];
  return runCodeSearch(keywords.join(' '));
}

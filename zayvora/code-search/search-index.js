import { getCodebaseIndex } from '../codebase/codebase-indexer.js';

function scoreRecord(record, query) {
  const q = query.toLowerCase();
  const bag = [record.file_path, ...(record.functions || []), ...(record.classes || []), ...(record.tags || []), ...(record.imports || [])].join(' ').toLowerCase();
  if (!bag.includes(q)) return 0;
  let score = 1;
  if ((record.tags || []).some((tag) => tag.toLowerCase().includes(q))) score += 2;
  if ((record.functions || []).some((name) => name.toLowerCase().includes(q))) score += 2;
  return score;
}

export function searchCodebase(query, options = {}) {
  const { index } = getCodebaseIndex();
  const limit = options.limit || 8;
  return index
    .map((record) => ({ record, score: scoreRecord(record, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.record);
}

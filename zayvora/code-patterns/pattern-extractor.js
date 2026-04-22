import { runCodeSearch } from '../code-search/search-query.js';

const fallbackLibrary = {
  patterns: [
    { name: 'game-loops', tags: ['game', 'loop', 'render', 'frame'], description: 'Continuous update-render loop with bounded state.' },
    { name: 'api-handlers', tags: ['api', 'handler', 'request', 'response'], description: 'Input validation plus response mapping for HTTP endpoints.' },
    { name: 'data-pipelines', tags: ['pipeline', 'transform', 'normalize', 'verify'], description: 'Staged ingestion, transformation, and verification.' },
    { name: 'simulation-engines', tags: ['simulation', 'terrain', 'voxel', 'noise'], description: 'Stateful simulation and deterministic generation patterns.' }
  ]
};

let patternLibrary = fallbackLibrary;

export async function loadPatternLibrary(path = '../zayvora/code-patterns/pattern-library.json') {
  try {
    const response = await fetch(path);
    if (response.ok) {
      patternLibrary = await response.json();
    }
  } catch (error) {
    patternLibrary = fallbackLibrary;
  }
  return patternLibrary;
}

export function extractPatterns(query) {
  const results = runCodeSearch(query);
  const patterns = (patternLibrary.patterns || []).map((pattern) => {
    const matches = results.filter((item) => pattern.tags.some((tag) => (item.tags || []).includes(tag)));
    return { ...pattern, confidence: matches.length, matches: matches.map((item) => item.file_path) };
  });
  return patterns.filter((pattern) => pattern.confidence > 0);
}

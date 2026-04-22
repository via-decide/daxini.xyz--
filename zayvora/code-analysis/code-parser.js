import { extractFunctions } from './function-extractor.js';
import { mapDependencies } from './dependency-mapper.js';

function detectLanguage(filePath = '') {
  if (filePath.endsWith('.py')) return 'python';
  if (filePath.endsWith('.rs')) return 'rust';
  return 'javascript';
}

function buildCallGraph(source = '', symbols = []) {
  const graph = {};
  symbols.forEach((symbol) => {
    const matcher = new RegExp(`\\b${symbol.name}\\s*\\(`, 'g');
    graph[symbol.name] = Array.from(source.matchAll(matcher)).length;
  });
  return graph;
}

export function parseCodeFile(file) {
  const language = detectLanguage(file.file_path || file.path || '');
  const source = file.source || '';
  const symbols = extractFunctions(source, language);
  const imports = mapDependencies(source, language);

  return {
    file_path: file.file_path || file.path,
    language,
    module_type: /class\s+/m.test(source) ? 'class-module' : 'function-module',
    functions: symbols.filter((item) => item.kind !== 'class' && item.kind !== 'struct').map((item) => item.name),
    classes: symbols.filter((item) => item.kind === 'class' || item.kind === 'struct').map((item) => item.name),
    imports,
    call_graph: buildCallGraph(source, symbols),
    tags: file.tags || []
  };
}

export function extractFunctions(source = '', language = 'javascript') {
  const results = [];
  const push = (name, kind, signature) => {
    if (!name) {return;}
    results.push({ name, kind, signature: signature || name });
  };

  const lines = source.split('\n');

  if (language === 'python') {
    lines.forEach((line) => {
      const defMatch = line.match(/^\s*def\s+([a-zA-Z_]\w*)/);
      if (defMatch) {push(defMatch[1], 'function');}
      const classMatch = line.match(/^\s*class\s+([a-zA-Z_]\w*)/);
      if (classMatch) {push(classMatch[1], 'class');}
    });
    return results;
  }

  if (language === 'rust') {
    lines.forEach((line) => {
      const fnMatch = line.match(/^\s*(?:pub\s+)?fn\s+([a-zA-Z_]\w*)/);
      if (fnMatch) {push(fnMatch[1], 'function');}
      const structMatch = line.match(/^\s*(?:pub\s+)?struct\s+([a-zA-Z_]\w*)/);
      if (structMatch) {push(structMatch[1], 'struct');}
    });
    return results;
  }

  lines.forEach((line) => {
    const fnMatch = line.match(/(?:export\s+)?function\s+([a-zA-Z_$][\w$]*)/);
    if (fnMatch) {push(fnMatch[1], 'function');}
    const arrowMatch = line.match(/(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/);
    if (arrowMatch) {push(arrowMatch[1], 'arrow');}
    const classMatch = line.match(/class\s+([a-zA-Z_$][\w$]*)/);
    if (classMatch) {push(classMatch[1], 'class');}
  });

  return results;
}

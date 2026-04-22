export function extractFunctions(source = '', language = 'javascript') {
  const results = [];
  const push = (name, kind, signature) => {
    if (!name) return;
    results.push({ name, kind, signature: signature || name });
  };

  if (language === 'python') {
    source.replace(/^\s*def\s+([a-zA-Z_][\w]*)\s*\(([^)]*)\)/gm, (_, name, args) => {
      push(name, 'function', `${name}(${args})`);
      return _;
    });
    source.replace(/^\s*class\s+([a-zA-Z_][\w]*)\s*(?:\(([^)]*)\))?/gm, (_, name, base) => {
      push(name, 'class', base ? `${name}(${base})` : name);
      return _;
    });
    return results;
  }

  if (language === 'rust') {
    source.replace(/^\s*(?:pub\s+)?fn\s+([a-zA-Z_][\w]*)\s*\(([^)]*)\)/gm, (_, name, args) => {
      push(name, 'function', `${name}(${args})`);
      return _;
    });
    source.replace(/^\s*(?:pub\s+)?struct\s+([a-zA-Z_][\w]*)/gm, (_, name) => {
      push(name, 'struct', name);
      return _;
    });
    return results;
  }

  source.replace(/(?:export\s+)?function\s+([a-zA-Z_$][\w$]*)\s*\(([^)]*)\)/g, (_, name, args) => {
    push(name, 'function', `${name}(${args})`);
    return _;
  });
  source.replace(/(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g, (_, name, args) => {
    push(name, 'arrow', `${name}(${args})`);
    return _;
  });
  source.replace(/class\s+([a-zA-Z_$][\w$]*)/g, (_, name) => {
    push(name, 'class', name);
    return _;
  });
  return results;
}

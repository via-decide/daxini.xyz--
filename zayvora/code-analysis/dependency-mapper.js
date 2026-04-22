export function mapDependencies(source = '', language = 'javascript') {
  const imports = [];
  if (language === 'python') {
    source.replace(/^\s*import\s+([\w.,\s]+)/gm, (_, dep) => {
      dep.split(',').map((entry) => entry.trim()).filter(Boolean).forEach((value) => imports.push(value));
      return _;
    });
    source.replace(/^\s*from\s+([\w.]+)\s+import\s+([\w*,\s]+)/gm, (_, mod, members) => {
      imports.push(`${mod}:${members.replace(/\s+/g, '')}`);
      return _;
    });
    return imports;
  }

  if (language === 'rust') {
    source.replace(/^\s*use\s+([^;]+);/gm, (_, dep) => {
      imports.push(dep.trim());
      return _;
    });
    return imports;
  }

  source.replace(/import\s+(?:[^'";]+\s+from\s+)?["']([^"']+)["']/g, (_, dep) => {
    imports.push(dep);
    return _;
  });
  source.replace(/require\(["']([^"']+)["']\)/g, (_, dep) => {
    imports.push(dep);
    return _;
  });
  return imports;
}

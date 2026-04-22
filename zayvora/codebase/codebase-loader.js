const DEFAULT_REGISTRY_PATH = '../codebase/codebase-registry.json';

export async function loadCodebaseRegistry(path = DEFAULT_REGISTRY_PATH) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Codebase registry unavailable (${response.status})`);
  }
  return response.json();
}

export async function loadCodebaseFiles(registry) {
  const files = registry?.files || [];
  return files.map((file) => ({ ...file }));
}

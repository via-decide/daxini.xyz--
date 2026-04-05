(function initRepoLoader(global) {
  const API_BASE = '/workspace';

  async function parseJson(response) {
    if (!response.ok) {
      const message = `Request failed (${response.status})`;
      throw new Error(message);
    }
    return response.json();
  }

  async function getProjects() {
    const response = await fetch(`${API_BASE}/projects`, {
      headers: { Accept: 'application/json' }
    });
    const payload = await parseJson(response);
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.projects)) return payload.projects;
    return [];
  }

  async function getFiles(project) {
    const query = project ? `?project=${encodeURIComponent(project)}` : '';
    const response = await fetch(`${API_BASE}/files${query}`, {
      headers: { Accept: 'application/json' }
    });
    const payload = await parseJson(response);
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.files)) return payload.files;
    return [];
  }

  async function getFile(project, filePath) {
    const params = new URLSearchParams({
      project: project || '',
      path: filePath || ''
    });

    const response = await fetch(`${API_BASE}/file?${params.toString()}`, {
      headers: { Accept: 'application/json' }
    });
    return parseJson(response);
  }

  async function saveFile(payload) {
    const response = await fetch(`${API_BASE}/save-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload || {})
    });
    return parseJson(response);
  }

  global.ZayvoraRepoLoader = {
    getProjects,
    getFiles,
    getFile,
    saveFile
  };
})(window);

import { buildCodebaseIndex, getCodebaseIndex } from '../zayvora/codebase/codebase-indexer.js';
import { runCodeSearch } from '../zayvora/code-search/search-query.js';
import { extractPatterns, loadPatternLibrary } from '../zayvora/code-patterns/pattern-extractor.js';
import { generateCodeFromPrompt } from '../zayvora/code-synthesis/code-composer.js';

const GENERATED_KEY = 'zayvora_generated_code_artifacts';

function loadArtifacts() {
  try {
    const data = JSON.parse(localStorage.getItem(GENERATED_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveArtifacts(items) {
  localStorage.setItem(GENERATED_KEY, JSON.stringify(items.slice(0, 25)));
}

function renderList(container, items = []) {
  if (!container) return;
  if (!items.length) {
    container.innerHTML = '<div class="card-meta">No results yet.</div>';
    return;
  }
  container.innerHTML = items.map((item) => `<article class="status-card"><div class="card-title">${item.file_path || item.fileName}</div><div class="card-meta">${(item.tags || []).join(', ') || item.language || 'code artifact'}</div></article>`).join('');
}

function downloadArtifact(artifact) {
  const blob = new Blob([artifact.content], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = artifact.fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export async function initCodeIntelligence() {
  await Promise.all([buildCodebaseIndex('../zayvora/codebase/codebase-registry.json'), loadPatternLibrary()]);

  const searchInput = document.getElementById('code-search-input');
  const searchButton = document.getElementById('code-search-run');
  const generateButton = document.getElementById('code-generate-run');
  const searchResults = document.getElementById('code-search-results');
  const patternResults = document.getElementById('code-pattern-results');
  const artifactResults = document.getElementById('generated-code-results');
  const output = document.getElementById('code-generate-output');
  const downloadButton = document.getElementById('artifact-download');
  const exportButton = document.getElementById('artifact-export');
  const publishButton = document.getElementById('artifact-publish');

  let lastArtifact = null;

  const runSearch = () => {
    const query = (searchInput?.value || '').trim();
    const matches = query ? runCodeSearch(query) : [];
    const patterns = query ? extractPatterns(query) : [];
    renderList(searchResults, matches);
    renderList(patternResults, patterns.map((entry) => ({ fileName: entry.name, language: `confidence ${entry.confidence}` })));
  };

  const runGenerate = () => {
    const prompt = (searchInput?.value || '').trim();
    if (!prompt) return;
    const artifact = generateCodeFromPrompt(prompt);
    output.textContent = artifact.content;
    lastArtifact = artifact;
    const artifacts = loadArtifacts();
    artifacts.unshift({ ...artifact, created_at: new Date().toISOString() });
    saveArtifacts(artifacts);
    renderList(artifactResults, artifacts);
  };

  renderList(artifactResults, loadArtifacts());

  searchButton?.addEventListener('click', runSearch);
  generateButton?.addEventListener('click', runGenerate);
  searchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') runSearch();
  });

  downloadButton?.addEventListener('click', () => {
    if (!lastArtifact) return;
    downloadArtifact(lastArtifact);
  });

  exportButton?.addEventListener('click', async () => {
    if (!lastArtifact) return;
    await navigator.clipboard.writeText(lastArtifact.content);
    exportButton.textContent = 'Copied';
    setTimeout(() => { exportButton.textContent = 'Export'; }, 1200);
  });

  publishButton?.addEventListener('click', () => {
    if (!lastArtifact) return;
    const { index } = getCodebaseIndex();
    index.push({ file_path: `workspace/generated-code/${lastArtifact.fileName}`, language: 'javascript', module_type: 'function-module', functions: ['createModule'], classes: [], imports: [], call_graph: {}, tags: ['generated', 'published'] });
    publishButton.textContent = 'Published';
    setTimeout(() => { publishButton.textContent = 'Publish'; }, 1200);
  });

  return {
    search: runCodeSearch,
    extractPatterns,
    generate: generateCodeFromPrompt
  };
}

import { loadRepoHistory, parseCommitGraph, generateSummary } from './git-history.js';
import { renderCommitGraph } from './commit-graph.js';

export function initRepoPanel({ onLog } = {}) {
  const button = document.getElementById('analyze-repo');
  const input = document.getElementById('repo-url-input');
  const status = document.getElementById('repo-status');
  const summaryNode = document.getElementById('repo-summary');

  if (!button || !input || !status || !summaryNode) {return;}

  button.addEventListener('click', async () => {
    const repoUrl = input.value.trim();
    if (!repoUrl) {
      status.textContent = 'Please provide a repository URL.';
      return;
    }

    button.disabled = true;
    status.textContent = 'STEP 1: repo scanned';
    onLog?.('[REPO] STEP 1: repo scanned');

    try {
      const history = await loadRepoHistory(repoUrl);
      status.textContent = 'STEP 2: commit graph generated';
      onLog?.('[REPO] STEP 2: commit graph generated');

      const graph = parseCommitGraph(history);
      renderCommitGraph('commit-graph', graph);

      status.textContent = 'STEP 3: architecture changes detected';
      onLog?.('[REPO] STEP 3: architecture changes detected');

      const summary = generateSummary(graph);
      summaryNode.textContent = summary;
      status.textContent = 'STEP 4: summary generated';
      onLog?.('[REPO] STEP 4: summary generated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Repository analysis failed';
      status.textContent = message;
      onLog?.(`[REPO][ERROR] ${message}`);
    } finally {
      button.disabled = false;
    }
  });
}

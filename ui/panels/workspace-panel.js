/**
 * ui/panels/workspace-panel.js
 * 
 * Zayvora Developer Environment — Repository & Task Management
 * 
 * Contains:
 * - repository files (explorer)
 * - task queue
 * - automation logs
 * - PR history
 * - tool outputs
 */

import { ZayvoraState } from '../state/zayvora-state.js';

export class WorkspacePanel {
  constructor(mountEl) {
    this.mountEl = mountEl;
    this.init();
  }

  init() {
    this.render();
    this.setupListeners();
  }

  render() {
    this.mountEl.innerHTML = `
      <div class="workspace-header">WORKSPACE_ENGINE</div>
      <div class="explorer" id="file-explorer"></div>
      <div class="tasks" id="task-queue"></div>
      <div class="history" id="automation-history"></div>
    `;
  }

  setupListeners() {
    ZayvoraState.on('repoChange', (repo) => this.loadRepo(repo));
    this.loadRepo(ZayvoraState.activeRepo || 'via-decide/zayvora');
  }

  async loadRepo(repo) {
    if (!repo) return;
    console.log(`[Zayv_Workspace] Loading PR History from: ${repo}`);
    const historyEl = this.mountEl.querySelector('#automation-history');
    historyEl.innerHTML = '<div class="loading">Fetching PR History...</div>';

    const token = localStorage.getItem('zayvora_token') || '';
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/pulls?state=all&per_page=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('GitHub API Error');
      const prs = await res.json();
      this.renderPRs(prs);
    } catch (err) {
      console.error(err);
      historyEl.innerHTML = `<div class="error">Failed to load PRs: ${err.message}</div>`;
    }
  }

  renderPRs(prs) {
    const historyEl = this.mountEl.querySelector('#automation-history');
    historyEl.innerHTML = `
      <div class="pr-list-header">PR_HISTORY (Total: ${prs.length}+)</div>
      ${prs.map(pr => `
        <div class="pr-item ${pr.state}">
          <span class="pr-id">#${pr.number}</span>
          <span class="pr-title"><a href="${pr.html_url}" target="_blank">${pr.title}</a></span>
          <span class="pr-status-badge">${pr.state.toUpperCase()}</span>
        </div>
      `).join('')}
    `;
  }
}

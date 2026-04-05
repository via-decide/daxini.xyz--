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

    const token = localStorage.getItem('GITHUB_PAT') || '';
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/pulls?state=all&per_page=100`, {
        headers: token ? { Authorization: `token ${token}` } : {}
      });
      if (!res.ok) throw new Error('GitHub API Error');
      const prs = await res.json();
      this.renderPRs(prs);
    } catch (err) {
      console.error('[Zayv_Workspace] Error loading PRs:', err);
      this.mountEl.querySelector('#pr-list').innerHTML = `
        <div class="error-state" style="padding: 20px; text-align: center;">
          <p style="color: #ff5c5c;">GITHUB API Error: Permission Denied</p>
          <p style="font-size: 11px; margin-bottom: 15px;">A GitHub Personal Access Token (PAT) is required for full repository history.</p>
          <button id="set-pat-btn" style="background: var(--accent); color: #fff; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Set GITHUB_PAT</button>
        </div>
      `;
      
      this.mountEl.querySelector('#set-pat-btn').onclick = () => {
        const pat = prompt('Enter GitHub Personal Access Token (PAT):');
        if (pat) {
          localStorage.setItem('GITHUB_PAT', pat);
          this.loadRepo('via-decide/zayvora');
        }
      };
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

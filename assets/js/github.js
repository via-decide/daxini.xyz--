/* ══════════════════════════════════════════════════════════
   GITHUB.JS — Live GitHub Activity Panel
   Fetches via-decide org repos from GitHub API
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const API_URL = 'https://api.github.com/orgs/via-decide/repos?sort=updated&per_page=6';

  function init() {
    const grid = document.getElementById('gh-grid');
    if (!grid) {return;}

    grid.innerHTML = '<div class="gh-loading" style="color:var(--tx3);font-size:.8rem;padding:2rem;">Loading repositories…</div>';

    fetch(API_URL)
      .then(function (r) {
        if (!r.ok) {throw new Error('GitHub API: ' + r.status);}
        return r.json();
      })
      .then(function (repos) { renderRepos(grid, repos); })
      .catch(function (err) {
        console.warn('GitHub:', err);
        renderFallback(grid);
      });
  }

  function renderRepos(grid, repos) {
    grid.innerHTML = '';

    repos.slice(0, 6).forEach(function (repo) {
      const card = document.createElement('a');
      card.className = 'gh-card';
      card.href = repo.html_url;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';

      const lang = repo.language || 'N/A';
      const stars = repo.stargazers_count || 0;
      const updated = new Date(repo.updated_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric'
      });

      card.innerHTML =
        '<div class="gh-card-header">' +
          '<span class="gh-icon">📦</span>' +
          '<span class="gh-card-name">' + escapeHTML(repo.name) + '</span>' +
        '</div>' +
        '<p class="gh-card-desc">' + escapeHTML(repo.description || 'No description') + '</p>' +
        '<div class="gh-card-footer">' +
          '<span class="gh-card-stat">⭐ ' + stars + '</span>' +
          '<span class="gh-card-stat">💻 ' + escapeHTML(lang) + '</span>' +
          '<span class="gh-card-stat">📅 ' + updated + '</span>' +
          '<span class="gh-card-link">Open →</span>' +
        '</div>';

      grid.appendChild(card);
    });
  }

  function renderFallback(grid) {
    const fallback = [
      { name: 'VIA', desc: 'ViaDecide platform — 68+ interactive decision tools', lang: 'HTML' },
      { name: 'decide.engine-tools', desc: 'Decide engine tool ecosystem', lang: 'JavaScript' },
      { name: 'fixed-main-3', desc: 'Production build with full tool pages', lang: 'HTML' },
      { name: 'zayvora-toolkit', desc: 'Knowledge indexing and semantic search engine', lang: 'TypeScript' },
      { name: 'skillhex', desc: 'Gamified skill assessment and progression', lang: 'JavaScript' },
      { name: 'daxini-site', desc: 'Daxini Systems research interface', lang: 'HTML' }
    ];

    grid.innerHTML = '';
    fallback.forEach(function (repo) {
      const card = document.createElement('div');
      card.className = 'gh-card';
      card.innerHTML =
        '<div class="gh-card-header">' +
          '<span class="gh-icon">📦</span>' +
          '<span class="gh-card-name">' + repo.name + '</span>' +
        '</div>' +
        '<p class="gh-card-desc">' + repo.desc + '</p>' +
        '<div class="gh-card-footer">' +
          '<span class="gh-card-stat">💻 ' + repo.lang + '</span>' +
          '<span class="gh-card-link" style="opacity:.4">Offline</span>' +
        '</div>';
      grid.appendChild(card);
    });
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/**
 * project-manager.js
 *
 * Project list with:
 *  - Project cards (name, description, last-modified, stars/forks/issues)
 *  - Project switcher dropdown
 *  - Clone repo modal (URL input)
 *  - Create new project inline
 *
 * Exposed as window.ZayvoraProjectManager
 */
(function initProjectManager(global) {
  'use strict';

  const API_BASE = '/workspace';

  // ── Utility ────────────────────────────────────────────────────────────────

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'className') node.className = v;
      else if (k === 'style') Object.assign(node.style, v);
      else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v);
    });
    children.forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function relativeDate(isoStr) {
    if (!isoStr) return '';
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(isoStr).toLocaleDateString();
  }

  // ── Clone modal ────────────────────────────────────────────────────────────

  function createCloneModal(onCloned) {
    const overlay = el('div', { className: 'pm-modal-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Clone repository' });

    const dialog = el('div', { className: 'pm-modal' });
    const title = el('h3', { className: 'pm-modal-title' }, 'Clone Repository');

    const urlLabel = el('label', { className: 'pm-modal-label', 'for': 'pm-clone-url' }, 'Repository URL');
    const urlInput = el('input', {
      className: 'pm-input', id: 'pm-clone-url', type: 'text',
      placeholder: 'https://github.com/user/repo.git'
    });

    const nameLabel = el('label', { className: 'pm-modal-label', 'for': 'pm-clone-name' }, 'Project name (optional)');
    const nameInput = el('input', {
      className: 'pm-input', id: 'pm-clone-name', type: 'text',
      placeholder: 'Auto-detected from URL'
    });

    const status = el('p', { className: 'pm-modal-status', 'aria-live': 'polite' });

    const btnRow = el('div', { className: 'pm-modal-btns' });
    const cancelBtn = el('button', { className: 'pm-btn pm-btn-ghost', type: 'button' }, 'Cancel');
    const cloneBtn = el('button', { className: 'pm-btn pm-btn-primary', type: 'button' }, 'Clone');

    async function doClone() {
      const url = urlInput.value.trim();
      if (!url) { status.textContent = 'URL is required.'; return; }

      cloneBtn.disabled = true;
      cloneBtn.textContent = 'Cloning…';
      status.textContent = 'Cloning repository, please wait…';

      try {
        const res = await fetch(`${API_BASE}/projects/clone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, name: nameInput.value.trim() || undefined })
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || 'Clone failed');

        status.textContent = `Cloned "${payload.project.name}" successfully!`;
        setTimeout(() => {
          closeModal();
          if (typeof onCloned === 'function') onCloned(payload.project);
        }, 800);
      } catch (err) {
        status.textContent = `Error: ${err.message}`;
        cloneBtn.disabled = false;
        cloneBtn.textContent = 'Clone';
      }
    }

    function closeModal() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    cancelBtn.addEventListener('click', closeModal);
    cloneBtn.addEventListener('click', doClone);
    urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doClone(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', esc); }
    });

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(cloneBtn);
    dialog.appendChild(title);
    dialog.appendChild(urlLabel);
    dialog.appendChild(urlInput);
    dialog.appendChild(nameLabel);
    dialog.appendChild(nameInput);
    dialog.appendChild(status);
    dialog.appendChild(btnRow);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    urlInput.focus();
  }

  // ── Core factory ───────────────────────────────────────────────────────────

  function createProjectManager(options) {
    const {
      container,       // DOM element to render into
      switcher,        // <select> element for project switcher (optional)
      store,           // ZayvoraWorkspaceStore (optional)
      onSelectProject  // (project) => void
    } = options;

    let projects = [];
    let activeProjectId = null;

    // ── Load & render ──────────────────────────────────────────────────────

    async function loadProjects() {
      container.innerHTML = '<p class="pm-loading">Loading projects…</p>';
      try {
        const res = await fetch(`${API_BASE}/projects`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        projects = Array.isArray(payload.projects) ? payload.projects : [];
        renderList();
        updateSwitcher();
      } catch (err) {
        container.innerHTML = `<p class="pm-error">Failed to load projects: ${escHtml(err.message)}</p>`;
      }
    }

    function renderList() {
      container.innerHTML = '';

      // Toolbar row
      const toolbar = el('div', { className: 'pm-toolbar' });
      const cloneBtn = el('button', { className: 'pm-btn pm-btn-outline', type: 'button' }, '⤓ Clone Repo');
      const newBtn = el('button', { className: 'pm-btn pm-btn-outline', type: 'button' }, '+ New Project');
      cloneBtn.addEventListener('click', () => createCloneModal(async (project) => {
        await loadProjects();
        selectProject(projects.find((p) => p.id === project.id) || project);
      }));
      newBtn.addEventListener('click', () => promptCreate());
      toolbar.appendChild(cloneBtn);
      toolbar.appendChild(newBtn);
      container.appendChild(toolbar);

      if (!projects.length) {
        container.appendChild(el('p', { className: 'pm-empty' }, 'No projects yet. Create or clone one.'));
        return;
      }

      const list = el('ul', { className: 'pm-project-list' });

      projects.forEach((project) => {
        const li = renderCard(project);
        list.appendChild(li);
      });

      container.appendChild(list);
    }

    function renderCard(project) {
      const isActive = project.id === activeProjectId;
      const li = el('li', { className: `pm-card${isActive ? ' pm-card-active' : ''}` });

      const header = el('div', { className: 'pm-card-header' });
      const name = el('span', { className: 'pm-card-name' }, project.name || project.id);
      const badge = isActive ? el('span', { className: 'pm-card-badge' }, 'active') : null;

      header.appendChild(name);
      if (badge) header.appendChild(badge);

      if (project.description) {
        li.appendChild(header);
        li.appendChild(el('p', { className: 'pm-card-desc' }, project.description));
      } else {
        li.appendChild(header);
      }

      const meta = el('div', { className: 'pm-card-meta' });

      if (project.lastModified) {
        meta.appendChild(el('span', { className: 'pm-meta-item', title: project.lastModified },
          `🕐 ${relativeDate(project.lastModified)}`));
      }
      if (project.stars) {
        meta.appendChild(el('span', { className: 'pm-meta-item' }, `⭐ ${project.stars}`));
      }
      if (project.forks) {
        meta.appendChild(el('span', { className: 'pm-meta-item' }, `🍴 ${project.forks}`));
      }
      if (project.issues) {
        meta.appendChild(el('span', { className: 'pm-meta-item' }, `⚠ ${project.issues}`));
      }

      if (meta.children.length) li.appendChild(meta);

      li.addEventListener('click', () => selectProject(project));
      li.setAttribute('tabindex', '0');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', isActive ? 'true' : 'false');
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter') selectProject(project); });

      return li;
    }

    // ── Switcher dropdown ──────────────────────────────────────────────────

    function updateSwitcher() {
      if (!switcher) return;
      switcher.innerHTML = '';

      const placeholder = el('option', { value: '' }, '— Select project —');
      switcher.appendChild(placeholder);

      projects.forEach((p) => {
        const opt = el('option', { value: p.id }, p.name || p.id);
        if (p.id === activeProjectId) opt.selected = true;
        switcher.appendChild(opt);
      });
    }

    if (switcher) {
      switcher.addEventListener('change', () => {
        const found = projects.find((p) => p.id === switcher.value);
        if (found) selectProject(found);
      });
    }

    // ── Actions ────────────────────────────────────────────────────────────

    function selectProject(project) {
      activeProjectId = project.id;
      store && store.setActiveProject(project);
      renderList();
      updateSwitcher();
      if (typeof onSelectProject === 'function') onSelectProject(project);
    }

    async function promptCreate() {
      const name = prompt('New project name:');
      if (!name || !name.trim()) return;
      const safe = name.trim().replace(/[^a-zA-Z0-9._-]/g, '-');
      if (!safe) return;

      try {
        // "Creating" a project is just hitting the files endpoint which auto-creates the folder
        await fetch(`${API_BASE}/files?project=${encodeURIComponent(safe)}`);
        await loadProjects();
        const created = projects.find((p) => p.id === safe);
        if (created) selectProject(created);
      } catch (err) {
        alert(`Failed to create project: ${err.message}`);
      }
    }

    // ── Public interface ───────────────────────────────────────────────────

    return {
      loadProjects,
      getProjects: () => projects,
      getActiveProjectId: () => activeProjectId,
      selectProjectById: (id) => {
        const p = projects.find((proj) => proj.id === id);
        if (p) selectProject(p);
      }
    };
  }

  global.ZayvoraProjectManager = { createProjectManager };
})(window);

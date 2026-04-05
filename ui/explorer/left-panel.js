/**
 * left-panel.js
 *
 * Tabbed left panel that hosts:
 *   Tab 0 — Projects  (ZayvoraProjectManager)
 *   Tab 1 — Files     (ZayvoraFileTreeEnhanced)
 *   Tab 2 — History   (ZayvoraHistoryViewer)
 *
 * Wires all three together via ZayvoraWorkspaceStore:
 *   – Selecting a project reloads the file tree and history
 *   – Opening a file records it in history
 *   – Undo/redo in history restores file content via the editor
 *
 * Exposed as window.ZayvoraLeftPanel
 *
 * Usage:
 *   const panel = ZayvoraLeftPanel.create({
 *     mountEl,        // Element the panel replaces / renders into
 *     onOpenFile,     // (projectId, filePath) => void
 *     onRestoreFile,  // (filePath, content) => void   (optional)
 *   });
 *   panel.init();
 */
(function initLeftPanel(global) {
  'use strict';

  function create(options) {
    const {
      mountEl,
      onOpenFile,
      onRestoreFile
    } = options;

    if (!mountEl) {
      throw new Error('ZayvoraLeftPanel: mountEl is required');
    }

    const store = global.ZayvoraWorkspaceStore;

    // ── Build skeleton DOM ───────────────────────────────────────────────────

    // Clear and re-use the mount element
    mountEl.innerHTML = '';
    mountEl.classList.add('left-panel');

    // -- Tab bar
    const tabBar = document.createElement('nav');
    tabBar.className = 'lp-tab-bar';
    tabBar.setAttribute('role', 'tablist');
    tabBar.setAttribute('aria-label', 'Left panel tabs');

    const TAB_DEFS = [
      { id: 'projects', label: '⊞ Projects' },
      { id: 'files',    label: '🗂 Files' },
      { id: 'history',  label: '🕐 History' }
    ];

    const tabButtons = {};
    TAB_DEFS.forEach(({ id, label }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lp-tab-btn';
      btn.textContent = label;
      btn.dataset.tab = id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', 'false');
      btn.setAttribute('aria-controls', `lp-panel-${id}`);
      btn.id = `lp-tab-${id}`;
      tabButtons[id] = btn;
      tabBar.appendChild(btn);
    });

    mountEl.appendChild(tabBar);

    // -- Panel panes
    const panes = {};
    TAB_DEFS.forEach(({ id }) => {
      const pane = document.createElement('div');
      pane.className = 'lp-pane';
      pane.id = `lp-panel-${id}`;
      pane.setAttribute('role', 'tabpanel');
      pane.setAttribute('aria-labelledby', `lp-tab-${id}`);
      pane.hidden = true;
      panes[id] = pane;
      mountEl.appendChild(pane);
    });

    // ── Projects pane ────────────────────────────────────────────────────────

    // Switcher dropdown (shown at top of Files pane too)
    const switcherLabel = document.createElement('label');
    switcherLabel.className = 'lp-switcher-label';
    switcherLabel.textContent = 'Project:';
    switcherLabel.htmlFor = 'lp-project-switcher';

    const switcher = document.createElement('select');
    switcher.id = 'lp-project-switcher';
    switcher.className = 'lp-switcher';
    switcher.setAttribute('aria-label', 'Switch project');

    const switcherRow = document.createElement('div');
    switcherRow.className = 'lp-switcher-row';
    switcherRow.appendChild(switcherLabel);
    switcherRow.appendChild(switcher);
    panes.projects.appendChild(switcherRow);

    const projectContainer = document.createElement('div');
    projectContainer.className = 'lp-projects-body';
    panes.projects.appendChild(projectContainer);

    // ── Files pane ───────────────────────────────────────────────────────────

    const breadcrumb = document.createElement('div');
    breadcrumb.className = 'ft-breadcrumb';
    breadcrumb.setAttribute('aria-label', 'File path');
    panes.files.appendChild(breadcrumb);

    const searchWrap = document.createElement('div');
    searchWrap.className = 'ft-search-wrap';
    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.className = 'ft-search';
    searchInput.placeholder = '🔍 Filter files…';
    searchInput.setAttribute('aria-label', 'Filter files');
    searchWrap.appendChild(searchInput);
    panes.files.appendChild(searchWrap);

    const treeContainer = document.createElement('ul');
    treeContainer.className = 'ft-root-list';
    treeContainer.setAttribute('role', 'tree');
    treeContainer.setAttribute('aria-label', 'File tree');
    panes.files.appendChild(treeContainer);

    // ── History pane ─────────────────────────────────────────────────────────

    const historyContainer = document.createElement('div');
    historyContainer.className = 'hv-container';
    panes.history.appendChild(historyContainer);

    // ── Instantiate sub-components ───────────────────────────────────────────

    const projectManager = global.ZayvoraProjectManager.createProjectManager({
      container: projectContainer,
      switcher,
      store,
      onSelectProject: (project) => handleProjectSelected(project)
    });

    const fileTree = global.ZayvoraFileTreeEnhanced.createFileTree({
      container: treeContainer,
      breadcrumb,
      searchInput,
      store,
      onOpenFile: (projectId, filePath) => {
        if (typeof onOpenFile === 'function') onOpenFile(projectId, filePath);
      }
    });

    const historyViewer = global.ZayvoraHistoryViewer.createHistoryViewer({
      container: historyContainer,
      store,
      onRestore: (filePath, content) => {
        if (typeof onRestoreFile === 'function') onRestoreFile(filePath, content);
      }
    });

    // ── Tab switching ─────────────────────────────────────────────────────────

    let activeTab = 'projects';

    function switchTab(id) {
      activeTab = id;
      TAB_DEFS.forEach(({ id: tabId }) => {
        const btn = tabButtons[tabId];
        const pane = panes[tabId];
        const isActive = tabId === id;
        btn.classList.toggle('lp-tab-btn-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        pane.hidden = !isActive;
      });

      // Lazy-load history when switching to it
      if (id === 'history' && store) {
        historyViewer.refresh();
      }
    }

    TAB_DEFS.forEach(({ id }) => {
      tabButtons[id].addEventListener('click', () => switchTab(id));
    });

    // Keyboard navigation across tabs (←/→)
    tabBar.addEventListener('keydown', (e) => {
      const ids = TAB_DEFS.map((t) => t.id);
      const idx = ids.indexOf(activeTab);
      if (e.key === 'ArrowRight') {
        tabButtons[ids[(idx + 1) % ids.length]].click();
        tabButtons[ids[(idx + 1) % ids.length]].focus();
      } else if (e.key === 'ArrowLeft') {
        tabButtons[ids[(idx - 1 + ids.length) % ids.length]].click();
        tabButtons[ids[(idx - 1 + ids.length) % ids.length]].focus();
      }
    });

    // ── Project selection flow ────────────────────────────────────────────────

    async function handleProjectSelected(project) {
      // Load file tree for selected project
      await fileTree.loadFiles(project);

      // Load history for selected project
      await historyViewer.load(project.id || project);

      // Switch to Files tab after selecting a project
      switchTab('files');
    }

    // ── Init ─────────────────────────────────────────────────────────────────

    async function init() {
      switchTab('projects');
      await projectManager.loadProjects();

      // If store already has an active project, use it
      if (store) {
        const st = store.getState();
        if (st.activeProject) {
          const p = st.activeProject;
          projectManager.selectProjectById(p.id || p);
        }
      }
    }

    return {
      init,
      switchTab,
      getProjectManager: () => projectManager,
      getFileTree: () => fileTree,
      getHistoryViewer: () => historyViewer
    };
  }

  global.ZayvoraLeftPanel = { create };
})(window);

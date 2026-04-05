/**
 * file-tree-enhanced.js
 *
 * Recursive, interactive file tree with:
 *  - Expand/collapse folders (▶/▼ arrows)
 *  - File type icons
 *  - Right-click context menu (create file, create folder, rename, delete)
 *  - Real-time search/filter
 *  - Breadcrumb path display
 *  - Keyboard navigation (↑↓ navigate, → expand, ← collapse, Enter open)
 *  - 16px per-level indentation
 *
 * Exposed as window.ZayvoraFileTreeEnhanced
 */
(function initFileTreeEnhanced(global) {
  'use strict';

  const API_BASE = '/workspace';

  // ── Icon helpers ───────────────────────────────────────────────────────────

  const EXT_ICONS = {
    js: '󰌞',  ts: '󰛦',  jsx: '󰜈',  tsx: '󰜈',
    html: '󰌝', css: '󰌜', scss: '󰟬', json: '󰘦',
    md: '󰍔',  txt: '󰦨', py: '󰌠',  rb: '󰴭',
    go: '󰟓',  rs: '󱘗',  java: '󰬷', sh: '󰆍',
    yml: '󰘦', yaml: '󰘦', xml: '󰗀', sql: '󰆼',
    png: '󰋩', jpg: '󰋩', jpeg: '󰋩', gif: '󰋩',
    svg: '󰜒', ico: '󰋩', pdf: '󰈦', zip: '󰗄',
    lock: '󰌾', env: '󰒓'
  };

  function fileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    return EXT_ICONS[ext] || '󰈔';
  }

  // Nerd-font icons not available? Fall back to text equivalents
  const ICONS = {
    folder_closed: '▶ 📁',
    folder_open:   '▼ 📂',
    file: (name) => '  📄'
  };

  // ── Utility ────────────────────────────────────────────────────────────────

  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    Object.assign(node, props);
    children.forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Core factory ───────────────────────────────────────────────────────────

  function createFileTree(options) {
    const {
      container,        // DOM element to render the tree into
      breadcrumb,       // DOM element for breadcrumb display (optional)
      searchInput,      // <input> for filtering (optional)
      store,            // ZayvoraWorkspaceStore instance (optional)
      onOpenFile        // (project, filePath) => void
    } = options;

    let activeProject = null;
    let treeData = [];          // full flat list of all visible file nodes
    let expandedPaths = new Set();
    let selectedPath = null;
    let searchQuery = '';
    let flatVisible = [];       // flattened list of currently visible nodes (for keyboard nav)
    let contextMenu = null;     // currently open context menu element

    // ── API calls ──────────────────────────────────────────────────────────

    async function apiJson(url, opts) {
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      return res.json();
    }

    async function loadFiles(project) {
      activeProject = project;
      updateBreadcrumb(null);
      try {
        const projectId = project && (project.id || project);
        const data = await apiJson(
          `${API_BASE}/files?project=${encodeURIComponent(projectId)}&recursive=true`
        );
        treeData = Array.isArray(data.files) ? data.files : [];
        render();
      } catch (err) {
        container.innerHTML = `<li class="ft-empty ft-error">Failed to load files: ${escHtml(err.message)}</li>`;
      }
    }

    async function createFile(parentPath, name) {
      const projectId = activeProject && (activeProject.id || activeProject);
      const fullPath = parentPath ? `${parentPath}/${name}` : name;
      await apiJson(`${API_BASE}/files/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectId, path: fullPath, content: '' })
      });
      store && store.addHistoryEntry('file_create', fullPath);
      await loadFiles(activeProject);
    }

    async function createFolder(parentPath, name) {
      const projectId = activeProject && (activeProject.id || activeProject);
      const fullPath = parentPath ? `${parentPath}/${name}` : name;
      await apiJson(`${API_BASE}/folders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectId, path: fullPath })
      });
      store && store.addHistoryEntry('folder_create', fullPath);
      expandedPaths.add(fullPath);
      await loadFiles(activeProject);
    }

    async function renameEntry(filePath, newName) {
      const projectId = activeProject && (activeProject.id || activeProject);
      const dir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
      const newPath = dir ? `${dir}/${newName}` : newName;
      await apiJson(`${API_BASE}/files/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectId, oldPath: filePath, newPath })
      });
      store && store.addHistoryEntry('file_rename', filePath, { data: { newPath } });
      await loadFiles(activeProject);
    }

    async function deleteEntry(filePath) {
      const projectId = activeProject && (activeProject.id || activeProject);
      await apiJson(`${API_BASE}/files`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectId, path: filePath })
      });
      store && store.addHistoryEntry('file_delete', filePath);
      if (selectedPath === filePath) selectedPath = null;
      await loadFiles(activeProject);
    }

    // ── Breadcrumb ─────────────────────────────────────────────────────────

    function updateBreadcrumb(filePath) {
      if (!breadcrumb) return;
      const projectName = activeProject
        ? (activeProject.name || activeProject.id || activeProject)
        : 'No project';

      if (!filePath) {
        breadcrumb.textContent = projectName;
        return;
      }

      breadcrumb.innerHTML = '';
      const parts = [projectName, ...filePath.split('/')];
      parts.forEach((part, i) => {
        const span = el('span', { className: 'ft-bc-part' }, part);
        breadcrumb.appendChild(span);
        if (i < parts.length - 1) {
          breadcrumb.appendChild(el('span', { className: 'ft-bc-sep' }, ' / '));
        }
      });
    }

    // ── Context menu ───────────────────────────────────────────────────────

    function closeContextMenu() {
      if (contextMenu && contextMenu.parentNode) {
        contextMenu.parentNode.removeChild(contextMenu);
      }
      contextMenu = null;
    }

    function openContextMenu(x, y, node) {
      closeContextMenu();

      const isDir = node.type === 'directory';
      const items = isDir
        ? [
            { label: '+ New File',   action: () => promptCreate('file', node.path) },
            { label: '+ New Folder', action: () => promptCreate('folder', node.path) },
            { label: '✎ Rename',     action: () => promptRename(node) },
            { label: '✕ Delete',     action: () => confirmDelete(node) }
          ]
        : [
            { label: '✎ Rename',     action: () => promptRename(node) },
            { label: '✕ Delete',     action: () => confirmDelete(node) }
          ];

      const menu = el('ul', { className: 'ft-context-menu', role: 'menu' });
      items.forEach(({ label, action }) => {
        const li = el('li', { className: 'ft-context-item', role: 'menuitem', tabIndex: 0 }, label);
        li.addEventListener('click', () => { closeContextMenu(); action(); });
        li.addEventListener('keydown', (e) => { if (e.key === 'Enter') { closeContextMenu(); action(); } });
        menu.appendChild(li);
      });

      menu.style.left = `${x}px`;
      menu.style.top = `${y}px`;
      document.body.appendChild(menu);
      contextMenu = menu;

      // Close on outside click
      setTimeout(() => {
        document.addEventListener('click', closeContextMenu, { once: true });
      }, 0);
    }

    // ── Inline prompts ─────────────────────────────────────────────────────

    function promptCreate(type, parentPath) {
      const name = prompt(`New ${type} name:`);
      if (!name || !name.trim()) return;
      const safe = name.trim().replace(/[/\\]/g, '');
      if (!safe) return;
      if (type === 'file') createFile(parentPath, safe).catch(alert);
      else createFolder(parentPath, safe).catch(alert);
    }

    function promptRename(node) {
      const currentName = node.name || node.path.split('/').pop();
      const newName = prompt('Rename to:', currentName);
      if (!newName || !newName.trim() || newName.trim() === currentName) return;
      renameEntry(node.path, newName.trim().replace(/[/\\]/g, '')).catch(alert);
    }

    function confirmDelete(node) {
      if (!confirm(`Delete "${node.path}"?`)) return;
      deleteEntry(node.path).catch(alert);
    }

    // ── Filter / search ────────────────────────────────────────────────────

    function matchesSearch(node, query) {
      if (!query) return true;
      const q = query.toLowerCase();
      return node.path.toLowerCase().includes(q) || node.name.toLowerCase().includes(q);
    }

    /**
     * Recursively filter the tree, returning nodes that match or contain matches.
     * Folders that contain a match are included (and their children are shown).
     */
    function filterTree(nodes, query) {
      if (!query) return nodes;
      const result = [];
      for (const node of nodes) {
        if (node.type === 'directory') {
          const filteredChildren = filterTree(node.children || [], query);
          if (filteredChildren.length) {
            result.push({ ...node, children: filteredChildren });
          } else if (matchesSearch(node, query)) {
            result.push({ ...node, children: [] });
          }
        } else if (matchesSearch(node, query)) {
          result.push(node);
        }
      }
      return result;
    }

    // ── Render ─────────────────────────────────────────────────────────────

    function render() {
      container.innerHTML = '';
      flatVisible = [];

      const visibleTree = filterTree(treeData, searchQuery);

      if (!visibleTree.length) {
        container.innerHTML = '<li class="ft-empty">No files found.</li>';
        return;
      }

      const ul = renderNodes(visibleTree, 0);
      container.appendChild(ul);
    }

    function renderNodes(nodes, depth) {
      const ul = el('ul', { className: 'ft-tree', role: 'tree' });

      nodes.forEach((node) => {
        const li = renderNode(node, depth);
        ul.appendChild(li);
      });

      return ul;
    }

    function renderNode(node, depth) {
      const li = document.createElement('li');
      li.className = `ft-node ft-${node.type}`;
      li.dataset.path = node.path;
      li.dataset.type = node.type;
      li.setAttribute('role', node.type === 'directory' ? 'treeitem' : 'treeitem');
      li.setAttribute('aria-selected', node.path === selectedPath ? 'true' : 'false');

      if (node.type === 'directory') {
        li.setAttribute('aria-expanded', expandedPaths.has(node.path) ? 'true' : 'false');
      }

      const row = el('div', {
        className: `ft-row${node.path === selectedPath ? ' ft-selected' : ''}`,
        tabIndex: 0,
        style: `padding-left: ${depth * 16 + 8}px`
      });

      if (node.type === 'directory') {
        const arrow = el('span', {
          className: 'ft-arrow',
          'aria-hidden': 'true'
        }, expandedPaths.has(node.path) ? '▼' : '▶');

        const icon = el('span', { className: 'ft-icon' }, expandedPaths.has(node.path) ? '📂' : '📁');
        const label = el('span', { className: 'ft-label' }, node.name);

        row.appendChild(arrow);
        row.appendChild(icon);
        row.appendChild(label);

        row.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleFolder(node);
        });
      } else {
        const spacer = el('span', { className: 'ft-arrow-spacer' });
        const icon = el('span', { className: 'ft-icon' }, getFileEmoji(node.name));
        const label = el('span', { className: 'ft-label' }, node.name);

        row.appendChild(spacer);
        row.appendChild(icon);
        row.appendChild(label);

        row.addEventListener('click', (e) => {
          e.stopPropagation();
          selectFile(node);
        });
        row.addEventListener('dblclick', () => openFile(node));
      }

      // Keyboard navigation on each row
      row.addEventListener('keydown', (e) => handleRowKeydown(e, node));

      // Right-click context menu
      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openContextMenu(e.clientX, e.clientY, node);
      });

      li.appendChild(row);

      // Render children if folder is expanded
      if (node.type === 'directory' && expandedPaths.has(node.path) && node.children && node.children.length) {
        const childUl = renderNodes(node.children, depth + 1);
        childUl.setAttribute('role', 'group');
        li.appendChild(childUl);
      }

      flatVisible.push({ node, row });
      return li;
    }

    function getFileEmoji(name) {
      const ext = name.split('.').pop().toLowerCase();
      const map = {
        js: '📜', ts: '📘', jsx: '⚛', tsx: '⚛', html: '🌐',
        css: '🎨', scss: '🎨', json: '📋', md: '📝', txt: '📄',
        py: '🐍', rb: '💎', go: '🐹', rs: '🦀', java: '☕',
        sh: '⚙', yml: '📋', yaml: '📋', xml: '📋', sql: '🗄',
        png: '🖼', jpg: '🖼', jpeg: '🖼', gif: '🖼', svg: '🎭',
        pdf: '📕', zip: '🗜', lock: '🔒', env: '🔐'
      };
      return map[ext] || '📄';
    }

    // ── Interaction handlers ───────────────────────────────────────────────

    function toggleFolder(node) {
      if (expandedPaths.has(node.path)) {
        expandedPaths.delete(node.path);
      } else {
        expandedPaths.add(node.path);
      }
      render();
    }

    function selectFile(node) {
      selectedPath = node.path;
      updateBreadcrumb(node.path);
      render();
    }

    function openFile(node) {
      if (node.type !== 'file') return;
      selectFile(node);
      const projectId = activeProject && (activeProject.id || activeProject);
      if (typeof onOpenFile === 'function' && projectId) {
        onOpenFile(projectId, node.path);
      }
      store && store.addHistoryEntry('file_open', node.path);
    }

    // ── Keyboard navigation ────────────────────────────────────────────────

    function handleRowKeydown(e, node) {
      const idx = flatVisible.findIndex((v) => v.node.path === node.path);

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = flatVisible[idx + 1];
          if (next) next.row.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = flatVisible[idx - 1];
          if (prev) prev.row.focus();
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (node.type === 'directory' && !expandedPaths.has(node.path)) {
            expandedPaths.add(node.path);
            render();
            // Re-focus the same row
            const row = container.querySelector(`[data-path="${CSS.escape(node.path)}"] .ft-row`);
            if (row) row.focus();
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          if (node.type === 'directory' && expandedPaths.has(node.path)) {
            expandedPaths.delete(node.path);
            render();
            const row = container.querySelector(`[data-path="${CSS.escape(node.path)}"] .ft-row`);
            if (row) row.focus();
          }
          break;
        }
        case 'Enter':
          if (node.type === 'directory') {
            toggleFolder(node);
          } else {
            openFile(node);
          }
          break;
        case 'F2':
          e.preventDefault();
          promptRename(node);
          break;
        case 'Delete':
          e.preventDefault();
          confirmDelete(node);
          break;
        case 'ContextMenu':
          e.preventDefault();
          const rect = e.target.getBoundingClientRect();
          openContextMenu(rect.left + rect.width, rect.top, node);
          break;
      }
    }

    // ── Search wiring ──────────────────────────────────────────────────────

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.trim();
        if (searchQuery) {
          // Auto-expand all folders when searching
          function collectDirPaths(nodes) {
            nodes.forEach((n) => {
              if (n.type === 'directory') {
                expandedPaths.add(n.path);
                collectDirPaths(n.children || []);
              }
            });
          }
          collectDirPaths(treeData);
        }
        render();
      });
    }

    // ── Public interface ───────────────────────────────────────────────────

    return {
      loadFiles,
      getActiveProject: () => activeProject,
      refresh: () => activeProject ? loadFiles(activeProject) : Promise.resolve()
    };
  }

  global.ZayvoraFileTreeEnhanced = { createFileTree };
})(window);

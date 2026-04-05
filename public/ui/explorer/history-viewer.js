/**
 * history-viewer.js
 *
 * Timeline of workspace changes with:
 *  - Date-grouped entries (Today / Yesterday / older dates)
 *  - Each entry: icon, action label, file path, timestamp
 *  - Click to restore file state
 *  - Undo / Redo buttons (delegates to ZayvoraWorkspaceStore)
 *  - Real-time search by action or file
 *  - Auto-expands today's group
 *
 * Exposed as window.ZayvoraHistoryViewer
 */
(function initHistoryViewer(global) {
  'use strict';

  // ── Constants ──────────────────────────────────────────────────────────────

  const ACTION_LABELS = {
    file_open:     { icon: '📂', label: 'Opened' },
    file_save:     { icon: '💾', label: 'Saved' },
    file_create:   { icon: '✨', label: 'Created' },
    file_delete:   { icon: '🗑',  label: 'Deleted' },
    file_rename:   { icon: '✎',  label: 'Renamed' },
    folder_create: { icon: '📁', label: 'Folder created' },
    restore:       { icon: '↩',  label: 'Restored' }
  };

  function actionMeta(action) {
    return ACTION_LABELS[action] || { icon: '•', label: action };
  }

  // ── Date helpers ───────────────────────────────────────────────────────────

  function dateKey(isoStr) {
    const d = new Date(isoStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function todayKey() {
    return dateKey(new Date().toISOString());
  }

  function yesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return dateKey(d.toISOString());
  }

  function formatGroupLabel(key) {
    if (key === todayKey()) return 'Today';
    if (key === yesterdayKey()) return 'Yesterday';
    return new Date(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function formatTime(isoStr) {
    return new Date(isoStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

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

  // ── Factory ────────────────────────────────────────────────────────────────

  function createHistoryViewer(options) {
    const {
      container,     // DOM element to render into
      store,         // ZayvoraWorkspaceStore
      onRestore      // (filePath, content) => void  — called when user restores a file
    } = options;

    let allEntries = [];
    let searchQuery = '';
    let expandedGroups = new Set([todayKey()]);
    let selectedEntryId = null;
    let detailPanel = null;
    let unsubscribe = null;

    // ── Load ───────────────────────────────────────────────────────────────

    async function load(projectId) {
      if (store) {
        allEntries = await store.fetchHistory(projectId);
      } else {
        allEntries = [];
      }
      render();
    }

    function refresh() {
      if (store) {
        allEntries = store.getState().history;
      }
      render();
    }

    // ── Undo/Redo buttons ─────────────────────────────────────────────────

    function buildUndoRedoBar() {
      if (!store) return null;
      const bar = el('div', { className: 'hv-toolbar' });

      const undoBtn = el('button', {
        className: 'pm-btn pm-btn-ghost hv-undo',
        type: 'button',
        title: 'Undo last change'
      }, '↩ Undo');

      const redoBtn = el('button', {
        className: 'pm-btn pm-btn-ghost hv-redo',
        type: 'button',
        title: 'Redo'
      }, '↪ Redo');

      function updateButtons() {
        undoBtn.disabled = !store.canUndo();
        redoBtn.disabled = !store.canRedo();
      }

      undoBtn.addEventListener('click', () => {
        const snap = store.undo();
        if (snap && typeof onRestore === 'function') {
          onRestore(snap.filePath, snap.content);
        }
        updateButtons();
      });

      redoBtn.addEventListener('click', () => {
        const snap = store.redo();
        if (snap && typeof onRestore === 'function') {
          onRestore(snap.filePath, snap.content);
        }
        updateButtons();
      });

      updateButtons();

      // Keep buttons synced with store changes
      if (unsubscribe) unsubscribe();
      unsubscribe = store.subscribe(() => updateButtons());

      bar.appendChild(undoBtn);
      bar.appendChild(redoBtn);
      return bar;
    }

    // ── Render ─────────────────────────────────────────────────────────────

    function render() {
      container.innerHTML = '';

      const undoBar = buildUndoRedoBar();
      if (undoBar) container.appendChild(undoBar);

      // Search input
      const searchRow = el('div', { className: 'hv-search-row' });
      const searchInput = el('input', {
        className: 'hv-search',
        type: 'search',
        placeholder: 'Search history…',
        value: searchQuery,
        'aria-label': 'Search history'
      });
      searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.trim();
        render();
      });
      searchRow.appendChild(searchInput);
      container.appendChild(searchRow);

      // Filter entries
      const filtered = filterEntries(allEntries, searchQuery);

      if (!filtered.length) {
        container.appendChild(el('p', { className: 'hv-empty' },
          searchQuery ? 'No matching history entries.' : 'No history yet.'));
        return;
      }

      // Group by date
      const groups = groupByDate(filtered);

      groups.forEach(([dateKey, entries]) => {
        const section = buildGroup(dateKey, entries);
        container.appendChild(section);
      });
    }

    function filterEntries(entries, query) {
      if (!query) return entries;
      const q = query.toLowerCase();
      return entries.filter((e) =>
        (e.action && e.action.toLowerCase().includes(q)) ||
        (e.filePath && e.filePath.toLowerCase().includes(q)) ||
        (e.project && e.project.toLowerCase().includes(q))
      );
    }

    function groupByDate(entries) {
      const map = new Map();
      entries.forEach((entry) => {
        const key = entry.timestamp ? dateKey(entry.timestamp) : 'unknown';
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(entry);
      });
      // Sort groups newest first
      return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    }

    function buildGroup(key, entries) {
      const isExpanded = expandedGroups.has(key);
      const section = el('section', { className: 'hv-group' });

      const header = el('button', {
        className: `hv-group-header${isExpanded ? ' hv-group-expanded' : ''}`,
        type: 'button',
        'aria-expanded': isExpanded ? 'true' : 'false'
      });

      header.appendChild(el('span', { className: 'hv-group-arrow' }, isExpanded ? '▼' : '▶'));
      header.appendChild(el('span', { className: 'hv-group-label' }, formatGroupLabel(key)));
      header.appendChild(el('span', { className: 'hv-group-count' }, `${entries.length}`));

      const body = el('ul', { className: `hv-entries${isExpanded ? '' : ' hv-hidden'}` });

      entries.forEach((entry) => {
        body.appendChild(buildEntry(entry));
      });

      header.addEventListener('click', () => {
        if (expandedGroups.has(key)) {
          expandedGroups.delete(key);
        } else {
          expandedGroups.add(key);
        }
        render();
      });

      section.appendChild(header);
      section.appendChild(body);
      return section;
    }

    function buildEntry(entry) {
      const meta = actionMeta(entry.action);
      const isSelected = entry.id === selectedEntryId;

      const li = el('li', {
        className: `hv-entry${isSelected ? ' hv-entry-selected' : ''}`,
        tabIndex: 0,
        'aria-label': `${meta.label} ${entry.filePath || ''}`,
        role: 'button'
      });

      const iconEl = el('span', { className: 'hv-entry-icon', 'aria-hidden': 'true' }, meta.icon);
      const body = el('div', { className: 'hv-entry-body' });
      const topRow = el('div', { className: 'hv-entry-top' });
      topRow.appendChild(el('span', { className: 'hv-entry-action' }, meta.label));
      topRow.appendChild(el('span', { className: 'hv-entry-time' }, entry.timestamp ? formatTime(entry.timestamp) : ''));

      body.appendChild(topRow);
      if (entry.filePath) {
        body.appendChild(el('div', { className: 'hv-entry-path', title: entry.filePath }, entry.filePath));
      }

      li.appendChild(iconEl);
      li.appendChild(body);

      li.addEventListener('click', () => showDetail(entry));
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter') showDetail(entry); });

      return li;
    }

    // ── Detail panel ───────────────────────────────────────────────────────

    function showDetail(entry) {
      selectedEntryId = entry.id;
      render();

      // Remove any existing detail panel
      if (detailPanel && detailPanel.parentNode) {
        detailPanel.parentNode.removeChild(detailPanel);
      }

      const meta = actionMeta(entry.action);
      detailPanel = el('div', { className: 'hv-detail' });

      detailPanel.appendChild(el('div', { className: 'hv-detail-header' },
        el('span', {}, `${meta.icon} ${meta.label}`),
        el('button', {
          className: 'hv-detail-close',
          type: 'button',
          'aria-label': 'Close detail',
          onclick: () => {
            if (detailPanel.parentNode) detailPanel.parentNode.removeChild(detailPanel);
            detailPanel = null;
            selectedEntryId = null;
            render();
          }
        }, '✕')
      ));

      const rows = [
        ['File', entry.filePath || '—'],
        ['Project', entry.project || '—'],
        ['Time', entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—']
      ];

      const table = el('dl', { className: 'hv-detail-table' });
      rows.forEach(([label, value]) => {
        table.appendChild(el('dt', {}, label));
        table.appendChild(el('dd', {}, value));
      });
      detailPanel.appendChild(table);

      // Restore button (only for actions with file content data)
      if (entry.data && entry.data.content && entry.filePath && typeof onRestore === 'function') {
        const restoreBtn = el('button', {
          className: 'pm-btn pm-btn-primary',
          type: 'button'
        }, '↩ Restore this version');
        restoreBtn.addEventListener('click', () => {
          if (confirm(`Restore "${entry.filePath}" to this version?`)) {
            onRestore(entry.filePath, entry.data.content);
            if (detailPanel.parentNode) detailPanel.parentNode.removeChild(detailPanel);
          }
        });
        detailPanel.appendChild(restoreBtn);
      }

      container.appendChild(detailPanel);
    }

    // ── Cleanup ────────────────────────────────────────────────────────────

    function destroy() {
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    }

    return { load, refresh, destroy };
  }

  global.ZayvoraHistoryViewer = { createHistoryViewer };
})(window);

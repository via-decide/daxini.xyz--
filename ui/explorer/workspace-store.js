/**
 * workspace-store.js
 *
 * Lightweight in-browser state store for the Zayvora workspace.
 * Persists history and project selection in localStorage, and
 * mirrors history writes to the server API.
 *
 * Exposed as window.ZayvoraWorkspaceStore
 */
(function initWorkspaceStore(global) {
  'use strict';

  const STORAGE_KEY = 'zayvora_workspace_state';
  const API_BASE = '/workspace';
  const MAX_LOCAL_HISTORY = 200;

  // ── Persistence ────────────────────────────────────────────────────────────

  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function saveLocal(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        activeProject: state.activeProject,
        history: state.history.slice(0, MAX_LOCAL_HISTORY)
      }));
    } catch { /* storage full — ignore */ }
  }

  // ── State ──────────────────────────────────────────────────────────────────

  const saved = loadLocal();

  const state = {
    activeProject: saved.activeProject || null,
    openFiles: [],
    history: saved.history || [],
    undoStack: [],   // stores { filePath, content } snapshots
    redoStack: []
  };

  const listeners = new Set();

  function notify() {
    listeners.forEach((fn) => {
      try { fn({ ...state, history: [...state.history] }); } catch { /* ignore */ }
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  function getState() {
    return { ...state, history: [...state.history] };
  }

  function subscribe(fn) {
    listeners.add(fn);
    return function unsubscribe() { listeners.delete(fn); };
  }

  function setActiveProject(project) {
    state.activeProject = project;
    saveLocal(state);
    notify();
  }

  /**
   * Add a history entry locally and POST it to the server.
   * @param {string} action  - e.g. 'file_open', 'file_save', 'file_create', 'file_delete', 'file_rename'
   * @param {string} filePath
   * @param {object} [extra] - optional { data, content }
   */
  function addHistoryEntry(action, filePath, extra) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      project: state.activeProject ? (state.activeProject.id || state.activeProject) : null,
      action,
      filePath: filePath || null,
      timestamp: new Date().toISOString(),
      ...(extra || {})
    };

    state.history = [entry, ...state.history].slice(0, MAX_LOCAL_HISTORY);
    saveLocal(state);
    notify();

    // Mirror to server (best-effort, non-blocking)
    if (entry.project) {
      fetch(`${API_BASE}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: entry.project,
          action: entry.action,
          filePath: entry.filePath,
          data: entry.data || null
        })
      }).catch(() => { /* best-effort */ });
    }

    return entry;
  }

  /**
   * Push a file snapshot for undo support.
   * @param {string} filePath
   * @param {string} content - file content BEFORE the change
   */
  function pushUndo(filePath, content) {
    state.undoStack.push({ filePath, content, timestamp: new Date().toISOString() });
    if (state.undoStack.length > 50) state.undoStack.shift();
    state.redoStack = []; // clear redo on new change
    notify();
  }

  function undo() {
    const snap = state.undoStack.pop();
    if (!snap) return null;
    state.redoStack.push(snap);
    notify();
    return snap;
  }

  function redo() {
    const snap = state.redoStack.pop();
    if (!snap) return null;
    state.undoStack.push(snap);
    notify();
    return snap;
  }

  function canUndo() { return state.undoStack.length > 0; }
  function canRedo() { return state.redoStack.length > 0; }

  /**
   * Fetch full history from server for the active project.
   * Merges with local cache.
   */
  async function fetchHistory(projectId) {
    const id = projectId || (state.activeProject && (state.activeProject.id || state.activeProject));
    if (!id) return state.history;

    try {
      const res = await fetch(`${API_BASE}/history?project=${encodeURIComponent(id)}`);
      if (!res.ok) return state.history;
      const payload = await res.json();
      if (Array.isArray(payload.history)) {
        // Merge: server is authoritative; local ids supplement
        const serverIds = new Set(payload.history.map((e) => e.id));
        const localOnly = state.history.filter((e) => !serverIds.has(e.id));
        state.history = [...localOnly, ...payload.history]
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, MAX_LOCAL_HISTORY);
        saveLocal(state);
        notify();
      }
    } catch { /* offline — use local cache */ }

    return state.history;
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  global.ZayvoraWorkspaceStore = {
    getState,
    subscribe,
    setActiveProject,
    addHistoryEntry,
    pushUndo,
    undo,
    redo,
    canUndo,
    canRedo,
    fetchHistory
  };
})(window);

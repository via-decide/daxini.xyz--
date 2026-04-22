(function (global) {
  'use strict';

  const STORAGE_KEY = 'daxini_global_memory_graph';
  const ALLOWED_TYPES = ['tasks', 'apps', 'repos', 'users', 'articles'];

  function readState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        return {
          nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
          events: Array.isArray(parsed.events) ? parsed.events : []
        };
      }
    } catch (_) {}
    return { nodes: [], events: [] };
  }

  function writeState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function registerNode(type, node) {
    if (ALLOWED_TYPES.indexOf(type) === -1) return null;
    if (!node || !node.id) return null;

    const state = readState();
    const idx = state.nodes.findIndex((n) => n.type === type && n.id === node.id);
    const merged = {
      ...state.nodes[idx],
      ...node,
      type,
      updated_at: new Date().toISOString()
    };

    if (idx >= 0) {
      state.nodes[idx] = merged;
    } else {
      merged.created_at = merged.updated_at;
      state.nodes.push(merged);
    }

    state.events.push({
      event: 'node.registered',
      source: 'browser-client',
      node_type: type,
      node_id: node.id,
      timestamp: new Date().toISOString()
    });

    if (state.events.length > 1000) {
      state.events.splice(0, state.events.length - 1000);
    }

    writeState(state);
    return merged;
  }

  function pushEvent(event) {
    const state = readState();
    state.events.push({
      timestamp: new Date().toISOString(),
      ...event
    });
    if (state.events.length > 1000) {
      state.events.splice(0, state.events.length - 1000);
    }
    writeState(state);
  }

  function snapshot() {
    return readState();
  }

  global.GlobalMemoryGraphClient = {
    registerNode,
    pushEvent,
    snapshot
  };
})(window);

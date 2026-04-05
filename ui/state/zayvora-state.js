/**
 * ui/state/zayvora-state.js
 * 
 * Central State Manager for Zayvora Mission Control
 * 
 * Tracks:
 * - active repository
 * - agent status (thinking | idle)
 * - preview output state
 * - panel resizing history
 */

export const ZayvoraState = {
  activeRepo: localStorage.getItem('zayv_repo') || null,
  agentStatus: 'idle', // idle | thinking | tool_invoked
  currentTask: null,
  previewData: {
    type: 'html', // html | image | code
    content: null,
    urlPath: null
  },

  setActiveRepo(repo) {
    this.activeRepo = repo;
    localStorage.setItem('zayv_repo', repo);
    this.emit('repoChange', repo);
  },

  setAgentStatus(status) {
    this.agentStatus = status;
    this.emit('statusChange', status);
  },

  setPreview(data) {
    this.previewData = { ...this.previewData, ...data };
    this.emit('previewUpdate', this.previewData);
  },

  // Event System
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },
  emit(event, payload) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(payload));
    }
  }
};

import { emit } from './src/router/events/eventBus.js';

document.addEventListener('DOMContentLoaded', () => {
  emit('workspace-ready', {
    timestamp: Date.now()
  });
});

(() => {
  'use strict';

  function initAuth() {
    document.documentElement.dataset.auth = 'ready';
  }

  function initUI() {
    const fallback = document.getElementById('daxini-fallback');
    // Hide the loader after page loads - it's no longer needed
    if (fallback) {
      fallback.hidden = true;
      fallback.remove();
    }
  }

  function initBootstrap() {
    initAuth();
    initUI();

    if (typeof window.initRouter === 'function') {
      window.initRouter();
    }

    // Register PWA Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((reg) => console.log('[PWA] Service Worker registered, scope:', reg.scope))
          .catch((err) => console.warn('[PWA] SW registration failed:', err));
      });
    }
  }

  window.initAuth = initAuth;
  window.initUI = initUI;
  window.initBootstrap = initBootstrap;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBootstrap, { once: true });
  } else {
    initBootstrap();
  }
})();

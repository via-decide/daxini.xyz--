(() => {
  'use strict';

  function initAuth() {
    document.documentElement.dataset.auth = 'ready';
  }

  function initUI() {
    const fallback = document.getElementById('daxini-fallback');
    if (fallback && fallback.hidden !== true) {
      fallback.textContent = 'Loading Daxini Engine...';
    }
  }

  function initBootstrap() {
    initAuth();
    initUI();

    if (typeof window.initRouter === 'function') {
      window.initRouter();
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

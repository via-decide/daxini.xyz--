(() => {
  'use strict';

  const routes = {
    '/': {
      title: 'Daxini — Home',
      render: () => ''
    }
  };

  function normalizePath(pathname) {
    const cleaned = pathname.replace(/\/+$/, '') || '/';
    return routes[cleaned] ? cleaned : '/';
  }

  function renderRoute(pathname) {
    const app = document.getElementById('app');
    const legacy = document.getElementById('legacy-home');
    const fallback = document.getElementById('daxini-fallback');
    const canonicalPath = normalizePath(pathname);
    const route = routes[canonicalPath];

    if (!app || !legacy || !fallback) return;

    fallback.hidden = true;

    if (canonicalPath === '/') {
      app.hidden = true;
      app.innerHTML = '';
      legacy.hidden = false;
      document.title = route.title;
      return;
    }

    legacy.hidden = true;
    app.hidden = false;
    app.innerHTML = route.render();
    document.title = route.title;
  }

  function handleNavigation(pathname, replace = false) {
    const canonicalPath = normalizePath(pathname);
    const currentPath = normalizePath(window.location.pathname);

    if (canonicalPath !== currentPath) {
      const method = replace ? 'replaceState' : 'pushState';
      window.history[method]({}, '', canonicalPath);
    }

    renderRoute(canonicalPath);
  }

  function initRouter() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');
      if (!link) return;
      if (link.target === '_blank' || link.hasAttribute('download')) return;

      const href = link.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('#')) {
        return;
      }

      const path = link.dataset.route || href;
      if (!routes[normalizePath(path)]) return;

      event.preventDefault();
      handleNavigation(path);
    });

    window.addEventListener('popstate', () => {
      renderRoute(window.location.pathname);
    });

    handleNavigation(window.location.pathname, true);
  }

  window.initRouter = initRouter;
})();

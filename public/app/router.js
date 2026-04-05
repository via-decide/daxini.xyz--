(() => {
  'use strict';

  const routes = {
    '/': {
      title: 'Daxini — Home',
      render: () => ''
    },
    '/zayvora': {
      title: 'Daxini — Zayvora',
      render: () => `
        <main class="hero">
          <div class="badge">Zayvora UI</div>
          <h1>Zayvora</h1>
          <p class="tagline">India's sovereign AI engineering and infrastructure stack.</p>
          <div class="grid">
            <a class="card featured" href="https://github.com/zayvora" target="_blank" rel="noopener"><div class="card-title">GitHub</div><div class="card-desc">Open-source repos and releases.</div></a>
            <a class="card" href="/pricing" data-route="/pricing"><div class="card-title">Pricing</div><div class="card-desc">Credits, plans, and onboarding details.</div></a>
            <a class="card" href="/login" data-route="/login"><div class="card-title">Login</div><div class="card-desc">Access your workspace account.</div></a>
          </div>
        </main>
      `
    },
    '/pricing': {
      title: 'Daxini — Pricing',
      render: () => `
        <main class="hero">
          <div class="badge">Pricing</div>
          <h1>Plans</h1>
          <p class="tagline">Choose a Zayvora credit pack that matches your usage.</p>
          <div class="grid">
            <a class="card" href="/login" data-route="/login"><div class="card-title">Starter</div><div class="card-desc">For evaluation and demos.</div></a>
            <a class="card featured" href="/login" data-route="/login"><div class="card-title">Growth</div><div class="card-desc">For frequent workspace use.</div></a>
            <a class="card" href="/login" data-route="/login"><div class="card-title">Enterprise</div><div class="card-desc">Custom deployment and support.</div></a>
          </div>
        </main>
      `
    },
    '/login': {
      title: 'Daxini — Login',
      render: () => `
        <main class="hero">
          <div class="badge">Login</div>
          <h1>Sign In</h1>
          <p class="tagline">Use your existing account to access Zayvora services.</p>
          <div class="launch-actions" style="display:flex; gap: 12px; flex-wrap: wrap;">
            <a class="card featured" href="/zayvora-login/index.html"><div class="card-title">Open Secure Login</div><div class="card-desc">Continue to authenticated sign-in flow.</div></a>
            <a class="card" href="/" data-route="/"><div class="card-title">Back Home</div><div class="card-desc">Return to Daxini portal.</div></a>
          </div>
        </main>
      `
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

/* ══════════════════════════════════════════════════════════
   ZAYVORA-PWA.JS — PWA connection monitor + install support
   - Registers the service worker
   - Probes the configured inference endpoint (default localhost:11434)
   - Updates a pill + banner in the dashboard nav
   - Exposes an install button when beforeinstallprompt fires
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const ENDPOINT_KEY = 'zv_endpoint';
  const CHECK_INTERVAL_MS = 5000;

  const $ = (s) => document.querySelector(s);

  const state = {
    status: 'connecting',
    nextRetryAt: null,
    checkInterval: null,
    countdownInterval: null,
    deferredInstallPrompt: null,
    running: false,
  };

  function getEndpoint() {
    const raw = (localStorage.getItem(ENDPOINT_KEY) || '').trim();
    return raw || 'http://localhost:11434';
  }

  function setEndpoint(url) {
    localStorage.setItem(ENDPOINT_KEY, (url || '').trim());
  }

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function updateInstallButton() {
    const btn = $('#zv-install-btn');
    if (!btn) return;
    if (isStandalone()) {
      btn.textContent = 'Installed';
      btn.disabled = true;
      btn.hidden = false;
      return;
    }
    if (state.deferredInstallPrompt) {
      btn.textContent = 'Install';
      btn.disabled = false;
      btn.hidden = false;
    } else {
      btn.hidden = true;
    }
  }

  async function fetchWithTimeout(url, opts = {}, timeoutMs = 3000) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      return await fetch(url, Object.assign({}, opts, { signal: ctl.signal }));
    } finally {
      clearTimeout(t);
    }
  }

  function setStatus(status) {
    state.status = status;
    const pill = $('#zv-connection-pill');
    const pillText = $('#zv-connection-text');
    const banner = $('#zv-connection-banner');
    if (pill) {
      pill.classList.remove('connected', 'connecting', 'disconnected');
      pill.classList.add(status);
    }
    if (pillText) {
      pillText.textContent = status === 'connected' ? 'Online'
        : status === 'connecting' ? 'Checking…'
        : 'Offline';
    }
    if (banner) {
      banner.classList.toggle('hidden', status === 'connected');
    }
  }

  function updateCountdown() {
    const label = $('#zv-retry-countdown');
    if (!label) return;
    if (state.status === 'connected' || !state.nextRetryAt) {
      label.textContent = '';
      return;
    }
    const remaining = Math.max(0, Math.ceil((state.nextRetryAt - Date.now()) / 1000));
    label.textContent = `Next check in ${remaining}s`;
  }

  async function checkConnection() {
    if (state.status !== 'connected') setStatus('connecting');
    const endpoint = getEndpoint().replace(/\/$/, '');
    const hostLabel = endpoint.replace(/^https?:\/\//, '');
    const endpointLabel = $('#zv-connection-endpoint');
    if (endpointLabel) endpointLabel.textContent = hostLabel;

    try {
      const res = await fetchWithTimeout(endpoint + '/health', { method: 'GET' }, 3000);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setStatus('connected');
      state.nextRetryAt = null;
      updateCountdown();
      return true;
    } catch (_) {
      setStatus('disconnected');
      state.nextRetryAt = Date.now() + CHECK_INTERVAL_MS;
      updateCountdown();
      return false;
    }
  }

  function start() {
    if (state.running) return;
    state.running = true;
    checkConnection();
    state.checkInterval = setInterval(checkConnection, CHECK_INTERVAL_MS);
    state.countdownInterval = setInterval(updateCountdown, 1000);
  }

  function stop() {
    state.running = false;
    clearInterval(state.checkInterval);
    clearInterval(state.countdownInterval);
    state.checkInterval = null;
    state.countdownInterval = null;
  }

  function bindEvents() {
    const retryBtn = $('#zv-connection-retry');
    if (retryBtn) retryBtn.addEventListener('click', checkConnection);

    const helpBtn = $('#zv-connection-help');
    if (helpBtn) {
      helpBtn.addEventListener('click', () => {
        alert(
          'Start your local Zayvora backend:\n\n' +
          '  python3 -m zayvora.server --host localhost --port 11434\n\n' +
          'Then verify it:\n\n' +
          '  curl http://localhost:11434/health'
        );
      });
    }

    const endpointInput = $('#zv-endpoint-input');
    if (endpointInput) {
      endpointInput.value = localStorage.getItem(ENDPOINT_KEY) || '';
      endpointInput.addEventListener('change', () => {
        setEndpoint(endpointInput.value);
        checkConnection();
      });
    }

    const installBtn = $('#zv-install-btn');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!state.deferredInstallPrompt) return;
        state.deferredInstallPrompt.prompt();
        try { await state.deferredInstallPrompt.userChoice; } catch (_) {}
        state.deferredInstallPrompt = null;
        updateInstallButton();
      });
    }

    window.addEventListener('beforeinstallprompt', (ev) => {
      ev.preventDefault();
      state.deferredInstallPrompt = ev;
      updateInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      state.deferredInstallPrompt = null;
      updateInstallButton();
    });
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  const Zpwa = {
    start, stop, checkConnection,
    getEndpoint, setEndpoint,
  };
  window.Zpwa = Zpwa;

  document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
    updateInstallButton();
    registerSW();

    if (window.Zauth && typeof window.Zauth.onAuthenticated === 'function') {
      window.Zauth.onAuthenticated(start);
      window.Zauth.onLogout(stop);
    } else {
      start();
    }
  });
})();

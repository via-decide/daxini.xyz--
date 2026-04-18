/* ══════════════════════════════════════════════════════════
   ZAYVORA-AUTH.JS — Local-first auth for the Zayvora dashboard
   IndexedDB-backed signup / login / recovery. No servers.
   Exposes window.Zauth with:
     - ready(): Promise<boolean>  resolves with `isAuthenticated`
     - onAuthenticated(fn)         fires after successful auth
     - logout()                    clears session and returns to login
     - currentUser()               { email, name } | null
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const DB_NAME = 'zayvora-auth';
  const DB_VERSION = 1;
  const TOKEN_KEY = 'zv_token';
  const EMAIL_KEY = 'zv_email';
  const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

  const $ = (s, r = document) => r.querySelector(s);

  /* ── IndexedDB helpers ── */
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'email' });
        }
        if (!db.objectStoreNames.contains('tokens')) {
          db.createObjectStore('tokens', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbPut(store, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(data);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function dbGet(store, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbClear(store) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /* ── Crypto helpers (SubtleCrypto SHA-256) ── */
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function hashPassword(password, salt) {
    return sha256(salt + ':' + password);
  }

  function randomSalt() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function generateRecoveryCode() {
    const bytes = crypto.getRandomValues(new Uint8Array(5));
    return Array.from(bytes).map((b) => b.toString(36).toUpperCase().padStart(2, '0').slice(-2)).join('').slice(0, 8);
  }

  function generateToken(email) {
    const header = btoa(JSON.stringify({ alg: 'local', typ: 'ZVT' }));
    const now = Math.floor(Date.now() / 1000);
    const payload = btoa(JSON.stringify({ email, iat: now, exp: now + TOKEN_TTL_MS / 1000 }));
    const sigBytes = crypto.getRandomValues(new Uint8Array(16));
    const sig = Array.from(sigBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    return header + '.' + payload + '.' + sig;
  }

  function decodeToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(atob(parts[1]));
    } catch (_) {
      return null;
    }
  }

  function tokenValid(token) {
    const payload = decodeToken(token);
    if (!payload || !payload.exp) return false;
    return payload.exp > Math.floor(Date.now() / 1000);
  }

  /* ── State ── */
  const state = {
    user: null,
    authenticatedListeners: [],
    logoutListeners: [],
    ready: false,
  };

  /* ── View switching ── */
  function showAuth(viewId) {
    const root = $('#zv-auth-root');
    if (!root) return;
    root.classList.remove('hidden');
    root.querySelectorAll('.zv-auth-view').forEach((v) => v.classList.remove('active'));
    const target = $('#' + viewId);
    if (target) target.classList.add('active');
    document.body.classList.remove('authorized');
    document.body.classList.add('unauthorized');
  }

  function hideAuth() {
    const root = $('#zv-auth-root');
    if (root) root.classList.add('hidden');
    document.body.classList.remove('unauthorized');
    document.body.classList.add('authorized');
  }

  function setErr(id, msg) {
    const el = $('#' + id);
    if (el) el.textContent = msg || '';
  }

  /* ── Flows ── */
  async function login(email, password) {
    email = (email || '').trim().toLowerCase();
    const user = await dbGet('users', email);
    if (!user) return { ok: false, error: 'Invalid email or password' };
    const hash = await hashPassword(password, user.salt);
    if (hash !== user.passwordHash) return { ok: false, error: 'Invalid email or password' };

    const token = generateToken(email);
    const now = Date.now();
    await dbClear('tokens');
    await dbPut('tokens', { id: 'session', token, email, expiresAt: now + TOKEN_TTL_MS });
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(EMAIL_KEY, email);

    state.user = { email: user.email, name: user.name };
    return { ok: true };
  }

  async function signup(name, email, password) {
    email = (email || '').trim().toLowerCase();
    name = (name || '').trim();
    if (!name) return { ok: false, error: 'Name is required' };
    if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters' };

    const existing = await dbGet('users', email);
    if (existing) return { ok: false, error: 'Account already exists' };

    const salt = randomSalt();
    const passwordHash = await hashPassword(password, salt);
    const recoveryCode = generateRecoveryCode();

    await dbPut('users', {
      email, name, salt, passwordHash, recoveryCode, createdAt: Date.now(),
    });
    return { ok: true, recoveryCode };
  }

  async function recover(email, code, newPassword) {
    email = (email || '').trim().toLowerCase();
    code = (code || '').trim().toUpperCase();
    if (newPassword.length < 8) return { ok: false, error: 'Password must be at least 8 characters' };
    const user = await dbGet('users', email);
    if (!user) return { ok: false, error: 'No account found' };
    if (user.recoveryCode !== code) return { ok: false, error: 'Invalid recovery code' };

    const salt = randomSalt();
    user.salt = salt;
    user.passwordHash = await hashPassword(newPassword, salt);
    user.recoveryCode = generateRecoveryCode();
    await dbPut('users', user);
    return { ok: true, recoveryCode: user.recoveryCode };
  }

  async function logout() {
    await dbClear('tokens');
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(EMAIL_KEY);
    state.user = null;
    state.logoutListeners.forEach((fn) => {
      try { fn(); } catch (_) {}
    });
    showAuth('zv-view-login');
  }

  async function restoreSession() {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const email = sessionStorage.getItem(EMAIL_KEY);
    if (!token || !email || !tokenValid(token)) return false;
    const stored = await dbGet('tokens', 'session');
    if (!stored || stored.token !== token || stored.email !== email) return false;
    const user = await dbGet('users', email);
    if (!user) return false;
    state.user = { email: user.email, name: user.name };
    return true;
  }

  /* ── UI wiring ── */
  function bindEvents() {
    const loginForm = $('#zv-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setErr('zv-login-error', '');
        const email = $('#zv-login-email').value;
        const password = $('#zv-login-password').value;
        const btn = $('#zv-login-btn');
        if (btn) btn.disabled = true;
        const r = await login(email, password);
        if (btn) btn.disabled = false;
        if (!r.ok) { setErr('zv-login-error', r.error); return; }
        enterDashboard();
      });
    }

    const signupForm = $('#zv-signup-form');
    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setErr('zv-signup-error', '');
        const name = $('#zv-signup-name').value;
        const email = $('#zv-signup-email').value;
        const password = $('#zv-signup-password').value;
        const confirm = $('#zv-signup-confirm').value;
        if (password !== confirm) { setErr('zv-signup-error', 'Passwords do not match'); return; }
        const btn = $('#zv-signup-btn');
        if (btn) btn.disabled = true;
        const r = await signup(name, email, password);
        if (!r.ok) { if (btn) btn.disabled = false; setErr('zv-signup-error', r.error); return; }

        const codeBox = $('#zv-signup-code');
        const success = $('#zv-signup-success');
        if (codeBox) codeBox.textContent = r.recoveryCode;
        if (success) success.classList.remove('hidden');

        const loginResult = await login(email, password);
        if (btn) btn.disabled = false;
        if (loginResult.ok) {
          setTimeout(enterDashboard, 1600);
        } else {
          setErr('zv-signup-error', 'Account created. Please sign in.');
        }
      });
    }

    const recoveryForm = $('#zv-recovery-form');
    if (recoveryForm) {
      recoveryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        setErr('zv-recovery-error', '');
        const email = $('#zv-recovery-email').value;
        const code = $('#zv-recovery-code').value;
        const newPass = $('#zv-recovery-newpass').value;
        const r = await recover(email, code, newPass);
        if (!r.ok) { setErr('zv-recovery-error', r.error); return; }
        alert('Password reset. New recovery code: ' + r.recoveryCode + '\nWrite it down. It will not be shown again.');
        showAuth('zv-view-login');
      });
    }

    const goSignup = $('#zv-goto-signup');
    if (goSignup) goSignup.addEventListener('click', (e) => { e.preventDefault(); showAuth('zv-view-signup'); });
    const goRecovery = $('#zv-goto-recovery');
    if (goRecovery) goRecovery.addEventListener('click', (e) => { e.preventDefault(); showAuth('zv-view-recovery'); });
    document.querySelectorAll('.zv-goto-login').forEach((el) => {
      el.addEventListener('click', (e) => { e.preventDefault(); showAuth('zv-view-login'); });
    });

    const logoutBtn = $('#zv-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
  }

  function enterDashboard() {
    hideAuth();
    const who = $('#zv-user-email');
    if (who && state.user) who.textContent = state.user.email;
    state.authenticatedListeners.forEach((fn) => {
      try { fn(state.user); } catch (_) {}
    });
  }

  /* ── Public API ── */
  const Zauth = {
    ready: async function () {
      if (state.ready) return !!state.user;
      state.ready = true;
      bindEvents();
      const ok = await restoreSession();
      if (ok) {
        enterDashboard();
        return true;
      }
      showAuth('zv-view-login');
      return false;
    },
    onAuthenticated(fn) {
      if (typeof fn === 'function') state.authenticatedListeners.push(fn);
    },
    onLogout(fn) {
      if (typeof fn === 'function') state.logoutListeners.push(fn);
    },
    logout,
    currentUser: () => state.user,
  };

  window.Zauth = Zauth;

  document.addEventListener('DOMContentLoaded', () => {
    Zauth.ready();
  });
})();

import { isValidEmail } from './utils.js';

const AUTH_KEY = 'zayvora_auth_jwt';
const APP_CONTENT_WRAPPER_ID = 'mainAppContentWrapper';

function getToken() {
  return localStorage.getItem(AUTH_KEY);
}

function setToken(token) {
  localStorage.setItem(AUTH_KEY, token);
}

function clearToken() {
  localStorage.removeItem(AUTH_KEY);
}

async function apiPost(url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body || {}) });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function login(username, password) {
  const { response, data } = await apiPost('/auth/login', { username, password });
  if (!response.ok || !data.token) throw new Error(data.message || 'Login failed');
  setToken(data.token);
}

async function register(username, password) {
  const { response, data } = await apiPost('/auth/register', { username, password });
  if (!response.ok) throw new Error(data.message || 'Registration failed');
  return data;
}

async function forgotPassword(email) {
  const { response, data } = await apiPost('/api/forgot-password', { email });
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

async function resetPassword(token, newPassword) {
  const { response, data } = await apiPost('/api/reset-password', { token, newPassword });
  if (!response.ok) throw new Error(data.message || 'Reset failed');
  return data;
}

async function logout() {
  const token = getToken();
  await apiPost('/auth/logout', {}, token).catch(() => {});
  clearToken();
  renderAuthUI();
}

function renderAuthOverlay() {
  const wrapper = document.getElementById(APP_CONTENT_WRAPPER_ID);
  if (wrapper) wrapper.style.display = 'none';

  const existing = document.getElementById('zayvoraAuthOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'zayvoraAuthOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#0b0c0f;display:flex;align-items:center;justify-content:center;padding:24px;';
  overlay.innerHTML = `
    <div style="width:100%;max-width:420px;background:#11131a;border:1px solid #2a2f3a;border-radius:12px;padding:20px;color:#f0f3ff;font-family:Inter,system-ui,sans-serif;">
      <h2 style="margin:0 0 12px;">Sign in to Daxini</h2>
      <input id="authUsername" placeholder="Email" style="width:100%;margin:8px 0;padding:10px;border-radius:8px;border:1px solid #3b4252;background:#0f1117;color:#fff;" />
      <input id="authPassword" type="password" placeholder="Password" style="width:100%;margin:8px 0;padding:10px;border-radius:8px;border:1px solid #3b4252;background:#0f1117;color:#fff;" />
      <button id="authLoginBtn" style="width:100%;margin-top:8px;padding:10px;border-radius:8px;border:none;background:#5b8cff;color:#fff;">Login</button>
      <button id="authRegisterBtn" style="width:100%;margin-top:8px;padding:10px;border-radius:8px;border:1px solid #3b4252;background:transparent;color:#fff;">Register</button>
      <input id="authResetToken" placeholder="Reset token" style="width:100%;margin:12px 0 8px;padding:10px;border-radius:8px;border:1px solid #3b4252;background:#0f1117;color:#fff;" />
      <button id="authForgotBtn" style="width:100%;margin-top:4px;padding:10px;border-radius:8px;border:1px solid #3b4252;background:transparent;color:#fff;">Forgot Password</button>
      <button id="authResetBtn" style="width:100%;margin-top:8px;padding:10px;border-radius:8px;border:1px solid #3b4252;background:transparent;color:#fff;">Reset Password</button>
      <p id="authMessage" style="min-height:20px;color:#aeb8d1;font-size:13px;margin-top:10px;"></p>
    </div>
  `;
  document.body.appendChild(overlay);

  const msg = document.getElementById('authMessage');
  const usernameInput = document.getElementById('authUsername');
  const passwordInput = document.getElementById('authPassword');
  const tokenInput = document.getElementById('authResetToken');

  document.getElementById('authLoginBtn').onclick = async () => {
    try {
      await login(usernameInput.value.trim().toLowerCase(), passwordInput.value);
      renderAuthUI();
    } catch (err) {
      msg.textContent = err.message;
    }
  };

  document.getElementById('authRegisterBtn').onclick = async () => {
    const username = usernameInput.value.trim().toLowerCase();
    if (!isValidEmail(username)) return void (msg.textContent = 'Enter a valid email.');
    try {
      const out = await register(username, passwordInput.value);
      msg.textContent = out.message || 'Registered. You can now login.';
    } catch (err) {
      msg.textContent = err.message;
    }
  };

  document.getElementById('authForgotBtn').onclick = async () => {
    const email = usernameInput.value.trim().toLowerCase();
    if (!isValidEmail(email)) return void (msg.textContent = 'Enter a valid email.');
    try {
      const out = await forgotPassword(email);
      msg.textContent = out._mockToken ? `Mock reset token: ${out._mockToken}` : 'If that account exists, a reset email has been sent.';
    } catch (err) {
      msg.textContent = err.message;
    }
  };

  document.getElementById('authResetBtn').onclick = async () => {
    try {
      const out = await resetPassword(tokenInput.value.trim(), passwordInput.value);
      msg.textContent = out.message || 'Password reset complete.';
    } catch (err) {
      msg.textContent = err.message;
    }
  };
}

function renderAuthedUI() {
  const wrapper = document.getElementById(APP_CONTENT_WRAPPER_ID);
  if (wrapper) wrapper.style.display = '';
  const overlay = document.getElementById('zayvoraAuthOverlay');
  if (overlay) overlay.remove();

  if (!document.getElementById('zayvoraLogoutBtn')) {
    const btn = document.createElement('button');
    btn.id = 'zayvoraLogoutBtn';
    btn.textContent = 'Logout';
    btn.style.cssText = 'position:fixed;top:16px;right:16px;z-index:10000;padding:8px 12px;background:#111;border:1px solid #555;color:#fff;border-radius:8px;';
    btn.onclick = logout;
    document.body.appendChild(btn);
  }
}

export function renderAuthUI() {
  if (getToken()) renderAuthedUI();
  else renderAuthOverlay();
}

renderAuthUI();

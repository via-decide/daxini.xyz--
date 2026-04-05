'use strict';

const TOKEN_STORAGE_KEY = 'zayvora_token';
const AUTH_BASE_STORAGE_KEY = 'zayvora_auth_base';
const AUTH_BASE = localStorage.getItem(AUTH_BASE_STORAGE_KEY) || 'http://MAC_MINI_IP:4000';
const WORKSPACE_PATH = '/workspace';

function setMessage(text, type = 'error') {
  const box = document.getElementById('auth-message');
  if (!box) return;
  box.className = `message ${type}`;
  box.textContent = text;
}

async function postJson(url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (_err) {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.error || payload.message || 'Request failed');
  }

  return payload;
}

async function verifyTokenAndRedirect() {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) {
    window.location.href = '/login';
    return;
  }

  const response = await fetch(`${AUTH_BASE}/auth/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.location.href = '/login';
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const data = await postJson(`${AUTH_BASE}/auth/login`, { email, password });
    localStorage.setItem(TOKEN_STORAGE_KEY, data.token);

    if (data.firstLogin) {
      window.location.href = '/onboarding';
      return;
    }

    window.location.href = WORKSPACE_PATH;
  } catch (err) {
    setMessage(err.message);
  }
}

async function handleSignupSubmit(event) {
  event.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    await postJson(`${AUTH_BASE}/auth/register`, { name, email, password });
    setMessage('Signup successful. Redirecting to onboarding…', 'success');
    window.setTimeout(() => {
      window.location.href = '/onboarding';
    }, 500);
  } catch (err) {
    setMessage(err.message);
  }
}

function setupOnboarding() {
  let step = 1;
  let selectedUseCase = '';

  const steps = Array.from(document.querySelectorAll('.step'));
  const workspaceInput = document.getElementById('workspace-name');

  function showStep(next) {
    step = next;
    for (const node of steps) {
      node.classList.toggle('active', Number(node.dataset.step) === step);
    }
    setMessage('', '');
  }

  async function createWorkspace() {
    const workspace = workspaceInput.value.trim();
    if (!workspace) {
      setMessage('Please enter a workspace name.');
      return;
    }

    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      await postJson(`${AUTH_BASE}/workspace/create`, { workspace, useCase: selectedUseCase || null }, token);
      showStep(4);
    } catch (err) {
      setMessage(err.message);
    }
  }

  document.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => {
      if (step === 2 && !selectedUseCase) {
        setMessage('Please select a use case first.');
        return;
      }
      if (step === 3) {
        createWorkspace();
        return;
      }
      showStep(step + 1);
    });
  });

  document.querySelectorAll('[data-prev]').forEach((button) => {
    button.addEventListener('click', () => showStep(Math.max(1, step - 1)));
  });

  document.querySelectorAll('[data-use-case]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedUseCase = button.dataset.useCase;
      document.querySelectorAll('[data-use-case]').forEach((pill) => pill.classList.remove('selected'));
      button.classList.add('selected');
    });
  });

  const launchButton = document.querySelector('[data-launch]');
  if (launchButton) {
    launchButton.addEventListener('click', () => {
      window.location.href = WORKSPACE_PATH;
    });
  }

  verifyTokenAndRedirect().catch((err) => {
    setMessage(err.message || 'Unable to validate session.');
  });
}

function initPage() {
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLoginSubmit);
    return;
  }

  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignupSubmit);
    return;
  }

  if (document.querySelector('[data-step]')) {
    setupOnboarding();
  }
}

document.addEventListener('DOMContentLoaded', initPage);

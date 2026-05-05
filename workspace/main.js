import { addLog, initLiveLog, streamLog } from './components/live-log.js';
import {
  renderReasoningGraph,
  activateNode,
  activateToolkitStep,
  clearNodes
} from './components/reasoning-graph.js';
import { runToolkitTask } from './connectors/zayvora-toolkit.js';
import { initRepoPanel } from './repo-panel.js';
import { initCodeIntelligence } from './code-intelligence.js';

const templates = [
  { key: 'research', label: '🔭 Research', prompt: 'Research the current state of AI agent memory architectures and summarize the top 5 approaches.' },
  { key: 'create', label: '🎬 Create', prompt: 'Create a launch plan for a short-form educational content series with scripts and hooks.' },
  { key: 'game-dev', label: '🧩 Game Dev', prompt: 'Design a replayable progression loop for an indie survival game with clear player rewards.' },
  { key: 'analyze', label: '📊 Analyze', prompt: 'Analyze this product concept and provide strengths, risks, and metrics to validate it.' },
  { key: 'solve', label: '🛠 Solve', prompt: 'Solve this engineering bottleneck by outlining root causes and a prioritized fix strategy.' },
  { key: 'documents', label: '📁 Documents', prompt: 'Draft a concise technical specification document from this project idea.' },
  { key: 'explore', label: '🔭 Explore Knowledge', prompt: 'Explore adjacent opportunities related to this idea and suggest unconventional directions.' }
];

let selectedMode = 'standard';
let lastSuccessfulAction = 'No successful action yet.';
const chatMessages = [];
const reasoningStages = ['INPUT', 'PARSE', 'ANALYZE', 'VERIFY', 'SYNTHESIZE', 'OUTPUT'];
let reasoningLoopTimer;

function buildTemplates() {
  const container = document.getElementById('task-templates');
  const input = document.getElementById('main-prompt');
  if (!container || !input) {return;}

  container.innerHTML = '';
  templates.forEach((template) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'template-item';
    button.dataset.templateKey = template.key;
    button.textContent = template.label;
    button.addEventListener('click', () => {
      setTemplateByKey(template.key);
      addLog(`[TEMPLATE] Loaded ${template.label}`);
      if (selectedMode === 'research') {addLog('[MODE] NEX Research enabled');}
    });
    container.appendChild(button);
  });
}

function setProgress(message) {
  const progress = document.getElementById('task-progress');
  if (progress) {progress.textContent = message;}
}

function setResult(message) {
  const result = document.getElementById('result-output');
  if (result) {result.textContent = message;}
}

function updateReasoningPanel(activeStep = '', withIndex = false) {
  const container = document.getElementById('reasoning-stages');
  if (!container) {return;}
  container.innerHTML = '';
  reasoningStages.forEach((stage) => {
    const node = document.createElement('div');
    node.className = `reasoning-stage ${stage.toLowerCase() === activeStep.toLowerCase() ? 'active' : ''}`;
    node.textContent = withIndex && stage.toLowerCase() === activeStep.toLowerCase() ? `${stage} • Stage ${reasoningStages.indexOf(stage) + 1}/6` : stage;
    container.appendChild(node);
  });
}


function getLocalItems(keys = []) {
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {continue;}
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) {return parsed;}
    } catch (error) {
      console.warn('Local data parse failed', key, error);
    }
  }
  return [];
}

function buildCapabilityCards() {
  const container = document.getElementById('capability-cards');
  if (!container) {return;}

  const taskThreads = getLocalItems(['zayvora_task_threads', 'task_threads']);
  const artifacts = getLocalItems(['recent_artifacts', 'zayvora_artifacts']);
  const apps = getLocalItems(['generated_apps', 'installed_apps']);
  const timeline = Array.from(document.querySelectorAll('#live-log .log-line')).map((node) => node.textContent).filter(Boolean);
  const repoSummary = (document.getElementById('repo-summary')?.textContent || '').trim();

  const cards = [
    {
      title: 'Task Threads',
      detail: taskThreads.length ? `${taskThreads.length} thread(s) available` : 'No task threads yet. Run a task to create one.'
    },
    {
      title: 'Live Reasoning Timeline',
      detail: timeline.length ? `${timeline.length} log events in this session` : 'Timeline is empty. Start an action to stream reasoning.'
    },
    {
      title: 'Git History Intelligence',
      detail: repoSummary && !repoSummary.includes('will appear here') ? repoSummary : 'No repo analysis yet. Use Analyze a repo to populate this card.'
    },
    {
      title: 'Installed Apps',
      detail: apps.length ? `${apps.length} generated app(s) found` : 'No generated apps found in local workspace storage.'
    },
    {
      title: 'Recent Artifacts',
      detail: artifacts.length ? `${artifacts.length} recent artifact(s) available` : 'No artifacts yet. Artifacts from completed tasks appear here.'
    }
  ];

  container.innerHTML = cards.map((card) => `
    <article class="capability-card">
      <div class="card-title">${card.title}</div>
      <div class="card-meta">${card.detail}</div>
    </article>
  `).join('');
}

function buildStatusCards() {
  const container = document.getElementById('status-cards');
  if (!container) {return;}
  const installReady = document.getElementById('pwa-install-btn') && !document.getElementById('pwa-install-btn').classList.contains('hidden');
  const runtime = navigator.onLine ? 'Online' : 'Offline';

  const cards = [
    { title: 'Install Daxini', detail: installReady ? 'Install is available in this browser.' : 'Install is not available yet in this session.' },
    { title: 'Local/offline capability', detail: 'Core workspace remains usable with cached/local data when runtime is unavailable.' },
    { title: 'Runtime status', detail: `Current runtime: ${runtime}` },
    { title: 'Last successful action', detail: lastSuccessfulAction }
  ];

  container.innerHTML = cards.map((card) => `
    <article class="status-card">
      <div class="card-title">${card.title}</div>
      <div class="card-meta">${card.detail}</div>
    </article>
  `).join('');
}

function buildWorkspaceLauncher() {
  const container = document.getElementById('workspace-launcher');
  if (!container) {return;}
  const actions = [
    { label: 'Ask Zayvora something', run: () => document.getElementById('main-prompt')?.focus() },
    { label: 'Analyze a repo', run: () => document.getElementById('tab-repo')?.click() },
    { label: 'Continue a task thread', run: () => document.getElementById('main-prompt')?.focus() },
    { label: 'Open research mode', run: () => setTemplateByKey('research') },
    { label: 'Open generated apps', run: () => document.getElementById('capability-cards')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
    { label: 'View execution timeline', run: () => document.getElementById('live-log')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  ];
  container.innerHTML = '';
  actions.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'launcher-action';
    button.textContent = action.label;
    button.addEventListener('click', action.run);
    container.appendChild(button);
  });
}

function setTemplateByKey(key) {
  const input = document.getElementById('main-prompt');
  if (!input) {return;}
  const template = templates.find((item) => item.key === key);
  if (!template) {return;}
  input.value = template.prompt;
  input.focus();
  selectedMode = template.key === 'research' ? 'research' : 'standard';
  document.querySelectorAll('.template-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.templateKey === key);
  });
}

function renderMetrics(executionMs, data = {}) {
  const metrics = document.getElementById('metrics-output');
  if (!metrics) {return;}
  const seconds = (executionMs / 1000).toFixed(1);
  const source = data?.reasoning?.source || data?.research?.source || (data?.verification?.offline ? 'cache' : 'toolkit');
  metrics.innerHTML = `
    <p>✔ Execution complete</p>
    <p>Execution time: ${seconds}s</p>
    <p>Pipeline: ${data.mode === 'research' ? 'NEX Research' : 'Standard reasoning'}</p>
    <p>Source: ${source || 'toolkit'}</p>
    <p>Verification: ${data.verification ? 'Complete' : 'Skipped'}</p>
  `;
}

function formatResult(payload) {
  const result = payload?.result ?? payload;
  if (typeof result === 'string') {return result;}
  return JSON.stringify(result, null, 2);
}

async function runTask() {
  const input = document.getElementById('main-prompt');
  const runButton = document.getElementById('run-task');
  if (!input || !runButton) {return;}

  const prompt = input.value.trim();
  if (!prompt) {
    setProgress('Enter a mission prompt first.');
    return;
  }

  runButton.disabled = true;
  clearNodes();
  setProgress('Starting execution...');
  setResult('Running toolkit...');
  const startedAt = performance.now();

  activateNode('user');
  addLog('[INPUT] Mission received');

  try {
    const payload = await runToolkitTask(prompt, {
      mode: selectedMode,
      onStep: (step) => {
        activateToolkitStep(step);
        updateReasoningPanel(step);
        setProgress(`Step: ${step}`);
      },
      onLog: (message) => streamLog(message.replace(/^\[TOOLKIT\]\s*/i, ''))
    });

    addLog('[ENGINE] Task completed');
    lastSuccessfulAction = `Task run completed at ${new Date().toLocaleString()}`;
    setProgress(payload.verification?.offline ? 'Execution complete (offline cache)' : 'Execution complete');
    setResult(formatResult(payload));
    renderMetrics(performance.now() - startedAt, payload);
    buildStatusCards();
    buildCapabilityCards();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Task failed';
    addLog(`[ERROR] ${message}`);
    setProgress('Execution failed');
    setResult(`Toolkit error: ${message}`);
  } finally {
    runButton.disabled = false;
  }
}

function setupCommandPalette() {
  const palette = document.getElementById('command-palette');
  const prompt = document.getElementById('main-prompt');
  if (!palette || !prompt) {return;}

  document.addEventListener('keydown', (event) => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const trigger = (isMac && event.metaKey && event.key.toLowerCase() === 'k')
      || (!isMac && event.ctrlKey && event.key.toLowerCase() === 'k');

    if (!trigger) {return;}
    event.preventDefault();
    palette.hidden = !palette.hidden;
    if (!palette.hidden) {palette.querySelector('button')?.focus();}
  });

  palette.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {return;}
    const action = target.dataset.action;
    if (!action) {
      if (target.id === 'command-palette') {palette.hidden = true;}
      return;
    }

    if (action === 'run') {
      runTask();
    } else {
      const template = templates.find((item) => item.key === action);
      if (template) {
        prompt.value = template.prompt;
        selectedMode = action === 'research' ? 'research' : 'standard';
        addLog(`[PALETTE] Loaded ${template.label}`);
        if (selectedMode === 'research') {addLog('[MODE] NEX Research enabled');}
      }
    }
    palette.hidden = true;
  });
}

function setupWorkspaceTabs() {
  const missionTab = document.getElementById('tab-mission');
  const repoTab = document.getElementById('tab-repo');
  const chatTab = document.getElementById('tab-chat');
  const settingsTab = document.getElementById('tab-settings');
  const missionPanel = document.getElementById('mission-panel');
  const repoPanel = document.getElementById('repo-panel');
  const chatPanel = document.getElementById('chat-panel');
  const settingsPanel = document.getElementById('settings-panel');
  if (!missionTab || !repoTab || !chatTab || !settingsTab || !missionPanel || !repoPanel || !chatPanel || !settingsPanel) {return;}

  const activate = (key) => {
    const tabs = { mission: missionTab, repo: repoTab, chat: chatTab, settings: settingsTab };
    const panels = { mission: missionPanel, repo: repoPanel, chat: chatPanel, settings: settingsPanel };
    Object.entries(tabs).forEach(([name, tab]) => { tab.classList.toggle('active', name === key); tab.setAttribute('aria-selected', name === key ? 'true' : 'false'); });
    Object.entries(panels).forEach(([name, panel]) => { panel.hidden = name !== key; });
  };

  missionTab.addEventListener('click', () => activate('mission'));
  repoTab.addEventListener('click', () => activate('repo'));
  chatTab.addEventListener('click', () => activate('chat'));
  settingsTab.addEventListener('click', () => activate('settings'));
}

function setupChatAndSettings() {
  const render = () => { const box = document.getElementById('chat-messages'); if (box) { box.innerHTML = chatMessages.map((m) => `<p><strong>${m.user}:</strong> ${m.text}</p>`).join(''); box.scrollTop = box.scrollHeight; } };
  const send = document.getElementById('chat-send'); const input = document.getElementById('chat-input');
  if (send && input) { send.addEventListener('click', () => { const text = input.value.trim(); if (!text) {return;} const user = localStorage.getItem('chat_username') || 'You'; chatMessages.push({ user, text }); localStorage.setItem('chat_messages', JSON.stringify(chatMessages)); input.value = ''; render(); }); }
  const saved = JSON.parse(localStorage.getItem('chat_messages') || '[]'); if (Array.isArray(saved)) { chatMessages.push(...saved); render(); }
  const username = document.getElementById('chat-username'); const save = document.getElementById('settings-save'); const status = document.getElementById('settings-status');
  if (username) { username.value = localStorage.getItem('chat_username') || ''; }
  if (save && username && status) { save.addEventListener('click', () => { localStorage.setItem('chat_username', username.value.trim() || 'You'); status.textContent = 'Config saved.'; }); }
  document.getElementById('settings-export')?.addEventListener('click', () => { const blob = new Blob([JSON.stringify({ username: localStorage.getItem('chat_username') || 'You', messages: chatMessages }, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'daxini-chat-settings.json'; link.click(); URL.revokeObjectURL(link.href); });
  document.getElementById('settings-clear')?.addEventListener('click', () => { chatMessages.length = 0; localStorage.removeItem('chat_messages'); render(); if (status) {status.textContent = 'Chat cleared.';} });
}

function setupMobileInteractions() {
  const drawerToggle = document.getElementById('mobile-drawer-toggle');
  if (drawerToggle) {
    drawerToggle.addEventListener('click', () => {
      document.body.classList.toggle('drawer-open');
    });
  }

  const quickInput = document.getElementById('mobile-quick-input');
  const quickRun = document.getElementById('mobile-run-task');
  if (quickInput && quickRun) {
    quickRun.addEventListener('click', () => {
      const mainInput = document.getElementById('main-prompt');
      if (!mainInput) {return;}
      mainInput.value = quickInput.value;
      runTask();
    });
  }
}

function setupStatusAndCapabilityRefresh() {
  const repoButton = document.getElementById('analyze-repo');
  if (repoButton) {
    repoButton.addEventListener('click', () => {
      setTimeout(buildCapabilityCards, 1800);
    });
  }
  window.addEventListener('online', buildStatusCards);
  window.addEventListener('offline', buildStatusCards);
}

function applyActionFromRoute() {
  const params = new URLSearchParams(window.location.search);
  const action = (params.get('action') || '').toLowerCase();
  if (!action) {return;}
  const map = {
    research: 'research',
    create: 'create',
    analyze: 'analyze',
    solve: 'solve',
    documents: 'documents'
  };
  if (action === 'zayvora') {
    window.location.href = '/zayvora';
    return;
  }
  const key = map[action];
  if (key) {setTemplateByKey(key);}
}

function initWorkspace() {
  console.log('Workspace mounted');
  document.body.classList.add('workspace-mounted');
  renderReasoningGraph();
  initLiveLog();
  addLog('[ZAYVORA] Mission control ready');
  initRepoPanel({ onLog: addLog });
  initCodeIntelligence().then(() => addLog('[CODEBASE] Intelligence ready')).catch((error) => addLog(`[CODEBASE] ${error.message}`));
  setupWorkspaceTabs();
  setupChatAndSettings();
  buildTemplates();
  buildWorkspaceLauncher();
  setupCommandPalette();
  setupMobileInteractions();
  setupStatusAndCapabilityRefresh();
  try { clearInterval(reasoningLoopTimer); let currentIndex = 0; updateReasoningPanel(reasoningStages[0], true);
    reasoningLoopTimer = setInterval(() => { currentIndex = (currentIndex + 1) % reasoningStages.length; updateReasoningPanel(reasoningStages[currentIndex], true); }, 1300);
  } catch (error) { const container = document.getElementById('reasoning-stages'); if (container) {container.textContent = 'System Ready';} }
  buildCapabilityCards();
  buildStatusCards();
  applyActionFromRoute();

  const runButton = document.getElementById('run-task');
  if (runButton) {runButton.addEventListener('click', runTask);}
}

function bootWorkspace() {
  try {
    initWorkspace();
  } catch (error) {
    console.error('[WORKSPACE] mount failed', error);
    const loading = document.getElementById('workspace-loading');
    if (loading) {loading.textContent = 'Loading Daxini Workspace... (runtime unavailable)';}
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootWorkspace);
} else {
  bootWorkspace();
}

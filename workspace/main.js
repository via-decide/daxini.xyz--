import { addLog, initLiveLog, streamLog } from './components/live-log.js';
import {
  renderReasoningGraph,
  activateNode,
  activateToolkitStep,
  clearNodes
} from './components/reasoning-graph.js';
import { runToolkitTask } from './connectors/zayvora-toolkit.js';
import { initRepoPanel } from './repo-panel.js';

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

function buildTemplates() {
  const container = document.getElementById('task-templates');
  const input = document.getElementById('main-prompt');
  if (!container || !input) return;

  container.innerHTML = '';
  templates.forEach((template) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'template-item';
    button.textContent = template.label;
    button.addEventListener('click', () => {
      input.value = template.prompt;
      input.focus();
      selectedMode = template.key === 'research' ? 'research' : 'standard';
      document.querySelectorAll('.template-item').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      addLog(`[TEMPLATE] Loaded ${template.label}`);
      if (selectedMode === 'research') addLog('[MODE] NEX Research enabled');
    });
    container.appendChild(button);
  });
}

function setProgress(message) {
  const progress = document.getElementById('task-progress');
  if (progress) progress.textContent = message;
}

function setResult(message) {
  const result = document.getElementById('result-output');
  if (result) result.textContent = message;
}

function renderMetrics(executionMs, data = {}) {
  const metrics = document.getElementById('metrics-output');
  if (!metrics) return;
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
  if (typeof result === 'string') return result;
  return JSON.stringify(result, null, 2);
}

async function runTask() {
  const input = document.getElementById('main-prompt');
  const runButton = document.getElementById('run-task');
  if (!input || !runButton) return;

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
        setProgress(`Step: ${step}`);
      },
      onLog: (message) => streamLog(message.replace(/^\[TOOLKIT\]\s*/i, ''))
    });

    addLog('[ENGINE] Task completed');
    setProgress(payload.verification?.offline ? 'Execution complete (offline cache)' : 'Execution complete');
    setResult(formatResult(payload));
    renderMetrics(performance.now() - startedAt, payload);
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
  if (!palette || !prompt) return;

  document.addEventListener('keydown', (event) => {
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const trigger = (isMac && event.metaKey && event.key.toLowerCase() === 'k')
      || (!isMac && event.ctrlKey && event.key.toLowerCase() === 'k');

    if (!trigger) return;
    event.preventDefault();
    palette.hidden = !palette.hidden;
    if (!palette.hidden) palette.querySelector('button')?.focus();
  });

  palette.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    if (!action) {
      if (target.id === 'command-palette') palette.hidden = true;
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
        if (selectedMode === 'research') addLog('[MODE] NEX Research enabled');
      }
    }
    palette.hidden = true;
  });
}

function setupWorkspaceTabs() {
  const missionTab = document.getElementById('tab-mission');
  const repoTab = document.getElementById('tab-repo');
  const missionPanel = document.getElementById('mission-panel');
  const repoPanel = document.getElementById('repo-panel');
  if (!missionTab || !repoTab || !missionPanel || !repoPanel) return;

  const activate = (key) => {
    const missionActive = key === 'mission';
    missionTab.classList.toggle('active', missionActive);
    repoTab.classList.toggle('active', !missionActive);
    missionTab.setAttribute('aria-selected', missionActive ? 'true' : 'false');
    repoTab.setAttribute('aria-selected', missionActive ? 'false' : 'true');
    missionPanel.hidden = !missionActive;
    repoPanel.hidden = missionActive;
  };

  missionTab.addEventListener('click', () => activate('mission'));
  repoTab.addEventListener('click', () => activate('repo'));
}

function initWorkspace() {
  renderReasoningGraph();
  initLiveLog();
  addLog('[ZAYVORA] Mission control ready');
  initRepoPanel({ onLog: addLog });
  setupWorkspaceTabs();
  buildTemplates();
  setupCommandPalette();

  const runButton = document.getElementById('run-task');
  if (runButton) runButton.addEventListener('click', runTask);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWorkspace);
} else {
  initWorkspace();
}

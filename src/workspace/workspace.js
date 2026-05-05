import { createActionLauncher } from '../components/workspace/ActionLauncher.js';
import { createTaskInput } from '../components/workspace/TaskInput.js';
import { createExecutionPanel } from '../components/workspace/ExecutionPanel.js';
import { createCheckoutButton } from '../components/workspace/CheckoutButton.js';
import { getTemplateByCategory, executeTemplate } from '../integrations/viaTools.js';
import { triggerInstall } from '../pwa/install.js';

const RUNTIME_FALLBACK = [
  'Planning task...',
  'Searching knowledge...',
  'Building solution...',
  'Generating output...',
  'Verifying results...'
];

const REASONING_STAGES = ['DECOMPOSE', 'RETRIEVE', 'SYNTHESIZE', 'CALCULATE', 'VERIFY', 'REVISE'];
const ZAYVORA_API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:7070'
  : 'https://zayvora.yourdomain.workers.dev';

function ensureServiceWorker() {
  if (!('serviceWorker' in navigator)) {return;}
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

async function fetchRuntimeSteps() {
  try {
    const response = await fetch('/zayvora/runtime');
    if (!response.ok) {return RUNTIME_FALLBACK;}
    const json = await response.json();
    if (Array.isArray(json.steps) && json.steps.length) {return json.steps;}
  } catch (error) {
    console.warn('Runtime endpoint unavailable:', error.message);
  }
  return RUNTIME_FALLBACK;
}

async function streamExecution({ prompt, category, executionPanel }) {
  executionPanel.clearTrace();
  REASONING_STAGES.forEach((stage) => executionPanel.appendReasoningStage(stage));

  try {
    const requestPayload = { query: prompt, prompt, category };
    console.log('[ZAYVORA] execute request', {
      endpoint: `${ZAYVORA_API}/execute`,
      method: 'POST',
      payload: requestPayload
    });

    const response = await fetch(`${ZAYVORA_API}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer UID-WORKSPACE'
      },
      body: JSON.stringify(requestPayload)
    });
    console.log('[ZAYVORA] execute response', { status: response.status, ok: response.ok });

    if (!response.ok || !response.body) {
      throw new Error(`Execution request failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {break;}
      const chunk = decoder.decode(value, { stream: true });
      const parts = chunk.split('\n\n').filter(Boolean);

      for (const entry of parts) {
        if (!entry.startsWith('data:')) {continue;}
        const payload = entry.replace(/^data:\s*/, '').trim();
        if (payload === '[DONE]') {
          executionPanel.appendStep('Task completed.');
          continue;
        }
        try {
          const parsed = JSON.parse(payload);
          if (parsed.text) {executionPanel.appendStep(parsed.text);}
          if (parsed.stage) {executionPanel.appendReasoningStage(parsed.stage, parsed.detail || '');}
        } catch {
          executionPanel.appendStep(payload);
        }
      }
    }
  } catch (error) {
    console.error('[ZAYVORA] execute error', error);
    executionPanel.appendStep('Zayvora engine offline — connect local runtime');
    executionPanel.appendStep(`Error: ${error.message}`);
  }
}

async function initWorkspace() {
  ensureServiceWorker();

  const installButton = document.getElementById('install-zayvora');
  if (installButton) {
    installButton.addEventListener('click', triggerInstall);
  }

  const root = document.getElementById('workspace-app');
  if (!root) {return;}

  root.innerHTML = '<div class="workspace-shell" id="workspace-shell"></div>';
  const shell = document.getElementById('workspace-shell');

  let selectedCategory = 'research';

  const actionLauncher = createActionLauncher({
    selected: selectedCategory,
    async onSelect(category) {
      selectedCategory = category;
      await getTemplateByCategory(category);
    }
  });

  const executionPanel = createExecutionPanel();
  executionPanel.setSteps(await fetchRuntimeSteps());

  const checkoutButton = createCheckoutButton();

  const taskInput = createTaskInput({
    async onRun(query) {
      const mapped = await executeTemplate({ category: selectedCategory, query });
      await streamExecution({
        prompt: mapped.query,
        category: mapped.category,
        executionPanel
      });
    }
  });

  shell.append(actionLauncher, executionPanel.element, checkoutButton.element, taskInput.element);
  taskInput.setValue('');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWorkspace);
} else {
  initWorkspace();
}

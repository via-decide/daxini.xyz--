import { createActionLauncher } from '../components/workspace/ActionLauncher.js';
import { createTaskInput } from '../components/workspace/TaskInput.js';
import { createExecutionPanel } from '../components/workspace/ExecutionPanel.js';
import { getTemplateByCategory, executeTemplate } from '../integrations/viaTools.js';

const RUNTIME_FALLBACK = [
  'Planning task...',
  'Searching knowledge...',
  'Building solution...',
  'Generating output...',
  'Verifying results...'
];

const REASONING_STAGES = ['DECOMPOSE', 'RETRIEVE', 'SYNTHESIZE', 'CALCULATE', 'VERIFY', 'REVISE'];

async function fetchRuntimeSteps() {
  try {
    const response = await fetch('/zayvora/runtime');
    if (!response.ok) return RUNTIME_FALLBACK;
    const json = await response.json();
    if (Array.isArray(json.steps) && json.steps.length) return json.steps;
  } catch (error) {
    console.warn('Runtime endpoint unavailable:', error.message);
  }
  return RUNTIME_FALLBACK;
}

function renderTemplatePreview(container, category, template) {
  const examples = Array.isArray(template?.examples) ? template.examples : [];
  container.innerHTML = `
    <h2>${template?.label || category}</h2>
    <ul>
      ${examples.map((item) => `<li>${item}</li>`).join('')}
    </ul>
  `;
}

async function streamExecution({ prompt, category, executionPanel }) {
  executionPanel.clearTrace();
  REASONING_STAGES.forEach((stage) => executionPanel.appendReasoningStage(stage));

  try {
    const response = await fetch('/zayvora/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer UID-WORKSPACE'
      },
      body: JSON.stringify({ prompt, category })
    });

    if (!response.ok || !response.body) {
      throw new Error(`Execution request failed (${response.status})`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const parts = chunk.split('\n\n').filter(Boolean);

      for (const entry of parts) {
        if (!entry.startsWith('data:')) continue;
        const payload = entry.replace(/^data:\s*/, '').trim();
        if (payload === '[DONE]') {
          executionPanel.appendStep('Task completed.');
          continue;
        }
        try {
          const parsed = JSON.parse(payload);
          if (parsed.text) executionPanel.appendStep(parsed.text);
          if (parsed.stage) executionPanel.appendReasoningStage(parsed.stage, parsed.detail || '');
        } catch {
          executionPanel.appendStep(payload);
        }
      }
    }
  } catch (error) {
    executionPanel.appendStep(`Error: ${error.message}`);
  }
}

async function initWorkspace() {
  const root = document.getElementById('workspace-app');
  if (!root) return;

  root.innerHTML = '<div class="workspace-shell" id="workspace-shell"></div>';
  const shell = document.getElementById('workspace-shell');

  let selectedCategory = 'research';

  const actionLauncher = createActionLauncher({
    selected: selectedCategory,
    async onSelect(category) {
      selectedCategory = category;
      const template = await getTemplateByCategory(category);
      renderTemplatePreview(previewPanel, category, template);
    }
  });

  const previewPanel = document.createElement('section');
  previewPanel.className = 'template-preview';

  const executionPanel = createExecutionPanel();
  executionPanel.setSteps(await fetchRuntimeSteps());

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

  shell.append(actionLauncher, previewPanel, executionPanel.element, taskInput.element);

  const template = await getTemplateByCategory(selectedCategory);
  renderTemplatePreview(previewPanel, selectedCategory, template);
  taskInput.setValue('Design a game mechanic for a survival game');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWorkspace);
} else {
  initWorkspace();
}

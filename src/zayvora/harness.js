const STEP_VIEW_MAP = {
  Decompose: 'reasoning',
  'Retrieve Context': 'reasoning',
  Synthesize: 'reasoning',
  Calculate: 'reasoning',
  Verify: 'reasoning',
  Execute: 'execution',
  'Toolkit Plugin': 'execution',
  'Plugin Result': 'execution',
  'Execution Task': 'execution',
  'Execution Result': 'execution',
  'Research Started': 'research',
  'Research Engine': 'research',
  'Research Results': 'research',
  'Opening Module': 'execution'
};

let debugMode = false;

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function setHarnessDebug(enabled) {
  debugMode = Boolean(enabled);
}

export function getHarnessView(step) {
  return STEP_VIEW_MAP[step] || 'execution';
}

export function logHarness(step, data, options = {}) {
  if (typeof document === 'undefined') {return;}
  const panel = document.getElementById('zayvora-harness');
  if (!panel) {return;}

  const entry = document.createElement('div');
  const view = options.view || getHarnessView(step);
  const payload = options.debug || debugMode ? data : options.summary ?? data;

  entry.className = 'harness-step';
  entry.dataset.view = view;
  entry.innerHTML = `
    <div class="timeline-dot" aria-hidden="true"></div>
    <div class="step-body">
      <div class="step-title">${escapeHtml(step)}</div>
      <pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
    </div>
  `;

  panel.prepend(entry);
  panel.scrollTop = 0;
}

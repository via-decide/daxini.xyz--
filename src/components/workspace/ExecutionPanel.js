const DEFAULT_STEPS = [
  'Planning task',
  'Searching knowledge',
  'Building solution'
];

export function createExecutionPanel() {
  const panel = document.createElement('section');
  panel.className = 'execution-panel';
  panel.innerHTML = `
    <h2>Live task logs</h2>
    <ul id="execution-steps" class="execution-steps"></ul>
    <div class="reasoning-trace">
      <h3>Reasoning trace</h3>
      <div id="reasoning-trace-content"></div>
    </div>
  `;

  const stepList = panel.querySelector('#execution-steps');
  const trace = panel.querySelector('#reasoning-trace-content');

  function setSteps(steps = DEFAULT_STEPS) {
    stepList.innerHTML = '';
    steps.forEach((label) => {
      const item = document.createElement('li');
      item.textContent = label;
      stepList.appendChild(item);
    });
  }

  function appendStep(label) {
    const item = document.createElement('li');
    item.textContent = label;
    stepList.appendChild(item);
  }

  function appendReasoningStage(stage, detail = '') {
    const node = document.createElement('div');
    node.className = 'trace-line';
    node.textContent = `${stage}${detail ? ` — ${detail}` : ''}`;
    trace.appendChild(node);
    trace.scrollTop = trace.scrollHeight;
  }

  setSteps();

  return {
    element: panel,
    setSteps,
    appendStep,
    appendReasoningStage,
    clearTrace() {
      trace.innerHTML = '';
    }
  };
}

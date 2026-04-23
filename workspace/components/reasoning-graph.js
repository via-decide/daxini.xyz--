const NODE_IDS = ['user', 'planning', 'knowledge', 'reasoning', 'verify', 'output'];

const TOOLKIT_NODE_MAP = {
  planning: 'planning',
  search: 'knowledge',
  reason: 'reasoning',
  verify: 'verify',
  output: 'output'
};

export function renderReasoningGraph(targetId = 'reasoning-graph') {
  const root = document.getElementById(targetId);
  if (!root) {return;}

  root.innerHTML = `
    <svg viewBox="0 0 320 220" class="reasoning-svg" role="img" aria-label="Reasoning flow graph">
      <defs>
        <marker id="arrow" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
          <polygon points="0 0, 10 4, 0 8" fill="#3b82f6"></polygon>
        </marker>
      </defs>
      <g class="edges" stroke="#2563eb" stroke-width="2" fill="none" marker-end="url(#arrow)">
        <path d="M45 35 H110"></path>
        <path d="M155 35 H220"></path>
        <path d="M255 40 V90"></path>
        <path d="M220 115 H155"></path>
        <path d="M110 115 H45"></path>
      </g>
      <g class="nodes">
        <g data-node="user" transform="translate(25,20)"><rect width="75" height="30" rx="8"></rect><text x="37" y="20">User</text></g>
        <g data-node="planning" transform="translate(115,20)"><rect width="90" height="30" rx="8"></rect><text x="45" y="20">Planning</text></g>
        <g data-node="knowledge" transform="translate(220,20)"><rect width="90" height="30" rx="8"></rect><text x="45" y="20">Knowledge</text></g>
        <g data-node="reasoning" transform="translate(220,100)"><rect width="90" height="30" rx="8"></rect><text x="45" y="20">Reasoning</text></g>
        <g data-node="verify" transform="translate(115,100)"><rect width="90" height="30" rx="8"></rect><text x="45" y="20">Verification</text></g>
        <g data-node="output" transform="translate(25,100)"><rect width="75" height="30" rx="8"></rect><text x="37" y="20">Output</text></g>
      </g>
    </svg>
  `;
}

export function activateNode(node) {
  const items = document.querySelectorAll('#reasoning-graph [data-node]');
  items.forEach((item) => item.classList.remove('node-active'));
  const active = document.querySelector(`#reasoning-graph [data-node="${node}"]`);
  if (active) {active.classList.add('node-active');}
}

export function activateToolkitStep(step) {
  const node = TOOLKIT_NODE_MAP[step];
  if (!node) {return;}
  activateNode(node);
}

export function clearNodes() {
  const items = document.querySelectorAll('#reasoning-graph [data-node]');
  items.forEach((item) => item.classList.remove('node-active'));
}

export { NODE_IDS };

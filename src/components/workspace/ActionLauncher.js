const ACTIONS = [
  { key: 'research', icon: '🧠', label: 'Research', template: 'research' },
  { key: 'creative', icon: '🎬', label: 'Create', template: 'creative' },
  { key: 'game', icon: '🧩', label: 'Game Dev', template: 'game' },
  { key: 'analysis', icon: '📊', label: 'Analyze', template: 'analysis' },
  { key: 'problem', icon: '🛠', label: 'Solve', template: 'problem' },
  { key: 'docs', icon: '📁', label: 'Documents', template: 'docs' }
];

export function createActionLauncher({ selected = 'research', onSelect }) {
  const wrapper = document.createElement('section');
  wrapper.className = 'action-launcher';
  wrapper.innerHTML = `
    <h1>Daxini Workspace</h1>
    <p class="workspace-subtitle">What do you want to do today?</p>
    <div class="action-grid" id="action-grid"></div>
  `;

  const grid = wrapper.querySelector('#action-grid');

  ACTIONS.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `action-card ${action.key === selected ? 'active' : ''}`;
    button.dataset.category = action.template;
    button.innerHTML = `<span>${action.icon}</span><span>${action.label}</span>`;

    button.addEventListener('click', () => {
      if (action.route) {
        window.location.href = action.route;
        return;
      }
      grid.querySelectorAll('.action-card').forEach((node) => node.classList.remove('active'));
      button.classList.add('active');
      onSelect(action.template, action.label);
    });

    grid.appendChild(button);
  });

  return wrapper;
}

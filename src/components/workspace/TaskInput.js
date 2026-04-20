export function createTaskInput({ onRun }) {
  const section = document.createElement('section');
  section.className = 'task-input-panel';
  section.innerHTML = `
    <label class="visually-hidden" for="zayvora-task-input">Task prompt</label>
    <input id="zayvora-task-input" type="text" placeholder="Ask Zayvora anything..." autocomplete="off" />
    <button id="zayvora-run-task" type="button">RUN TASK</button>
  `;

  const input = section.querySelector('#zayvora-task-input');
  const button = section.querySelector('#zayvora-run-task');

  async function handleSubmit() {
    const query = input.value.trim();
    if (!query) return;
    button.disabled = true;
    try {
      await onRun(query);
    } finally {
      button.disabled = false;
    }
  }

  button.addEventListener('click', handleSubmit);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleSubmit();
  });

  return {
    element: section,
    setValue(value) {
      input.value = value;
    }
  };
}

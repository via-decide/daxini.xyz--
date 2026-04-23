/**
 * Prompt Console Component
 * Handles user input and dispatching reasoning requests.
 */

export class PromptConsole {
  constructor(manager) {
    this.manager = manager;
    this.input = document.getElementById('prompt-input');
    this.btn = document.getElementById('run-btn');
    
    this.init();
  }

  init() {
    this.btn.addEventListener('click', () => this.handleRun());
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.handleRun();
      }
    });
  }

  async handleRun() {
    const prompt = this.input.value.trim();
    if (!prompt || this.manager.isProcessing) {return;}

    this.manager.startExecution(prompt);
  }

  clear() {
    this.input.value = '';
  }

  setDisabled(disabled) {
    this.input.disabled = disabled;
    this.btn.disabled = disabled;
    this.btn.textContent = disabled ? 'PROCCESSING...' : 'RUN EXECUTION';
    this.btn.style.opacity = disabled ? 0.5 : 1;
  }
}

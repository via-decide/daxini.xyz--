/**
 * Execution Trace Panel
 * Real-time log of reasoning actions.
 */

export class ExecutionTrace {
  constructor() {
    this.container = document.getElementById('trace-log');
    this.clearBtn = document.getElementById('clear-trace');
    this.init();
  }

  init() {
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  addEntry(tag, message) {
    const entry = document.createElement('div');
    entry.className = 'trace-entry';
    
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;

    entry.innerHTML = `
      <span class="trace-time">[${timeStr}]</span>
      <span class="trace-tag">[${tag}]</span>
      <span class="trace-message">${message}</span>
    `;
    
    this.container.appendChild(entry);
    
    // Auto scroll to bottom
    const parent = this.container.parentElement;
    parent.scrollTop = parent.scrollHeight;
  }

  clear() {
    this.container.innerHTML = '';
  }
}

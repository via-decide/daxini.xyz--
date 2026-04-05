/**
 * ui/panels/chat-panel.js
 * 
 * Zayvora Brain Interface — Management of Agent Conversation
 * 
 * Logic:
 * - listens for user input (/repo, /code, /image, /pr, /run)
 * - displays status, reasoning logs, and tool execution progress
 */

import { ZayvoraState } from '../state/zayvora-state.js';

export class ChatPanel {
  constructor(mountEl) {
    this.mountEl = mountEl;
    this.init();
  }

  init() {
    this.render();
    this.setupListeners();
  }

  render() {
    this.mountEl.innerHTML = `
      <div class="chat-header">BRAIN_INTERFACE</div>
      <div class="chat-log" id="chat-log"></div>
      <div class="chat-input-container">
        <textarea id="chat-prompt" placeholder="Ask Zayvora... (/repo, /code, /image)"></textarea>
        <button id="chat-send">SEND</button>
      </div>
    `;
  }

  setupListeners() {
    const prompt = this.mountEl.querySelector('#chat-prompt');
    const sendBtn = this.mountEl.querySelector('#chat-send');

    sendBtn.onclick = () => this.handlePrompt(prompt.value);
    prompt.onkeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') this.handlePrompt(prompt.value);
    };
  }

  handlePrompt(text) {
    if (!text.trim()) return;
    console.log(`[Zayvora-Chat] Executing task: ${text}`);
    this.addLog(`USER: ${text}`, 'user');
    ZayvoraState.setAgentStatus('thinking');

    // Logic to communicate with backends would go here
    this.addLog(`Zayvora: Executing ${text.startsWith('/') ? 'command' : 'reasoning'}...`, 'agent');
  }

  addLog(msg, type) {
    const log = this.mountEl.querySelector('#chat-log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerText = msg;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }
}

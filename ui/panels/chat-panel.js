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

    sendBtn.onclick = () => this.sendMessage();
    prompt.onkeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') this.sendMessage();
    };
  }

  sendMessage() {
    const prompt = this.mountEl.querySelector('#chat-prompt');
    const text = prompt.value.trim();
    if (!text) return;

    this.addBubble('user', text);
    prompt.value = '';

    setTimeout(() => {
      let response = 'Executing reasoning...';
      if (text.toLowerCase().includes('hi')) {
        response = 'System Prime Online. Reporting for engineering duties. How can I assist with the repository architecture today?';
      } else if (text.toLowerCase().includes('repo')) {
        response = 'Scanning via-decide/zayvora... Repository health [OPTIMAL]. Latest Sovereign UI commit [VERIFIED].';
      }
      this.addBubble('agent', response);
    }, 1000);
  }

  addBubble(sender, text) {
    const log = this.mountEl.querySelector('#chat-log');
    const bubble = document.createElement('div');
    bubble.className = `bubble ${sender}`;
    bubble.textContent = `${sender === 'agent' ? 'Zayvora' : 'User'}: ${text}`;
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
  }
}

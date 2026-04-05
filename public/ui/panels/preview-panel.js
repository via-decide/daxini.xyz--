/**
 * ui/panels/preview-panel.js
 * 
 * Zayvora Visual Output Engine — Live Rendering
 * 
 * Logic:
 * - listens for previewUpdate
 * - manages refresh, zoom, fullscreen
 * - supports html, image, code views
 */

import { ZayvoraState } from '../state/zayvora-state.js';

export class PreviewPanel {
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
      <div class="panel-header">LIVE_PREVIEW</div>
      <div class="preview-actions">
        <button id="refresh">REFRESH</button>
        <button id="fullscreen">FULLSCREEN</button>
      </div>
      <div class="preview-viewport" id="preview-viewport">
        <iframe id="preview-frame" sandbox="allow-scripts allow-same-origin"></iframe>
        <canvas id="preview-canvas" style="display: none;"></canvas>
      </div>
    `;
  }

  setupListeners() {
    ZayvoraState.on('previewUpdate', (data) => this.handleUpdate(data));
    this.mountEl.querySelector('#refresh').onclick = () => this.refresh();
  }

  handleUpdate({ type, content, urlPath }) {
    console.log(`[Zayv_Preview] Rendering ${type}`);
    const frame = this.mountEl.querySelector('#preview-frame');
    const canvas = this.mountEl.querySelector('#preview-canvas');

    if (type === 'html') {
      frame.style.display = 'block';
      canvas.style.display = 'none';
      if (urlPath) frame.src = urlPath;
      else if (content) frame.srcdoc = content;
    } else if (type === 'image') {
      frame.style.display = 'none';
      canvas.style.display = 'block';
      // Implement canvas rendering or img src update
    }
  }

  refresh() {
    const frame = this.mountEl.querySelector('#preview-frame');
    if (frame.src) frame.src = frame.src;
  }
}

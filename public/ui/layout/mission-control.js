/**
 * ui/layout/mission-control.js
 * 
 * Zayvora Mission Control Layout Controller — 3-Panel Desktop Orchestration
 * 
 * Responsibilities:
 * - Initialize Chat, Preview, and Workspace panels
 * - Handle drag-resizing between components
 * - Persist layout preferences
 */

import { ChatPanel } from '../panels/chat-panel.js';
import { PreviewPanel } from '../panels/preview-panel.js';
import { WorkspacePanel } from '../panels/workspace-panel.js';

class MissionControl {
  constructor() {
    this.init();
  }

  init() {
    console.log('[Zayvora-Mission-Control] Initializing Interface...');
    this.mountPanels();
    this.setupResizing();
  }

  mountPanels() {
    const chatEl = document.getElementById('chat-panel-mount');
    const previewEl = document.getElementById('preview-panel-mount');
    const workspaceEl = document.getElementById('workspace-panel-mount');

    this.chatAgent = new ChatPanel(chatEl);
    this.previewEngine = new PreviewPanel(previewEl);
    this.workspaceEngine = new WorkspacePanel(workspaceEl);
  }

  setupResizing() {
    const workspace = document.getElementById('mission-control-workspace');
    const handles = document.querySelectorAll('.panel-resizer');

    handles.forEach(handle => {
      let dragging = false;
      handle.onpointerdown = (e) => {
        dragging = true;
        handle.setPointerCapture(e.pointerId);
      };
      
      window.addEventListener('pointerup', () => { dragging = false; });
      window.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const rect = workspace.getBoundingClientRect();
        if (handle.id === 'resizer-left') {
           const left = e.clientX - rect.left;
           workspace.style.gridTemplateColumns = `${left}px 8px 1fr 8px 300px`;
        } else if (handle.id === 'resizer-right') {
           const right = rect.right - e.clientX;
           workspace.style.gridTemplateColumns = `300px 8px 1fr 8px ${right}px`;
        }
      });
    });
  }
}

export const missionControl = new MissionControl();

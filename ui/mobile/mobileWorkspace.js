/**
 * ui/mobile/mobileWorkspace.js
 *
 * Mobile workspace container for Zayvora.
 * Shows one panel at a time with swipe and tab navigation.
 *
 * Structure:
 *   mobile-container
 *    +-- chat-panel
 *    +-- preview-panel
 *    +-- workspace-panel
 *   mobile-nav-bar
 */

import { ChatPanel } from '../panels/chat-panel.js';
import { PreviewPanel } from '../panels/preview-panel.js';
import { WorkspacePanel } from '../panels/workspace-panel.js';
import { SwipeNavigation } from './swipeNavigation.js';
import { MobileNavBar } from './mobileNavBar.js';

const PANELS = ['chat', 'preview', 'workspace'];

export class MobileWorkspace {
  constructor() {
    this.activePanel = 'chat';
    this.init();
  }

  init() {
    console.log('[Zayvora-Mobile] Initializing mobile workspace...');
    this.createContainer();
    this.mountPanels();
    this.setupNavigation();
    this.showPanel('chat');
  }

  createContainer() {
    this.wrapper = document.createElement('div');
    this.wrapper.id = 'mobile-workspace';
    this.wrapper.className = 'mobile-workspace';

    this.container = document.createElement('div');
    this.container.className = 'mobile-container';

    this.chatMount = document.createElement('div');
    this.chatMount.id = 'mobile-chat-panel';
    this.chatMount.className = 'mobile-panel panel-section';

    this.previewMount = document.createElement('div');
    this.previewMount.id = 'mobile-preview-panel';
    this.previewMount.className = 'mobile-panel panel-section';

    this.workspaceMount = document.createElement('div');
    this.workspaceMount.id = 'mobile-workspace-panel';
    this.workspaceMount.className = 'mobile-panel panel-section';

    this.container.appendChild(this.chatMount);
    this.container.appendChild(this.previewMount);
    this.container.appendChild(this.workspaceMount);
    this.wrapper.appendChild(this.container);

    document.body.appendChild(this.wrapper);
  }

  mountPanels() {
    this.chatAgent = new ChatPanel(this.chatMount);
    this.previewEngine = new PreviewPanel(this.previewMount);
    this.workspaceEngine = new WorkspacePanel(this.workspaceMount);
  }

  setupNavigation() {
    this.swipe = new SwipeNavigation(this.container, (direction) => {
      const idx = PANELS.indexOf(this.activePanel);
      if (direction === 'next' && idx < PANELS.length - 1) {
        this.showPanel(PANELS[idx + 1]);
      } else if (direction === 'prev' && idx > 0) {
        this.showPanel(PANELS[idx - 1]);
      }
    });

    this.navBar = new MobileNavBar(this.wrapper, (panel) => {
      this.showPanel(panel);
    });
  }

  showPanel(panel) {
    this.activePanel = panel;

    this.chatMount.classList.toggle('mobile-panel--active', panel === 'chat');
    this.previewMount.classList.toggle('mobile-panel--active', panel === 'preview');
    this.workspaceMount.classList.toggle('mobile-panel--active', panel === 'workspace');

    if (this.navBar) {
      this.navBar.setActive(panel);
    }
  }

  destroy() {
    if (this.navBar) this.navBar.destroy();
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
  }
}

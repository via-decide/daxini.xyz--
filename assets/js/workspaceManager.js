/*
  assets/js/workspaceManager.js
  Orchestrates the Zayvora Research OS Workstation.
*/

export class WorkspaceManager {
    constructor() {
        this.panels = new Map();
        this.activeStage = null;
        this.isDeveloperMode = false;
        this.init();
    }

    init() {
        console.log('[ZAYVORA_SYSTEM] Reasoning Harness Linked.');
        this.setupObservers();
    }

    setupObservers() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                const isMobile = window.innerWidth <= 1000;
                document.body.classList.toggle('layout-stacked', isMobile);
            }, 150);
        });
    }

    registerPanel(id, component) {
        this.panels.set(id, component);
    }

    broadcast(event, data) {
        this.panels.forEach(p => {
            if (p.onEvent) p.onEvent(event, data);
        });
    }

    toggleDevMode() {
        this.isDeveloperMode = !this.isDeveloperMode;
        document.body.classList.toggle('dev-active', this.isDeveloperMode);
        this.broadcast('DEV_TOGGLE', { enabled: this.isDeveloperMode });
    }

    setStage(stageId) {
        this.activeStage = stageId;
        this.broadcast('STAGE_CHANGE', { stage: stageId });
    }
}

export const workspace = new WorkspaceManager();

/**
 * Zayvora Toolkit Hub - Mission Control Component
 * MISSION: AUTONOMOUS BUG ASSASSIN
 */

export class ToolkitHub {
    constructor() {
        this.status = 'DISCONNECTED';
        this.tools = [];
        this.mountPoint = null;
        this.pollInterval = null;
    }

    async init() {
        this._createUI();
        this.startPolling();
    }

    _createUI() {
        const hub = document.createElement('div');
        hub.id = 'zayvora-toolkit-hub';
        hub.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(10, 12, 18, 0.9);
            border: 1px solid rgba(0, 229, 255, 0.2);
            padding: 12px 20px;
            border-radius: 12px;
            backdrop-filter: blur(20px);
            color: #fff;
            font-family: monospace;
            z-index: 9999;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            gap: 15px;
            transition: all 0.3s ease;
        `;

        hub.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <div id="tk-status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #ff4500; box-shadow: 0 0 10px #ff4500;"></div>
                <span style="font-size: 10px; letter-spacing: 1px; color: rgba(255,255,255,0.5);">TOOLKIT_GRID</span>
            </div>
            <div id="tk-active-tools" style="font-size: 11px; font-weight: bold; color: #00e5ff;">SCANNING...</div>
            <div style="width: 1px; height: 15px; background: rgba(255,255,255,0.1);"></div>
            <button id="tk-run-audit" style="background: none; border: 1px solid rgba(0, 229, 255, 0.4); color: #00e5ff; font-size: 9px; padding: 4px 8px; border-radius: 4px; cursor: pointer;">AUDIT_REPO</button>
        `;

        document.body.appendChild(hub);
        this.mountPoint = hub;

        hub.querySelector('#tk-run-audit').onclick = () => this.runTool('repo-audit');
    }

    async updateStatus() {
        try {
            // Attempt to connect to local toolkit via proxy or direct
            const resp = await fetch('http://localhost:5001/runtime/status');
            const data = await resp.json();
            
            const dot = document.getElementById('tk-status-dot');
            const text = document.getElementById('tk-active-tools');
            
            if (data.status === 'running') {
                dot.style.background = '#00ff8c';
                dot.style.boxShadow = '0 0 10px #00ff8c';
                text.innerText = `${data.tools_count} TOOLS READY`;
                this.status = 'CONNECTED';
            }
        } catch (e) {
            this.status = 'DISCONNECTED';
            document.getElementById('tk-status-dot').style.background = '#ff4500';
            document.getElementById('tk-active-tools').innerText = 'OFFLINE';
        }
    }

    async runTool(name) {
        if (this.status !== 'CONNECTED') {
            alert('Toolkit Restricted: Connection Lost.');
            return;
        }
        console.log(`[TOOLKIT_HUB] Orchestrating: ${name}`);
        // Integration logic here
    }

    startPolling() {
        this.updateStatus();
        this.pollInterval = setInterval(() => this.updateStatus(), 10000);
    }
}

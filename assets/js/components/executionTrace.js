/*
  assets/js/components/executionTrace.js
*/

export class ExecutionTrace {
    constructor(mountId) {
        this.mount = document.getElementById(mountId);
        this.stepMeta = document.getElementById('trace-meta');
        this.steps = [];
    }

    add(tag, message) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.style.fontSize = '0.75rem';
        entry.style.opacity = '0.8';
        entry.innerHTML = `<span style="color:var(--tx3); font-size:0.6rem; margin-right:0.5rem;">[${new Date().toLocaleTimeString('en-GB')}]</span> <span style="color:var(--amber);">[${tag}]</span> ${message}`;
        this.mount.appendChild(entry);
        this.mount.scrollTop = this.mount.scrollHeight;
        
        this.steps.push({tag, message});
        if (this.stepMeta) this.stepMeta.textContent = `${this.steps.length} steps`;
    }

    onEvent(event, data) {
        if (event === 'STAGE_CHANGE') this.add('STAGE', `Switching to ${data.stage} logic...`);
        if (event === 'TOOL_START') this.add('TOOL', `Initializing ${data.tool} harness...`);
        if (event === 'TOOL_SUCCESS') this.add('OK', `${data.tool} returned success signal.`);
    }

    clear() {
        this.mount.innerHTML = '';
        this.steps = [];
        this.stepMeta.textContent = '0 steps';
    }
}

/*
  assets/js/components/executionTrace.js
  Real-time technical log of the reasoning steps.
*/

export class ExecutionTrace {
    constructor(mountId) {
        this.mount = document.getElementById(mountId);
        this.render();
    }

    render() {
        this.mount.innerHTML = `
            <div id="trace-log" class="trace-log">
                <div class="trace-entry system">[SYSTEM] Awaiting pulse...</div>
            </div>
        `;
        this.log = this.mount.querySelector('#trace-log');
    }

    onEvent(event, data) {
        if (event === 'stage') {
            this.add(data.stage, data.detail);
        }
        if (event === 'completed') {
            this.add('SYSTEM', 'Execution pulse finalized.', 'success');
        }
        if (event === 'error') {
            this.add('ERROR', data.error, 'failed');
        }
    }

    add(stage, detail, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `trace-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        entry.innerHTML = `
            <span class="trace-time">[${timestamp}]</span>
            <span class="trace-stage">[${stage}]</span>
            <span class="trace-detail">${detail}</span>
        `;
        
        this.log.appendChild(entry);
        this.log.scrollTop = this.log.scrollHeight;

        // Update meta counter
        const meta = document.getElementById('trace-meta');
        if (meta) {
            const count = this.log.querySelectorAll('.trace-entry').length;
            meta.innerText = `${count} steps`;
        }
    }

    clear() {
        this.log.innerHTML = '';
        const meta = document.getElementById('trace-meta');
        if (meta) {meta.innerText = `0 steps`;}
    }
}

/*
  assets/js/components/systemMetrics.js
*/

export class SystemMetrics {
    constructor(mountId) {
        this.mount = document.getElementById(mountId);
        this.data = { tokens: 0, latency: 0, steps: 0 };
        this.render();
    }

    render() {
        this.mount.innerHTML = `
            <div style="display:flex; gap:3rem; align-items:center; height:100%;">
                <div class="m-box">
                    <label style="display:block; font-size:0.5rem; color:var(--tx3); text-transform:uppercase;">Tokens</label>
                    <span style="font-family:var(--font-mono); font-size:1rem; color:var(--accent);">${this.data.tokens}</span>
                </div>
                <div class="m-box">
                    <label style="display:block; font-size:0.5rem; color:var(--tx3); text-transform:uppercase;">Latency</label>
                    <span style="font-family:var(--font-mono); font-size:1rem; color:var(--amber);">${this.data.latency}ms</span>
                </div>
                <div class="m-box">
                    <label style="display:block; font-size:0.5rem; color:var(--tx3); text-transform:uppercase;">Atomic Cycles</label>
                    <span style="font-family:var(--font-mono); font-size:1rem; color:var(--tx);">${this.data.steps}</span>
                </div>
            </div>
        `;
    }

    onEvent(event, data) {
        if (event === 'STAGE_CHANGE') {
            this.data.steps++;
            this.data.tokens += Math.floor(Math.random() * 20) + 10;
            this.render();
        }
    }
}

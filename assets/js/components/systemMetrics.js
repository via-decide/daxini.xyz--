/*
  assets/js/components/systemMetrics.js
  Inference metrics HUD for the reasoning engine.
*/

export class SystemMetrics {
    constructor(mountId) {
        this.mount = document.getElementById(mountId);
        this.render();
    }

    render() {
        this.mount.innerHTML = `
            <div class="metrics-grid">
                <div class="m-card">
                    <div class="m-label">LATENCY</div>
                    <div class="m-val" id="met-latency">0 ms</div>
                </div>
                <div class="m-card">
                    <div class="m-label">STEPS</div>
                    <div class="m-val" id="met-steps">0</div>
                </div>
                <div class="m-card">
                    <div class="m-label">RAG HITS</div>
                    <div class="m-val" id="met-hits">0</div>
                </div>
                <div class="m-card">
                    <div class="m-label">TOKENS</div>
                    <div class="m-val" id="met-tokens">0</div>
                </div>
            </div>
        `;
    }

    onEvent(event, data) {
        if (event === 'stage' && data.stage === 'RETRIEVE' && data.hits) {
            this.updateValue('met-hits', data.hits);
        }
        if (event === 'completed') {
            if (data.metrics) {
                this.updateValue('met-latency', `${data.metrics.latency} ms`);
                this.updateValue('met-steps', data.metrics.steps);
            }
        }
    }

    updateValue(id, val) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    }

    reset() {
        ['met-latency', 'met-steps', 'met-hits', 'met-tokens'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = id.includes('latency') ? '0 ms' : '0';
        });
    }
}

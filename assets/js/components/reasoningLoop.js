/*
  assets/js/components/reasoningLoop.js
  Visual status for the 6-stage Zayvora reasoning pipeline.
*/

export class ReasoningLoop {
    constructor(mountId) {
        this.mount = document.getElementById(mountId);
        this.stages = [
            'DECOMPOSE',
            'RETRIEVE',
            'SYNTHESIZE',
            'CALCULATE',
            'VERIFY',
            'REVISE'
        ];
        this.render();
    }

    render() {
        this.mount.innerHTML = `
            <div class="stages-list">
                ${this.stages.map((stage, i) => `
                    <div class="stage-node" id="sn-${stage}">
                        <span class="stage-idx">0${i + 1}</span>
                        <span class="stage-txt">${stage}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    onEvent(event, data) {
        if (event === 'stage') {
            const el = document.getElementById(`sn-${data.stage}`);
            if (!el) return;

            // Manage active state
            document.querySelectorAll('.stage-node').forEach(n => n.classList.remove('active'));
            
            if (data.status === 'active') {
                el.classList.add('active');
            } else if (data.status === 'complete') {
                el.classList.add('complete');
            } else if (data.status === 'failed') {
                el.classList.add('failed');
            }
        }
    }

    reset() {
        document.querySelectorAll('.stage-node').forEach(n => {
            n.classList.remove('active', 'complete', 'failed');
        });
    }
}

/*
  assets/js/components/reasoningLoop.js
*/

export class ReasoningLoop {
    constructor(mountId) {
        this.mount = document.getElementById(mountId);
        this.stages = [
            { id: 'DECOMPOSE', label: 'DECOMPOSE', idx: '01' },
            { id: 'RETRIEVE', label: 'RETRIEVE', idx: '02' },
            { id: 'SYNTHESIZE', label: 'SYNTHESIZE', idx: '03' },
            { id: 'CALCULATE', label: 'CALCULATE', idx: '04' },
            { id: 'VERIFY', label: 'VERIFY', idx: '05' },
            { id: 'REVISE', label: 'REVISE', idx: '06' }
        ];
        this.render();
    }

    render() {
        this.mount.innerHTML = this.stages.map(s => `
            <div class="stage-node" id="sn-${s.id}">
                <span class="stage-idx">${s.idx}</span>
                <span class="stage-txt">${s.label}</span>
            </div>
        `).join('');
    }

    onEvent(event, data) {
        if (event === 'STAGE_CHANGE') {
            document.querySelectorAll('.stage-node').forEach(n => n.classList.remove('active'));
            const activeNode = document.getElementById(`sn-${data.stage}`);
            if (activeNode) activeNode.classList.add('active');
        }
    }
}

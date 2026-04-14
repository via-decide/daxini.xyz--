/**
 * Reasoning Loop Panel
 * Visualizes the 6-stage reasoning cycle.
 */

export class ReasoningLoop {
  constructor() {
    this.container = document.getElementById('loop-container');
    this.stages = [
      'DECOMPOSE',
      'RETRIEVE',
      'SYNTHESIZE',
      'CALCULATE',
      'VERIFY',
      'REVISE'
    ];
    this.elements = {};
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    this.stages.forEach((stage, index) => {
      const el = document.createElement('div');
      el.className = 'loop-stage';
      el.innerHTML = `
        <span class="stage-num">${String(index + 1).padStart(2, '0')}</span>
        <span class="stage-label">${stage}</span>
      `;
      this.container.appendChild(el);
      this.elements[stage] = el;
    });
  }

  setActiveStage(stageName) {
    // Reset all
    Object.values(this.elements).forEach(el => el.classList.remove('active'));
    
    // Set active
    if (this.elements[stageName]) {
      this.elements[stageName].classList.add('active');
      this.elements[stageName].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  clear() {
    Object.values(this.elements).forEach(el => el.classList.remove('active'));
  }
}

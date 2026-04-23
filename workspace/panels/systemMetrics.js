/**
 * System Metrics Panel
 * Monitors performance and resource usage.
 */

export class SystemMetrics {
  constructor() {
    this.container = document.getElementById('metrics-container');
    this.metrics = [
      { id: 'tokens', label: 'Token Usage', value: '0' },
      { id: 'steps', label: 'Reasoning Steps', value: '0' },
      { id: 'latency', label: 'Execution Latency', value: '0ms' },
      { id: 'retrieval', label: 'Retrieval Time', value: '0ms' }
    ];
    this.elements = {};
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    this.metrics.forEach(m => {
      const card = document.createElement('div');
      card.className = 'metric-card';
      card.innerHTML = `
        <div class="metric-label">${m.label}</div>
        <div class="metric-value" id="metric-${m.id}">${m.value}</div>
      `;
      this.container.appendChild(card);
      this.elements[m.id] = card.querySelector(`#metric-${m.id}`);
    });
  }

  updateMetric(id, value) {
    if (this.elements[id]) {
      this.elements[id].textContent = value;
    }
  }

  updateMetrics(data) {
    if (data.tokens) {this.updateMetric('tokens', data.tokens);}
    if (data.steps) {this.updateMetric('steps', data.steps);}
    if (data.latency) {this.updateMetric('latency', data.latency + 'ms');}
    if (data.retrieval) {this.updateMetric('retrieval', data.retrieval + 'ms');}
  }

  clear() {
    this.metrics.forEach(m => this.updateMetric(m.id, m.value));
  }
}

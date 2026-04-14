/**
 * Knowledge Graph Component
 * Visualizes relationships between concepts and retrieved data.
 */

export class KnowledgeGraph {
  constructor() {
    this.canvas = document.getElementById('ws-graph-canvas');
    if (!this.canvas) return;
    
    this.ctx = this.canvas.getContext('2d');
    this.nodes = [];
    this.edges = [];
    this.colors = {
      concept: '#5b8cff',
      document: '#a78bfa',
      relationship: '#34d399'
    };

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => {
      this.resize();
      this.draw();
    });
    this.animate();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.W = rect.width;
    this.H = rect.height;
    this.canvas.width = this.W * (window.devicePixelRatio || 1);
    this.canvas.height = this.H * (window.devicePixelRatio || 1);
    this.canvas.style.width = this.W + 'px';
    this.canvas.style.height = this.H + 'px';
    this.ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
  }

  addData(nodeData, edgeData) {
    // Add new nodes if they don't exist
    nodeData.forEach(n => {
      if (!this.nodes.find(existing => existing.id === n.id)) {
        this.nodes.push({
          ...n,
          x: Math.random() * this.W,
          y: Math.random() * this.H,
          vx: 0, vy: 0,
          r: n.type === 'concept' ? 6 : 4
        });
      }
    });

    // Add new edges
    edgeData.forEach(e => {
      if (!this.edges.find(existing => existing.from === e.from && existing.to === e.to)) {
        this.edges.push(e);
      }
    });
  }

  updatePhysics() {
    // Basic force-directed layout step
    for (let i = 0; i < this.nodes.length; i++) {
      const n1 = this.nodes[i];
      // Repulsion
      for (let j = i + 1; j < this.nodes.length; j++) {
        const n2 = this.nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = 400 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        n1.vx -= fx; n1.vy -= fy;
        n2.vx += fx; n2.vy += fy;
      }
    }

    // Attraction
    this.edges.forEach(e => {
      const n1 = this.nodes.find(n => n.id === e.from);
      const n2 = this.nodes.find(n => n.id === e.to);
      if (!n1 || !n2) return;
      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist - 80) * 0.05;
      n1.vx += (dx / dist) * force;
      n1.vy += (dy / dist) * force;
      n2.vx -= (dx / dist) * force;
      n2.vy -= (dy / dist) * force;
    });

    // Apply & Friction
    this.nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      n.vx *= 0.8;
      n.vy *= 0.8;

      // Bounce
      if (n.x < 10 || n.x > this.W - 10) n.vx *= -1;
      if (n.y < 10 || n.y > this.H - 10) n.vy *= -1;
    });
  }

  draw() {
    this.ctx.clearRect(0, 0, this.W, this.H);

    // Edges
    this.ctx.strokeStyle = 'rgba(91,140,255,0.15)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.edges.forEach(e => {
      const n1 = this.nodes.find(n => n.id === e.from);
      const n2 = this.nodes.find(n => n.id === e.to);
      if (n1 && n2) {
        this.ctx.moveTo(n1.x, n1.y);
        this.ctx.lineTo(n2.x, n2.y);
      }
    });
    this.ctx.stroke();

    // Nodes
    this.nodes.forEach(n => {
      const color = this.colors[n.type] || '#5b8cff';
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
      
      this.ctx.font = '10px "JetBrains Mono"';
      this.ctx.fillStyle = 'rgba(255,255,255,0.5)';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(n.label, n.x, n.y + n.r + 12);
    });
  }

  animate() {
    this.updatePhysics();
    this.draw();
    requestAnimationFrame(() => this.animate());
  }

  clear() {
    this.nodes = [];
    this.edges = [];
  }
}

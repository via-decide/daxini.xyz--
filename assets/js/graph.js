/* ══════════════════════════════════════════════════════════
   GRAPH.JS — Canvas-based Knowledge Graph Visualization
   No external dependencies — pure canvas rendering
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  let nodes = [];
  let edges = [];
  let canvas, ctx, W, H;
  let tooltip;
  let hoveredNode = null;
  const _animFrame = null;

  const COLORS = {
    core:     '#5b8cff',
    research: '#a78bfa',
    applied:  '#34d399',
    product:  '#fbbf24'
  };

  function init() {
    canvas = document.getElementById('graph-canvas');
    tooltip = document.getElementById('graph-tooltip');
    if (!canvas) {return;}

    ctx = canvas.getContext('2d');
    resize();

    fetch('./data/articles.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        layoutNodes(data.nodes);
        edges = data.edges;
        draw();
      })
      .catch(function () {
        console.warn('Graph: could not load articles.json');
      });

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('resize', function () { resize(); draw(); });
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * (window.devicePixelRatio || 1);
    canvas.height = H * (window.devicePixelRatio || 1);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    if (nodes.length) {layoutNodes(nodes);}
  }

  function layoutNodes(rawNodes) {
    nodes = rawNodes.map(function (n, i) {
      const angle = (i / rawNodes.length) * Math.PI * 2 - Math.PI / 2;
      const isCore = n.group === 'core';
      let radius = isCore ? Math.min(W, H) * 0.2 : Math.min(W, H) * 0.35;
      radius += (Math.random() - 0.5) * 30;
      return {
        id: n.id,
        label: n.label,
        group: n.group,
        desc: n.desc,
        x: W / 2 + Math.cos(angle) * radius,
        y: H / 2 + Math.sin(angle) * radius,
        r: isCore ? 7 : 5,
        vx: 0, vy: 0
      };
    });

    // Simple force simulation (50 iterations)
    for (let iter = 0; iter < 60; iter++) {
      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 800 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }

      // Attraction along edges
      edges.forEach(function (e) {
        const a = nodeById(e.from);
        const b = nodeById(e.to);
        if (!a || !b) {return;}
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 120) * 0.01;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      });

      // Center gravity
      nodes.forEach(function (n) {
        n.vx += (W / 2 - n.x) * 0.002;
        n.vy += (H / 2 - n.y) * 0.002;
        n.x += n.vx * 0.3;
        n.y += n.vy * 0.3;
        n.vx *= 0.85;
        n.vy *= 0.85;
        // Boundary
        n.x = Math.max(40, Math.min(W - 40, n.x));
        n.y = Math.max(30, Math.min(H - 30, n.y));
      });
    }
  }

  function nodeById(id) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {return nodes[i];}
    }
    return null;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Edges
    edges.forEach(function (e) {
      const a = nodeById(e.from);
      const b = nodeById(e.to);
      if (!a || !b) {return;}

      const isHovered = hoveredNode && (hoveredNode.id === a.id || hoveredNode.id === b.id);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = isHovered ? 'rgba(91,140,255,0.35)' : 'rgba(91,140,255,0.08)';
      ctx.lineWidth = isHovered ? 1.5 : 0.7;
      ctx.stroke();
    });

    // Nodes
    nodes.forEach(function (n) {
      const color = COLORS[n.group] || '#5b8cff';
      const isHovered = hoveredNode && hoveredNode.id === n.id;
      const r = isHovered ? n.r + 3 : n.r;

      // Glow
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
      ctx.fillStyle = color.replace(')', ',0.08)').replace('rgb', 'rgba').replace('#', '');
      // Use hex to rgba
      const gc = hexToRGBA(color, isHovered ? 0.2 : 0.08);
      ctx.fillStyle = gc;
      ctx.fill();

      // Circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Label
      ctx.font = (isHovered ? '600 ' : '500 ') + '10px "JetBrains Mono", monospace';
      ctx.fillStyle = isHovered ? '#fff' : 'rgba(255,255,255,0.55)';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y + r + 14);
    });
  }

  function hexToRGBA(hex, alpha) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    hoveredNode = null;
    for (let i = 0; i < nodes.length; i++) {
      const dx = mx - nodes[i].x;
      const dy = my - nodes[i].y;
      if (dx * dx + dy * dy < 400) {
        hoveredNode = nodes[i];
        break;
      }
    }

    if (hoveredNode && tooltip) {
      tooltip.innerHTML = '<strong>' + hoveredNode.label + '</strong><br>' + hoveredNode.desc;
      tooltip.style.left = (mx + 16) + 'px';
      tooltip.style.top = (my - 10) + 'px';
      tooltip.classList.add('show');
    } else if (tooltip) {
      tooltip.classList.remove('show');
    }

    canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
    draw();
  }

  function onMouseLeave() {
    hoveredNode = null;
    if (tooltip) {tooltip.classList.remove('show');}
    draw();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

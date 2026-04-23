/* ══════════════════════════════════════════════════════════
   STACK.JS — Interactive Daxini Architecture Stack
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const LAYERS = [
    {
      id: 'interface',
      name: 'Interface',
      badge: 'L4 · UI',
      desc: 'The presentation layer. Research dashboards, decision tools, and interactive experiences that surface insights to users.',
      features: [
        'Decision Matrix with weighted scoring',
        'Interactive research briefs',
        'Knowledge graph visualization',
        'Swipe-native mobile interface'
      ]
    },
    {
      id: 'logichub',
      name: 'LogicHub',
      badge: 'L3 · REASON',
      desc: 'The reasoning orchestrator. Routes queries through decision paths, applies weighted analysis, and structures complex evaluations.',
      features: [
        'Multi-criteria decision routing',
        'Weighted trade-off analysis',
        'Scenario planning engine',
        'Structured output generation'
      ]
    },
    {
      id: 'nex',
      name: 'Nex',
      badge: 'L2 · CONTEXT',
      desc: 'Contextual memory and session awareness. Maintains state across reasoning cycles and connects disparate knowledge threads.',
      features: [
        'Session-persistent memory',
        'Cross-article concept linking',
        'Context window management',
        'Temporal awareness engine'
      ]
    },
    {
      id: 'zayvora',
      name: 'Zayvora',
      badge: 'L1 · CORE',
      desc: 'The sovereign reasoning engine. Six-stage verification loop ensuring every output is decomposed, retrieved, synthesized, calculated, verified, and revised.',
      features: [
        '6-stage reasoning loop',
        'Local-first computation',
        'Knowledge graph indexing',
        'Semantic search pipeline'
      ]
    }
  ];

  let activeIndex = 0;

  function init() {
    const visual = document.getElementById('stack-visual');
    const detail = document.getElementById('stack-detail');
    if (!visual || !detail) {return;}

    // Build stack layers
    LAYERS.forEach(function (layer, i) {
      const el = document.createElement('button');
      el.className = 'stack-layer' + (i === 0 ? ' active' : '');
      el.setAttribute('data-index', i);
      el.setAttribute('aria-label', 'Select ' + layer.name + ' layer');
      el.innerHTML =
        '<span class="stack-layer-name">' + layer.name + '</span>' +
        '<span class="stack-layer-badge">' + layer.badge + '</span>';
      el.addEventListener('click', function () { selectLayer(i); });
      visual.appendChild(el);
    });

    renderDetail(0);
  }

  function selectLayer(index) {
    if (index === activeIndex) {return;}
    activeIndex = index;

    const layers = document.querySelectorAll('.stack-layer');
    layers.forEach(function (el, i) {
      el.classList.toggle('active', i === index);
    });

    renderDetail(index);
  }

  function renderDetail(index) {
    const panel = document.getElementById('stack-detail');
    if (!panel) {return;}
    const layer = LAYERS[index];

    const featuresHTML = layer.features.map(function (f) {
      return '<div class="stack-feat"><span class="stack-feat-icon">→</span>' + f + '</div>';
    }).join('');

    panel.innerHTML =
      '<div class="stack-detail-panel">' +
        '<h3><span class="badge"><span class="badge-dot"></span>' + layer.badge + '</span> ' + layer.name + '</h3>' +
        '<p>' + layer.desc + '</p>' +
        '<div class="stack-features">' + featuresHTML + '</div>' +
      '</div>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

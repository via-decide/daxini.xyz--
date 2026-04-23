/* ══════════════════════════════════════════════════════════
   REASONING.JS — Zayvora 6-Stage Reasoning Loop Animation
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const STAGES = [
    { label: 'DECOMPOSE',  desc: 'Break query into atomic sub-problems' },
    { label: 'RETRIEVE',   desc: 'Fetch relevant knowledge from graph' },
    { label: 'SYNTHESIZE', desc: 'Merge sources into coherent thesis' },
    { label: 'CALCULATE',  desc: 'Apply weighted scoring and analysis' },
    { label: 'VERIFY',     desc: 'Cross-validate against constraints' },
    { label: 'REVISE',     desc: 'Refine output with feedback loop' }
  ];

  let activeStage = -1;
  let cycle = 0;
  let _timer = null;

  function init() {
    const ring = document.getElementById('reasoning-ring');
    if (!ring) {return;}

    STAGES.forEach(function (stage, i) {
      const node = document.createElement('div');
      node.className = 'reason-node';
      node.setAttribute('data-stage', i);
      node.innerHTML =
        '<span class="reason-index">0' + (i + 1) + '</span>' +
        '<span class="reason-label">' + stage.label + '</span>' +
        '<div class="reason-bar"></div>';
      ring.appendChild(node);
    });

    advance();
  }

  function advance() {
    activeStage = (activeStage + 1) % STAGES.length;
    if (activeStage === 0) {cycle++;}

    const nodes = document.querySelectorAll('.reason-node');
    nodes.forEach(function (n, i) {
      n.classList.toggle('active', i === activeStage);
      // Reset bar animation
      const bar = n.querySelector('.reason-bar');
      if (bar) {
        bar.style.transition = 'none';
        bar.style.width = '0';
        if (i === activeStage) {
          // Force reflow
          void bar.offsetWidth;
          bar.style.transition = 'width 1.8s linear';
          bar.style.width = '100%';
        }
      }
    });

    const cycleEl = document.getElementById('reasoning-cycle');
    const currentEl = document.getElementById('reasoning-current');
    if (cycleEl) {cycleEl.textContent = 'Cycle ' + cycle + ' · Stage ' + (activeStage + 1) + '/6';}
    if (currentEl) {currentEl.textContent = STAGES[activeStage].label;}

    _timer = setTimeout(advance, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

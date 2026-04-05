(function initImageTimeline(global) {
  const STAGES = ['scene', 'sketch', 'shapes', 'color', 'texture', 'lighting', 'final'];

  function createTimeline(container, onSelect) {
    if (!container) return { setActive: () => {} };

    const stageButtons = new Map();
    container.innerHTML = '';

    STAGES.forEach((stageName) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'timeline-stage';
      btn.textContent = stageName[0].toUpperCase() + stageName.slice(1);
      btn.addEventListener('click', () => onSelect(stageName));
      container.appendChild(btn);
      stageButtons.set(stageName, btn);
    });

    return {
      setActive(stage) {
        stageButtons.forEach((button, name) => {
          button.classList.toggle('active', name === stage);
        });
      },
      stages: STAGES.slice(),
    };
  }

  global.ZayvoraImageTimeline = {
    createTimeline,
    STAGES,
  };
})(window);

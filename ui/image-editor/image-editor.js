(function initImageEditor(global) {
  const LAYERS = ['sketch', 'shapes', 'color', 'texture', 'lighting'];

  function colorForStage(stage) {
    return {
      sketch: '#7b8fb8',
      shapes: '#9ec8ff',
      color: '#f5b971',
      texture: '#90d0a4',
      lighting: '#d7b2ff',
      final: '#ffffff',
    }[stage] || '#dfe7ff';
  }

  function drawStage(ctx, stage, index) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;

    ctx.globalAlpha = Math.min(0.2 + index * 0.15, 0.95);
    ctx.strokeStyle = colorForStage(stage);
    ctx.fillStyle = colorForStage(stage);

    if (stage === 'sketch') {
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i += 1) {
        ctx.beginPath();
        ctx.moveTo(70 + i * 70, 120);
        ctx.lineTo(140 + i * 65, height - 120);
        ctx.stroke();
      }
      return;
    }

    if (stage === 'shapes') {
      ctx.fillRect(180, 260, 260, 220);
      ctx.fillRect(520, 180, 330, 300);
      return;
    }

    if (stage === 'color') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#1f3f7a');
      grad.addColorStop(1, '#ffae6d');
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      return;
    }

    if (stage === 'texture') {
      ctx.globalAlpha = 0.2;
      for (let i = 0; i < 900; i += 1) {
        ctx.fillRect(Math.random() * width, Math.random() * height, 1.2, 1.2);
      }
      return;
    }

    if (stage === 'lighting' || stage === 'final') {
      const light = ctx.createRadialGradient(width * 0.65, height * 0.25, 40, width * 0.65, height * 0.25, width * 0.6);
      light.addColorStop(0, 'rgba(255,255,220,0.65)');
      light.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, width, height);
    }
  }

  async function saveWorkspaceAsset(project, name, content) {
    await fetch('/workspace/save-file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ project, path: `images/${name}`, content })
    });
  }

  function createImageEditor(options = {}) {
    const mount = options.mount;
    if (!mount) return null;

    const initialHtml = global.ZAYVORA_IMAGE_EDITOR_HTML || '<div id="image-editor"></div>';
    mount.innerHTML = initialHtml;

    const canvas = mount.querySelector('#imageCanvas');
    const promptEl = mount.querySelector('#imagePrompt');
    const runBtn = mount.querySelector('#runImagePipeline');
    const layerList = mount.querySelector('#layerToggles');
    const timelineEl = mount.querySelector('#generation-timeline');
    const ctx = canvas.getContext('2d');

    const state = {
      project: 'default-project',
      scene: null,
      stageAssets: {},
      activeStage: 'scene',
      layers: Object.fromEntries(LAYERS.map((layer) => [layer, true]))
    };

    const timeline = global.ZayvoraImageTimeline.createTimeline(timelineEl, (stage) => {
      state.activeStage = stage;
      timeline.setActive(stage);
      repaint();
    });

    function renderLayerControls() {
      layerList.innerHTML = '';
      LAYERS.forEach((layer) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = `${state.layers[layer] ? 'Hide' : 'Show'} ${layer}`;
        btn.addEventListener('click', () => {
          state.layers[layer] = !state.layers[layer];
          renderLayerControls();
          repaint();
        });
        li.appendChild(btn);
        layerList.appendChild(li);
      });
    }

    function repaint() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#0c1224';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const stagesInOrder = global.ZayvoraImageTimeline.STAGES;
      const maxIndex = stagesInOrder.indexOf(state.activeStage);
      stagesInOrder.forEach((stage, index) => {
        if (index < 1 || index > maxIndex) return;
        if (LAYERS.includes(stage) && !state.layers[stage]) return;
        drawStage(ctx, stage, index);
      });

      ctx.globalAlpha = 1;
      ctx.fillStyle = '#dfe7ff';
      ctx.font = '20px Inter, sans-serif';
      ctx.fillText(`Stage: ${state.activeStage}`, 24, 34);
    }

    async function runPipeline(prompt, fromStage = 'scene') {
      const payload = await fetch('/workspace/image/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          prompt,
          project: state.project,
          from_stage: fromStage,
          scene: state.scene,
          resolution: 1024,
        })
      }).then((res) => res.json());

      state.scene = payload.scene;
      state.stageAssets = payload.assets || {};

      const sceneJson = JSON.stringify(state.scene, null, 2);
      await saveWorkspaceAsset(state.project, 'scene.json', sceneJson);
      Object.entries(payload.assets || {}).forEach(async ([fileName, value]) => {
        await saveWorkspaceAsset(state.project, fileName, JSON.stringify(value));
      });

      await animateGeneration();
    }

    async function animateGeneration() {
      for (const stage of timeline.stages) {
        state.activeStage = stage;
        timeline.setActive(stage);
        repaint();
        await new Promise((resolve) => setTimeout(resolve, 260));
      }
    }

    function applyAgentCommand(command) {
      if (!command || !state.scene) return;
      const line = String(command).toLowerCase();

      if (line.startsWith('add object')) {
        const objectName = command.split(':')[1] || command.split('add object')[1];
        if (objectName) state.scene.objects.push(objectName.trim());
        runPipeline(promptEl.value || state.scene.prompt || '', 'scene');
        return;
      }

      if (line.startsWith('remove object')) {
        const objectName = (command.split(':')[1] || '').trim().toLowerCase();
        state.scene.objects = state.scene.objects.filter((obj) => obj.toLowerCase() !== objectName);
        runPipeline(promptEl.value || state.scene.prompt || '', 'scene');
        return;
      }

      if (line.startsWith('change style')) {
        state.scene.style = (command.split(':')[1] || '').trim() || state.scene.style;
        runPipeline(promptEl.value || state.scene.prompt || '', 'color');
        return;
      }

      if (line.startsWith('adjust lighting')) {
        state.scene.lighting = (command.split(':')[1] || '').trim() || state.scene.lighting;
        runPipeline(promptEl.value || state.scene.prompt || '', 'lighting');
        return;
      }

      if (line.startsWith('modify color palette')) {
        const palette = (command.split(':')[1] || '').split(',').map((item) => item.trim()).filter(Boolean);
        if (palette.length) state.scene.palette = palette;
        runPipeline(promptEl.value || state.scene.prompt || '', 'color');
      }
    }

    runBtn.addEventListener('click', () => runPipeline(promptEl.value || 'sci-fi spaceship over a planet at sunset', 'scene'));
    renderLayerControls();
    timeline.setActive('scene');
    repaint();

    return {
      setProject(project) {
        state.project = project || 'default-project';
      },
      applyAgentCommand,
      runPipeline,
      replayTimeline: animateGeneration,
    };
  }

  global.ZayvoraImageEditor = {
    createImageEditor,
  };
})(window);

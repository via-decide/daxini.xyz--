(function initWorkspaceDesktop(global) {
  'use strict';

  const workspace      = document.getElementById('workspace');
  const explorerPanel  = document.getElementById('explorer');
  const previewPanel   = document.getElementById('preview');
  const chatPanel      = document.getElementById('chat');
  const terminalPanel  = document.getElementById('terminal');
  const leftPanelMount = document.getElementById('left-panel-mount');

  if (!workspace || !explorerPanel || !previewPanel || !chatPanel || !terminalPanel) return;

  // ── Drag-resize ────────────────────────────────────────────────────────────

  function dragResize(panelA, panelB, axis) {
    const handle = document.createElement('div');
    handle.className = axis === 'x' ? 'resizer-vertical' : 'resizer-horizontal';
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', axis === 'x' ? 'vertical' : 'horizontal');

    const insertBefore = axis === 'x' ? panelB : terminalPanel;
    workspace.insertBefore(handle, insertBefore);

    let dragging = false;

    handle.addEventListener('pointerdown', (event) => {
      dragging = true;
      handle.setPointerCapture(event.pointerId);
    });

    window.addEventListener('pointerup', () => { dragging = false; });

    window.addEventListener('pointermove', (event) => {
      if (!dragging) return;

      if (axis === 'x') {
        const rect = workspace.getBoundingClientRect();
        const left  = Math.max(220, Math.min(event.clientX - rect.left, rect.width - 440));
        const right = Math.max(260, Math.min(rect.right - event.clientX, rect.width - 320));
        workspace.style.gridTemplateColumns = `${left}px 8px 1fr 8px ${right}px`;
        return;
      }

      const rect = workspace.getBoundingClientRect();
      const topHeight = Math.max(260, Math.min(event.clientY - rect.top, rect.height - 140));
      workspace.style.gridTemplateRows = `${topHeight}px 8px 180px`;
    });
  }

  dragResize(explorerPanel, previewPanel, 'x');
  dragResize(previewPanel, chatPanel, 'x');

  const projectContainer = document.getElementById('projectTree');
  const fileContainer = document.getElementById('fileTree');
  const fileHeader = document.getElementById('fileTreeHeader');
  const projectInput = document.getElementById('projectNameInput');
  const projectButton = document.getElementById('createProjectBtn');
  const statusEl = document.getElementById('projectStatus');
  const chatLog = document.getElementById('chatLog');
  const chatPrompt = document.getElementById('chatPrompt');
  const chatSend = document.getElementById('chatSend');
  const imageEditorMount = document.getElementById('imageEditorMount');

  let activeProject = 'default-project';

  fetch('../image-editor/image-editor.html')
    .then((res) => res.text())
    .then((html) => {
      global.ZAYVORA_IMAGE_EDITOR_HTML = html;
      const imageEditor = global.ZayvoraImageEditor.createImageEditor({ mount: imageEditorMount });
      imageEditor.setProject(activeProject);

      const fileTree = window.ZayvoraFileTree.createFileTree({
        container: fileContainer,
        header: fileHeader,
        loader: window.ZayvoraRepoLoader,
        onOpenFile: () => {
          // Workspace image editor owns the center panel. File opening is read-only here.
        },
      });

      const projectTree = window.ZayvoraProjectTree.createProjectTree({
        container: projectContainer,
        createInput: projectInput,
        createButton: projectButton,
        statusEl,
        loader: window.ZayvoraRepoLoader,
        onOpenProject: async (project) => {
          activeProject = project.id;
          fileTree.loadFiles(project);
          imageEditor.setProject(activeProject);
        }
      });

      const chatAgent = window.ZayvoraChatAgent.createChatAgent({
        logEl: chatLog,
        promptInput: chatPrompt,
        sendButton: chatSend,
        onActions: (_actions, payload) => {
          const prompt = payload && payload.prompt ? payload.prompt : (chatPrompt && chatPrompt.value);
          imageEditor.applyAgentCommand(prompt || '');
        }
      });

      document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          chatAgent.sendPrompt();
        }
      });

      projectTree.loadProjects();
    });
  // ── Editor + preview ───────────────────────────────────────────────────────

  const previewFrame  = document.getElementById('preview-frame');
  const editorEl      = document.getElementById('codeEditor');
  const editorStatusEl = document.getElementById('editorStatus');
  const saveFileBtn   = document.getElementById('saveFileBtn');

  const previewController = global.ZayvoraPreviewEngine.createPreviewEngine({ frame: previewFrame });

  const codeEditor = global.ZayvoraCodeEditor.createCodeEditor({
    editorMount:  editorEl,
    saveButton:   saveFileBtn,
    statusEl:     editorStatusEl,
    loader:       global.ZayvoraRepoLoader,
    previewController,
    onSaved: () => previewController.reload()
  });

  // ── Chat agent ─────────────────────────────────────────────────────────────

  const chatLog    = document.getElementById('chatLog');
  const chatPrompt = document.getElementById('chatPrompt');
  const chatSend   = document.getElementById('chatSend');

  const chatAgent = global.ZayvoraChatAgent.createChatAgent({
    logEl:       chatLog,
    promptInput: chatPrompt,
    sendButton:  chatSend,
    onActions: (actions) => {
      if (actions.some((a) => a.type === 'preview_refresh')) previewController.reload();
    }
  });

  // ── Left panel (Projects / Files / History) ────────────────────────────────

  const store = global.ZayvoraWorkspaceStore;

  const leftPanel = global.ZayvoraLeftPanel.create({
    mountEl: leftPanelMount,

    onOpenFile: async (projectId, filePath) => {
      // Open the file in the code editor
      codeEditor.openFile(projectId, filePath);
      // Record in store history
      store && store.addHistoryEntry('file_open', filePath);
    },

    onRestoreFile: async (filePath, content) => {
      // Restore file content — save to server then reload editor
      const state = store ? store.getState() : {};
      const projectId = state.activeProject
        ? (state.activeProject.id || state.activeProject)
        : null;

      if (!projectId) return;

      try {
        await fetch('/workspace/save-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project: projectId, path: filePath, content })
        });
        codeEditor.openFile(projectId, filePath);
        store && store.addHistoryEntry('restore', filePath, { data: { content } });
      } catch (err) {
        console.error('Restore failed:', err);
      }
    }
  });

  // Wire project selection → runtime start → preview update
  const origSelectProject = leftPanel.getProjectManager
    ? leftPanel.getProjectManager().loadProjects
    : null;

  // Subscribe to store project changes to start the runtime
  if (store) {
    store.subscribe(async (state) => {
      const project = state.activeProject;
      if (!project) return;
      const projectId = project.id || project;

      try {
        const runtime = await fetch('/workspace/runtime/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ project: projectId })
        }).then((r) => r.json()).catch(() => null);

        if (runtime && runtime.preview_url) {
          previewController.setSource(runtime.preview_url);
        }
      } catch { /* non-fatal */ }
    });
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      codeEditor.saveActiveFile();
    }

    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      chatAgent.sendPrompt();
    }
  });

  // ── Boot ───────────────────────────────────────────────────────────────────

  codeEditor.init();
  leftPanel.init();
})(window);

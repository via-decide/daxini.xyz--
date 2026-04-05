(function initCodeEditor(global) {
  const MONACO_LOADER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/loader.min.js';

  function inferLanguage(path) {
    const ext = String(path || '').split('.').pop().toLowerCase();
    const map = {
      js: 'javascript',
      mjs: 'javascript',
      cjs: 'javascript',
      ts: 'typescript',
      json: 'json',
      html: 'html',
      css: 'css',
      md: 'markdown',
      py: 'python',
      yml: 'yaml',
      yaml: 'yaml'
    };
    return map[ext] || 'plaintext';
  }

  function loadMonaco() {
    if (global.monaco && global.monaco.editor) {
      return Promise.resolve(global.monaco);
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-monaco-loader="true"]');
      if (existing) {
        existing.addEventListener('load', () => {
          global.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs' } });
          global.require(['vs/editor/editor.main'], () => resolve(global.monaco), reject);
        }, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = MONACO_LOADER_URL;
      script.dataset.monacoLoader = 'true';
      script.onload = () => {
        global.require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs' } });
        global.require(['vs/editor/editor.main'], () => resolve(global.monaco), reject);
      };
      script.onerror = () => reject(new Error('Failed to load Monaco editor assets.'));
      document.head.appendChild(script);
    });
  }

  function createCodeEditor(options) {
    const {
      editorMount,
      saveButton,
      statusEl,
      previewFrame,
      loader,
      previewController,
      onSaved
    } = options;

    let editor;
    let activeProject = null;
    let activeFilePath = '';

    function setStatus(message, isError) {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.dataset.state = isError ? 'error' : 'ok';
    }

    function schedulePreviewUpdate() {
      if (previewController && typeof previewController.reload === 'function') {
        previewController.reload();
      }
    }

    async function saveActiveFile() {
      if (!activeFilePath || !activeProject) {
        setStatus('Select a file before saving.', true);
        return;
      }

      try {
        await loader.saveFile({
          project: activeProject.id,
          path: activeFilePath,
          content: editor.getValue()
        });
        setStatus(`Saved ${activeFilePath}`);
        if (typeof onSaved === 'function') onSaved({ project: activeProject, path: activeFilePath });
        schedulePreviewUpdate();

      } catch (error) {
        setStatus(`Save failed: ${error.message}`, true);
      }
    }

    async function openFile(project, filePath) {
      if (!editor) return;
      activeProject = project;
      activeFilePath = filePath;

      try {
        const payload = await loader.getFile(project.id, filePath);
        const content = payload && typeof payload.content === 'string' ? payload.content : '';
        const language = inferLanguage(filePath);

        const model = global.monaco.editor.createModel(content, language);
        editor.setModel(model);
        setStatus(`Opened ${filePath}`);

      } catch (error) {
        setStatus(`Unable to open ${filePath}: ${error.message}`, true);
      }
    }

    async function init() {
      if (!editorMount || !loader) return;

      try {
        await loadMonaco();
        editor = global.monaco.editor.create(editorMount, {
          value: '// Select a file from the explorer to start editing.\n',
          language: 'javascript',
          theme: 'vs-dark',
          automaticLayout: true,
          minimap: { enabled: false },
          fontSize: 13
        });

        let previewTimer = null;
        editor.onDidChangeModelContent(() => {
          if (previewTimer) global.clearTimeout(previewTimer);
          previewTimer = global.setTimeout(schedulePreviewUpdate, 250);
        });

        setStatus('Editor ready.');
      } catch (error) {
        setStatus(error.message, true);
      }
    }

    if (saveButton) {
      saveButton.addEventListener('click', saveActiveFile);
    }

    return {
      init,
      openFile,
      saveActiveFile
    };
  }

  global.ZayvoraCodeEditor = {
    createCodeEditor
  };
})(window);

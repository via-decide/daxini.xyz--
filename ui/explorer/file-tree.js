(function initFileTree(global) {
  function normalizeFile(fileEntry) {
    if (typeof fileEntry === 'string') {
      return { path: fileEntry, type: fileEntry.endsWith('/') ? 'directory' : 'file' };
    }

    const path = fileEntry && (fileEntry.path || fileEntry.name || 'unknown');
    const type = (fileEntry && fileEntry.type) || (String(path).endsWith('/') ? 'directory' : 'file');

    return { path, type };
  }

  function createFileTree(options) {
    const { container, header, loader, onOpenFile } = options;

    let activeProject = null;

    function renderTree(files) {
      container.innerHTML = '';

      if (!files.length) {
        const empty = document.createElement('li');
        empty.className = 'explorer-empty';
        empty.textContent = 'No files to display.';
        container.appendChild(empty);
        return;
      }

      files.forEach((entry) => {
        const item = document.createElement('li');
        item.className = `file-item file-${entry.type}`;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'project-open';
        button.textContent = `${entry.type === 'directory' ? '📁' : '📄'} ${entry.path}`;

        if (entry.type === 'directory') {
          button.disabled = true;
        } else {
          button.addEventListener('click', () => {
            if (typeof onOpenFile === 'function' && activeProject) {
              onOpenFile(activeProject, entry.path);
            }
          });
        }

        item.appendChild(button);
        container.appendChild(item);
      });
    }

    async function loadFiles(project) {
      activeProject = project;
      header.textContent = project ? `Files · ${project.name}` : 'Files';
      try {
        const loaded = await loader.getFiles(project && project.id);
        const files = loaded.map(normalizeFile);
        renderTree(files);
      } catch (error) {
        renderTree([]);
        const failed = document.createElement('li');
        failed.className = 'explorer-empty';
        failed.textContent = `Unable to load files: ${error.message}`;
        container.appendChild(failed);
      }
    }

    return {
      loadFiles
    };
  }

  global.ZayvoraFileTree = {
    createFileTree
  };
})(window);

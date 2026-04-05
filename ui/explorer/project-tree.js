(function initProjectTree(global) {
  function normalizeProject(project) {
    if (typeof project === 'string') {
      return { id: project, name: project };
    }

    const id = project && (project.id || project.slug || project.name);
    const name = project && (project.name || project.id || project.slug);

    return {
      id: id || 'untitled-project',
      name: name || 'Untitled project'
    };
  }

  function createProjectTree(options) {
    const {
      container,
      createInput,
      createButton,
      statusEl,
      onOpenProject,
      loader
    } = options;

    let projects = [];

    function setStatus(message, isError) {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.dataset.state = isError ? 'error' : 'ok';
    }

    function render() {
      container.innerHTML = '';

      if (!projects.length) {
        const empty = document.createElement('li');
        empty.className = 'explorer-empty';
        empty.textContent = 'No projects found.';
        container.appendChild(empty);
        return;
      }

      projects.forEach((project) => {
        const item = document.createElement('li');
        item.className = 'project-item';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'project-open';
        button.textContent = project.name;
        button.addEventListener('click', () => {
          openProject(project);
        });

        item.appendChild(button);
        container.appendChild(item);
      });
    }

    function openProject(project) {
      onOpenProject(project);
      setStatus(`Opened project: ${project.name}`);
    }

    function addProjectFromInput() {
      const value = createInput.value.trim();
      if (!value) {
        setStatus('Project name cannot be empty.', true);
        return;
      }

      const project = normalizeProject(value);
      projects = [project, ...projects.filter((entry) => entry.id !== project.id)];
      createInput.value = '';
      render();
      setStatus(`Created project: ${project.name}`);
    }

    async function loadProjects() {
      try {
        const loaded = await loader.getProjects();
        projects = loaded.map(normalizeProject);
        render();
        setStatus(`Loaded ${projects.length} project${projects.length === 1 ? '' : 's'}.`);
      } catch (error) {
        projects = [];
        render();
        setStatus(`Unable to load projects: ${error.message}`, true);
      }
    }

    createButton.addEventListener('click', addProjectFromInput);
    createInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addProjectFromInput();
      }
    });

    return {
      loadProjects,
      openProject
    };
  }

  global.ZayvoraProjectTree = {
    createProjectTree
  };
})(window);

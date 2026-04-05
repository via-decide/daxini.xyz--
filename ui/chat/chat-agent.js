(function initWorkspaceChat(global) {
  function createChatAgent(options) {
    const { logEl, promptInput, sendButton, onActions } = options;

    function append(kind, text) {
      if (!logEl) return;
      const line = document.createElement('p');
      line.className = `chat-line chat-line--${kind}`;
      line.textContent = text;
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;
    }

    async function sendPrompt() {
      const prompt = (promptInput && promptInput.value || '').trim();
      if (!prompt) return;

      append('user', prompt);
      if (promptInput) promptInput.value = '';

      try {
        const response = await fetch('/api/agent/run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({ prompt })
        });

        const payload = await response.json().catch(() => ({}));
        const actions = payload && payload.workspace_actions ? payload.workspace_actions : [];
        append('agent', `Planned ${actions.length} workspace action(s).`);

        if (typeof onActions === 'function') {
          onActions(actions, payload);
        }
      } catch (error) {
        append('agent', `Agent request failed: ${error.message}`);
      }
    }

    if (sendButton) {
      sendButton.addEventListener('click', sendPrompt);
    }

    if (promptInput) {
      promptInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          sendPrompt();
        }
      });
    }

    return {
      sendPrompt,
      append,
    };
  }

  global.ZayvoraChatAgent = {
    createChatAgent
  };
})(window);

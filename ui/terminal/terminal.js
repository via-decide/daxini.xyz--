(function initWorkspaceTerminal() {
  const terminalLog = document.getElementById('terminalLog');
  const terminalInput = document.getElementById('terminalInput');
  const terminalRun = document.getElementById('terminalRun');

  if (!terminalLog || !terminalInput || !terminalRun) return;

  function appendLine(text, kind) {
    const line = document.createElement('p');
    line.className = `terminal-line terminal-line--${kind || 'muted'}`;
    line.textContent = text;
    terminalLog.appendChild(line);
    terminalLog.scrollTop = terminalLog.scrollHeight;
  }

  async function resolveSocketUrl() {
    try {
      const response = await fetch('/workspace/terminal', { headers: { Accept: 'application/json' } });
      const payload = await response.json();
      if (payload && payload.websocket_url) return payload.websocket_url;
    } catch (_error) {
      // fallback below
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}/workspace/terminal`;
  }

  async function connect() {
    const socketUrl = await resolveSocketUrl();
    const socket = new WebSocket(socketUrl);

    socket.addEventListener('open', () => {
      appendLine('Connected to workspace terminal.', 'system');
    });

    socket.addEventListener('close', () => {
      appendLine('Terminal disconnected. Reconnecting...', 'error');
      window.setTimeout(connect, 1500);
    });

    socket.addEventListener('message', (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        appendLine(String(event.data || ''), 'muted');
        return;
      }

      if (payload.type === 'server-log') {
        appendLine(`[server:${payload.level}] ${payload.message}`, 'server');
        return;
      }

      if (payload.type === 'build-error') {
        appendLine(String(payload.message || '').trimEnd(), 'error');
        return;
      }

      if (payload.type === 'command-start') {
        appendLine(`$ ${payload.command}`, 'command');
        return;
      }

      if (payload.type === 'command-output') {
        appendLine(String(payload.message || '').trimEnd(), 'command');
        return;
      }

      if (payload.type === 'command-end') {
        appendLine(`Exit code: ${payload.code}`, payload.code === 0 ? 'muted' : 'error');
        return;
      }

      appendLine(String(payload.message || ''), 'muted');
    });

    function submitCommand() {
      const command = terminalInput.value.trim();
      if (!command) return;
      if (socket.readyState !== WebSocket.OPEN) {
        appendLine('Socket not ready. Try again in a moment.', 'error');
        return;
      }

      socket.send(JSON.stringify({ type: 'run-command', command }));
      terminalInput.value = '';
    }

    terminalRun.onclick = submitCommand;
    terminalInput.onkeydown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitCommand();
      }
    };
  }

  connect();
})();

const LOG_TARGETS = ['live-log', 'live-log-mobile'];

export function initLiveLog() {
  LOG_TARGETS.forEach((id) => {
    const node = document.getElementById(id);
    if (node) node.innerHTML = '';
  });
}

export function addLog(message) {
  LOG_TARGETS.forEach((id) => {
    const log = document.getElementById(id);
    if (!log) return;
    const line = document.createElement('div');
    line.className = 'log-line';
    line.textContent = message;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  });
}

export function streamLog(message) {
  addLog(`[TOOLKIT] ${message}`);
}

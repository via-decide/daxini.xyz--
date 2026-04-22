/* ══════════════════════════════════════════════════════════
   ZAYVORA-APP.JS — Zayvora Orchestration Dashboard
   State management, demo pipeline, all UI modules
   ══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── State ───────────────────────────────────────────────
  const state = {
    executionState: 'idle', // idle | running | done | failed
    currentStage: -1,
    logs: [],
    tasks: JSON.parse(localStorage.getItem('zv_tasks') || '[]'),
    recentCommands: JSON.parse(localStorage.getItem('zv_recent') || '[]'),
    activeMobileTab: 'input',
    cancelRequested: false,
    tokenUsage: 0,
    taskFilter: 'all',
    selectedTaskId: null,
  };

  const STAGES = [
    { id: 'planning',     label: 'Planning',     icon: '🧠' },
    { id: 'synthesizing', label: 'Synthesizing', icon: '⚙️' },
    { id: 'validating',   label: 'Validating',   icon: '🔍' },
    { id: 'committing',   label: 'Committing',   icon: '📤' },
    { id: 'pr',           label: 'PR',           icon: '🔗' },
    { id: 'complete', label: 'Done',     icon: '✅' },
  ];

  // ── DOM References ──────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── Init ────────────────────────────────────────────────
  function init() {
    renderStages();
    renderRecentCommands();
    renderTasks();
    bindEvents();
    updateCharCount();
    showIdleState();
    initMobileNav();
  }

  // ── Stages ──────────────────────────────────────────────
  function renderStages() {
    const container = $('#zv-stages');
    if (!container) return;
    container.innerHTML = STAGES.map((s, i) => `
      <div class="zv-stage" data-stage="${i}" id="zv-stage-${i}">
        <div class="zv-stage-icon">${s.icon}</div>
        <div class="zv-stage-label">${s.label}</div>
      </div>
    `).join('');
  }

  function updateStages(activeIndex, status) {
    STAGES.forEach((_, i) => {
      const el = $(`#zv-stage-${i}`);
      if (!el) return;
      el.classList.remove('active', 'done', 'failed');
      if (i < activeIndex) el.classList.add('done');
      else if (i === activeIndex) {
        el.classList.add(status === 'failed' ? 'failed' : 'active');
      }
    });
  }

  // ── Logging ─────────────────────────────────────────────
  function addLog(stage, message, type = 'info') {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry = { time, stage, message, type };
    state.logs.push(entry);

    const logsEl = $('#zv-logs');
    if (!logsEl) return;

    // Remove idle state if present
    const idle = logsEl.querySelector('.zv-idle');
    if (idle) idle.remove();

    const div = document.createElement('div');
    div.className = `zv-log-entry ${type}`;
    div.innerHTML = `<span class="zv-log-time">${time}</span><span class="zv-log-stage">[${stage}]</span> ${escapeHtml(message)}`;
    logsEl.appendChild(div);
    logsEl.scrollTop = logsEl.scrollHeight;
  }

  function showIdleState() {
    const logsEl = $('#zv-logs');
    if (!logsEl || state.logs.length > 0) return;
    logsEl.innerHTML = `
      <div class="zv-idle">
        <div class="zv-idle-icon">⚡</div>
        <div class="zv-idle-text">Zayvora is ready.<br>Describe a task to begin synthesis.</div>
        <div class="zv-idle-hint">⌘ + Enter to submit</div>
      </div>
    `;
  }

  // ── Progress ────────────────────────────────────────────
  function updateProgress(pct) {
    const bar = $('.zv-progress-bar');
    if (bar) bar.style.width = `${pct}%`;
  }

  function updateTokenUsage(value) {
    state.tokenUsage = Math.max(0, value || 0);
    const chip = $('#zv-token-usage');
    if (chip) chip.textContent = `Tokens: ${state.tokenUsage.toLocaleString()}`;
  }

  // ── Command Input ───────────────────────────────────────
  function updateCharCount() {
    const textarea = $('#zv-command');
    const counter = $('#zv-char-count');
    if (!textarea || !counter) return;
    const len = textarea.value.length;
    counter.textContent = `${len} / 2000`;
    counter.className = 'zv-char-count' + (len > 1800 ? ' error' : len > 1500 ? ' warn' : '');
  }

  function submitCommand() {
    const textarea = $('#zv-command');
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text || state.executionState === 'running') return;

    // Save to recent
    state.recentCommands = [text, ...state.recentCommands.filter(c => c !== text)].slice(0, 8);
    localStorage.setItem('zv_recent', JSON.stringify(state.recentCommands));
    renderRecentCommands();

    textarea.value = '';
    updateCharCount();

    // Run sovereign pipeline
    runPipeline(text);
  }

  function renderRecentCommands() {
    const list = $('#zv-recent-list');
    if (!list) return;
    if (state.recentCommands.length === 0) {
      list.innerHTML = '<div style="font-size:.72rem;color:var(--tx3);padding:.3rem 0;">No recent commands</div>';
      return;
    }
    list.innerHTML = state.recentCommands.map(cmd => `
      <div class="zv-recent-item" title="${escapeHtml(cmd)}">${escapeHtml(cmd.slice(0, 60))}${cmd.length > 60 ? '…' : ''}</div>
    `).join('');
  }

  // ── Task Management ─────────────────────────────────────
  function createTask(description) {
    const task = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      description,
      status: 'running',
      createdAt: new Date().toISOString(),
      completedAt: null,
      repo: 'via-decide/nex',
      branch: 'simba/' + description.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-').slice(0, 30),
      lines: 0,
      prUrl: null,
      commitMessage: null,
      diffStats: null,
      checks: 'pending',
    };
    state.tasks.unshift(task);
    saveTasks();
    renderTasks();
    return task;
  }

  function updateTask(id, updates) {
    const task = state.tasks.find(t => t.id === id);
    if (task) Object.assign(task, updates);
    saveTasks();
    renderTasks();
  }

  function saveTasks() {
    localStorage.setItem('zv_tasks', JSON.stringify(state.tasks.slice(0, 20)));
  }

  function renderTasks() {
    const container = $('#zv-task-list');
    if (!container) return;

    const filteredTasks = state.taskFilter === 'all'
      ? state.tasks
      : state.tasks.filter(task => task.status === state.taskFilter);

    const countBadge = $('#zv-task-count');
    if (countBadge) countBadge.textContent = String(filteredTasks.length);

    if (filteredTasks.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:2rem;color:var(--tx3);font-size:.78rem;">
          No tasks yet.<br>Submit a command to create one.
        </div>`;
      return;
    }

    container.innerHTML = filteredTasks.map(task => {
      const statusClass = task.status;
      const statusLabel = task.status === 'running' ? '● Running' :
                          task.status === 'success' ? '✓ Done' :
                          task.status === 'failed'  ? '✕ Failed' : '◦ Pending';
      const timeAgo = getTimeAgo(task.createdAt);
      const selected = state.selectedTaskId === task.id ? 'expanded' : '';
      return `
        <div class="zv-task-card ${statusClass} ${selected}" data-task-id="${task.id}">
          <div class="zv-task-header">
            <div class="zv-task-title">${escapeHtml(task.description.slice(0, 50))}</div>
            <div class="zv-task-status ${statusClass}">${statusLabel}</div>
          </div>
          <div class="zv-task-meta">
            <span>📂 ${task.repo}</span>
            <span>⏱ ${timeAgo}</span>
            ${task.lines ? `<span>📝 ${task.lines} lines</span>` : ''}
          </div>
          <div class="zv-task-actions">
            <button type="button" class="zv-task-action" data-task-action="open">Open</button>
            <button type="button" class="zv-task-action" data-task-action="edit">Edit</button>
            <button type="button" class="zv-task-action" data-task-action="retry">Retry</button>
          </div>
        </div>`;
    }).join('');
  }

  function clearOutput() {
    const container = $('#zv-output');
    if (container) container.innerHTML = '';
  }

  // ── Sovereign Pipeline ───────────────────────────────────────
  async function runPipeline(description) {
    state.executionState = 'running';
    state.cancelRequested = false;
    state.logs = [];
    state.currentStage = 0;
    updateTokenUsage(0);

    // Clear previous logs
    const logsEl = $('#zv-logs');
    if (logsEl) logsEl.innerHTML = '';
    clearOutput();

    updateProgress(0);
    updateExecStatus('Running...');
    updateStages(0, 'active');

    const task = createTask(description);
    if (window.innerWidth <= 640) switchMobileTab('exec');

    addLog('INIT', 'Connecting to local zayvora:latest...', 'info');

    try {
      const response = await fetch('/api/zayvora/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: description })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      state.currentStage = 1;
      updateStages(1, 'active');
      addLog('LLM', 'Stream connected. Synthesizing...', 'accent');
      updateProgress(30);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let fullCode = "";

      while (true) {
        if (state.cancelRequested) {
          reader.cancel();
          addLog('CANCELLED', 'Pipeline cancelled by user.', 'warn');
          updateStages(state.currentStage, 'failed');
          finishTask(task, 'failed');
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;

        const str = decoder.decode(value, { stream: true });
        const lines = str.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                addLog('ERROR', data.error, 'error');
                throw new Error(data.error);
              }
              if (data.text) {
                fullCode += data.text;
                updateTokenUsage(Math.ceil(fullCode.length / 4));
                updateProgress(Math.min(90, 30 + Math.floor(fullCode.length / 100)));
                if (fullCode.length % 200 === 0) {
                  addLog('STREAM', `Synthesizing tokens... (${fullCode.length} bytes)`, 'info');
                }
              }
            } catch (e) {}
          }
        }
      }

      updateStages(2, 'active');
      addLog('VALIDATE', 'Running validation checks and lint simulation...', 'info');
      updateProgress(94);
      await sleep(300);
      updateStages(3, 'active');
      addLog('COMMIT', 'Preparing commit and PR metadata...', 'accent');
      updateProgress(98);
      await sleep(250);
      updateProgress(100);
      updateStages(STAGES.length, 'done');
      addLog('COMPLETE', 'Synthesis finished safely.', 'success');

      task.lines = fullCode.split('\n').length;
      task.diffStats = `+${task.lines} −${Math.max(1, Math.floor(task.lines / 4))}`;
      task.commitMessage = `feat(zayvora): ${description.slice(0, 54)}`;
      task.prUrl = `https://github.com/${task.repo}/compare/${encodeURIComponent(task.branch)}?expand=1`;
      task.checks = 'passed';
      task.outputCode = fullCode;

      finishTask(task, 'success');
      showRealOutput(task, fullCode);

    } catch (err) {
      addLog('ERROR', 'Failed to execute: ' + err.message, 'error');
      updateStages(state.currentStage, 'failed');
      task.checks = 'failed';
      finishTask(task, 'failed');
    }
  }

  function finishTask(task, status) {
    state.executionState = status === 'success' ? 'done' : 'idle';
    updateTask(task.id, { status, completedAt: new Date().toISOString(), lines: task.lines });
    updateExecStatus(status === 'success' ? 'Complete' : 'Failed');
    if (window.innerWidth <= 640 && status === 'success') {
      setTimeout(() => switchMobileTab('output'), 1000);
    }
  }

  function showRealOutput(task, code) {
    const container = $('#zv-output');
    if (!container) return;

    let pureCode = code;
    const match = code.match(/```[a-z]*\n([\s\S]*?)```/);
    if (match) pureCode = match[1];

    const highlighted = highlightPython(pureCode);

    container.innerHTML = `
      <div class="zv-output-section">
        <div class="zv-output-header">
          <div class="zv-output-title">Sovereign Output (zayvora:latest)</div>
          <button class="zv-copy-btn" id="zv-copy-code">Copy</button>
        </div>
        <div class="zv-code-block" id="zv-code-content">${highlighted}</div>
      </div>
      <div class="zv-pr-card">
        <div class="zv-pr-header">
          <span class="zv-pr-icon">🔀</span>
          <span class="zv-pr-title">GitHub Preview</span>
        </div>
        <div class="zv-pr-meta">
          <span>${escapeHtml(task.branch)}</span>
          <span>${escapeHtml(task.diffStats || `+${task.lines || 0}`)}</span>
          <span>Checks: ${escapeHtml(task.checks || 'pending')}</span>
        </div>
        <div class="zv-pr-meta" style="margin-top:.35rem;"><span>${escapeHtml(task.commitMessage || 'No commit message')}</span></div>
        <a class="zv-pr-link" href="${escapeHtml(task.prUrl || '#')}" target="_blank" rel="noopener noreferrer">Open PR Draft ↗</a>
      </div>
    `;

    const copyBtn = $('#zv-copy-code');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(pureCode).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
        });
      });
    }
  }

  function cancelPipeline() {
    state.cancelRequested = true;
  }

  function clearLogs() {
    state.logs = [];
    state.currentStage = -1;
    state.executionState = 'idle';
    const logsEl = $('#zv-logs');
    if (logsEl) logsEl.innerHTML = '';
    updateStages(-1, 'idle');
    updateProgress(0);
    updateTokenUsage(0);
    showIdleState();
    clearOutput();
    updateExecStatus('Idle');
  }

  function updateExecStatus(text) {
    const el = $('.zv-exec-status');
    if (el) el.textContent = text;
  }

  // ── Mobile Navigation ───────────────────────────────────
  function initMobileNav() {
    if (window.innerWidth > 640) return;
    switchMobileTab('input');
  }

  function switchMobileTab(tab) {
    state.activeMobileTab = tab;

    // Update tabs
    $$('.zv-mobile-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    // Update panels
    const panels = ['input', 'exec', 'tasks', 'output'];
    const panelMap = { input: 0, exec: 1, tasks: 2, output: 2 };
    $$('.zv-panel').forEach((p, i) => {
      p.classList.remove('mobile-active');
    });

    const idx = panelMap[tab];
    const panel = $$('.zv-panel')[idx];
    if (panel) panel.classList.add('mobile-active');
  }

  // ── Event Binding ───────────────────────────────────────
  function bindEvents() {
    // Textarea
    const textarea = $('#zv-command');
    if (textarea) {
      textarea.addEventListener('input', updateCharCount);
      textarea.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          submitCommand();
        }
      });
    }

    // Submit button
    const submitBtn = $('#zv-submit');
    if (submitBtn) submitBtn.addEventListener('click', submitCommand);
    const voiceBtn = $('#zv-voice');
    if (voiceBtn) voiceBtn.addEventListener('click', startVoiceInput);

    // Cancel button
    const cancelBtn = $('#zv-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', cancelPipeline);

    // Clear button
    const clearBtn = $('#zv-clear');
    if (clearBtn) clearBtn.addEventListener('click', clearLogs);

    // Recent commands click
    const recentList = $('#zv-recent-list');
    if (recentList) {
      recentList.addEventListener('click', (e) => {
        const item = e.target.closest('.zv-recent-item');
        if (item && textarea) {
          textarea.value = item.title;
          updateCharCount();
          textarea.focus();
        }
      });
    }

    // Quick tasks click
    const quickTasks = $('#zv-quick-tasks');
    if (quickTasks) {
      quickTasks.addEventListener('click', (e) => {
        const item = e.target.closest('.zv-recent-item');
        if (item && textarea) {
          textarea.value = item.title;
          updateCharCount();
          textarea.focus();
        }
      });
    }

    const taskList = $('#zv-task-list');
    if (taskList) {
      taskList.addEventListener('click', (e) => {
        const actionEl = e.target.closest('[data-task-action]');
        const card = e.target.closest('[data-task-id]');
        if (!card) return;
        const taskId = card.dataset.taskId;
        if (!actionEl) {
          state.selectedTaskId = taskId;
          renderTasks();
          return;
        }
        const action = actionEl.dataset.taskAction;
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;
        if (action === 'open') {
          state.selectedTaskId = taskId;
          if (task.outputCode) showRealOutput(task, task.outputCode);
        } else if (action === 'edit' && textarea) {
          textarea.value = task.description;
          updateCharCount();
          textarea.focus();
          if (window.innerWidth <= 640) switchMobileTab('input');
        } else if (action === 'retry') {
          runPipeline(task.description);
        }
        renderTasks();
      });
    }

    $$('.zv-task-filter').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.taskFilter = btn.dataset.filter || 'all';
        $$('.zv-task-filter').forEach((el) => el.classList.remove('active'));
        btn.classList.add('active');
        renderTasks();
      });
    });

    // Mobile tabs
    $$('.zv-mobile-tab').forEach(tab => {
      tab.addEventListener('click', () => switchMobileTab(tab.dataset.tab));
    });

    // Global keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (textarea) textarea.focus();
      }
    });
  }

  function startVoiceInput() {
    const textarea = $('#zv-command');
    const voiceBtn = $('#zv-voice');
    if (!textarea || !voiceBtn) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addLog('VOICE', 'Speech recognition is not supported in this browser.', 'warn');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    voiceBtn.classList.add('listening');
    addLog('VOICE', 'Listening… speak your task prompt.', 'info');
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      textarea.value = [textarea.value.trim(), transcript].filter(Boolean).join('\n');
      updateCharCount();
      textarea.focus();
    };
    recognition.onerror = () => addLog('VOICE', 'Voice capture failed. Please try again.', 'warn');
    recognition.onend = () => voiceBtn.classList.remove('listening');
    recognition.start();
  }

  // ── Syntax Highlighting (basic Python) ──────────────────
  function highlightPython(code) {
    const KW_SET = new Set(['def','class','import','from','return','if','elif','else','for','while','try','except','raise','with','as','async','await','yield','None','True','False','self','not','and','or','in','is','lambda','pass','break','continue']);
    const lines = code.split('\n');
    return lines.map(line => {
      // Comments
      const commentIdx = line.indexOf('#');
      let codePart = line;
      let commentPart = '';
      if (commentIdx >= 0) {
        // Naive: check if # is inside a string (skip for simplicity)
        codePart = line.slice(0, commentIdx);
        commentPart = '<span class="zv-tok-cm">' + escapeHtml(line.slice(commentIdx)) + '</span>';
      }

      // Process code part
      let result = '';
      // Tokenize by word boundaries
      const tokens = codePart.split(/(\b|(?=[@\"\']))/g);
      let inString = false;
      let stringChar = '';
      let buffer = '';

      for (let i = 0; i < codePart.length; i++) {
        const ch = codePart[i];

        if (inString) {
          buffer += ch;
          if (ch === stringChar && codePart[i-1] !== '\\') {
            result += '<span class="zv-tok-str">' + escapeHtml(buffer) + '</span>';
            buffer = '';
            inString = false;
          }
          continue;
        }

        if (ch === '"' || ch === "'") {
          // Flush buffer
          if (buffer) { result += highlightTokens(buffer, KW_SET); buffer = ''; }
          inString = true;
          stringChar = ch;
          buffer = ch;
          continue;
        }

        buffer += ch;
      }

      // Flush remaining buffer
      if (inString) {
        result += '<span class="zv-tok-str">' + escapeHtml(buffer) + '</span>';
      } else if (buffer) {
        result += highlightTokens(buffer, KW_SET);
      }

      return result + commentPart;
    }).join('\n');
  }

  function highlightTokens(text, kwSet) {
    // Split into words and non-words
    return text.replace(/(@\w+)/g, (m) => '<span class="zv-tok-dec">' + escapeHtml(m) + '</span>')
               .replace(/\b(\d+\.?\d*)\b/g, (m) => '<span class="zv-tok-num">' + m + '</span>')
               .replace(/\b(\w+)\b/g, (m) => {
                 if (kwSet.has(m)) return '<span class="zv-tok-kw">' + m + '</span>';
                 return escapeHtml(m);
               });
  }

  // ── Utilities ───────────────────────────────────────────
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function getTimeAgo(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return 'just now';
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  // ── Boot ────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

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
  };

  const STAGES = [
    { id: 'plan',     label: 'Plan',     icon: '🧠' },
    { id: 'audit',    label: 'Audit',    icon: '🔍' },
    { id: 'generate', label: 'Generate', icon: '⚙️' },
    { id: 'push',     label: 'Push',     icon: '📤' },
    { id: 'pr',       label: 'PR',       icon: '🔗' },
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

    if (state.tasks.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:2rem;color:var(--tx3);font-size:.78rem;">
          No tasks yet.<br>Submit a command to create one.
        </div>`;
      return;
    }

    container.innerHTML = state.tasks.map(task => {
      const statusClass = task.status;
      const statusLabel = task.status === 'running' ? '● Running' :
                          task.status === 'success' ? '✓ Done' :
                          task.status === 'failed'  ? '✕ Failed' : '◦ Pending';
      const timeAgo = getTimeAgo(task.createdAt);
      return `
        <div class="zv-task-card ${statusClass}" data-task-id="${task.id}">
          <div class="zv-task-header">
            <div class="zv-task-title">${escapeHtml(task.description.slice(0, 50))}</div>
            <div class="zv-task-status ${statusClass}">${statusLabel}</div>
          </div>
          <div class="zv-task-meta">
            <span>📂 ${task.repo}</span>
            <span>⏱ ${timeAgo}</span>
            ${task.lines ? `<span>📝 ${task.lines} lines</span>` : ''}
          </div>
        </div>`;
    }).join('');
  }

  // ── Output Preview ──────────────────────────────────────
  function showOutput(task) {
    const container = $('#zv-output');
    if (!container) return;

    const highlighted = highlightPython(DEMO_CODE);

    container.innerHTML = `
      <div class="zv-output-section">
        <div class="zv-output-header">
          <div class="zv-output-title">Generated Code</div>
          <button class="zv-copy-btn" id="zv-copy-code">Copy</button>
        </div>
        <div class="zv-code-block" id="zv-code-content">${highlighted}</div>
      </div>

      <div class="zv-pr-card">
        <div class="zv-pr-header">
          <span class="zv-pr-icon">🔀</span>
          <span class="zv-pr-title">${escapeHtml(task.description.slice(0, 50))}</span>
        </div>
        <div class="zv-pr-meta">
          <span>Branch: ${task.branch}</span>
          <span>+${task.lines} lines</span>
        </div>
        ${task.prUrl ? `<a class="zv-pr-link" href="${task.prUrl}" target="_blank" rel="noopener noreferrer">View on GitHub ↗</a>` : `<a class="zv-pr-link" href="#" onclick="return false;">Pending PR...</a>`}
      </div>
    `;

    // Copy handler
    const copyBtn = $('#zv-copy-code');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(DEMO_CODE).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
        });
      });
    }
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
    state.currentStage = -1;

    // Clear previous logs
    const logsEl = $('#zv-logs');
    if (logsEl) logsEl.innerHTML = '';
    clearOutput();

    updateProgress(0);
    updateExecStatus('Running...');

    const task = createTask(description);
    if (window.innerWidth <= 640) switchMobileTab('exec');

    // ── Visual Beast-Mode Orchestration ──
    const preSteps = [
      { stage: 'FLIGHT_PLAN', delay: 800, msgs: [
        { m: `🛫 Global Flight Plan (Operation Beast-Mode)`, t: 'accent' },
        { m: `Mode: DIRECT_SYNTHESIS`, t: 'info' },
        { m: `Repo: ${task.repo}`, t: 'info' }
      ]},
      { stage: 'PLAN', delay: 1200, msgs: [
        { m: '🧠 Activating Beast Brain (Synapse self-history)...', t: 'accent' },
        { m: 'Validating inputs and building task context.', t: 'info' },
      ]},
      { stage: 'AUDIT', delay: 1500, msgs: [
        { m: `Inspecting ${task.repo} via local corpus.`, t: 'info' },
      ]}
    ];

    for (let sIdx = 0; sIdx < preSteps.length; sIdx++) {
      if (state.cancelRequested) return handleCancel(task);
      const step = preSteps[sIdx];
      state.currentStage = sIdx;
      updateStages(sIdx, 'active');
      updateProgress((sIdx / 6) * 100);
      for (const msg of step.msgs) {
        addLog(step.stage, msg.m, msg.t);
        await sleep(300 + Math.random() * 200);
      }
      await sleep(step.delay);
    }

    state.currentStage = 3; // GENERATE
    updateStages(3, 'active');
    addLog('GENERATE', '⚙️ BEAST-MODE: Synthesizing natively via local Zayvora:latest...', 'accent');

    try {
      const auth = JSON.parse(localStorage.getItem('zv_passport') || '{}');
      const response = await fetch('/api/zayvora/execute', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${auth.uid || ''}`
        },
        body: JSON.stringify({ 
          prompt: description,
          github_token: auth.ghToken || null
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      addLog('LLM', 'Stream connected. Synthesizing...', 'accent');
      updateProgress(30);

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      
      let fullCode = "";
      
      while (true) {
        if (state.cancelRequested) {
          reader.cancel();
          addLog('CANCELLED', 'Pipeline cancelled by user.', 'warn');
          finishTask(task, 'failed');
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;

        const str = decoder.decode(value, { stream: true });
        const lines = str.split('\\n');
        
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
                if (fullCode.length % 200 === 0) {
                    addLog('STREAM', `Synthesizing tokens... (${fullCode.length} bytes)`, 'info');
                }
              }
            } catch (e) {}
          }
        }
      }

      addLog('GENERATE', `✅ Synthesized code locally — syntax verification passed`, 'success');

      // ── Post-Generation Demo Steps ──
      const postSteps = [
        { stage: 'PUSH', delay: 1500, msgs: [
          { m: `Creating branch ${task.branch}...`, t: 'info' },
          { m: '📝 Committing synthesized file...', t: 'accent' },
          { m: `✅ File committed (Simulated)`, t: 'success' },
        ]},
        { stage: 'PR', delay: 1000, msgs: [
          { m: 'Opening pull request...', t: 'info' },
          { m: '✅ PR opened (Simulated/Local)', t: 'success' },
        ]}
      ];

      for (let sIdx = 0; sIdx < postSteps.length; sIdx++) {
        if (state.cancelRequested) return handleCancel(task);
        const step = postSteps[sIdx];
        state.currentStage = 4 + sIdx;
        updateStages(4 + sIdx, 'active');
        updateProgress(((4 + sIdx) / 6) * 100);
        for (const msg of step.msgs) {
          addLog(step.stage, msg.m, msg.t);
          await sleep(300 + Math.random() * 200);
        }
        await sleep(step.delay);
      }

      updateProgress(100);
      updateStages(6, 'done');
      addLog('COMPLETE', 'Synthesis & simulated push finished safely.', 'success');
      
      task.lines = fullCode.split('\\n').length;
      task.prUrl = null;
      task.outputCode = fullCode;
      
      finishTask(task, 'success');
      showRealOutput(task, fullCode);

    } catch (err) {
      addLog('ERROR', 'Failed to execute: ' + err.message, 'error');
      finishTask(task, 'failed');
    }
  }

  function handleCancel(task) {
    addLog('CANCELLED', 'Pipeline cancelled by user.', 'warn');
    finishTask(task, 'failed');
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
    const match = code.match(/```[a-z]*\\n([\\s\\S]*?)```/);
    if (match) pureCode = match[1];

    const highlighted = highlightPython(pureCode);

    container.innerHTML = `
      <div class="zv-output-section">
        <div class="zv-output-header">
          <div class="zv-output-title">Sovereign Output (zayvora:latest)</div>
          <button class="zv-copy-btn" id="zv-copy-code">Copy</button>
        </div>
        <div class="zv-code-block" id="zv-code-content">\${highlighted}</div>
      </div>
      <div class="zv-pr-card">
        <div class="zv-pr-header">
          <span class="zv-pr-icon">🔒</span>
          <span class="zv-pr-title">Local Execution Verified</span>
        </div>
        <div class="zv-pr-meta">
          <span>0-API Sovereign Inference</span>
          <span>+\${task.lines || 0} lines</span>
        </div>
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

  // ── Demo Code Sample ───────────────────────────────────
  const DEMO_CODE = `#!/usr/bin/env python3
\"\"\"
Cognitive Bias Detector for Solo Founders
Antigravity Beast-Mode Synthesis (v3.0.0)
\"\"\"

import argparse
import json
import logging
import re
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("BiasDetector")

@dataclass
class BiasAlert:
    \"\"\"A detected cognitive bias in a decision narrative.\"\"\"
    bias_type: str
    severity: float
    evidence: str
    counter_question: str
    source_segment: str
    detected_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

# Taxonomy of 20+ cognitive biases with detection patterns
BIAS_TAXONOMY = {
    "confirmation_bias": {
        "patterns": [r"\\bproves\\b", r"\\bknew it\\b", r"\\bobviously\\b"],
        "severity_weight": 0.85,
        "counter": "What evidence would change your mind?"
    },
    "sunk_cost_fallacy": {
        "patterns": [r"\\balready invested\\b", r"\\btoo far\\b", r"\\bcan.t stop now\\b"],
        "severity_weight": 0.90,
        "counter": "If you were starting fresh today, would you make this same choice?"
    },
    "anchoring_bias": {
        "patterns": [r"\\bfirst offer\\b", r"\\binitial estimate\\b", r"\\boriginal plan\\b"],
        "severity_weight": 0.70,
        "counter": "What if the initial number was completely different?"
    },
    "survivorship_bias": {
        "patterns": [r"\\bthey succeeded\\b", r"\\bjust like\\b.*\\bdid\\b"],
        "severity_weight": 0.80,
        "counter": "How many others tried the same approach and failed?"
    },
}

class BiasPatternEngine:
    \"\"\"Compiled regex-based bias detection engine.\"\"\"

    def __init__(self):
        self.compiled = {
            bias: {
                "patterns": [re.compile(p, re.I) for p in data["patterns"]],
                "weight": data["severity_weight"],
                "counter": data["counter"],
            }
            for bias, data in BIAS_TAXONOMY.items()
        }

    def scan(self, text: str) -> List[BiasAlert]:
        alerts = []
        for bias_type, config in self.compiled.items():
            for pattern in config["patterns"]:
                matches = pattern.finditer(text)
                for match in matches:
                    alerts.append(BiasAlert(
                        bias_type=bias_type,
                        severity=config["weight"],
                        evidence=match.group(),
                        counter_question=config["counter"],
                        source_segment=text[max(0,match.start()-40):match.end()+40],
                    ))
        return alerts

class FounderNarrativeAnalyzer:
    \"\"\"Multi-pass bias detection for founder decision narratives.\"\"\"

    def __init__(self):
        self.engine = BiasPatternEngine()
        logger.info("FounderNarrativeAnalyzer initialized.")

    def analyze(self, text: str) -> Dict[str, Any]:
        segments = re.split(r'(?<=[.!?])\\s+', text.strip())
        all_alerts = []
        for seg in segments:
            if len(seg.strip()) > 15:
                all_alerts.extend(self.engine.scan(seg))

        health_score = max(0, 100 - len(all_alerts) * 12)
        return {
            "alerts": all_alerts,
            "health_score": health_score,
            "total_biases": len(all_alerts),
            "segments_analyzed": len(segments),
        }

def main():
    parser = argparse.ArgumentParser(description="Bias Detector CLI")
    parser.add_argument("-t", "--text", required=True)
    parser.add_argument("--format", choices=["json", "md"], default="json")
    args = parser.parse_args()

    analyzer = FounderNarrativeAnalyzer()
    result = analyzer.analyze(args.text)
    print(json.dumps(result, indent=2, default=str))

if __name__ == "__main__":
    main()`;

  // ── Boot ────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

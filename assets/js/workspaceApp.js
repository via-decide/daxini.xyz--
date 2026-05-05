/*
  assets/js/workspaceApp.js
  Main entry for the Zayvora Research Workstation.
  Orchestrates the 6-stage reasoning pipeline with real-time SSE streaming.
*/

import { workspace } from './workspaceManager.js';
import { ReasoningLoop } from './components/reasoningLoop.js';
import { SystemMetrics } from './components/systemMetrics.js';
import { logHarness, setHarnessDebug } from '../../src/zayvora/harness.js';
import { emit, on } from '../../src/router/events/eventBus.js';
import { initRouterDebug } from '../../src/router/routerDebugPanel.js';

const loop = new ReasoningLoop('mount-reasoning-loop');
const hud = new SystemMetrics('mount-metrics');

const panels = [loop, hud];

const STAGE_TO_STEP = {
    DECOMPOSE: 'Decompose',
    RETRIEVE: 'Retrieve Context',
    SYNTHESIZE: 'Synthesize',
    CALCULATE: 'Calculate',
    VERIFY: 'Verify',
    REVISE: 'Execute'
};

const input = document.getElementById('main-prompt');
const submit = document.getElementById('send-prompt');
const log = document.getElementById('mount-console-log');
const devToggle = document.getElementById('dev-toggle-input');
const debugToggle = document.getElementById('debug-toggle-input');
const viewControls = document.getElementById('harness-controls');
const routerLogPanel = document.getElementById('router-log');

function appendRouterEvent(event) {
    if (!routerLogPanel) {return;}

    const line = document.createElement('div');
    line.textContent = `${event.name} :: ${JSON.stringify(event.payload)}`;
    routerLogPanel.appendChild(line);
    routerLogPanel.scrollTop = routerLogPanel.scrollHeight;
}

function initializeRouterWorkspace() {
    emit('workspace-ready', {
        timestamp: Date.now()
    });

    initRouterDebug();
    on('*', appendRouterEvent);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRouterWorkspace);
} else {
    initializeRouterWorkspace();
}

if (devToggle) {devToggle.addEventListener('change', () => workspace.toggleDevMode());}
if (debugToggle) {
    debugToggle.addEventListener('change', () => setHarnessDebug(debugToggle.checked));
}

if (viewControls) {
    viewControls.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-view]');
        if (!button) {return;}

        button.classList.toggle('active');
        const selectedViews = Array.from(viewControls.querySelectorAll('button[data-view].active')).map((el) => el.dataset.view);

        document.querySelectorAll('#zayvora-harness .harness-step').forEach((entry) => {
            entry.hidden = selectedViews.length > 0 && !selectedViews.includes(entry.dataset.view);
        });
    });
}

async function streamInference(prompt, model = 'default') {
    const token = sessionStorage.getItem('zayvora_token') || 'sovereign_guest';
    const response = await fetch('/api/zayvora/execute', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt, model })
    });
    if (!response.ok || !response.body) {throw new Error(`Upstream Error: ${response.status}`);}

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) {break;}
        buffer += decoder.decode(value, { stream: true });

        const messages = buffer.split('\n\n');
        buffer = messages.pop() || '';
        messages.forEach((msg) => {
            let event = '';
            let data = null;
            msg.split('\n').forEach((line) => {
                if (line.startsWith('event: ')) {event = line.replace('event: ', '').trim();}
                if (line.startsWith('data: ')) {
                    try { data = JSON.parse(line.replace('data: ', '').trim()); } catch (e) { console.warn('Malformed SSE data', e); }
                }
            });
            if (event && data) {handlePipelineEvent(event, data);}
        });
    }
}

async function streamWithRetry(prompt, model = 'default', retries = 2) {
    let attempt = 0;
    while (attempt <= retries) {
        try { return await streamInference(prompt, model); } catch (e) {
            if (attempt === retries) {throw e;}
            await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
            attempt += 1;
        }
    }
}

async function runReasoning() {
    const prompt = input.value.trim();
    if (!prompt) {return;}

    panels.forEach(p => {
        if (!p.reset) {return;}
        try { p.reset(); } catch (e) { console.warn('Panel reset failed', e); }
    });

    const harnessPanel = document.getElementById('zayvora-harness');
    if (harnessPanel) {harnessPanel.innerHTML = '';}

    input.value = '';
    addLog('user', prompt);
    addLog('system', 'Initializing reasoning architecture...');

    try {
        await streamWithRetry(prompt, 'default');
    } catch (e) {
        addLog('system', `ERROR: ${e.message}`);
        logHarness('Execution Result', { error: e.message }, { view: 'execution', debug: true });
        console.error('Reasoning failure', e);
    }
}

function handlePipelineEvent(event, data) {
    panels.forEach(p => {
        if (p.onEvent) {p.onEvent(event, data);}
    });

    if (event === 'stage' && data.stage) {
        const step = STAGE_TO_STEP[data.stage];
        if (step) {
            logHarness(step, data.detail || data, {
                view: step === 'Execute' ? 'execution' : 'reasoning',
                debug: false
            });
        }

        if (data.stage === 'RETRIEVE') {
            logHarness('Research Results', { hits: data.hits ?? 0, detail: data.detail }, { view: 'research' });
        }
    }

    if (event === 'token') {
        addLog('zayvora', data.token || data.text || '');
    }

    if (event === 'completed') {
        addLog('zayvora', data.answer || 'Analysis complete.');
        logHarness('Execution Result', data, { view: 'execution' });
    }

    if (event === 'research') {
        logHarness('Research Started', data.query || data, { view: 'research' });
        logHarness('Research Engine', 'NEX', { view: 'research' });
    }
}

function addLog(role, text) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${role}`;
    entry.innerHTML = `<span style="text-transform:uppercase; font-weight:bold; font-size:0.6rem; opacity:0.6;">[${role}]</span> ${text}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

if (submit) {submit.addEventListener('click', runReasoning);}
if (input) {input.addEventListener('keypress', e => (e.key === 'Enter') && runReasoning());}

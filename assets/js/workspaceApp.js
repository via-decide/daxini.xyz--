/*
  assets/js/workspaceApp.js
  Main entry for the Zayvora Research Workstation.
*/

import { workspace } from './workspaceManager.js';
import { ReasoningLoop } from './components/reasoningLoop.js';
import { ExecutionTrace } from './components/executionTrace.js';
import { KnowledgeGraph } from './components/knowledgeGraph.js';
import { SystemMetrics } from './components/systemMetrics.js';

// Initialize UI
const loop = new ReasoningLoop('mount-reasoning-loop');
const trace = new ExecutionTrace('mount-execution-trace');
const graph = new KnowledgeGraph('mount-knowledge-graph');
const hud = new SystemMetrics('mount-metrics');

// Register for Broadcasts
workspace.registerPanel('LOOP', loop);
workspace.registerPanel('TRACE', trace);
workspace.registerPanel('GRAPH', graph);
workspace.registerPanel('HUD', hud);

// DOM Elements
const input = document.getElementById('main-prompt');
const submit = document.getElementById('send-prompt');
const log = document.getElementById('mount-console-log');
const devToggle = document.getElementById('dev-toggle-input');

// Listeners
devToggle.addEventListener('change', () => workspace.toggleDevMode());

async function runReasoning() {
    const prompt = input.value.trim();
    if (!prompt) return;

    // Reset
    trace.clear();
    input.value = '';
    addLog('user', prompt);
    addLog('system', 'Initializing reasoning architecture...');

    try {
        const resp = await fetch('/api/zayvora/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });
        const data = await resp.json();

        // Playback Trace
        for (const step of data.reasoning_trace) {
            workspace.setStage(step.stage);
            await new Promise(r => setTimeout(r, 600));
            trace.add(step.stage, step.message);
        }

        // Final Result
        addLog('zayvora', data.final_answer);
        
    } catch (e) {
        addLog('system', `ERROR: ${e.message}`);
    }
}

function addLog(role, text) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${role}`;
    entry.innerHTML = `<span style="text-transform:uppercase; font-weight:bold; font-size:0.6rem; opacity:0.6;">[${role}]</span> ${text}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

submit.addEventListener('click', runReasoning);
input.addEventListener('keypress', e => (e.key === 'Enter') && runReasoning());

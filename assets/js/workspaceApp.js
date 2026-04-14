/*
  assets/js/workspaceApp.js
  Main entry for the Zayvora Research Workstation.
  Orchestrates the 6-stage reasoning pipeline with real-time SSE streaming.
*/

import { workspace } from './workspaceManager.js';
import { ReasoningLoop } from './components/reasoningLoop.js';
import { ExecutionTrace } from './components/executionTrace.js';
import { KnowledgeGraph } from './components/knowledgeGraph.js';
import { SystemMetrics } from './components/systemMetrics.js';

// Initialize UI Components
const loop = new ReasoningLoop('mount-reasoning-loop');
const trace = new ExecutionTrace('mount-execution-trace');
const graph = new KnowledgeGraph('mount-knowledge-graph');
const hud = new SystemMetrics('mount-metrics');

// Register for Broadcasts (Optional - we'll pipe directly for performance)
const panels = [loop, trace, graph, hud];

// DOM Elements
const input = document.getElementById('main-prompt');
const submit = document.getElementById('send-prompt');
const log = document.getElementById('mount-console-log');
const devToggle = document.getElementById('dev-toggle-input');

// Listeners
if (devToggle) devToggle.addEventListener('change', () => workspace.toggleDevMode());

async function runReasoning() {
    const prompt = input.value.trim();
    if (!prompt) return;

    // Reset Components
    panels.forEach(p => p.reset ? p.reset() : null);
    if (trace.clear) trace.clear();
    if (graph.clear) graph.clear();
    
    input.value = '';
    addLog('user', prompt);
    addLog('system', 'Initializing reasoning architecture...');

    try {
        const token = localStorage.getItem('zayvora_token') || 'sovereign_guest';
        
        const response = await fetch('/api/zayvora/execute', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ prompt })
        });

        if (!response.ok) {
            throw new Error(`Upstream Error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        async function readStream() {
            const { done, value } = await reader.read();
            if (done) return;

            const chunk = decoder.decode(value, { stream: true });
            const messages = chunk.split('\n\n');

            messages.forEach(msg => {
                const lines = msg.split('\n');
                let event = '';
                let data = null;

                lines.forEach(line => {
                    if (line.startsWith('event: ')) {
                        event = line.replace('event: ', '').trim();
                    } else if (line.startsWith('data: ')) {
                        try {
                            data = JSON.parse(line.replace('data: ', '').trim());
                        } catch (e) {
                            console.warn('Malformed SSE data', e);
                        }
                    }
                });

                if (event && data) {
                    handlePipelineEvent(event, data);
                }
            });

            return readStream();
        }

        await readStream();

    } catch (e) {
        addLog('system', `ERROR: ${e.message}`);
        console.error('Reasoning failure', e);
    }
}

function handlePipelineEvent(event, data) {
    // Dispatch to all panels
    panels.forEach(p => {
        if (p.onEvent) p.onEvent(event, data);
    });

    if (event === 'completed') {
        addLog('zayvora', data.answer || 'Analysis complete.');
    }
}

function addLog(role, text) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${role}`;
    entry.innerHTML = `<span style="text-transform:uppercase; font-weight:bold; font-size:0.6rem; opacity:0.6;">[${role}]</span> ${text}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
}

if (submit) submit.addEventListener('click', runReasoning);
if (input) input.addEventListener('keypress', e => (e.key === 'Enter') && runReasoning());

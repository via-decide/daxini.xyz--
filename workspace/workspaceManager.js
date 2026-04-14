/**
 * Workspace Manager
 * Orchestrates panel state, API communication, and console logic.
 */

import { PromptConsole } from './panels/promptConsole.js';
import { ReasoningLoop } from './panels/reasoningLoop.js';
import { ExecutionTrace } from './panels/executionTrace.js';
import { KnowledgeGraph } from './panels/knowledgeGraph.js';
import { SystemMetrics } from './panels/systemMetrics.js';

class WorkspaceManager {
  constructor() {
    this.isProcessing = false;
    this.devMode = localStorage.getItem('ws_dev_mode') === 'true';
    
    // Initialize Panels
    this.panels = {
      console: new PromptConsole(this),
      loop: new ReasoningLoop(),
      trace: new ExecutionTrace(),
      graph: new KnowledgeGraph(),
      metrics: new SystemMetrics()
    };

    this.init();
  }

  init() {
    // Dev Mode Toggle
    const devBtn = document.getElementById('dev-mode-toggle');
    devBtn.textContent = `DEV_MODE: ${this.devMode ? 'ON' : 'OFF'}`;
    devBtn.addEventListener('click', () => {
      this.devMode = !this.devMode;
      localStorage.setItem('ws_dev_mode', this.devMode);
      devBtn.textContent = `DEV_MODE: ${this.devMode ? 'ON' : 'OFF'}`;
      this.panels.trace.addEntry('SYSTEM', `Developer mode ${this.devMode ? 'enabled' : 'disabled'}.`);
    });

    this.panels.trace.addEntry('SYSTEM', 'Workspace initialized. Awaiting objective...');
  }

  async startExecution(prompt) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    // Clear previous state
    this.panels.console.setDisabled(true);
    this.panels.trace.addEntry('USER', prompt);
    this.panels.loop.clear();
    this.panels.metrics.clear();
    
    try {
      // Step 1: Decompose
      this.panels.loop.setActiveStage('DECOMPOSE');
      this.panels.trace.addEntry('DECOMPOSE', 'Parsing reasoning objective and identifying constraints.');
      await this.sleep(800);

      // Step 2: Retrieve
      this.panels.loop.setActiveStage('RETRIEVE');
      this.panels.trace.addEntry('RETRIEVE', 'Querying knowledge base for relevant concepts and context.');
      await this.simulateRetrieval();

      // Step 3: API Call (Real Execution)
      this.panels.trace.addEntry('SYSTEM', 'Streaming data to Zayvora execute endpoint...');
      
      const response = await fetch('/api/zayvora/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_prompt: prompt })
      });

      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);

      const data = await response.json();
      
      // Handle response data
      await this.processReasoningResponse(data);

      this.panels.trace.addEntry('SUCCESS', 'Reasoning cycle complete.');
    } catch (error) {
      console.error(error);
      this.panels.trace.addEntry('ERROR', error.message);
      this.panels.loop.clear();
    } finally {
      this.isProcessing = false;
      this.panels.console.setDisabled(false);
    }
  }

  async processReasoningResponse(data) {
    // Simulate remaining stages based on response
    const stages = ['SYNTHESIZE', 'CALCULATE', 'VERIFY', 'REVISE'];
    
    for (const stage of stages) {
      this.panels.loop.setActiveStage(stage);
      this.panels.trace.addEntry(stage, `Processing ${stage.toLowerCase()} phase...`);
      await this.sleep(1000);
    }

    // Update Trace with real log items if available
    if (data.reasoning_trace && Array.isArray(data.reasoning_trace)) {
      data.reasoning_trace.forEach(item => {
        this.panels.trace.addEntry('LOG', item);
      });
    }

    // Update Graph
    if (data.retrieved_sources) {
      const nodes = data.retrieved_sources.map(s => ({ 
        id: s.id, 
        label: s.title, 
        type: 'document' 
      }));
      const edges = nodes.map(n => ({ from: 'root', to: n.id }));
      this.panels.graph.addData([{ id: 'root', label: 'Query', type: 'concept' }, ...nodes], edges);
    }

    // Update Metrics
    this.panels.metrics.updateMetrics({
      tokens: data.usage?.total_tokens || '~1.2k',
      steps: data.reasoning_trace?.length || 12,
      latency: data.timing?.total_ms || 2400,
      retrieval: data.timing?.retrieval_ms || 450
    });

    // Final Output
    this.panels.trace.addEntry('FINAL', data.final_answer || 'Objective satisfied.');
  }

  async simulateRetrieval() {
    // Mock graph updates during retrieval
    await this.sleep(1200);
    this.panels.graph.addData([
      { id: 'c1', label: 'Sovereign AI', type: 'concept' },
      { id: 'c2', label: 'Local-first', type: 'concept' }
    ], [
      { from: 'c1', to: 'c2' }
    ]);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initial Launch
window.workspaceManager = new WorkspaceManager();

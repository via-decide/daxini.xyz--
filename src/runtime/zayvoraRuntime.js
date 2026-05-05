/**
 * src/runtime/zayvoraRuntime.js
 * 
 * THE BRIDGE — Load-bearing orchestration path.
 * Connects the Dashboard UI to the Sovereign Engine.
 */

(function() {
  'use strict';

  console.log('[Runtime] Zayvora Sovereign Bridge active.');

  /**
   * Main Execution Handler
   * Responds to 'zayvora-execute' custom events.
   */
  window.addEventListener('zayvora-execute', async (event) => {
    const { taskId, prompt, options } = event.detail;
    console.log(`[Bridge] Executing task ${taskId}...`);

    try {
      await runZayvoraPipeline(taskId, prompt, options);
    } catch (err) {
      console.error('[Bridge] Fatal execution error:', err);
      dispatchResult(taskId, { error: err.message });
    }
  });

  /**
   * Pipeline Logic
   * Phase 1: Local Plugin Fallback
   * Phase 2: Remote SSE API (Streaming)
   */
  async function runZayvoraPipeline(taskId, prompt, options = {}) {
    // 1. Check for registered local toolkit plugins (window.runToolkit)
    if (typeof window.runToolkit === 'function') {
      console.log('[Bridge] Found local toolkit plugin. Routing...');
      try {
        const result = await window.runToolkit({ prompt, ...options });
        dispatchResult(taskId, result);
        return;
      } catch (e) {
        console.warn('[Bridge] Local toolkit failed, falling back to API:', e);
      }
    }

    // 2. Fallback to /api/zayvora/execute (SSE Streaming)
    const passport = JSON.parse(sessionStorage.getItem('zv_passport') || '{}');
    const apiEndpoint = '/api/zayvora/execute';
    
    // Construct Sovereign Auth object for body propagation
    const auth = {
      hardware_id: passport.uid || 'GUEST_NODE',
      session_token: passport.jwt || 'GUEST_TOKEN',
      signature: 'signed_by_browser_bridge_v1'
    };

    console.log('[Bridge] Routing to API SSE stream with Sovereign Auth...');

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${passport.jwt || ''}`
      },
      body: JSON.stringify({ 
        auth, // Propagate full auth context
        prompt,
        github_token: passport.ghToken || null,
        model: options.model || 'zayvora:latest',
        performance_mode: options.perfMode || 'full'
      })
    });

    if (!response.ok) {
      throw new Error(`Engine returned ${response.status}: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      totalBytes += value.length;
      
      // Process SSE lines
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          
          try {
            const data = JSON.parse(dataStr);
            if (data.error) throw new Error(data.error);
            if (data.text) {
              fullText += data.text;
              // Emit PROGRESS event (C-stream)
              dispatchProgress(taskId, data.text, totalBytes);
            }
          } catch (e) {
            console.warn('[Bridge] Malformed SSE chunk:', dataStr);
          }
        }
      }
    }

    // 3. Dispatch Final Result
    dispatchResult(taskId, { text: fullText, totalBytes });
  }

  /**
   * Event Dispatchers
   */
  function dispatchProgress(taskId, chunk, totalBytes) {
    window.dispatchEvent(new CustomEvent('zayvora-progress', {
      detail: { taskId, chunk, totalBytes }
    }));
  }

  function dispatchResult(taskId, result) {
    window.dispatchEvent(new CustomEvent('zayvora-result', {
      detail: { taskId, result }
    }));
  }

})();

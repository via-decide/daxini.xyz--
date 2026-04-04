// ============================================================================
// OLLAMA UI - CHAT HANDLER
// ============================================================================
// Integrates Zayvora Engine into chat flow
// Routes prompts to Zayvora instead of Ollama when Zayvora selected

class ZayvoraChatHandler {
  constructor() {
    this.currentModel = null;
    this.zayvora = null;
    this.modelSelector = null;
  }

  async initialize(zayvora, modelSelector) {
    this.zayvora = zayvora;
    this.modelSelector = modelSelector;
  }

  // ========================================================================
  // MAIN CHAT HANDLER
  // ========================================================================

  async *handleMessage(message, modelId, chatHistory = [], options = {}) {
    // Check if Zayvora is selected
    if (modelId === 'zayvora') {
      // Check credits before sending
      const credits = await this.zayvora.checkCredits();
      if (credits && credits.available <= 0) {
        yield {
          type: 'error',
          content: 'No credits remaining. Please purchase credits to continue.',
          action: 'show-purchase-modal'
        };
        return;
      }

      // Deduct credit
      const deducted = await this.zayvora.deductCredit();
      if (!deducted) {
        yield {
          type: 'error',
          content: 'Failed to deduct credit. Please try again.'
        };
        return;
      }

      // Log credit deduction
      console.log('[ChatHandler] Credit deducted for Zayvora prompt');

      // Send to Zayvora engine
      yield* this.zayvora.generateResponse(message, chatHistory, options);
    } else {
      // Fall back to Ollama for non-Zayvora models
      yield* this.handleOllamaMessage(message, modelId, chatHistory, options);
    }
  }

  // ========================================================================
  // OLLAMA FALLBACK
  // ========================================================================

  async *handleOllamaMessage(message, modelId, chatHistory = [], options = {}) {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          prompt: message,
          stream: true,
          options: options
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);
            if (data.response) {
              yield {
                type: 'token',
                content: data.response
              };
            }
            if (data.done) {
              yield {
                type: 'done',
                metadata: {
                  eval_count: data.eval_count,
                  eval_duration: data.eval_duration
                }
              };
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    } catch (error) {
      console.error('[ChatHandler] Ollama error:', error);
      yield {
        type: 'error',
        content: `Ollama error: ${error.message}`
      };
    }
  }

  // ========================================================================
  // HEADER CUSTOMIZATION
  // ========================================================================

  getHeaderForModel(modelId) {
    if (modelId === 'zayvora') {
      return {
        title: 'Zayvora Engine',
        subtitle: 'India\'s Sovereign AI Engineering Agent',
        icon: '◈',
        color: '#667eea'
      };
    }

    return {
      title: 'Ollama',
      subtitle: `Model: ${modelId}`,
      icon: '🦙',
      color: '#fff'
    };
  }

  // ========================================================================
  // REPO CONTEXT
  // ========================================================================

  async injectRepoContext(repoUrl) {
    if (!this.zayvora) return null;

    const analysis = await this.zayvora.analyzeRepository(repoUrl);
    if (!analysis) return null;

    return this.zayvora.formatRepoContext(analysis);
  }

  // ========================================================================
  // FALLBACK HANDLING
  // ========================================================================

  async handleBackendUnavailable(originalModelId) {
    console.warn('[ChatHandler] Zayvora backend unavailable, falling back to Ollama');

    return {
      fallback: true,
      originalModel: originalModelId,
      fallbackModel: 'llama2',
      message: 'Zayvora backend unavailable. Falling back to Ollama model.'
    };
  }

  // ========================================================================
  // RESPONSE FORMATTING
  // ========================================================================

  formatResponse(data) {
    switch (data.type) {
      case 'token':
        return {
          type: 'token',
          content: data.content,
          source: 'zayvora'
        };

      case 'done':
        return {
          type: 'done',
          metadata: {
            ...data.metadata,
            source: 'zayvora',
            timestamp: new Date().toISOString()
          }
        };

      case 'error':
        return {
          type: 'error',
          content: data.content,
          action: data.action || null,
          source: 'zayvora'
        };

      default:
        return data;
    }
  }
}

// ============================================================================
// EXPORT
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZayvoraChatHandler;
}

window.ZayvoraChatHandler = ZayvoraChatHandler;

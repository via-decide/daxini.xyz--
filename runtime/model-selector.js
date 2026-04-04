// ============================================================================
// OLLAMA UI - MODEL SELECTOR
// ============================================================================
// Extends Ollama model list with Zayvora Engine option
// Integrates Zayvora as a first-class model alongside Ollama models

const ZAYVORA_MODEL = {
  id: 'zayvora',
  name: 'Zayvora Engine',
  description: 'India\'s Sovereign AI Engineering Agent',
  provider: 'local',
  format: 'zayvora',
  family: 'zayvora',
  capabilities: {
    'code-generation': true,
    'repo-analysis': true,
    'architecture-design': true,
    'autonomous-tasks': true,
    'streaming': true
  },
  details: {
    parameter_size: 'Variable',
    quantization_level: 'N/A',
    context_length: 8192,
    max_tokens: 4096
  },
  isExternal: true,
  endpoint: 'http://localhost:3001'
};

// ============================================================================
// MODEL LIST EXTENSION
// ============================================================================

class ZayvoraModelSelector {
  constructor() {
    this.zayvora = null;
    this.originalModels = [];
  }

  // Initialize and inject Zayvora into model list
  async initialize() {
    try {
      // Create Zayvora engine instance
      const ZayvoraEngine = window.ZayvoraEngine;
      if (!ZayvoraEngine) {
        console.error('[ModelSelector] ZayvoraEngine not loaded');
        return false;
      }

      this.zayvora = new ZayvoraEngine();
      await this.zayvora.checkAvailability();

      console.log('[ModelSelector] Zayvora initialized:', {
        available: this.zayvora.isAvailable,
        info: this.zayvora.getModelInfo()
      });

      return true;
    } catch (error) {
      console.error('[ModelSelector] Initialization error:', error);
      return false;
    }
  }

  // Get extended model list (Ollama models + Zayvora)
  getModelList(ollamaModels = []) {
    // Add Zayvora to the beginning of the list
    const extended = [ZAYVORA_MODEL, ...ollamaModels];

    console.log('[ModelSelector] Model list:', {
      total: extended.length,
      zayvora: ZAYVORA_MODEL.name,
      ollama: ollamaModels.length
    });

    return extended;
  }

  // Filter models by capability
  filterByCapability(capability, models = null) {
    const list = models || [ZAYVORA_MODEL];

    return list.filter(model => {
      if (model.id === 'zayvora') {
        return model.capabilities[capability] === true;
      }
      // For Ollama models, skip capability check
      return true;
    });
  }

  // Get model by ID
  getModel(modelId, models = null) {
    const list = models || [ZAYVORA_MODEL];

    return list.find(m => m.id === modelId);
  }

  // Check if model is Zayvora
  isZayvoraModel(modelId) {
    return modelId === 'zayvora';
  }

  // Get Zayvora model info
  getZayvoraInfo() {
    if (!this.zayvora) return null;
    return this.zayvora.getModelInfo();
  }
}

// ============================================================================
// EXPORT & GLOBAL ACCESS
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ZayvoraModelSelector, ZAYVORA_MODEL };
}

window.ZayvoraModelSelector = ZayvoraModelSelector;
window.ZAYVORA_MODEL = ZAYVORA_MODEL;

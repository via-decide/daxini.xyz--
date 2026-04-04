// ============================================================================
// ZAYVORA ENGINE ROUTER
// ============================================================================
// Routes inference requests to Zayvora backend instead of Ollama
// Handles streaming responses, credit deduction, and repo context

const ZAYVORA_API = 'http://localhost:3001';
const ZAYVORA_CHAT_ENDPOINT = `${ZAYVORA_API}/api/zayvora-chat`;

// ============================================================================
// ZAYVORA ENGINE CLASS
// ============================================================================

class ZayvoraEngine {
  constructor() {
    this.isAvailable = false;
    this.userId = null;
    this.checkAvailability();
  }

  // Check if Zayvora backend is available
  async checkAvailability() {
    try {
      const response = await fetch(`${ZAYVORA_API}/health`, {
        method: 'GET',
        timeout: 2000
      });
      this.isAvailable = response.ok;
      console.log(`[Zayvora] Backend ${this.isAvailable ? 'available' : 'unavailable'}`);
    } catch (error) {
      this.isAvailable = false;
      console.warn('[Zayvora] Backend unavailable:', error.message);
    }
  }

  // Get user ID from authentication token
  getUserId() {
    try {
      const tokenStr = localStorage.getItem('zayvora_token');
      if (!tokenStr) return 'demo';
      const token = JSON.parse(tokenStr);
      return token.user_id || 'demo';
    } catch (error) {
      return 'demo';
    }
  }

  // ========================================================================
  // MAIN INFERENCE METHOD
  // ========================================================================

  async *generateResponse(prompt, chatHistory = [], options = {}) {
    // Check availability first
    if (!this.isAvailable) {
      await this.checkAvailability();
      if (!this.isAvailable) {
        yield {
          type: 'error',
          content: 'Zayvora backend unavailable. Falling back to Ollama model.',
          fallback: true
        };
        return;
      }
    }

    // Get user ID
    const userId = this.getUserId();

    // Prepare request payload
    const payload = {
      prompt,
      chat_history: chatHistory,
      user_id: userId,
      options: {
        temperature: options.temperature || 0.2,
        top_p: options.top_p || 0.95,
        top_k: options.top_k || 40,
        ...options
      }
    };

    console.log('[Zayvora] Sending prompt:', { prompt: prompt.substring(0, 50), userId });

    try {
      const response = await fetch(ZAYVORA_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('zayvora_token') || ''}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // Process complete lines
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          try {
            // Handle SSE format (data: {...})
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.substring(6));

              if (data.type === 'token') {
                yield {
                  type: 'token',
                  content: data.token
                };
              } else if (data.type === 'done') {
                yield {
                  type: 'done',
                  metadata: data.metadata || {}
                };
              } else if (data.type === 'error') {
                yield {
                  type: 'error',
                  content: data.message || 'Unknown error'
                };
              }
            }
          } catch (parseError) {
            console.error('[Zayvora] Parse error:', parseError);
          }
        }

        // Keep incomplete line in buffer
        buffer = lines[lines.length - 1];
      }

      // Process remaining buffer
      if (buffer.trim()) {
        try {
          if (buffer.startsWith('data: ')) {
            const data = JSON.parse(buffer.substring(6));
            if (data.type === 'token') {
              yield {
                type: 'token',
                content: data.token
              };
            } else if (data.type === 'done') {
              yield {
                type: 'done',
                metadata: data.metadata || {}
              };
            }
          }
        } catch (parseError) {
          console.error('[Zayvora] Final parse error:', parseError);
        }
      }

      console.log('[Zayvora] Response complete');
    } catch (error) {
      console.error('[Zayvora] Request error:', error);
      yield {
        type: 'error',
        content: `Zayvora error: ${error.message}`
      };
    }
  }

  // ========================================================================
  // CREDIT CHECKING
  // ========================================================================

  async checkCredits() {
    try {
      const userId = this.getUserId();
      const response = await fetch(`${ZAYVORA_API}/api/user-wallet/${userId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return {
        available: data.available_credits,
        total: data.total_credits,
        pending: data.pending_credits
      };
    } catch (error) {
      console.error('[Zayvora] Credit check error:', error);
      return null;
    }
  }

  async deductCredit() {
    try {
      const userId = this.getUserId();
      const response = await fetch(`${ZAYVORA_API}/api/deduct-credit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          amount: 1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('[Zayvora] Deduct credit error:', error);
      return false;
    }
  }

  // ========================================================================
  // REPO CONTEXT INJECTION
  // ========================================================================

  async analyzeRepository(repoUrl) {
    try {
      const response = await fetch(`${ZAYVORA_API}/api/repo-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          repo_url: repoUrl
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[Zayvora] Repo analysis error:', error);
      return null;
    }
  }

  // Format repo context for injection into chat
  formatRepoContext(analysis) {
    if (!analysis) return '';

    return `
Repository Analysis:
- Files: ${analysis.structure?.files || '?'}
- Folders: ${analysis.structure?.folders || '?'}
- Language: ${analysis.structure?.main_language || '?'}
- Tests: ${analysis.structure?.has_tests ? 'Yes' : 'No'}
- Documentation: ${analysis.structure?.has_docs ? 'Yes' : 'No'}
- Complexity: ${analysis.structure?.estimated_complexity || 'Unknown'}

---
`;
  }

  // ========================================================================
  // MODEL INFO
  // ========================================================================

  getModelInfo() {
    return {
      id: 'zayvora',
      name: 'Zayvora Engine',
      description: 'India\'s Sovereign AI Engineering Agent',
      provider: 'local',
      capabilities: [
        'Code generation',
        'Repository analysis',
        'Architecture design',
        'Autonomous engineering tasks'
      ],
      status: this.isAvailable ? 'online' : 'offline',
      parameters: {
        temperature: 0.2,
        top_p: 0.95,
        top_k: 40,
        context_length: 8192
      }
    };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZayvoraEngine;
}

// Make available globally for use in Ollama UI
window.ZayvoraEngine = ZayvoraEngine;

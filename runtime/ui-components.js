// ============================================================================
// OLLAMA UI - ZAYVORA COMPONENTS
// ============================================================================
// UI components for credit display, repo import, and Zayvora branding

class ZayvoraUIComponents {
  constructor() {
    this.credits = 0;
    this.zayvora = null;
  }

  async initialize(zayvora) {
    this.zayvora = zayvora;
    await this.updateCredits();
  }

  // ========================================================================
  // CREDIT WALLET DISPLAY
  // ========================================================================

  async updateCredits() {
    try {
      const credits = await this.zayvora.checkCredits();
      if (credits) {
        this.credits = credits.available;
        this.renderCreditBadge();
      }
    } catch (error) {
      console.error('[UIComponents] Credit fetch error:', error);
    }
  }

  renderCreditBadge() {
    // Create or update credit badge in header
    let badge = document.getElementById('zayvora-credit-badge');

    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'zayvora-credit-badge';
      badge.className = 'zayvora-credit-badge';

      // Find header and insert badge
      const header = document.querySelector('.ollama-header') ||
                     document.querySelector('header') ||
                     document.querySelector('[role="banner"]');

      if (header) {
        header.appendChild(badge);
      }
    }

    // Update badge content and styling
    badge.innerHTML = `
      <div class="credit-icon">💎</div>
      <div class="credit-value">${this.credits}</div>
    `;

    // Add styling
    badge.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      position: absolute;
      right: 20px;
      top: 15px;
    `;

    // Show purchase modal if credits empty
    if (this.credits === 0) {
      this.showNoCreditAlert();
    }
  }

  showNoCreditAlert() {
    const modal = document.createElement('div');
    modal.className = 'zayvora-modal';
    modal.innerHTML = `
      <div class="zayvora-modal-content">
        <div class="modal-icon">⚠️</div>
        <h2>No Credits Remaining</h2>
        <p>You have used all your credits. Purchase additional credits to continue using Zayvora Engine.</p>
        <div class="modal-actions">
          <button class="btn-primary" onclick="window.location.href='/zayvora-pricing'">
            Buy Credits
          </button>
          <button class="btn-secondary" onclick="this.closest('.zayvora-modal').remove()">
            Cancel
          </button>
        </div>
      </div>
    `;

    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    document.body.appendChild(modal);
  }

  // ========================================================================
  // REPO IMPORT BUTTON
  // ========================================================================

  renderRepoImportButton() {
    const button = document.createElement('button');
    button.className = 'zayvora-repo-import';
    button.innerHTML = `
      <span class="repo-icon">📁</span>
      <span>Import GitHub Repo</span>
    `;

    button.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 10px 16px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s ease;
    `;

    button.onclick = () => this.handleRepoImport();

    // Add to chat input area
    const inputArea = document.querySelector('.chat-input-area') ||
                      document.querySelector('[role="textbox"]')?.parentElement;

    if (inputArea) {
      inputArea.insertBefore(button, inputArea.firstChild);
    }

    return button;
  }

  async handleRepoImport() {
    const repoUrl = prompt('Enter GitHub repository URL:');
    if (!repoUrl) return;

    // Show loading state
    const button = document.querySelector('.zayvora-repo-import');
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="spinner"></span>Analyzing...';
    button.disabled = true;

    try {
      // Analyze repository
      const analysis = await this.zayvora.analyzeRepository(repoUrl);
      if (!analysis) {
        alert('Failed to analyze repository. Please check the URL and try again.');
        return;
      }

      // Display analysis in chat
      const context = this.zayvora.formatRepoContext(analysis);
      this.displayRepoAnalysis(repoUrl, analysis, context);

      // Inject context into prompt
      const promptArea = document.querySelector('textarea[placeholder*="message"]') ||
                        document.querySelector('[contenteditable="true"]');

      if (promptArea && context) {
        promptArea.value = (promptArea.value || '') + '\n\n' + context;
      }
    } catch (error) {
      alert('Error importing repository: ' + error.message);
    } finally {
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }

  displayRepoAnalysis(repoUrl, analysis, context) {
    const container = document.createElement('div');
    container.className = 'zayvora-repo-analysis';
    container.innerHTML = `
      <div class="analysis-card">
        <div class="card-header">
          <span class="card-icon">📊</span>
          <span class="card-title">Repository Analysis</span>
        </div>
        <div class="card-content">
          <p><strong>Repository:</strong> ${repoUrl}</p>
          <ul>
            <li>Files: ${analysis.structure?.files || '?'}</li>
            <li>Folders: ${analysis.structure?.folders || '?'}</li>
            <li>Language: ${analysis.structure?.main_language || '?'}</li>
            <li>Tests: ${analysis.structure?.has_tests ? '✓ Yes' : '✗ No'}</li>
            <li>Docs: ${analysis.structure?.has_docs ? '✓ Yes' : '✗ No'}</li>
            <li>Complexity: ${analysis.structure?.estimated_complexity || '?'}</li>
          </ul>
        </div>
      </div>
    `;

    container.style.cssText = `
      background: rgba(102, 126, 234, 0.08);
      border-left: 3px solid #667eea;
      border-radius: 8px;
      padding: 16px;
      margin: 12px 0;
      font-size: 14px;
    `;

    // Add to chat messages
    const messagesContainer = document.querySelector('[role="log"]') ||
                             document.querySelector('.messages') ||
                             document.querySelector('.chat-messages');

    if (messagesContainer) {
      messagesContainer.appendChild(container);
    }
  }

  // ========================================================================
  // HEADER CUSTOMIZATION
  // ========================================================================

  updateHeaderForZayvora() {
    const header = document.querySelector('.ollama-header') ||
                   document.querySelector('header');

    if (!header) return;

    // Update header styling
    header.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

    // Update title
    const title = header.querySelector('h1') || header.querySelector('[role="heading"]');
    if (title) {
      title.innerHTML = '◈ Zayvora Engine';
      title.style.color = 'white';
    }

    // Update subtitle
    const subtitle = document.createElement('p');
    subtitle.className = 'zayvora-subtitle';
    subtitle.textContent = 'India\'s Sovereign AI Engineering Agent';
    subtitle.style.cssText = `
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
      margin-top: 4px;
    `;

    // Insert subtitle
    if (title && !header.querySelector('.zayvora-subtitle')) {
      title.parentElement.appendChild(subtitle);
    }
  }

  resetHeaderForOllama() {
    const header = document.querySelector('.ollama-header') ||
                   document.querySelector('header');

    if (!header) return;

    // Reset header styling
    header.style.background = '';

    // Reset title
    const title = header.querySelector('h1') || header.querySelector('[role="heading"]');
    if (title) {
      title.innerHTML = '🦙 Ollama';
      title.style.color = '';
    }

    // Remove subtitle
    const subtitle = header.querySelector('.zayvora-subtitle');
    if (subtitle) {
      subtitle.remove();
    }
  }

  // ========================================================================
  // MODEL SELECTOR UI
  // ========================================================================

  enhanceModelSelector(models) {
    const selector = document.querySelector('select[name="model"]') ||
                     document.querySelector('[data-model-select]');

    if (!selector) return;

    // Clear existing options
    selector.innerHTML = '';

    // Add Zayvora option first
    const zayvoraOption = document.createElement('option');
    zayvoraOption.value = 'zayvora';
    zayvoraOption.innerHTML = '◈ Zayvora Engine (India\'s Sovereign AI)';
    selector.appendChild(zayvoraOption);

    // Add separator
    const separator = document.createElement('optgroup');
    separator.label = '─────────── Ollama Models ───────────';
    selector.appendChild(separator);

    // Add Ollama models
    models.forEach(model => {
      if (model.id !== 'zayvora') {
        const option = document.createElement('option');
        option.value = model.id;
        option.innerHTML = `🦙 ${model.name}`;
        separator.appendChild(option);
      }
    });
  }
}

// ============================================================================
// EXPORT
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ZayvoraUIComponents;
}

window.ZayvoraUIComponents = ZayvoraUIComponents;

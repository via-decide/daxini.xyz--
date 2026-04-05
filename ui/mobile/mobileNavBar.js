/**
 * ui/mobile/mobileNavBar.js
 *
 * Bottom navigation bar for mobile workspace.
 * Provides tab switching between Chat, Preview, and Files panels.
 */

export class MobileNavBar {
  constructor(container, onTabChange) {
    this.container = container;
    this.onTabChange = onTabChange;
    this.activeTab = 'chat';
    this.render();
  }

  render() {
    this.el = document.createElement('nav');
    this.el.className = 'mobile-nav-bar';
    this.el.innerHTML = `
      <button class="mobile-nav-tab active" data-panel="chat">
        <span class="mobile-nav-icon">&#128172;</span>
        <span class="mobile-nav-label">Chat</span>
      </button>
      <button class="mobile-nav-tab" data-panel="preview">
        <span class="mobile-nav-icon">&#128421;</span>
        <span class="mobile-nav-label">Preview</span>
      </button>
      <button class="mobile-nav-tab" data-panel="workspace">
        <span class="mobile-nav-icon">&#128193;</span>
        <span class="mobile-nav-label">Files</span>
      </button>
    `;

    this.el.addEventListener('click', (e) => {
      const tab = e.target.closest('.mobile-nav-tab');
      if (!tab) return;
      const panel = tab.dataset.panel;
      this.setActive(panel);
      this.onTabChange(panel);
    });

    this.container.appendChild(this.el);
  }

  setActive(panel) {
    this.activeTab = panel;
    this.el.querySelectorAll('.mobile-nav-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.panel === panel);
    });
  }

  destroy() {
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}

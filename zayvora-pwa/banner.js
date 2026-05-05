(function () {
  if (window.__zayvoraPWA) return;
  window.__zayvoraPWA = true;

  if (!location.pathname.startsWith('/zayvora')) return;

  if (window.matchMedia('(display-mode: standalone)').matches) return;

  const style = document.createElement('style');
  style.textContent = `
    #zayvora-pwa-banner {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 2147483647;
      pointer-events: none;
      transform: translateY(100%);
      transition: transform 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
      font-family: -apple-system, 'Segoe UI', sans-serif;
    }
    #zayvora-pwa-banner.zpwa-show {
      transform: translateY(0);
      pointer-events: all;
    }
    #zayvora-pwa-inner {
      margin: 0 12px 12px;
      background: rgba(8, 8, 16, 0.97);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(124, 58, 237, 0.45);
      border-radius: 18px;
      padding: 13px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow:
        0 -4px 40px rgba(0,0,0,0.5),
        inset 0 1px 0 rgba(255,255,255,0.05);
    }
    #zayvora-pwa-icon {
      width: 46px; height: 46px;
      min-width: 46px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(124,58,237,0.45);
    }
    #zayvora-pwa-icon img {
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
    }
    #zayvora-pwa-text {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }
    #zayvora-pwa-title {
      font-size: 14px;
      font-weight: 600;
      color: #f0f0f8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #zayvora-pwa-origin {
      font-size: 11px;
      color: rgba(160,160,190,0.6);
      margin-top: 1px;
      font-family: 'SF Mono', 'JetBrains Mono', monospace;
    }
    #zayvora-pwa-dismiss {
      background: transparent;
      border: none;
      color: rgba(160,160,190,0.5);
      font-size: 18px;
      cursor: pointer;
      padding: 6px;
      line-height: 1;
      min-width: 32px;
      transition: color 0.2s;
      -webkit-tap-highlight-color: transparent;
    }
    #zayvora-pwa-dismiss:hover { color: rgba(200,200,220,0.9); }
    #zayvora-pwa-btn {
      font-size: 13px;
      font-weight: 600;
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      color: #fff;
      border: none;
      padding: 9px 17px;
      border-radius: 9px;
      cursor: pointer;
      white-space: nowrap;
      box-shadow: 0 4px 14px rgba(124,58,237,0.4);
      transition: transform 0.15s, box-shadow 0.15s;
      -webkit-tap-highlight-color: transparent;
      letter-spacing: -0.2px;
    }
    #zayvora-pwa-btn:active { transform: scale(0.96); }
    @supports (padding-bottom: env(safe-area-inset-bottom)) {
      #zayvora-pwa-inner {
        margin-bottom: calc(12px + env(safe-area-inset-bottom));
      }
    }
  `;
  document.head.appendChild(style);

  const banner = document.createElement('div');
  banner.id = 'zayvora-pwa-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Install Zayvora');
  banner.innerHTML = `
    <div id="zayvora-pwa-inner">
      <div id="zayvora-pwa-icon"><img src="/zayvora-pwa/icons/icon-192.png" alt="Zayvora"></div>
      <div id="zayvora-pwa-text">
        <div id="zayvora-pwa-title">Install Zayvora</div>
        <div id="zayvora-pwa-origin">daxini.xyz</div>
      </div>
      <button id="zayvora-pwa-dismiss" aria-label="Dismiss">&#x2715;</button>
      <button id="zayvora-pwa-btn">Install</button>
    </div>
  `;
  document.body.appendChild(banner);

  let deferredPrompt = null;
  const SESSION_KEY = 'zpwa_dismissed';

  function show() {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    banner.classList.add('zpwa-show');
  }

  function hide() {
    banner.classList.remove('zpwa-show');
    sessionStorage.setItem(SESSION_KEY, '1');
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(show, 1500);
  });

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
  if (isIOS && isSafari) {
    document.getElementById('zayvora-pwa-btn').textContent = 'How to Install';
    setTimeout(show, 2000);
  }

  document.getElementById('zayvora-pwa-dismiss').addEventListener('click', hide);

  document.getElementById('zayvora-pwa-btn').addEventListener('click', async () => {
    hide();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
    } else if (isIOS) {
      alert('Tap the Share button (⬆) then “Add to Home Screen” to install Zayvora.');
    }
  });

  window.addEventListener('appinstalled', hide);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/zayvora-pwa/sw.js', { scope: '/zayvora/' });
    });
  }

})();

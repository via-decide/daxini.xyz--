(function () {
  'use strict';

  let deferredPrompt;
  const installBtn = document.getElementById('pwa-install-btn');

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function (error) {
        console.log('Service worker registration failed:', error);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredPrompt = event;
    if (installBtn) {installBtn.classList.remove('hidden');}
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    if (installBtn) {installBtn.classList.add('hidden');}
  });

  if (installBtn) {
    installBtn.addEventListener('click', function () {
      if (!deferredPrompt) {return;}
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function () {
        deferredPrompt = null;
      });
    });
  }
})();

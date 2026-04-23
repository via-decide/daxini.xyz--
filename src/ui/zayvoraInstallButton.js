let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const btn = document.getElementById("install-zayvora");
  if (btn) {btn.style.display = "block";}

  window.dispatchEvent(new Event("zayvora-install-available"));
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  const btn = document.getElementById("install-zayvora");
  if (btn) {btn.style.display = "none";}
});

export function installZayvora() {
  if (!deferredPrompt) {return;}

  deferredPrompt.prompt();

  deferredPrompt.userChoice.then(() => {
    deferredPrompt = null;
  });
}

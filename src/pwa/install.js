let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  const btn = document.getElementById("install-zayvora");
  if (btn) {
    btn.style.display = "block";
  }
});

window.addEventListener("appinstalled", () => {
  const btn = document.getElementById("install-zayvora");
  if (btn) {
    btn.style.display = "none";
  }
});

export async function triggerInstall() {
  if (!deferredPrompt) {return;}

  deferredPrompt.prompt();

  const choice = await deferredPrompt.userChoice;
  console.log("Install outcome:", choice.outcome);

  deferredPrompt = null;
}

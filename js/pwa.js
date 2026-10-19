// Installable app: registers the service worker and shows an "Install app" button.
(() => {
  if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  const btn = document.getElementById("install"); if (!btn) return;
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (standalone) return;
  let ev = null;
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); ev = e; btn.hidden = false; });
  addEventListener("appinstalled", () => { btn.hidden = true; });
  btn.onclick = async () => { if (ev) { ev.prompt(); await ev.userChoice; ev = null; btn.hidden = true; } };
  // iPhone/iPad Safari has no install prompt: show manual steps instead
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) { btn.hidden = false; btn.onclick = () => alert("To install: tap the Share button in Safari, then 'Add to Home Screen'."); }
})();

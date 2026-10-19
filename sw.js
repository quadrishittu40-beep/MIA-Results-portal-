// Network-first service worker: always tries the live site (so updates and results are fresh),
// falls back to the cached copy when offline.
const CACHE = "mia-portal-v1";
const SHELL = ["./", "index.html", "config.js", "css/style.css", "js/calc.js", "js/pdf.js", "js/cloud.js", "js/app.js", "assets/logo.png", "manifest.webmanifest"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return; // Firebase & CDN calls go straight to the network
  e.respondWith(fetch(r).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); return res; }).catch(() => caches.match(r).then(m => m || caches.match("index.html"))));
});

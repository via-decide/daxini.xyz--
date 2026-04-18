/* Zayvora — Service Worker (root scope)
   App-shell cache for /zayvora plus offline-safe navigation. */

const CACHE_NAME = 'zayvora-shell-v1';
const SHELL = [
  '/',
  '/zayvora',
  '/zayvora.html',
  '/manifest.json',
  '/assets/css/base.css',
  '/assets/css/layout.css',
  '/assets/css/components.css',
  '/assets/css/zayvora.css',
  '/assets/js/zayvora-app.js',
  '/assets/js/zayvora-auth.js',
  '/assets/js/zayvora-pwa.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Don't intercept cross-origin or local inference endpoint traffic.
  if (url.origin !== self.location.origin) return;
  if (url.port === '11434') return;

  // API: network-only
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(req));
    return;
  }

  // App shell: cache-first, fall back to network and cache successes
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok && (req.destination === 'script' || req.destination === 'style' || req.mode === 'navigate' || req.destination === 'document')) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        if (req.mode === 'navigate') return caches.match('/zayvora.html');
      });
    })
  );
});

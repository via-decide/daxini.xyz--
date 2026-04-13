/**
 * sw.js — Daxini PWA Service Worker
 * Sovereign, offline-capable caching for the Daxini + Zayvora platform.
 *
 * Strategy:
 *   - INSTALL: Pre-cache the core app shell (HTML, CSS, JS, icons).
 *   - FETCH:   Network-first for HTML pages (always get latest).
 *              Cache-first for static assets (CSS, JS, fonts, images).
 *   - ACTIVATE: Clean up old cache versions automatically.
 */

const CACHE_VERSION = 'daxini-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/zayvora.html',
  '/zayvora-pricing.html',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/scripts/app.js',
  '/scripts/zayvora-ui.js',
  '/app/router.js',
  '/app/bootstrap.js',
];

// ── INSTALL ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => {
            console.log('[SW] Purging old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  event.waitUntil(clients.claim());
});

// ── FETCH ────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // Skip Zayvora engine API calls (localhost:8902, localhost:11434)
  // These must always hit the network for live data
  if (url.port === '8902' || url.port === '11434') return;

  // HTML pages: Network-first (always get latest, fallback to cache)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: Cache-first (fast loads, fallback to network)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Only cache successful responses from our own origin
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

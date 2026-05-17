/**
 * public/sw.js
 * Phase 8 — Service Worker for PWA
 *
 * Strategy:
 *   - App shell (HTML, JS, CSS) → Cache First (fast loads)
 *   - API calls → Network First (fresh data)
 *   - Images → Cache First with fallback
 *   - Offline → serve cached shell so app still opens
 */

const CACHE_NAME    = 'haat-v1';
const SHELL_ASSETS  = [
  '/delivery-rms/',
  '/delivery-rms/index.html',
];

// ── Install: cache app shell ──────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: routing strategy ───────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls → Network First (always try network, fallback to cache)
  if (url.pathname.startsWith('/api/') || url.hostname.includes('railway.app')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful GET responses
          if (event.request.method === 'GET' && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Static assets (JS, CSS, fonts) → Cache First
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|png|jpg|svg|ico)$/) ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Navigation (HTML pages) → Network First, fallback to cached shell
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match('/delivery-rms/') || caches.match('/delivery-rms/index.html'))
    );
    return;
  }

  // Default → network
  event.respondWith(fetch(event.request));
});

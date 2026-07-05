/**
 * Service worker — offline app shell.
 *
 * Capture must work with no signal (you're outside, running). We cache the shell
 * on install and serve it cache-first. The Edge Function call is never cached:
 * network requests to other origins always go straight to the network.
 *
 * Bump CACHE_VERSION whenever shell files change to force an update.
 */
const CACHE_VERSION = 'running-ideas-v3';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/capture.js',
  './js/send.js',
  './js/history.js',
  './js/storage.js',
  './js/api.js',
  './js/ui.js',
  './js/config.js',
  './icons/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GETs. Everything else (the Edge Function POST,
  // cross-origin requests) bypasses the cache entirely.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          // Cache successful same-origin responses for next time.
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html')); // SPA-style offline fallback
    })
  );
});

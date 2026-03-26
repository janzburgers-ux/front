const CACHE_NAME = 'janz-v2';
const STATIC_ASSETS = [
  '/',
  '/pedido',
  '/static/js/main.chunk.js',
  '/static/css/main.chunk.css',
  '/favicon.png',
  '/favicon-logo.png',
  '/manifest.json'
];

// Install — pre-cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip API calls — always go to network
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful responses for static assets
        if (response.ok && (url.pathname.startsWith('/static') || url.pathname === '/' || url.pathname === '/pedido')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(request).then(cached => {
          if (cached) return cached;
          // Fallback to root for navigation requests
          if (request.mode === 'navigate') return caches.match('/');
        });
      })
  );
});

// Background sync — notify when back online
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

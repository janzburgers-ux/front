const CACHE_NAME = 'janz-v3';
const STATIC_ASSETS = [
  '/',
  '/pedido',
  '/static/js/main.chunk.js',
  '/static/css/main.chunk.css',
  '/favicon.png',
  '/favicon-logo.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return;
  if (request.method !== 'GET') return;
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && (url.pathname.startsWith('/static') || url.pathname === '/' || url.pathname === '/pedido')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request).then(cached => {
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('/');
      }))
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'Janz Burgers', body: event.data.text() }; }

  const { title = 'Janz Burgers', body = '', icon = '/favicon-logo.png', url = '/pedido' } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/favicon-logo.png',
      badge: '/favicon.png',
      tag: 'janz-push',
      renotify: true,
      data: { url },
      actions: [
        { action: 'open', title: '🍔 Ver menú' },
        { action: 'close', title: 'Cerrar' },
      ],
      vibrate: [200, 100, 200],
    })
  );
});

// Al hacer clic en la notificación, abrir la URL
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/pedido';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

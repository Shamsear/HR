const CACHE_NAME = 'hr-v1.0.0';
const OFFLINE_ASSETS = [
  '/offline.html',
  '/globe.svg',
  '/manifest.json'
];

// 1. Install Event: Cache offline skeleton
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching offline assets shell');
      return cache.addAll(OFFLINE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clear outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Clearing old cache storage:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event Interceptor
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Rule A: Do not intercept API, auth checks, or non-GET requests
  if (
    event.request.method !== 'GET' || 
    !event.request.url.startsWith(self.location.origin) ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('/auth/')
  ) {
    return;
  }

  // Rule B: NEVER cache root (/) to prevent loop redirect lockouts
  if (url.pathname === '/') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // Caching Strategy: Network-first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache success responses only
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Fallback offline landing page for navigations
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

// 4. Version upgrade hook
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 5. Push Notification Handler (Merged from old sw.js)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const options = {
      body: payload.body,
      icon: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=128&h=128&fit=crop',
      badge: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=96&h=96&fit=crop',
      vibrate: [100, 50, 100],
      data: {
        url: payload.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(payload.title, options)
    );
  } catch (error) {
    console.error('[Service Worker] Push parsing error:', error);
  }
});

// 6. Push Notification Click Handler (Merged from old sw.js)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const targetUrl = event.notification.data.url;
      // Focus tab if already open
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

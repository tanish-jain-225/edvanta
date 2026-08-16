// Edvanta Service Worker - Offline Support & Asset Cache
const CACHE_VERSION = 'edvanta-v2';
const CACHE_NAME = `${CACHE_VERSION}-all`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/edvanta-logo.png',
  '/default-avatar.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.debug('[Service Worker] Cache addAll error:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('edvanta-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - cache-first or network-with-cache-fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external API calls
  if (url.origin !== self.location.origin && 
      !url.href.includes('fonts.googleapis.com') && 
      !url.href.includes('fonts.gstatic.com')) {
    return;
  }

  // For static assets / bundle chunks: Stale-While-Revalidate or Network-First
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cachedResponse) => {
      // If we have cached response and are offline, return it immediately
      if (cachedResponse && !navigator.onLine) {
        return cachedResponse;
      }

      // Try network
      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fails, return cached response if available
          if (cachedResponse) {
            return cachedResponse;
          }

          // For navigation requests, return index.html
          if (request.mode === 'navigate' || request.destination === 'document') {
            return caches.match('/index.html');
          }

          // For images, return default avatar
          if (request.destination === 'image') {
            return caches.match('/default-avatar.svg');
          }

          return new Response('Offline - Resource not cached', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

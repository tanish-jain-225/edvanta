// Edvanta Service Worker - Simple Offline Support
const CACHE_VERSION = 'edvanta-v1';
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
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log('[Service Worker] Cache addAll error:', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('edvanta-') && key !== CACHE_NAME)
          .map((key) => {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - cache everything, serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external API calls (let them fail gracefully in app)
  if (url.origin !== self.location.origin && 
      !url.href.includes('fonts.googleapis.com') && 
      !url.href.includes('fonts.gstatic.com')) {
    return;
  }

  event.respondWith(
    // Try network first with short timeout
    Promise.race([
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        }),
      // Timeout after 5 seconds
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), 5000)
      )
    ])
    .catch(() => {
      // Network failed or timed out, try cache immediately
      return caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // For navigation requests, return index.html
        if (request.destination === 'document') {
          return caches.match('/index.html');
        }
        
        // For images, return placeholder
        if (request.destination === 'image') {
          return caches.match('/default-avatar.svg');
        }
        
        // Otherwise, return offline response immediately
        return new Response('Offline - No cached version available', { 
          status: 503,
          statusText: 'Service Unavailable'
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

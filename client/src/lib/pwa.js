// PWA Service Worker Registration - Simplified

/**
 * Register service worker for offline support
 */
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // Check for updates periodically only when online
          setInterval(() => {
            if (navigator.onLine) {
              registration.update().catch((err) => {
                console.debug('[PWA] Service Worker update check skipped:', err);
              });
            }
          }, 60000); // Check every minute
        })
        .catch((error) => {
          console.debug('[PWA] Service Worker registration failed:', error);
        });
    });
  }
};

/**
 * Unregister service worker (for development)
 */
export const unregisterServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
};

/**
 * Check if offline
 */
export const isOffline = () => {
  return !navigator.onLine;
};

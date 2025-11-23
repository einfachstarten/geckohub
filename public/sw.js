self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Basic fetch handling - keine aggressive Caching-Strategie
  event.respondWith(
    fetch(event.request).catch(() => {
      // Fallback bei Offline
      if (event.request.destination === 'document') {
        return caches.match('/');
      }
    })
  );
});

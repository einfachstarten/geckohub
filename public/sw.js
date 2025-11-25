const CACHE_NAME = 'flitzhq-v2'; // ← Version erhöht für sofortiges Update
const STATIC_CACHE = 'flitzhq-static-v2';
const API_CACHE = 'flitzhq-api-v2';

// Static Assets die gecacht werden sollen
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/android-launchericon-144-144.png',
  '/icons/android-launchericon-192-192.png',
  '/icons/android-launchericon-512-512.png',
  '/apple-touch-icon.png'
];

// Install Event - Cache Static Assets
self.addEventListener('install', (event) => {
  console.log('[SW v2] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW v2] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()) // Sofort aktivieren
  );
});

// Activate Event - Cleanup alte Caches
self.addEventListener('activate', (event) => {
  console.log('[SW v2] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Lösche alle Caches außer den aktuellen
            if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
              console.log('[SW v2] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim()) // Übernimm sofort alle Clients
  );
});

// Fetch Event - Unterschiedliche Strategien je nach Request-Typ
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // API Routes → Network-First (immer frische Daten)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // Static Assets → Cache-First (schnell, offline-fähig)
  event.respondWith(cacheFirstStrategy(request));
});

// Network-First Strategie für API Calls
async function networkFirstStrategy(request) {
  try {
    // Versuche IMMER zuerst das Netzwerk
    const networkResponse = await fetch(request);
    
    // Bei Erfolg: Cache die Response UND gib sie zurück
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
      
      console.log('[SW v2] Network success:', request.url);
      return networkResponse;
    }
    
    return networkResponse;
    
  } catch (error) {
    // Netzwerk-Fehler (Offline) → Fallback zu Cache
    console.log('[SW v2] Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[SW v2] Cache hit (offline fallback):', request.url);
      return cachedResponse;
    }
    
    // Kein Cache vorhanden → Fehler
    console.error('[SW v2] No cache available:', request.url);
    return new Response(
      JSON.stringify({ 
        error: 'Offline und keine gecachten Daten verfügbar',
        offline: true 
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache-First Strategie für Static Assets
async function cacheFirstStrategy(request) {
  // Suche zuerst im Cache
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    console.log('[SW v2] Cache hit (static):', request.url);
    return cachedResponse;
  }
  
  // Cache Miss → Fetch aus Netzwerk
  try {
    const networkResponse = await fetch(request);
    
    // Bei Erfolg: Cache für zukünftige Requests
    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    // Offline und kein Cache → Fallback zur Root
    if (request.destination === 'document') {
      const rootCache = await caches.match('/');
      if (rootCache) return rootCache;
    }
    
    throw error;
  }
}

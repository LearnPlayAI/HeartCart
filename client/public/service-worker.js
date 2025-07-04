// Service Worker for TEE ME YOU PWA with Auto-Update Support

// Generate version based on timestamp - this ensures cache busting on each deployment
const APP_VERSION = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`; // Auto-generated version
const CACHE_NAME = `teemeyou-cache-${APP_VERSION}`;
const RUNTIME = `runtime-${APP_VERSION}`;
const VERSION_KEY = 'app-version';

// Resources to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/favicon.ico'
];

// Installation event - precache static assets and store version
self.addEventListener('install', event => {
  console.log(`[SW] Installing version ${APP_VERSION}`);
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME)
        .then(cache => cache.addAll(PRECACHE_URLS)),
      // Store current version in cache for version checking
      caches.open('app-metadata')
        .then(cache => cache.put(VERSION_KEY, new Response(APP_VERSION)))
    ])
    .then(() => {
      console.log(`[SW] Installation complete for version ${APP_VERSION}`);
      return self.skipWaiting();
    })
    .catch(error => console.error('[SW] Error during service worker installation:', error))
  );
});

// Activation event - clean up old caches and notify clients of updates
self.addEventListener('activate', event => {
  console.log(`[SW] Activating version ${APP_VERSION}`);
  const currentCaches = [CACHE_NAME, RUNTIME, 'app-metadata'];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      if (cachesToDelete.length > 0) {
        console.log(`[SW] Deleting old caches:`, cachesToDelete);
      }
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => {
      console.log(`[SW] Cache cleanup complete, claiming clients`);
      return self.clients.claim();
    }).then(() => {
      // Notify all clients that a new version is available
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATE',
            version: APP_VERSION,
            action: 'RELOAD_REQUIRED'
          });
        });
      });
    })
  );
});

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests, like those for Google Analytics
  if (event.request.url.startsWith(self.location.origin)) {
    // HTTPS-only policy for mobile security
    if (event.request.url.startsWith('http:') && self.location.protocol === 'https:') {
      console.warn('[SW] Blocking insecure HTTP request on HTTPS site:', event.request.url);
      return;
    }
    
    // For API requests, use network first strategy
    if (event.request.url.includes('/api/')) {
      event.respondWith(networkFirst(event.request));
    } else {
      // For other requests, use cache first strategy
      event.respondWith(cacheFirst(event.request));
    }
  }
});

// Cache first strategy with mobile optimization
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Mobile-optimized fetch with timeout for slow connections
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for mobile
    
    const networkResponse = await fetch(request, { 
      signal: controller.signal,
      credentials: 'same-origin' // Ensure HTTPS-only credentials
    });
    
    clearTimeout(timeoutId);
    
    // Cache valid HTTPS responses for future use
    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
      // Only cache HTTPS resources for security
      if (request.url.startsWith('https:') || request.url.startsWith(self.location.origin)) {
        const cache = await caches.open(RUNTIME);
        cache.put(request, networkResponse.clone());
      }
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Mobile-optimized fetch error:', error);
    
    // Enhanced mobile fallback logic
    if (request.destination === 'image') {
      return caches.match('/logo.svg') || caches.match('/icon-192.png');
    }
    
    // For mobile connectivity issues, try to return any cached version
    if (error.name === 'AbortError' || error.message.includes('network')) {
      console.log('[SW] Mobile network timeout - attempting to serve any cached content');
      const fallbackResponse = await caches.match(request, { ignoreSearch: true });
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }
    
    throw error;
  }
}

// Network first strategy
async function networkFirst(request) {
  try {
    // First try to get from network
    const networkResponse = await fetch(request);
    // Clone the response to store in cache
    const clonedResponse = networkResponse.clone();
    
    // Cache API responses that are successful
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME);
      cache.put(request, clonedResponse);
    }
    
    return networkResponse;
  } catch (error) {
    // If network fails, try to get from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If not in cache and network failed, handle the error
    console.error('Network and cache fetch failed:', error);
    throw error;
  }
}

// Push notification event listener
self.addEventListener('push', event => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/apple-touch-icon.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('TEE ME YOU', options)
  );
});

// Message event listener for version checks and updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_VERSION') {
    // Check current version against cached version
    caches.open('app-metadata')
      .then(cache => cache.match(VERSION_KEY))
      .then(response => {
        if (response) {
          return response.text();
        }
        return null;
      })
      .then(cachedVersion => {
        event.ports[0].postMessage({
          type: 'VERSION_INFO',
          currentVersion: APP_VERSION,
          cachedVersion: cachedVersion,
          updateAvailable: cachedVersion && cachedVersion !== APP_VERSION
        });
      })
      .catch(error => {
        console.error('[SW] Error checking version:', error);
        event.ports[0].postMessage({
          type: 'VERSION_ERROR',
          error: error.message
        });
      });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notification click event listener
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data.url;
  
  event.waitUntil(
    clients.openWindow(url)
  );
});

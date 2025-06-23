// Service Worker for TEE ME YOU PWA

const CACHE_NAME = 'teemeyou-cache-v1';
const RUNTIME = 'runtime';

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

// Installation event - precache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(self.skipWaiting())
      .catch(error => console.error('Error during service worker installation:', error))
  );
});

// Activation event - clean up old caches
self.addEventListener('activate', event => {
  const currentCaches = [CACHE_NAME, RUNTIME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
    }).then(cachesToDelete => {
      return Promise.all(cachesToDelete.map(cacheToDelete => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', event => {
  // Skip cross-origin requests, like those for Google Analytics
  if (event.request.url.startsWith(self.location.origin)) {
    // For API requests, use network first strategy
    if (event.request.url.includes('/api/')) {
      event.respondWith(networkFirst(event.request));
    } else {
      // For other requests, use cache first strategy
      event.respondWith(cacheFirst(event.request));
    }
  }
});

// Cache first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    // Cache valid responses for future use
    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
      const cache = await caches.open(RUNTIME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Fetch error:', error);
    // For some requests like images, return a fallback
    if (request.destination === 'image') {
      return caches.match('/logo.svg');
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
    icon: '/logo.svg',
    badge: '/logo.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('TEE ME YOU', options)
  );
});

// Notification click event listener
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data.url;
  
  event.waitUntil(
    clients.openWindow(url)
  );
});

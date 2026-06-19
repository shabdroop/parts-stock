const CACHE_NAME = 'inventory-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/app.js',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/@zxing/library@latest/umd/index.min.js',
    'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js'
];

// Install event - cache assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(ASSETS_TO_CACHE).catch(() => {
                    // Some files might fail to cache (like CDNs), but that's okay
                    // The app will still work offline with IndexedDB
                });
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin) &&
        !event.request.url.includes('cdn.jsdelivr.net')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version if available
                if (response) {
                    return response;
                }

                // Otherwise try network
                return fetch(event.request)
                    .then(response => {
                        // Cache successful responses
                        if (response && response.status === 200) {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Return offline page if available, otherwise fail gracefully
                        return new Response('Offline - using cached data', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({
                                'Content-Type': 'text/plain'
                            })
                        });
                    });
            })
    );
});

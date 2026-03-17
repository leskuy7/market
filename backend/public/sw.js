const CACHE_NAME = 'market-stock-v3';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/css/components.css',
    '/assets/icons/icon-192.svg',
    '/js/app.js',
    '/js/api.js',
    '/js/auth.js',
    '/js/barcode.js',
    '/js/db.js',
    '/js/router.js',
    '/js/utils.js',
    '/pages/dashboard.js',
    '/pages/products.js',
    '/pages/sales.js',
    '/pages/stock.js',
    '/pages/reports.js',
    '/pages/categories.js',
    '/pages/settings.js',
    '/manifest.json'
];

// Install event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // API calls - network first, fallback to cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Clone and cache successful GET requests
                    if (request.method === 'GET' && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request);
                })
        );
        return;
    }

    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put('/index.html', responseClone);
                    });
                    return response;
                })
                .catch(() => caches.match('/index.html'))
        );
        return;
    }

    // Static assets - cache first, fallback to network
    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    return response;
                }
                return fetch(request).then(response => {
                    // Cache new static assets
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                });
            })
            .catch(() => {
                // Offline fallback for navigation
                if (request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            })
    );
});

// ─── Background Sync for offline sales ───
self.addEventListener('sync', event => {
    if (event.tag === 'sync-sales') {
        event.waitUntil(syncOfflineSales());
    }
});

async function syncOfflineSales() {
    // Open IndexedDB inside the service worker
    const db = await openIndexedDB();
    if (!db) return;

    const tx = db.transaction('pending_sales', 'readonly');
    const store = tx.objectStore('pending_sales');

    const allSales = await idbGetAll(store);
    if (allSales.length === 0) return;

    console.log(`[SW] ${allSales.length} bekleyen satış senkronize ediliyor...`);

    for (const sale of allSales) {
        try {
            const { offlineId, queuedAt, ...saleData } = sale;

            // Get token from the client if possible
            const clients = await self.clients.matchAll();
            let token = '';
            if (clients.length > 0) {
                // Ask a client for the auth token
                // Fallback: try localStorage via cache
            }

            const response = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData)
            });

            if (response.ok) {
                // Remove from pending
                const delTx = db.transaction('pending_sales', 'readwrite');
                delTx.objectStore('pending_sales').delete(offlineId);
                console.log(`[SW] Satış senkronize edildi`);
            }
        } catch (err) {
            console.warn('[SW] Satış senkronize edilemedi:', err.message);
            break;
        }
    }

    db.close();
}

// ─── IndexedDB helpers for Service Worker ───
function openIndexedDB() {
    return new Promise((resolve) => {
        try {
            const request = indexedDB.open('market-offline', 1);
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = () => resolve(null);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('products')) {
                    const s = db.createObjectStore('products', { keyPath: '_id' });
                    s.createIndex('barcode', 'barcode', { unique: true });
                }
                if (!db.objectStoreNames.contains('pending_sales')) {
                    db.createObjectStore('pending_sales', { keyPath: 'offlineId', autoIncrement: true });
                }
            };
        } catch {
            resolve(null);
        }
    });
}

function idbGetAll(store) {
    return new Promise((resolve) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
    });
}

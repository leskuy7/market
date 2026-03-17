// ─── IndexedDB Offline-First Module ───
// Provides local product cache and pending sales queue for offline operation.

const offlineDB = (() => {
    const DB_NAME = 'market-offline';
    const DB_VERSION = 1;
    let dbInstance = null;

    /** Open (or create) the IndexedDB database */
    function openDB() {
        return new Promise((resolve, reject) => {
            if (dbInstance) return resolve(dbInstance);

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;

                // Products cache — indexed by barcode for fast lookup
                if (!db.objectStoreNames.contains('products')) {
                    const store = db.createObjectStore('products', { keyPath: '_id' });
                    store.createIndex('barcode', 'barcode', { unique: true });
                }

                // Pending sales queue — for offline-made sales
                if (!db.objectStoreNames.contains('pending_sales')) {
                    db.createObjectStore('pending_sales', { keyPath: 'offlineId', autoIncrement: true });
                }
            };

            request.onsuccess = (e) => {
                dbInstance = e.target.result;
                resolve(dbInstance);
            };

            request.onerror = (e) => {
                console.error('IndexedDB open error:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    // ─── Products Cache ───

    /** Sync all products from the server into IndexedDB */
    async function syncProducts() {
        try {
            const res = await api.products.getAll({ limit: 9999 });
            if (!res.success || !res.data) return;

            const db = await openDB();
            const tx = db.transaction('products', 'readwrite');
            const store = tx.objectStore('products');

            // Clear old data and insert fresh
            store.clear();
            for (const product of res.data) {
                store.put(product);
            }

            return new Promise((resolve, reject) => {
                tx.oncomplete = () => {
                    console.log(`[OfflineDB] ${res.data.length} ürün senkronize edildi`);
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.warn('[OfflineDB] Ürün senkronizasyonu başarısız:', err.message);
        }
    }

    /** Find a product by barcode — IndexedDB first, then server fallback */
    async function getProductByBarcode(barcode) {
        try {
            const db = await openDB();
            const tx = db.transaction('products', 'readonly');
            const index = tx.objectStore('products').index('barcode');

            return new Promise((resolve) => {
                const request = index.get(barcode);
                request.onsuccess = () => {
                    if (request.result) {
                        console.log('[OfflineDB] Ürün yerel veritabanından bulundu');
                        resolve(request.result);
                    } else {
                        resolve(null); // Not found locally
                    }
                };
                request.onerror = () => resolve(null);
            });
        } catch {
            return null;
        }
    }

    // ─── Pending Sales Queue ───

    /** Queue a sale for later sync */
    async function queueSale(saleData) {
        try {
            const db = await openDB();
            const tx = db.transaction('pending_sales', 'readwrite');
            const store = tx.objectStore('pending_sales');

            saleData.queuedAt = new Date().toISOString();
            store.add(saleData);

            return new Promise((resolve, reject) => {
                tx.oncomplete = () => {
                    console.log('[OfflineDB] Satış kuyruğa alındı');
                    resolve(true);
                };
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.error('[OfflineDB] Satış kuyruğa alınamadı:', err);
            return false;
        }
    }

    /** Get all pending sales */
    async function getPendingSales() {
        try {
            const db = await openDB();
            const tx = db.transaction('pending_sales', 'readonly');
            const store = tx.objectStore('pending_sales');

            return new Promise((resolve) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => resolve([]);
            });
        } catch {
            return [];
        }
    }

    /** Remove a synced sale from the queue */
    async function removePendingSale(offlineId) {
        try {
            const db = await openDB();
            const tx = db.transaction('pending_sales', 'readwrite');
            tx.objectStore('pending_sales').delete(offlineId);

            return new Promise((resolve) => {
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            });
        } catch {
            return false;
        }
    }

    /** Sync all pending sales to the server */
    async function syncPendingSales() {
        const pending = await getPendingSales();
        if (pending.length === 0) return;

        console.log(`[OfflineDB] ${pending.length} bekleyen satış senkronize ediliyor...`);

        for (const sale of pending) {
            try {
                const { offlineId, queuedAt, ...saleData } = sale;
                const res = await api.sales.create(saleData);
                if (res.success) {
                    await removePendingSale(offlineId);
                    console.log(`[OfflineDB] Satış senkronize edildi: ${res.data.saleNumber}`);
                }
            } catch (err) {
                console.warn('[OfflineDB] Satış senkronize edilemedi:', err.message);
                // Stop trying — server might still be down
                break;
            }
        }
    }

    // ─── Auto-sync on page load & connection restore ───

    function init() {
        // Initial product sync (delayed to not block startup)
        setTimeout(() => syncProducts(), 3000);

        // Re-sync products every 5 minutes
        setInterval(() => syncProducts(), 5 * 60 * 1000);

        // Sync pending sales when connection is restored
        window.addEventListener('online', () => {
            console.log('[OfflineDB] İnternet bağlantısı geri geldi — senkronizasyon başlıyor');
            showToast('İnternet bağlantısı geri geldi. Senkronize ediliyor...', 'info');
            syncPendingSales();
            syncProducts();
        });

        window.addEventListener('offline', () => {
            showToast('İnternet bağlantısı kesildi. Çevrimdışı moddasınız.', 'warning', 5000);
        });

        // Try to sync pending sales on startup
        if (navigator.onLine) {
            syncPendingSales();
        }

        // Register background sync if supported
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(reg => {
                reg.sync.register('sync-sales').catch(() => {
                    // Background sync not supported — we still have online event fallback
                });
            });
        }
    }

    return {
        init,
        syncProducts,
        getProductByBarcode,
        queueSale,
        getPendingSales,
        removePendingSale,
        syncPendingSales
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    offlineDB.init();
});

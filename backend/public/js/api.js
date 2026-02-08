// API Module

const API_BASE_URL = '/api';

const api = {
    // Get auth token from storage
    getToken() {
        return storage.get('token');
    },

    // Make API request
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const token = this.getToken();

        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Bir hata oluştu');
            }

            return data;
        } catch (error) {
            if (error.name === 'TypeError') {
                throw new Error('Sunucuya bağlanılamadı');
            }
            throw error;
        }
    },

    // GET request
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    // POST request
    post(endpoint, data) {
        return this.request(endpoint, { method: 'POST', body: data });
    },

    // PUT request
    put(endpoint, data) {
        return this.request(endpoint, { method: 'PUT', body: data });
    },

    // DELETE request
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },

    // Auth endpoints
    auth: {
        login(username, password) {
            return api.post('/auth/login', { username, password });
        },
        register(data) {
            return api.post('/auth/register', data);
        },
        me() {
            return api.get('/auth/me');
        }
    },

    // Products endpoints
    products: {
        getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.get(`/products${query ? `?${query}` : ''}`);
        },
        getById(id) {
            return api.get(`/products/${id}`);
        },
        getByBarcode(barcode) {
            return api.get(`/products/barcode/${barcode}`);
        },
        create(data) {
            return api.post('/products', data);
        },
        update(id, data) {
            return api.put(`/products/${id}`, data);
        },
        delete(id) {
            return api.delete(`/products/${id}`);
        },
        getLowStock() {
            return api.get('/products/alerts/low-stock');
        }
    },

    // Categories endpoints
    categories: {
        getAll() {
            return api.get('/categories');
        },
        create(data) {
            return api.post('/categories', data);
        },
        update(id, data) {
            return api.put(`/categories/${id}`, data);
        },
        delete(id) {
            return api.delete(`/categories/${id}`);
        }
    },

    // Stock endpoints
    stock: {
        addMovement(data) {
            return api.post('/stock/movement', data);
        },
        getHistory(productId, params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.get(`/stock/history/${productId}${query ? `?${query}` : ''}`);
        },
        getMovements(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.get(`/stock/movements${query ? `?${query}` : ''}`);
        }
    },

    // Sales endpoints
    sales: {
        create(data) {
            return api.post('/sales', data);
        },
        getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.get(`/sales${query ? `?${query}` : ''}`);
        },
        getById(id) {
            return api.get(`/sales/${id}`);
        },
        getTodaySummary() {
            return api.get('/sales/summary/today');
        }
    },

    // Reports endpoints
    reports: {
        getDashboard() {
            return api.get('/reports/dashboard');
        },
        getSales(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.get(`/reports/sales${query ? `?${query}` : ''}`);
        },
        getTopProducts(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.get(`/reports/top-products${query ? `?${query}` : ''}`);
        },
        getCategorySales(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.get(`/reports/category-sales${query ? `?${query}` : ''}`);
        }
    }
};

// Dashboard Page
router.register('dashboard', async (container) => {
    container.innerHTML = `
        <div class="stats-grid" id="dashboard-stats">
            <div class="stat-card">
                <div class="stat-icon primary">💰</div>
                <div class="stat-content">
                    <div class="stat-label">Bugünkü Satış</div>
                    <div class="stat-value" id="today-revenue">₺0</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon success">📈</div>
                <div class="stat-content">
                    <div class="stat-label">Bugünkü Kar</div>
                    <div class="stat-value" id="today-profit">₺0</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon warning">📦</div>
                <div class="stat-content">
                    <div class="stat-label">Toplam Ürün</div>
                    <div class="stat-value" id="total-products">0</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon danger">⚠️</div>
                <div class="stat-content">
                    <div class="stat-label">Düşük Stok</div>
                    <div class="stat-value" id="low-stock-count">0</div>
                </div>
            </div>
        </div>

        <div class="card mb-2">
            <div class="card-header">
                <h3>⚠️ Düşük Stok Uyarıları</h3>
            </div>
            <div class="card-body" id="low-stock-alerts">
                <p class="text-muted">Yükleniyor...</p>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3>🏆 En Çok Satan Ürünler</h3>
            </div>
            <div class="card-body" id="top-products">
                <p class="text-muted">Yükleniyor...</p>
            </div>
        </div>
    `;

    // Load dashboard data
    try {
        const dashboard = await api.reports.getDashboard();
        if (dashboard.success) {
            const d = dashboard.data;
            document.getElementById('today-revenue').textContent = formatCurrency(d.today.revenue);
            document.getElementById('today-profit').textContent = formatCurrency(d.today.profit);
            document.getElementById('total-products').textContent = d.inventory.totalProducts;
            document.getElementById('low-stock-count').textContent = d.inventory.lowStockProducts;
        }
    } catch (e) {
        console.error('Dashboard load error:', e);
    }

    // Load low stock alerts
    try {
        const lowStock = await api.products.getLowStock();
        const alertsContainer = document.getElementById('low-stock-alerts');
        if (lowStock.success && lowStock.data.length > 0) {
            alertsContainer.innerHTML = lowStock.data.slice(0, 5).map(p => `
                <div class="list-item">
                    <div class="list-item-icon">📦</div>
                    <div class="list-item-content">
                        <div class="list-item-title">${p.name}</div>
                        <div class="list-item-subtitle">Stok: ${p.stock} / Min: ${p.minStock}</div>
                    </div>
                    <span class="badge badge-danger">Düşük</span>
                </div>
            `).join('');
        } else {
            alertsContainer.innerHTML = '<p class="text-muted text-center">Düşük stoklu ürün yok ✓</p>';
        }
    } catch (e) {
        document.getElementById('low-stock-alerts').innerHTML = '<p class="text-muted">Veri yüklenemedi</p>';
    }

    // Load top products
    try {
        const top = await api.reports.getTopProducts({ limit: 5 });
        const topContainer = document.getElementById('top-products');
        if (top.success && top.data.length > 0) {
            topContainer.innerHTML = top.data.map((p, i) => `
                <div class="list-item">
                    <div class="list-item-icon">${i + 1}</div>
                    <div class="list-item-content">
                        <div class="list-item-title">${p.name}</div>
                        <div class="list-item-subtitle">${p.totalQuantity} adet satıldı</div>
                    </div>
                    <span class="text-success">${formatCurrency(p.totalRevenue)}</span>
                </div>
            `).join('');
        } else {
            topContainer.innerHTML = '<p class="text-muted text-center">Henüz satış verisi yok</p>';
        }
    } catch (e) {
        document.getElementById('top-products').innerHTML = '<p class="text-muted">Veri yüklenemedi</p>';
    }
});

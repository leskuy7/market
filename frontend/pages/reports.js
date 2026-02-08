// Reports Page
router.register('reports', async (container) => {
    container.innerHTML = `
        <div class="page-header">
            <h2>Raporlar</h2>
        </div>
        <div class="stats-grid" id="report-stats"></div>
        <div class="card mb-2">
            <div class="card-header"><h3>📈 Satış Trendi</h3></div>
            <div class="card-body" id="sales-chart">
                <p class="text-muted">Yükleniyor...</p>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><h3>📊 Kategori Satışları</h3></div>
            <div class="card-body" id="category-chart">
                <p class="text-muted">Yükleniyor...</p>
            </div>
        </div>
    `;

    try {
        const dash = await api.reports.getDashboard();
        if (dash.success) {
            const d = dash.data;
            document.getElementById('report-stats').innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon primary">💰</div>
                    <div class="stat-content">
                        <div class="stat-label">Haftalık Ciro</div>
                        <div class="stat-value">${formatCurrency(d.weekly.revenue)}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">📈</div>
                    <div class="stat-content">
                        <div class="stat-label">Haftalık Kar</div>
                        <div class="stat-value">${formatCurrency(d.weekly.profit)}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">🛒</div>
                    <div class="stat-content">
                        <div class="stat-label">Haftalık Satış</div>
                        <div class="stat-value">${d.weekly.salesCount} adet</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon info">💎</div>
                    <div class="stat-content">
                        <div class="stat-label">Stok Değeri</div>
                        <div class="stat-value">${formatCurrency(d.inventory.stockValue)}</div>
                    </div>
                </div>
            `;
        }
    } catch (e) { console.error(e); }

    try {
        const sales = await api.reports.getSales({ groupBy: 'day' });
        const container = document.getElementById('sales-chart');
        if (sales.success && sales.data.length > 0) {
            const maxVal = Math.max(...sales.data.map(s => s.revenue));
            container.innerHTML = `
                <div style="display:flex;gap:0.5rem;align-items:flex-end;height:150px">
                    ${sales.data.slice(-7).map(s => `
                        <div style="flex:1;text-align:center">
                            <div style="background:var(--primary);height:${(s.revenue / maxVal) * 120}px;border-radius:4px 4px 0 0;margin-bottom:4px"></div>
                            <small style="font-size:0.65rem">${s._id.slice(-5)}</small>
                        </div>
                    `).join('')}
                </div>
            `;
        } else {
            container.innerHTML = '<p class="text-muted text-center">Veri yok</p>';
        }
    } catch (e) { document.getElementById('sales-chart').innerHTML = '<p class="text-muted">Hata</p>'; }

    try {
        const cats = await api.reports.getCategorySales();
        const container = document.getElementById('category-chart');
        if (cats.success && cats.data.length > 0) {
            container.innerHTML = cats.data.map(c => `
                <div class="list-item">
                    <div class="list-item-icon" style="background:${c.color}20;color:${c.color}">${c.name.charAt(0)}</div>
                    <div class="list-item-content">
                        <div class="list-item-title">${c.name}</div>
                        <div class="list-item-subtitle">${c.quantity} ürün satıldı</div>
                    </div>
                    <span class="text-success">${formatCurrency(c.revenue)}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-muted text-center">Veri yok</p>';
        }
    } catch (e) { document.getElementById('category-chart').innerHTML = '<p class="text-muted">Hata</p>'; }
});

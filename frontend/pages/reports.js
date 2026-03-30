// Reports Page
router.register('reports', async (container) => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    container.innerHTML = `
        <div class="page-header">
            <h2>Raporlar</h2>
            <button class="btn btn-outline" id="export-csv-btn">📥 CSV İndir</button>
        </div>

        <!-- Tarih Filtresi -->
        <div class="card mb-2">
            <div class="card-body">
                <div class="toolbar" style="flex-wrap:wrap;gap:0.5rem">
                    <div class="form-group" style="margin:0">
                        <label style="font-size:0.75rem">Başlangıç</label>
                        <input type="date" id="report-start-date" value="${weekAgo}">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label style="font-size:0.75rem">Bitiş</label>
                        <input type="date" id="report-end-date" value="${today}">
                    </div>
                    <div class="form-group" style="margin:0">
                        <label style="font-size:0.75rem">Gruplama</label>
                        <select id="report-group-by">
                            <option value="day">Günlük</option>
                            <option value="week">Haftalık</option>
                            <option value="month">Aylık</option>
                        </select>
                    </div>
                    <button class="btn btn-primary btn-sm" id="apply-filter-btn" style="align-self:flex-end">Filtrele</button>
                </div>
            </div>
        </div>

        <div class="stats-grid" id="report-stats"></div>
        <div class="card mb-2">
            <div class="card-header"><h3>📈 Satış Trendi</h3></div>
            <div class="card-body" id="sales-chart">
                <p class="text-muted">Yükleniyor...</p>
            </div>
        </div>
        <div class="card mb-2">
            <div class="card-header"><h3>🏆 En Çok Satan Ürünler</h3></div>
            <div class="card-body" id="top-products-report">
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

    let reportData = { sales: [], topProducts: [], categories: [] };

    async function loadReportData() {
        const startDate = document.getElementById('report-start-date').value;
        const endDate = document.getElementById('report-end-date').value;
        const groupBy = document.getElementById('report-group-by').value;

        // Dashboard stats
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

        // Satış trendi
        try {
            const sales = await api.reports.getSales({ startDate, endDate, groupBy });
            const chartContainer = document.getElementById('sales-chart');
            reportData.sales = sales.data || [];
            if (sales.success && sales.data.length > 0) {
                const maxVal = Math.max(...sales.data.map(s => s.revenue));
                chartContainer.innerHTML = `
                    <div style="display:flex;gap:0.5rem;align-items:flex-end;height:150px">
                        ${sales.data.slice(-14).map(s => `
                            <div style="flex:1;text-align:center;min-width:30px" title="${s._id}: ${formatCurrency(s.revenue)}">
                                <div style="background:var(--primary);height:${maxVal > 0 ? (s.revenue / maxVal) * 120 : 0}px;border-radius:4px 4px 0 0;margin-bottom:4px;min-height:2px"></div>
                                <small style="font-size:0.6rem;display:block;overflow:hidden;text-overflow:ellipsis">${s._id.slice(-5)}</small>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else {
                chartContainer.innerHTML = '<p class="text-muted text-center">Veri yok</p>';
            }
        } catch (e) { document.getElementById('sales-chart').innerHTML = '<p class="text-muted">Hata</p>'; }

        // En çok satan ürünler
        try {
            const top = await api.reports.getTopProducts({ limit: 10, startDate, endDate });
            const topContainer = document.getElementById('top-products-report');
            reportData.topProducts = top.data || [];
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
                topContainer.innerHTML = '<p class="text-muted text-center">Veri yok</p>';
            }
        } catch (e) { document.getElementById('top-products-report').innerHTML = '<p class="text-muted">Hata</p>'; }

        // Kategori satışları
        try {
            const cats = await api.reports.getCategorySales({ startDate, endDate });
            const catContainer = document.getElementById('category-chart');
            reportData.categories = cats.data || [];
            if (cats.success && cats.data.length > 0) {
                catContainer.innerHTML = cats.data.map(c => `
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
                catContainer.innerHTML = '<p class="text-muted text-center">Veri yok</p>';
            }
        } catch (e) { document.getElementById('category-chart').innerHTML = '<p class="text-muted">Hata</p>'; }
    }

    // CSV export
    document.getElementById('export-csv-btn').onclick = () => {
        if (reportData.sales.length === 0 && reportData.topProducts.length === 0) {
            showToast('Dışa aktarılacak veri yok', 'warning');
            return;
        }

        let csv = 'Satış Raporu\n';
        csv += 'Dönem,Satış Adedi,Ciro,Kar,Ürün Sayısı\n';
        reportData.sales.forEach(s => {
            csv += `${s._id},${s.count},${s.revenue.toFixed(2)},${s.profit.toFixed(2)},${s.items}\n`;
        });

        csv += '\nEn Çok Satan Ürünler\n';
        csv += 'Ürün,Barkod,Satış Adedi,Toplam Ciro\n';
        reportData.topProducts.forEach(p => {
            csv += `"${p.name}",${p.barcode || ''},${p.totalQuantity},${p.totalRevenue.toFixed(2)}\n`;
        });

        csv += '\nKategori Satışları\n';
        csv += 'Kategori,Satış Adedi,Toplam Ciro\n';
        reportData.categories.forEach(c => {
            csv += `"${c.name}",${c.quantity},${c.revenue.toFixed(2)}\n`;
        });

        // BOM ekle (Excel Türkçe karakter desteği)
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rapor_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Rapor indirildi', 'success');
    };

    document.getElementById('apply-filter-btn').onclick = loadReportData;
    await loadReportData();
});

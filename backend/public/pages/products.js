// Products Page
router.register('products', async (container) => {
    container.innerHTML = `
        <div class="page-header">
            <h2>Ürünler</h2>
            <button class="btn btn-primary" id="add-product-btn">+ Yeni Ürün</button>
        </div>
        <div class="toolbar">
            <div class="toolbar-left">
                <div class="search-bar">
                    <span>🔍</span>
                    <input type="text" id="product-search" placeholder="Ürün veya barkod ara...">
                </div>
            </div>
            <div class="toolbar-right">
                <select id="category-filter" class="form-group" style="margin:0">
                    <option value="">Tüm Kategoriler</option>
                </select>
            </div>
        </div>
        <div class="product-grid" id="products-list"></div>
    `;

    await loadCategories();
    await loadProducts();

    document.getElementById('add-product-btn').onclick = () => openProductModal();
    document.getElementById('product-search').oninput = debounce(() => loadProducts(), 300);
    document.getElementById('category-filter').onchange = () => loadProducts();
});

async function loadCategories() {
    try {
        const res = await api.categories.getAll();
        const select = document.getElementById('category-filter');
        const productCat = document.getElementById('product-category');
        if (res.success) {
            const opts = res.data.map(c => `<option value="${c._id}">${c.icon} ${c.name}</option>`).join('');
            if (select) select.innerHTML = '<option value="">Tüm Kategoriler</option>' + opts;
            if (productCat) productCat.innerHTML = '<option value="">Seçiniz</option>' + opts;
        }
    } catch (e) { console.error(e); }
}

async function loadProducts() {
    const list = document.getElementById('products-list');
    const search = document.getElementById('product-search')?.value || '';
    const category = document.getElementById('category-filter')?.value || '';

    try {
        const res = await api.products.getAll({ search, category });
        if (res.success && res.data.length > 0) {
            list.innerHTML = res.data.map(p => `
                <div class="product-card" data-id="${p._id}">
                    <div class="product-card-header">
                        <div>
                            <div class="product-name">${p.name}</div>
                            <div class="product-barcode">${p.barcode}</div>
                        </div>
                        ${p.category ? `<span class="product-category">${p.category.icon || '📦'} ${p.category.name}</span>` : ''}
                    </div>
                    <div class="product-details">
                        <div class="product-detail">
                            <div class="product-detail-label">Alış</div>
                            <div class="product-detail-value">${formatCurrency(p.purchasePrice)}</div>
                        </div>
                        <div class="product-detail">
                            <div class="product-detail-label">Satış</div>
                            <div class="product-detail-value">${formatCurrency(p.salePrice)}</div>
                        </div>
                        <div class="product-detail">
                            <div class="product-detail-label">Stok</div>
                            <div class="product-detail-value ${p.isLowStock ? 'text-danger' : ''}">${p.stock}</div>
                        </div>
                        <div class="product-detail">
                            <div class="product-detail-label">Kar</div>
                            <div class="product-detail-value text-success">%${p.profitMargin}</div>
                        </div>
                    </div>
                    <div class="product-actions">
                        <button class="btn btn-outline btn-sm edit-btn">✏️ Düzenle</button>
                        <button class="btn btn-danger btn-sm delete-btn">🗑️</button>
                    </div>
                </div>
            `).join('');

            list.querySelectorAll('.product-card').forEach(card => {
                card.querySelector('.edit-btn').onclick = () => openProductModal(card.dataset.id);
                card.querySelector('.delete-btn').onclick = () => deleteProduct(card.dataset.id);
            });
        } else {
            list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📦</div><h3>Ürün bulunamadı</h3></div>';
        }
    } catch (e) {
        list.innerHTML = '<div class="empty-state"><h3>Hata</h3><p>' + e.message + '</p></div>';
    }
}

async function openProductModal(id = null) {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');
    const title = document.getElementById('product-modal-title');

    await loadCategories();
    form.reset();
    document.getElementById('product-id').value = '';
    title.textContent = 'Yeni Ürün';

    if (id) {
        title.textContent = 'Ürünü Düzenle';
        try {
            const res = await api.products.getById(id);
            if (res.success) {
                const p = res.data;
                document.getElementById('product-id').value = p._id;
                document.getElementById('product-barcode').value = p.barcode;
                document.getElementById('product-name').value = p.name;
                document.getElementById('product-category').value = p.category?._id || '';
                document.getElementById('product-unit').value = p.unit;
                document.getElementById('product-purchase-price').value = p.purchasePrice;
                document.getElementById('product-sale-price').value = p.salePrice;
                document.getElementById('product-stock').value = p.stock;
                document.getElementById('product-min-stock').value = p.minStock;
                document.getElementById('product-supplier').value = p.supplier || '';
                document.getElementById('product-description').value = p.description || '';
            }
        } catch (e) { showToast(e.message, 'error'); }
    }
    modal.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('product-modal');
    const form = document.getElementById('product-form');

    document.getElementById('close-product-modal')?.addEventListener('click', () => modal.classList.add('hidden'));
    document.getElementById('cancel-product')?.addEventListener('click', () => modal.classList.add('hidden'));

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('product-id').value;
        const data = {
            barcode: document.getElementById('product-barcode').value,
            name: document.getElementById('product-name').value,
            category: document.getElementById('product-category').value || null,
            unit: document.getElementById('product-unit').value,
            purchasePrice: parseFloat(document.getElementById('product-purchase-price').value),
            salePrice: parseFloat(document.getElementById('product-sale-price').value),
            stock: parseInt(document.getElementById('product-stock').value),
            minStock: parseInt(document.getElementById('product-min-stock').value),
            supplier: document.getElementById('product-supplier').value,
            description: document.getElementById('product-description').value
        };

        try {
            const res = id ? await api.products.update(id, data) : await api.products.create(data);
            if (res.success) {
                showToast(id ? 'Ürün güncellendi' : 'Ürün eklendi', 'success');
                modal.classList.add('hidden');
                loadProducts();
            }
        } catch (e) { showToast(e.message, 'error'); }
    });
});

async function deleteProduct(id) {
    if (await confirm('Bu ürünü silmek istediğinize emin misiniz?')) {
        try {
            const res = await api.products.delete(id);
            if (res.success) {
                showToast('Ürün silindi', 'success');
                loadProducts();
            }
        } catch (e) { showToast(e.message, 'error'); }
    }
}

// Stock Page
router.register('stock', async (container) => {
    container.innerHTML = `
        <div class="page-header">
            <h2>Stok Takip</h2>
            <button class="btn btn-primary" id="add-stock-btn">+ Stok Girişi</button>
        </div>
        <div class="card mb-2">
            <div class="card-header"><h3>Son Stok Hareketleri</h3></div>
            <div class="card-body" id="stock-movements">
                <p class="text-muted">Yükleniyor...</p>
            </div>
        </div>
    `;

    await loadStockMovements();
    document.getElementById('add-stock-btn').onclick = openStockModal;
});

async function loadStockMovements() {
    const container = document.getElementById('stock-movements');
    try {
        const res = await api.stock.getMovements({ limit: 20 });
        if (res.success && res.data.length > 0) {
            container.innerHTML = res.data.map(m => `
                <div class="list-item">
                    <div class="list-item-icon">${m.type === 'in' ? '📥' : '📤'}</div>
                    <div class="list-item-content">
                        <div class="list-item-title">${m.product?.name || 'Ürün'}</div>
                        <div class="list-item-subtitle">${formatDateTime(m.createdAt)}</div>
                    </div>
                    <span class="badge ${m.type === 'in' ? 'badge-success' : 'badge-danger'}">
                        ${m.type === 'in' ? '+' : '-'}${m.quantity}
                    </span>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-muted text-center">Stok hareketi bulunamadı</p>';
        }
    } catch (e) {
        container.innerHTML = '<p class="text-danger">' + e.message + '</p>';
    }
}

function openStockModal() {
    const modal = createElement('div', {
        className: 'modal',
        innerHTML: `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Stok Girişi</h2>
                    <button class="modal-close" id="close-stock-modal">✕</button>
                </div>
                <form id="stock-form" class="modal-form">
                    <div class="form-group">
                        <label>Barkod</label>
                        <input type="text" id="stock-barcode" required placeholder="Barkod okutun">
                    </div>
                    <div class="form-group">
                        <label>Ürün</label>
                        <input type="text" id="stock-product-name" readonly placeholder="Ürün otomatik bulunacak">
                        <input type="hidden" id="stock-product-id">
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>İşlem Tipi</label>
                            <select id="stock-type">
                                <option value="in">Giriş</option>
                                <option value="out">Çıkış</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Miktar</label>
                            <input type="number" id="stock-quantity" min="1" value="1" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Sebep</label>
                        <select id="stock-reason">
                            <option value="purchase">Satın Alma</option>
                            <option value="return">İade</option>
                            <option value="damage">Hasar/Fire</option>
                            <option value="adjustment">Düzeltme</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Not</label>
                        <textarea id="stock-note" rows="2"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" id="cancel-stock">İptal</button>
                        <button type="submit" class="btn btn-primary">Kaydet</button>
                    </div>
                </form>
            </div>
        `
    });

    document.body.appendChild(modal);

    modal.querySelector('#close-stock-modal').onclick = () => modal.remove();
    modal.querySelector('#cancel-stock').onclick = () => modal.remove();

    modal.querySelector('#stock-barcode').addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const barcode = e.target.value.trim();
            try {
                const res = await api.products.getByBarcode(barcode);
                if (res.success) {
                    document.getElementById('stock-product-id').value = res.data._id;
                    document.getElementById('stock-product-name').value = res.data.name;
                }
            } catch { showToast('Ürün bulunamadı', 'error'); }
        }
    });

    modal.querySelector('#stock-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            productId: document.getElementById('stock-product-id').value,
            type: document.getElementById('stock-type').value,
            quantity: parseInt(document.getElementById('stock-quantity').value),
            reason: document.getElementById('stock-reason').value,
            note: document.getElementById('stock-note').value
        };

        if (!data.productId) {
            showToast('Önce ürün seçin', 'warning');
            return;
        }

        try {
            const res = await api.stock.addMovement(data);
            if (res.success) {
                showToast('Stok güncellendi', 'success');
                modal.remove();
                loadStockMovements();
            }
        } catch (err) { showToast(err.message, 'error'); }
    };
}

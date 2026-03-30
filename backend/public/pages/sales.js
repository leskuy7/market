// Sales Page (POS)
let cart = [];

// ─── USB Barcode Scanner Buffer System ───
const scannerBuffer = {
    buffer: '',
    lastKeyTime: 0,
    MAX_KEY_INTERVAL: 50,

    handleKeyDown(e) {
        const now = Date.now();
        const target = e.target;

        if (target.tagName === 'INPUT' && target.id !== 'barcode-input') return;
        if (target.tagName === 'TEXTAREA') return;
        if (target.tagName === 'SELECT') return;

        if (now - this.lastKeyTime > this.MAX_KEY_INTERVAL && this.buffer.length > 0) {
            this.buffer = '';
        }
        this.lastKeyTime = now;

        if (e.key === 'Enter') {
            if (this.buffer.length >= 4) {
                e.preventDefault();
                const barcode = this.buffer;
                this.buffer = '';
                const barcodeInput = document.getElementById('barcode-input');
                if (barcodeInput) {
                    barcodeInput.value = '';
                    addToCart(barcode);
                }
            }
            this.buffer = '';
        } else if (e.key.length === 1) {
            this.buffer += e.key;
        }
    }
};

document.addEventListener('keydown', (e) => scannerBuffer.handleKeyDown(e));

router.register('sales', async (container) => {
    cart = [];
    container.innerHTML = `
        <div class="page-header">
            <h2>Satış</h2>
            <div style="display:flex;gap:0.5rem">
                <button class="btn btn-outline btn-sm" id="show-history-btn">📋 Geçmiş</button>
            </div>
        </div>
        <div class="cart-container">
            <div>
                <div class="card mb-2">
                    <div class="card-body">
                        <div class="search-bar">
                            <span>📷</span>
                            <input type="text" id="barcode-input" placeholder="Barkod okutun veya yazın..." autofocus>
                        </div>
                    </div>
                </div>
                <div class="cart-items" id="cart-items">
                    <div class="empty-state">
                        <div class="empty-state-icon">🛒</div>
                        <h3>Sepet boş</h3>
                        <p>Ürün eklemek için barkod okutun</p>
                    </div>
                </div>
            </div>
            <div class="cart-summary">
                <h3>Sepet Özeti</h3>
                <div class="cart-totals">
                    <div class="cart-total-row">
                        <span>Ara Toplam</span>
                        <span id="cart-subtotal">₺0,00</span>
                    </div>
                    <div class="cart-total-row">
                        <span>İndirim</span>
                        <input type="number" id="cart-discount" value="0" min="0" step="0.01" style="width:80px;text-align:right">
                    </div>
                    <div class="cart-total-row total">
                        <span>Toplam</span>
                        <span id="cart-total">₺0,00</span>
                    </div>
                </div>
                <div class="form-group mb-2">
                    <label>Ödeme Yöntemi</label>
                    <select id="payment-method">
                        <option value="cash">💵 Nakit</option>
                        <option value="card">💳 Kart</option>
                    </select>
                </div>
                <button class="btn btn-primary btn-full btn-lg" id="complete-sale-btn" disabled>
                    💰 Satışı Tamamla
                </button>
                <button class="btn btn-outline btn-full mt-1" id="clear-cart-btn">
                    🗑️ Sepeti Temizle
                </button>
            </div>
        </div>
    `;

    const barcodeInput = document.getElementById('barcode-input');

    barcodeInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const barcode = barcodeInput.value.trim();
            if (barcode) {
                await addToCart(barcode);
                barcodeInput.value = '';
                barcodeInput.focus();
            }
        }
    });

    document.getElementById('cart-discount').oninput = updateCartTotals;
    document.getElementById('complete-sale-btn').onclick = completeSale;
    document.getElementById('clear-cart-btn').onclick = async () => {
        if (cart.length === 0) return;
        if (await confirm('Sepeti temizlemek istediğinize emin misiniz?')) {
            cart = [];
            renderCart();
        }
    };
    document.getElementById('show-history-btn').onclick = showSalesHistory;
});

async function addToCart(barcode) {
    try {
        let product = null;

        if (typeof offlineDB !== 'undefined') {
            product = await offlineDB.getProductByBarcode(barcode);
        }

        if (!product) {
            const res = await api.products.getByBarcode(barcode);
            if (res.success) {
                product = res.data;
            }
        }

        if (product) {
            const existing = cart.find(i => i.product._id === product._id);
            if (existing) {
                if (existing.quantity < product.stock) {
                    existing.quantity++;
                } else {
                    showToast('Yetersiz stok', 'warning');
                    if (typeof sfx !== 'undefined') sfx.error();
                    return;
                }
            } else {
                if (product.stock < 1) {
                    showToast('Stokta yok', 'error');
                    if (typeof sfx !== 'undefined') sfx.error();
                    return;
                }
                cart.push({ product, quantity: 1 });
            }
            renderCart();
            showToast(`${product.name} eklendi`, 'success');
            if (typeof sfx !== 'undefined') sfx.beep();
        } else {
            showToast('Ürün bulunamadı', 'error');
            if (typeof sfx !== 'undefined') sfx.error();
        }
    } catch (e) {
        showToast('Ürün bulunamadı', 'error');
        if (typeof sfx !== 'undefined') sfx.error();
    }
}

function renderCart() {
    const container = document.getElementById('cart-items');
    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🛒</div><h3>Sepet boş</h3></div>';
        document.getElementById('complete-sale-btn').disabled = true;
    } else {
        container.innerHTML = cart.map((item, i) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.product.name}</div>
                    <div class="cart-item-price">${formatCurrency(item.product.salePrice)}</div>
                </div>
                <div class="cart-item-quantity">
                    <button onclick="updateQuantity(${i}, -1)">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity(${i}, 1)">+</button>
                </div>
                <div class="cart-item-total">${formatCurrency(item.product.salePrice * item.quantity)}</div>
                <button class="cart-item-remove" onclick="removeFromCart(${i})">✕</button>
            </div>
        `).join('');
        document.getElementById('complete-sale-btn').disabled = false;
    }
    updateCartTotals();
}

function updateQuantity(index, change) {
    const item = cart[index];
    const newQty = item.quantity + change;
    if (newQty < 1) {
        removeFromCart(index);
    } else if (newQty <= item.product.stock) {
        item.quantity = newQty;
        renderCart();
    } else {
        showToast('Yetersiz stok', 'warning');
        if (typeof sfx !== 'undefined') sfx.error();
    }
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function updateCartTotals() {
    const subtotal = cart.reduce((sum, i) => sum + (i.product.salePrice * i.quantity), 0);
    const discountInput = document.getElementById('cart-discount');
    let discount = parseFloat(discountInput?.value || 0);

    // İndirim kontrolü
    if (discount < 0) {
        discount = 0;
        discountInput.value = 0;
    }
    if (discount > subtotal) {
        discount = subtotal;
        discountInput.value = subtotal;
    }

    const total = Math.max(0, subtotal - discount);
    document.getElementById('cart-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('cart-total').textContent = formatCurrency(total);
}

async function completeSale() {
    if (cart.length === 0) return;

    const discount = parseFloat(document.getElementById('cart-discount').value || 0);
    const paymentMethod = document.getElementById('payment-method').value;

    const data = {
        items: cart.map(i => ({ productId: i.product._id, quantity: i.quantity })),
        discount,
        paymentMethod
    };

    try {
        const res = await api.sales.create(data);
        if (res.success) {
            showToast(`Satış tamamlandı! ${res.data.saleNumber}`, 'success');
            if (typeof sfx !== 'undefined') sfx.success();

            // Fiş yazdırma seçeneği
            if (await confirm('Fiş yazdırılsın mı?')) {
                printReceipt(res.data);
            }

            cart = [];
            renderCart();
            document.getElementById('cart-discount').value = 0;
        }
    } catch (e) {
        if (!navigator.onLine && typeof offlineDB !== 'undefined') {
            const queued = await offlineDB.queueSale(data);
            if (queued) {
                showToast('Çevrimdışı: Satış kaydedildi, internet gelince gönderilecek', 'warning', 5000);
                if (typeof sfx !== 'undefined') sfx.success();
                cart = [];
                renderCart();
                document.getElementById('cart-discount').value = 0;
            } else {
                showToast('Satış kaydedilemedi!', 'error');
                if (typeof sfx !== 'undefined') sfx.error();
            }
        } else {
            showToast(e.message, 'error');
            if (typeof sfx !== 'undefined') sfx.error();
        }
    }
}

function printReceipt(sale) {
    const receiptWindow = window.open('', '_blank', 'width=300,height=600');
    const items = sale.items.map(i =>
        `<tr><td>${i.name}</td><td style="text-align:center">${i.quantity}</td><td style="text-align:right">${i.total.toFixed(2)}</td></tr>`
    ).join('');

    receiptWindow.document.write(`
        <html><head><title>Fiş</title>
        <style>
            body { font-family: monospace; font-size: 12px; padding: 10px; max-width: 280px; margin: 0 auto; }
            h2 { text-align: center; margin: 5px 0; }
            hr { border: none; border-top: 1px dashed #000; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 2px 0; }
            .total { font-weight: bold; font-size: 14px; }
            .center { text-align: center; }
            @media print { .no-print { display: none; } }
        </style></head><body>
        <h2>Market Stok Takip</h2>
        <p class="center">${new Date(sale.createdAt).toLocaleString('tr-TR')}</p>
        <p class="center">Fiş No: ${sale.saleNumber}</p>
        <hr>
        <table>
            <tr><th style="text-align:left">Ürün</th><th>Adet</th><th style="text-align:right">Tutar</th></tr>
            ${items}
        </table>
        <hr>
        <table>
            <tr><td>Ara Toplam:</td><td style="text-align:right">${sale.subtotal.toFixed(2)} TL</td></tr>
            ${sale.discount > 0 ? `<tr><td>İndirim:</td><td style="text-align:right">-${sale.discount.toFixed(2)} TL</td></tr>` : ''}
            <tr class="total"><td>TOPLAM:</td><td style="text-align:right">${sale.total.toFixed(2)} TL</td></tr>
        </table>
        <hr>
        <p class="center">Ödeme: ${sale.paymentMethod === 'cash' ? 'Nakit' : 'Kart'}</p>
        <p class="center" style="margin-top:10px">Teşekkür ederiz!</p>
        <button class="no-print" onclick="window.print()" style="width:100%;padding:8px;margin-top:10px;cursor:pointer">Yazdır</button>
        </body></html>
    `);
    receiptWindow.document.close();
}

async function showSalesHistory() {
    const modal = createElement('div', {
        className: 'modal',
        innerHTML: `
            <div class="modal-content" style="max-width:700px">
                <div class="modal-header">
                    <h2>Satış Geçmişi</h2>
                    <button class="modal-close" id="close-history-modal">✕</button>
                </div>
                <div class="modal-form">
                    <div class="toolbar" style="margin-bottom:1rem;gap:0.5rem;flex-wrap:wrap">
                        <input type="text" id="history-search" placeholder="Fiş no ile ara..." style="flex:1;min-width:150px">
                        <select id="history-status-filter" style="width:auto">
                            <option value="">Tümü</option>
                            <option value="completed">Tamamlanan</option>
                            <option value="cancelled">İptal</option>
                            <option value="refunded">İade</option>
                        </select>
                    </div>
                    <div id="history-list" style="max-height:400px;overflow-y:auto">
                        <p class="text-muted">Yükleniyor...</p>
                    </div>
                </div>
            </div>
        `
    });
    document.body.appendChild(modal);
    modal.querySelector('#close-history-modal').onclick = () => modal.remove();

    async function loadHistory() {
        const status = document.getElementById('history-status-filter').value;
        const historyList = document.getElementById('history-list');
        try {
            const res = await api.sales.getAll({ status, limit: 50 });
            if (res.success && res.data.length > 0) {
                const search = (document.getElementById('history-search').value || '').toLowerCase();
                const filtered = search
                    ? res.data.filter(s => s.saleNumber?.toLowerCase().includes(search))
                    : res.data;

                if (filtered.length === 0) {
                    historyList.innerHTML = '<p class="text-muted text-center">Sonuç bulunamadı</p>';
                    return;
                }

                historyList.innerHTML = filtered.map(s => {
                    const statusBadge = s.status === 'completed'
                        ? '<span class="badge badge-success">Tamamlandı</span>'
                        : s.status === 'cancelled'
                        ? '<span class="badge badge-danger">İptal</span>'
                        : '<span class="badge badge-warning">İade</span>';

                    return `
                        <div class="list-item" style="cursor:pointer" data-sale-id="${s._id}">
                            <div class="list-item-content">
                                <div class="list-item-title">${s.saleNumber || 'Fiş'} ${statusBadge}</div>
                                <div class="list-item-subtitle">${formatDateTime(s.createdAt)} · ${s.items.length} ürün · ${s.paymentMethod === 'cash' ? 'Nakit' : 'Kart'}</div>
                            </div>
                            <div style="text-align:right">
                                <div class="text-success" style="font-weight:600">${formatCurrency(s.total)}</div>
                                ${s.status === 'completed' ? `
                                    <div style="margin-top:4px;display:flex;gap:4px">
                                        <button class="btn btn-ghost btn-sm cancel-sale-btn" data-id="${s._id}" title="İptal Et">❌</button>
                                        <button class="btn btn-ghost btn-sm refund-sale-btn" data-id="${s._id}" title="İade Et">↩️</button>
                                        <button class="btn btn-ghost btn-sm print-sale-btn" data-id="${s._id}" title="Fiş Yazdır">🖨️</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                // İptal butonları
                historyList.querySelectorAll('.cancel-sale-btn').forEach(btn => {
                    btn.onclick = async (e) => {
                        e.stopPropagation();
                        if (await confirm('Bu satışı iptal etmek istediğinize emin misiniz?')) {
                            try {
                                const res = await api.sales.cancel(btn.dataset.id, 'Manuel iptal');
                                if (res.success) {
                                    showToast('Satış iptal edildi', 'success');
                                    loadHistory();
                                }
                            } catch (err) { showToast(err.message, 'error'); }
                        }
                    };
                });

                // İade butonları
                historyList.querySelectorAll('.refund-sale-btn').forEach(btn => {
                    btn.onclick = async (e) => {
                        e.stopPropagation();
                        if (await confirm('Bu satışı iade etmek istediğinize emin misiniz?')) {
                            try {
                                const res = await api.sales.refund(btn.dataset.id, 'Manuel iade');
                                if (res.success) {
                                    showToast('Satış iade edildi', 'success');
                                    loadHistory();
                                }
                            } catch (err) { showToast(err.message, 'error'); }
                        }
                    };
                });

                // Fiş yazdırma butonları
                historyList.querySelectorAll('.print-sale-btn').forEach(btn => {
                    btn.onclick = async (e) => {
                        e.stopPropagation();
                        try {
                            const res = await api.sales.getById(btn.dataset.id);
                            if (res.success) {
                                printReceipt(res.data);
                            }
                        } catch (err) { showToast(err.message, 'error'); }
                    };
                });
            } else {
                historyList.innerHTML = '<p class="text-muted text-center">Satış bulunamadı</p>';
            }
        } catch (e) {
            historyList.innerHTML = '<p class="text-danger">' + e.message + '</p>';
        }
    }

    document.getElementById('history-status-filter').onchange = loadHistory;
    document.getElementById('history-search').oninput = debounce(loadHistory, 300);
    await loadHistory();
}

// Sales Page (POS)
let cart = [];

// ─── USB Barcode Scanner Buffer System ───
// Barcode guns type at 10-20ms intervals and send Enter at the end.
// Human typing is much slower (>50ms between keys).
const scannerBuffer = {
    buffer: '',
    lastKeyTime: 0,
    MAX_KEY_INTERVAL: 50, // ms — gap threshold between scanner vs human typing

    handleKeyDown(e) {
        const now = Date.now();
        const target = e.target;

        // Don't intercept if user is typing in a text input (except barcode-input)
        if (target.tagName === 'INPUT' && target.id !== 'barcode-input') return;
        if (target.tagName === 'TEXTAREA') return;
        if (target.tagName === 'SELECT') return;

        // If too much time passed, reset buffer (human typing)
        if (now - this.lastKeyTime > this.MAX_KEY_INTERVAL && this.buffer.length > 0) {
            this.buffer = '';
        }
        this.lastKeyTime = now;

        if (e.key === 'Enter') {
            if (this.buffer.length >= 4) { // Minimum barcode length
                e.preventDefault();
                const barcode = this.buffer;
                this.buffer = '';

                // If on sales page, add to cart
                const barcodeInput = document.getElementById('barcode-input');
                if (barcodeInput) {
                    barcodeInput.value = '';
                    addToCart(barcode);
                }
            }
            this.buffer = '';
        } else if (e.key.length === 1) {
            // Single character key (not Shift, Ctrl, etc.)
            this.buffer += e.key;
        }
    }
};

// Global listener for barcode scanner
document.addEventListener('keydown', (e) => scannerBuffer.handleKeyDown(e));

router.register('sales', async (container) => {
    cart = [];
    container.innerHTML = `
        <div class="page-header">
            <h2>Satış</h2>
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
                        <input type="number" id="cart-discount" value="0" min="0" style="width:80px;text-align:right">
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

    // Manual typing: user types barcode and presses Enter
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
    document.getElementById('clear-cart-btn').onclick = () => { cart = []; renderCart(); };
});

async function addToCart(barcode) {
    try {
        let product = null;

        // Try IndexedDB first (0 latency, works offline)
        if (typeof offlineDB !== 'undefined') {
            product = await offlineDB.getProductByBarcode(barcode);
        }

        // Fallback to server if not found locally
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
    const discount = parseFloat(document.getElementById('cart-discount')?.value || 0);
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
            cart = [];
            renderCart();
            document.getElementById('cart-discount').value = 0;
        }
    } catch (e) {
        // Offline fallback: queue sale locally
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

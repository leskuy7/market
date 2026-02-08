// Sales Page (POS)
let cart = [];

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
    let barcodeTimeout;

    const processBarcode = async () => {
        const barcode = barcodeInput.value.trim();
        if (barcode) {
            await addToCart(barcode);
            barcodeInput.value = '';
            barcodeInput.focus();
        }
    };

    barcodeInput.addEventListener('input', (e) => {
        if (barcodeTimeout) clearTimeout(barcodeTimeout);

        // Hızlı yazma/okuma bittikten 400ms sonra işlem yap
        if (e.target.value.trim().length > 0) {
            barcodeTimeout = setTimeout(processBarcode, 400);
        }
    });

    barcodeInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            if (barcodeTimeout) clearTimeout(barcodeTimeout);
            await processBarcode();
        }
    });

    document.getElementById('cart-discount').oninput = updateCartTotals;
    document.getElementById('complete-sale-btn').onclick = completeSale;
    document.getElementById('clear-cart-btn').onclick = () => { cart = []; renderCart(); };
});

async function addToCart(barcode) {
    try {
        const res = await api.products.getByBarcode(barcode);
        if (res.success) {
            const product = res.data;
            const existing = cart.find(i => i.product._id === product._id);
            if (existing) {
                if (existing.quantity < product.stock) {
                    existing.quantity++;
                } else {
                    showToast('Yetersiz stok', 'warning');
                    return;
                }
            } else {
                if (product.stock < 1) {
                    showToast('Stokta yok', 'error');
                    return;
                }
                cart.push({ product, quantity: 1 });
            }
            renderCart();
            showToast(`${product.name} eklendi`, 'success');
        }
    } catch (e) {
        showToast('Ürün bulunamadı', 'error');
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
            cart = [];
            renderCart();
            document.getElementById('cart-discount').value = 0;
        }
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// Settings Page
router.register('settings', async (container) => {
    const user = auth.getUser();
    container.innerHTML = `
        <div class="page-header">
            <h2>Ayarlar</h2>
        </div>
        <div class="card mb-2">
            <div class="card-header"><h3>👤 Hesap Bilgileri</h3></div>
            <div class="card-body">
                <div class="list-item">
                    <div class="list-item-icon">👤</div>
                    <div class="list-item-content">
                        <div class="list-item-title">${user?.name || user?.email || 'Kullanıcı'}</div>
                        <div class="list-item-subtitle">${user?.email || ''}</div>
                    </div>
                    <span class="badge ${user?.role === 'admin' ? 'badge-primary' : 'badge-success'}">
                        ${user?.role === 'admin' ? 'Admin' : 'Personel'}
                    </span>
                </div>
            </div>
        </div>
        <div class="card mb-2">
            <div class="card-header"><h3>📱 Uygulama</h3></div>
            <div class="card-body">
                <div class="list-item">
                    <div class="list-item-icon">📲</div>
                    <div class="list-item-content">
                        <div class="list-item-title">Uygulamayı Yükle</div>
                        <div class="list-item-subtitle">PWA olarak cihaza ekle</div>
                    </div>
                    <button class="btn btn-sm btn-primary" id="install-btn">Yükle</button>
                </div>
                <div class="list-item">
                    <div class="list-item-icon">🗑️</div>
                    <div class="list-item-content">
                        <div class="list-item-title">Önbelleği Temizle</div>
                        <div class="list-item-subtitle">Yerel verileri sil</div>
                    </div>
                    <button class="btn btn-sm btn-outline" id="clear-cache-btn">Temizle</button>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="card-header"><h3>ℹ️ Hakkında</h3></div>
            <div class="card-body">
                <p class="text-muted">Market Stok Takip v1.0.0</p>
                <p class="text-muted" style="font-size:0.875rem">PWA ile geliştirilen stok takip uygulaması</p>
            </div>
        </div>
    `;

    document.getElementById('clear-cache-btn').onclick = async () => {
        if (await confirm('Önbellek temizlensin mi?')) {
            storage.clear();
            showToast('Önbellek temizlendi', 'success');
        }
    };

    // PWA install
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
    });

    document.getElementById('install-btn').onclick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                showToast('Uygulama yükleniyor', 'success');
            }
            deferredPrompt = null;
        } else {
            showToast('Uygulama zaten yüklü veya desteklenmiyor', 'info');
        }
    };
});

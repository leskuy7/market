// 404 Page
router.register('404', async (container) => {
    container.innerHTML = `
        <div class="error-page">
            <div class="error-content">
                <div class="error-code">404</div>
                <h1 class="error-title">Sayfa Bulunamadı</h1>
                <p class="error-message">Aradığınız sayfa mevcut değil veya taşınmış olabilir.</p>
                <div class="error-actions">
                    <button class="btn btn-primary" onclick="router.navigate('dashboard')">
                        🏠 Ana Sayfaya Dön
                    </button>
                    <button class="btn btn-outline" onclick="history.back()">
                        ← Geri Git
                    </button>
                </div>
            </div>
        </div>
    `;
});

// 500 Error Page
router.register('500', async (container) => {
    container.innerHTML = `
        <div class="error-page">
            <div class="error-content">
                <div class="error-code error-500">500</div>
                <h1 class="error-title">Sunucu Hatası</h1>
                <p class="error-message">Bir şeyler yanlış gitti. Lütfen daha sonra tekrar deneyin.</p>
                <div class="error-actions">
                    <button class="btn btn-primary" onclick="location.reload()">
                        🔄 Sayfayı Yenile
                    </button>
                    <button class="btn btn-outline" onclick="router.navigate('dashboard')">
                        🏠 Ana Sayfa
                    </button>
                </div>
            </div>
        </div>
    `;
});

// Connection Error Page
router.register('offline', async (container) => {
    container.innerHTML = `
        <div class="error-page">
            <div class="error-content">
                <div class="error-code error-offline">📡</div>
                <h1 class="error-title">Bağlantı Yok</h1>
                <p class="error-message">İnternet bağlantınızı kontrol edin ve tekrar deneyin.</p>
                <div class="error-actions">
                    <button class="btn btn-primary" onclick="location.reload()">
                        🔄 Tekrar Dene
                    </button>
                </div>
            </div>
        </div>
    `;
});

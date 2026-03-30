// Settings Page
router.register('settings', async (container) => {
    const user = auth.getUser();
    const isAdmin = auth.isAdmin();

    container.innerHTML = `
        <div class="page-header">
            <h2>Ayarlar</h2>
        </div>

        <!-- Profil Bilgileri -->
        <div class="card mb-2">
            <div class="card-header"><h3>👤 Profil Bilgileri</h3></div>
            <div class="card-body">
                <form id="profile-form">
                    <div class="form-group">
                        <label>Ad Soyad</label>
                        <input type="text" id="profile-name" value="${user?.name || ''}" placeholder="Adınız">
                    </div>
                    <div class="form-group">
                        <label>E-posta</label>
                        <input type="email" id="profile-email" value="${user?.email || ''}" placeholder="E-posta adresiniz">
                    </div>
                    <div class="form-group">
                        <label>Rol</label>
                        <input type="text" value="${user?.role === 'admin' ? 'Yönetici' : 'Personel'}" disabled>
                    </div>
                    <button type="submit" class="btn btn-primary">Profili Güncelle</button>
                </form>
            </div>
        </div>

        <!-- Şifre Değiştirme -->
        <div class="card mb-2">
            <div class="card-header"><h3>🔒 Şifre Değiştir</h3></div>
            <div class="card-body">
                <form id="password-form">
                    <div class="form-group">
                        <label>Mevcut Şifre</label>
                        <input type="password" id="current-password" required autocomplete="current-password">
                    </div>
                    <div class="form-group">
                        <label>Yeni Şifre</label>
                        <input type="password" id="new-password" required minlength="8" autocomplete="new-password">
                        <small class="text-muted">En az 8 karakter, 1 harf ve 1 rakam</small>
                    </div>
                    <div class="form-group">
                        <label>Yeni Şifre Tekrar</label>
                        <input type="password" id="new-password-confirm" required minlength="8" autocomplete="new-password">
                    </div>
                    <button type="submit" class="btn btn-primary">Şifreyi Değiştir</button>
                </form>
            </div>
        </div>

        ${isAdmin ? `
        <!-- Kullanıcı Yönetimi (Admin) -->
        <div class="card mb-2">
            <div class="card-header"><h3>👥 Kullanıcı Yönetimi</h3></div>
            <div class="card-body" id="users-list">
                <p class="text-muted">Yükleniyor...</p>
            </div>
        </div>
        ` : ''}

        <!-- Uygulama -->
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

    // Profil güncelleme
    document.getElementById('profile-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Güncelleniyor...';

        try {
            const res = await api.auth.updateProfile({
                name: document.getElementById('profile-name').value.trim(),
                email: document.getElementById('profile-email').value.trim()
            });
            if (res.success) {
                storage.set('user', res.user);
                auth.user = res.user;
                document.getElementById('user-name').textContent = res.user.name || res.user.email;
                showToast('Profil güncellendi', 'success');
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
        btn.disabled = false;
        btn.textContent = 'Profili Güncelle';
    };

    // Şifre değiştirme
    document.getElementById('password-form').onsubmit = async (e) => {
        e.preventDefault();
        const newPass = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('new-password-confirm').value;

        if (newPass.length < 8) {
            showToast('Şifre en az 8 karakter olmalıdır', 'warning');
            return;
        }
        if (!/[A-Za-z]/.test(newPass) || !/\d/.test(newPass)) {
            showToast('Şifre en az 1 harf ve 1 rakam içermelidir', 'warning');
            return;
        }
        if (newPass !== confirmPass) {
            showToast('Şifre tekrarı eşleşmiyor', 'warning');
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Değiştiriliyor...';

        try {
            const res = await api.auth.changePassword({
                currentPassword: document.getElementById('current-password').value,
                newPassword: newPass
            });
            if (res.success) {
                if (res.token) {
                    storage.set('token', res.token);
                }
                showToast('Şifre başarıyla değiştirildi', 'success');
                e.target.reset();
            }
        } catch (err) {
            showToast(err.message, 'error');
        }
        btn.disabled = false;
        btn.textContent = 'Şifreyi Değiştir';
    };

    // Kullanıcı yönetimi (admin)
    if (isAdmin) {
        try {
            const res = await api.users.getAll();
            const usersList = document.getElementById('users-list');
            if (res.success && res.data.length > 0) {
                usersList.innerHTML = res.data.map(u => `
                    <div class="list-item" data-user-id="${u._id}">
                        <div class="list-item-icon">👤</div>
                        <div class="list-item-content">
                            <div class="list-item-title">${u.name || u.email}</div>
                            <div class="list-item-subtitle">${u.email} · Son giriş: ${u.lastLogin ? formatRelativeTime(u.lastLogin) : 'Hiç'}</div>
                        </div>
                        <span class="badge ${u.role === 'admin' ? 'badge-primary' : 'badge-success'}">${u.role === 'admin' ? 'Admin' : 'Personel'}</span>
                        ${u._id !== user.id ? `
                            <select class="user-role-select" data-uid="${u._id}" style="margin-left:0.5rem;padding:0.25rem">
                                <option value="staff" ${u.role === 'staff' ? 'selected' : ''}>Personel</option>
                                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                            </select>
                            <button class="btn btn-ghost btn-sm toggle-user-btn" data-uid="${u._id}" data-active="${u.isActive}" style="margin-left:0.5rem">
                                ${u.isActive ? '🚫' : '✅'}
                            </button>
                        ` : '<span class="badge badge-info" style="margin-left:0.5rem">Siz</span>'}
                    </div>
                `).join('');

                // Rol değiştirme
                usersList.querySelectorAll('.user-role-select').forEach(select => {
                    select.onchange = async () => {
                        try {
                            await api.users.update(select.dataset.uid, { role: select.value });
                            showToast('Kullanıcı rolü güncellendi', 'success');
                        } catch (err) { showToast(err.message, 'error'); }
                    };
                });

                // Kullanıcı aktif/pasif
                usersList.querySelectorAll('.toggle-user-btn').forEach(btn => {
                    btn.onclick = async () => {
                        const isActive = btn.dataset.active === 'true';
                        const action = isActive ? 'devre dışı bırakmak' : 'aktif etmek';
                        if (await confirm(`Bu kullanıcıyı ${action} istediğinize emin misiniz?`)) {
                            try {
                                await api.users.update(btn.dataset.uid, { isActive: !isActive });
                                showToast('Kullanıcı güncellendi', 'success');
                                router.navigate('settings');
                            } catch (err) { showToast(err.message, 'error'); }
                        }
                    };
                });
            } else {
                usersList.innerHTML = '<p class="text-muted">Kullanıcı bulunamadı</p>';
            }
        } catch (e) {
            document.getElementById('users-list').innerHTML = '<p class="text-danger">' + e.message + '</p>';
        }
    }

    // Önbellek temizle
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

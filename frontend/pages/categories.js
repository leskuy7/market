// Categories Page
router.register('categories', async (container) => {
    container.innerHTML = `
        <div class="page-header">
            <h2>Kategoriler</h2>
            <button class="btn btn-primary" id="add-category-btn">+ Yeni Kategori</button>
        </div>
        <div id="categories-list"></div>
    `;

    await loadCategoriesList();
    document.getElementById('add-category-btn').onclick = () => openCategoryModal();
});

async function loadCategoriesList() {
    const container = document.getElementById('categories-list');
    try {
        const res = await api.categories.getAll();
        if (res.success && res.data.length > 0) {
            container.innerHTML = res.data.map(c => `
                <div class="list-item" data-id="${c._id}">
                    <div class="list-item-icon" style="background:${c.color}20">${c.icon}</div>
                    <div class="list-item-content">
                        <div class="list-item-title">${c.name}</div>
                        <div class="list-item-subtitle">${c.description || 'Açıklama yok'}</div>
                    </div>
                    <div class="list-item-actions">
                        <button class="btn btn-ghost btn-sm edit-cat">✏️</button>
                        <button class="btn btn-ghost btn-sm delete-cat">🗑️</button>
                    </div>
                </div>
            `).join('');

            container.querySelectorAll('.list-item').forEach(item => {
                item.querySelector('.edit-cat').onclick = () => openCategoryModal(item.dataset.id);
                item.querySelector('.delete-cat').onclick = () => deleteCategory(item.dataset.id);
            });
        } else {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏷️</div><h3>Kategori yok</h3></div>';
        }
    } catch (e) { container.innerHTML = '<p class="text-danger">' + e.message + '</p>'; }
}

async function openCategoryModal(id = null) {
    const modal = createElement('div', {
        className: 'modal',
        innerHTML: `
            <div class="modal-content" style="max-width:400px">
                <div class="modal-header">
                    <h2>${id ? 'Kategori Düzenle' : 'Yeni Kategori'}</h2>
                    <button class="modal-close" id="close-cat-modal">✕</button>
                </div>
                <form id="category-form" class="modal-form">
                    <input type="hidden" id="cat-id" value="${id || ''}">
                    <div class="form-row">
                        <div class="form-group">
                            <label>İkon</label>
                            <input type="text" id="cat-icon" value="📦" maxlength="2">
                        </div>
                        <div class="form-group">
                            <label>Renk</label>
                            <input type="color" id="cat-color" value="#6366f1">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Kategori Adı</label>
                        <input type="text" id="cat-name" required>
                    </div>
                    <div class="form-group">
                        <label>Açıklama</label>
                        <textarea id="cat-desc" rows="2"></textarea>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" id="cancel-cat">İptal</button>
                        <button type="submit" class="btn btn-primary">Kaydet</button>
                    </div>
                </form>
            </div>
        `
    });
    document.body.appendChild(modal);

    if (id) {
        try {
            const cats = await api.categories.getAll();
            const cat = cats.data.find(c => c._id === id);
            if (cat) {
                document.getElementById('cat-icon').value = cat.icon;
                document.getElementById('cat-color').value = cat.color;
                document.getElementById('cat-name').value = cat.name;
                document.getElementById('cat-desc').value = cat.description || '';
            }
        } catch (e) { console.error(e); }
    }

    modal.querySelector('#close-cat-modal').onclick = () => modal.remove();
    modal.querySelector('#cancel-cat').onclick = () => modal.remove();
    modal.querySelector('#category-form').onsubmit = async (e) => {
        e.preventDefault();
        const catId = document.getElementById('cat-id').value;
        const data = {
            icon: document.getElementById('cat-icon').value,
            color: document.getElementById('cat-color').value,
            name: document.getElementById('cat-name').value,
            description: document.getElementById('cat-desc').value
        };
        try {
            const res = catId ? await api.categories.update(catId, data) : await api.categories.create(data);
            if (res.success) {
                showToast(catId ? 'Kategori güncellendi' : 'Kategori eklendi', 'success');
                modal.remove();
                loadCategoriesList();
            }
        } catch (err) { showToast(err.message, 'error'); }
    };
}

async function deleteCategory(id) {
    if (await confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) {
        try {
            const res = await api.categories.delete(id);
            if (res.success) {
                showToast('Kategori silindi', 'success');
                loadCategoriesList();
            }
        } catch (e) { showToast(e.message, 'error'); }
    }
}

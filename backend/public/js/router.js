// Router Module
const router = {
    currentPage: 'dashboard',
    pages: {},

    register(name, handler) {
        this.pages[name] = handler;
    },

    async navigate(page) {
        if (!this.pages[page]) {
            console.error(`Page not found: ${page}`);
            return this.navigate('404');
        }

        this.currentPage = page;

        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        document.querySelectorAll('.bottom-nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            products: 'Ürünler',
            sales: 'Satış',
            stock: 'Stok Takip',
            reports: 'Raporlar',
            categories: 'Kategoriler',
            settings: 'Ayarlar'
        };
        document.getElementById('page-title').textContent = titles[page] || page;

        // Load page content
        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = '<div class="loading-content"><div class="loading-spinner"></div></div>';

        try {
            await this.pages[page](mainContent);
        } catch (error) {
            mainContent.innerHTML = `<div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <h3>Hata</h3>
                <p>${error.message}</p>
            </div>`;
        }

        // Close sidebar on mobile
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar-overlay').classList.remove('open');
    }
};

// Setup navigation listeners
// Setup navigation listeners
document.addEventListener('DOMContentLoaded', () => {
    // Handle hash based navigation
    const handleHashChange = () => {
        const hash = window.location.hash.slice(1) || 'dashboard';
        router.navigate(hash);
    };

    window.addEventListener('hashchange', handleHashChange);

    // Initial load
    handleHashChange();

    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) {
                window.location.hash = page;
            }
        });
    });
});

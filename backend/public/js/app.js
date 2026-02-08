// Main App
const app = {
    async init() {
        // Check authentication
        const isValid = await auth.verify();

        // Hide loading screen
        document.getElementById('loading-screen').classList.add('hidden');

        if (isValid) {
            this.showApp();
        } else {
            this.showLogin();
        }

        this.setupEventListeners();
    },

    showLogin() {
        document.getElementById('app').classList.add('hidden');
        document.getElementById('register-screen').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
    },

    showApp() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('register-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');

        // Update user info
        const user = auth.getUser();
        if (user) {
            document.getElementById('user-name').textContent = user.name;
            document.getElementById('user-role').textContent = user.role === 'admin' ? 'Yönetici' : 'Personel';
        }

        // Navigate to dashboard
        window.location.hash = 'dashboard';
    },

    setupEventListeners() {
        // Menu toggle
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        menuToggle?.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        });

        overlay?.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
        });

        // Login form handlers
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const showRegister = document.getElementById('show-register');
        const showLogin = document.getElementById('show-login');
        const logoutBtn = document.getElementById('logout-btn');

        showRegister?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('register-screen').classList.remove('hidden');
        });

        showLogin?.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-screen').classList.add('hidden');
            document.getElementById('login-screen').classList.remove('hidden');
        });

        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = loginForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Giriş yapılıyor...';

            const result = await auth.login(
                document.getElementById('login-username').value,
                document.getElementById('login-password').value
            );

            if (result.success) {
                showToast('Giriş başarılı!', 'success');
                this.showApp();
            } else {
                showToast(result.message, 'error');
            }

            btn.disabled = false;
            btn.textContent = 'Giriş Yap';
        });

        registerForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = registerForm.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Kayıt olunuyor...';

            const result = await auth.register({
                name: document.getElementById('register-name').value,
                username: document.getElementById('register-username').value,
                email: document.getElementById('register-email').value,
                password: document.getElementById('register-password').value
            });

            if (result.success) {
                showToast('Kayıt başarılı! Lütfen giriş yapın.', 'success');
                this.showLogin();
                // Clear form
                registerForm.reset();
            } else {
                showToast(result.message, 'error');
            }

            btn.disabled = false;
            btn.textContent = 'Kayıt Ol';
        });

        logoutBtn?.addEventListener('click', () => {
            auth.logout();
            this.showLogin();
            showToast('Çıkış yapıldı', 'info');
        });
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

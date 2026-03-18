// Main App
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

function normalizeEmail(value) {
    return value.trim().toLowerCase();
}

function getEmailValidationMessage(email) {
    if (!email) {
        return 'E-posta gereklidir';
    }

    if (!EMAIL_REGEX.test(email)) {
        return 'Geçerli bir e-posta adresi girin';
    }

    return null;
}

function getPasswordValidationMessage(password, requireStrongPassword = false) {
    if (!password) {
        return 'Şifre gereklidir';
    }

    if (!requireStrongPassword) {
        return null;
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        return `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalıdır`;
    }

    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
        return 'Şifre en az 1 harf ve 1 rakam içermelidir';
    }

    return null;
}

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
        requestAnimationFrame(() => document.getElementById('login-email')?.focus());
    },

    showRegister() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('register-screen').classList.remove('hidden');
        requestAnimationFrame(() => document.getElementById('register-email')?.focus());
    },

    showApp() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('register-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');

        // Update user info
        const user = auth.getUser();
        if (user) {
            document.getElementById('user-name').textContent = user.name || user.email;
            document.getElementById('user-role').textContent = user.role === 'admin' ? 'Yönetici' : 'Personel';
        }

        // Navigate to dashboard
        router.navigate('dashboard');
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

        this.setupPasswordToggles();

        showRegister?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegister();
        });

        showLogin?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogin();
        });

        loginForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = loginForm.querySelector('button[type="submit"]');
            const email = normalizeEmail(document.getElementById('login-email').value);
            const password = document.getElementById('login-password').value;

            const emailMessage = getEmailValidationMessage(email);
            if (emailMessage) {
                showToast(emailMessage, 'warning');
                document.getElementById('login-email').focus();
                return;
            }

            const passwordMessage = getPasswordValidationMessage(password);
            if (passwordMessage) {
                showToast(passwordMessage, 'warning');
                document.getElementById('login-password').focus();
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Giriş yapılıyor...';

            const result = await auth.login(
                email,
                password
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
            const email = normalizeEmail(document.getElementById('register-email').value);
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-password-confirm').value;

            const emailMessage = getEmailValidationMessage(email);
            if (emailMessage) {
                showToast(emailMessage, 'warning');
                document.getElementById('register-email').focus();
                return;
            }

            const passwordMessage = getPasswordValidationMessage(password, true);
            if (passwordMessage) {
                showToast(passwordMessage, 'warning');
                document.getElementById('register-password').focus();
                return;
            }

            if (password !== confirmPassword) {
                showToast('Şifre tekrarı eşleşmiyor', 'warning');
                document.getElementById('register-password-confirm').focus();
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Kayıt olunuyor...';

            const result = await auth.register({
                email,
                password
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
    },

    setupPasswordToggles() {
        document.querySelectorAll('.password-toggle').forEach((button) => {
            const targetId = button.dataset.target;
            const input = document.getElementById(targetId);

            if (!input) {
                return;
            }

            button.addEventListener('click', () => {
                const isPassword = input.type === 'password';
                input.type = isPassword ? 'text' : 'password';
                button.classList.toggle('is-visible', isPassword);
                button.setAttribute('aria-label', isPassword ? 'Şifreyi gizle' : 'Şifreyi göster');
            });
        });
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

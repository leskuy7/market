// Utility functions

// Format currency (TRY)
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(amount);
}

// Format date
function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
    };
    return new Intl.DateTimeFormat('tr-TR', defaultOptions).format(new Date(date));
}

// Format date time
function formatDateTime(date) {
    return new Intl.DateTimeFormat('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

// Format relative time
function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} gün önce`;
    if (hours > 0) return `${hours} saat önce`;
    if (minutes > 0) return `${minutes} dakika önce`;
    return 'Az önce';
}

// Show toast notification
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function (...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Local storage helpers
const storage = {
    get(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch {
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },

    remove(key) {
        localStorage.removeItem(key);
    },

    clear() {
        localStorage.clear();
    }
};

// Element helpers
function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function createElement(tag, options = {}) {
    const element = document.createElement(tag);

    if (options.className) element.className = options.className;
    if (options.id) element.id = options.id;
    if (options.innerHTML) element.innerHTML = options.innerHTML;
    if (options.textContent) element.textContent = options.textContent;

    if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
            element.setAttribute(key, value);
        });
    }

    if (options.events) {
        Object.entries(options.events).forEach(([event, handler]) => {
            element.addEventListener(event, handler);
        });
    }

    if (options.children) {
        options.children.forEach(child => element.appendChild(child));
    }

    return element;
}

// Confirm dialog
function confirm(message, title = 'Onayla') {
    return new Promise((resolve) => {
        const modal = createElement('div', {
            className: 'modal',
            innerHTML: `
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <h2>${title}</h2>
                    </div>
                    <div class="modal-form">
                        <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">${message}</p>
                        <div class="modal-footer" style="margin-top: 0; padding-top: 0; border-top: none;">
                            <button class="btn btn-outline" id="confirm-cancel">İptal</button>
                            <button class="btn btn-primary" id="confirm-ok">Onayla</button>
                        </div>
                    </div>
                </div>
            `
        });

        document.body.appendChild(modal);

        modal.querySelector('#confirm-cancel').onclick = () => {
            modal.remove();
            resolve(false);
        };

        modal.querySelector('#confirm-ok').onclick = () => {
            modal.remove();
            resolve(true);
        };
    });
}

// Validate form
function validateForm(formData, rules) {
    const errors = {};

    Object.entries(rules).forEach(([field, rule]) => {
        const value = formData[field];

        if (rule.required && !value) {
            errors[field] = rule.message || `${field} gereklidir`;
        }

        if (rule.minLength && value && value.length < rule.minLength) {
            errors[field] = rule.message || `${field} en az ${rule.minLength} karakter olmalıdır`;
        }

        if (rule.pattern && value && !rule.pattern.test(value)) {
            errors[field] = rule.message || `${field} geçerli değil`;
        }
    });

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

// Authentication Module

const auth = {
    user: null,

    isLoggedIn() {
        return !!storage.get('token');
    },

    getUser() {
        return this.user || storage.get('user');
    },

    async login(username, password) {
        try {
            const response = await api.auth.login(username, password);
            if (response.success) {
                storage.set('token', response.token);
                storage.set('user', response.user);
                this.user = response.user;
                return { success: true, user: response.user };
            }
            return { success: false, message: response.message };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    async register(data) {
        try {
            const response = await api.auth.register(data);
            if (response.success) {
                storage.set('token', response.token);
                storage.set('user', response.user);
                this.user = response.user;
                return { success: true, user: response.user };
            }
            return { success: false, message: response.message };
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    logout() {
        storage.remove('token');
        storage.remove('user');
        this.user = null;
    },

    async verify() {
        if (!this.isLoggedIn()) return false;
        try {
            const response = await api.auth.me();
            if (response.success) {
                this.user = response.user;
                storage.set('user', response.user);
                return true;
            }
            this.logout();
            return false;
        } catch {
            this.logout();
            return false;
        }
    },

    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    }
};

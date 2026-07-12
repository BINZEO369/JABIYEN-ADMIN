// ============================================
// JAYENWARE Admin Components
// Shared header, sidebar, and authentication
// ============================================

(function() {
    'use strict';

    // ============================================
    // Configuration
    // ============================================
    const API_BASE_URL = window.location.origin;

    // ============================================
    // Auth Helpers
    // ============================================
    window.JWAdmin = window.JWAdmin || {};

    window.JWAdmin.getToken = function() {
        return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    };

    window.JWAdmin.getRefreshToken = function() {
        return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token');
    };

    window.JWAdmin.saveToken = function(token, refreshToken, remember) {
        if (remember) {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('refresh_token', refreshToken);
        } else {
            sessionStorage.setItem('auth_token', token);
            sessionStorage.setItem('refresh_token', refreshToken);
        }
    };

    window.JWAdmin.clearTokens = function() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('refresh_token');
    };

    window.JWAdmin.isAuthenticated = async function() {
        const token = window.JWAdmin.getToken();
        if (!token) return false;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) return false;

            const data = await response.json();
            return data.success && data.data && data.data.isAdmin;
        } catch (error) {
            return false;
        }
    };

    window.JWAdmin.getCurrentUser = async function() {
        const token = window.JWAdmin.getToken();
        if (!token) return null;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to get user');

            const data = await response.json();
            if (data.success) {
                return data.data;
            }
            return null;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    };

    window.JWAdmin.logout = async function() {
        const token = window.JWAdmin.getToken();
        try {
            if (token) {
                await fetch(`${API_BASE_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            window.JWAdmin.clearTokens();
            window.location.href = '/login';
        }
    };

    window.JWAdmin.checkAuthAndRedirect = async function() {
        const isAuth = await window.JWAdmin.isAuthenticated();
        if (!isAuth) {
            window.JWAdmin.clearTokens();
            window.location.href = '/login';
            return false;
        }
        return true;
    };

    // ============================================
    // API Helpers
    // ============================================
    window.JWAdmin.api = {
        fetchWithAuth: async function(url, options = {}) {
            const token = window.JWAdmin.getToken();
            if (!token) throw new Error('No auth token');

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                ...options.headers
            };

            const response = await fetch(`${API_BASE_URL}${url}`, {
                ...options,
                headers
            });

            if (response.status === 401) {
                window.JWAdmin.clearTokens();
                window.location.href = '/login';
                throw new Error('Session expired');
            }

            return response;
        },

        get: async function(url) {
            const response = await this.fetchWithAuth(url);
            return response.json();
        },

        post: async function(url, data) {
            const response = await this.fetchWithAuth(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },

        put: async function(url, data) {
            const response = await this.fetchWithAuth(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },

        patch: async function(url, data) {
            const response = await this.fetchWithAuth(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.json();
        },

        delete: async function(url) {
            const response = await this.fetchWithAuth(url, {
                method: 'DELETE'
            });
            return response.json();
        }
    };

    // ============================================
    // Toast Notifications
    // ============================================
    window.JWAdmin.showToast = function(message, type = 'info') {
        // Create container if it doesn't exist
        let container = document.getElementById('jw-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'jw-toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        
        const colors = {
            success: { bg: '#059669', icon: 'fa-check-circle' },
            error: { bg: '#dc2626', icon: 'fa-exclamation-circle' },
            info: { bg: '#2563eb', icon: 'fa-info-circle' },
            warning: { bg: '#d97706', icon: 'fa-exclamation-triangle' }
        };

        const color = colors[type] || colors.info;

        toast.style.cssText = `
            padding: 14px 20px;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 500;
            color: #fff;
            background: ${color.bg};
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
            max-width: 380px;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: jwSlideInRight 0.3s ease;
            font-family: 'Inter', sans-serif;
        `;

        toast.innerHTML = `<i class="fa-solid ${color.icon}"></i> ${message}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // Add animation keyframes
    if (!document.getElementById('jw-toast-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'jw-toast-styles';
        styleEl.textContent = `
            @keyframes jwSlideInRight {
                from { opacity: 0; transform: translateX(50px); }
                to { opacity: 1; transform: translateX(0); }
            }
        `;
        document.head.appendChild(styleEl);
    }

    // ============================================
    // Confirm Dialog
    // ============================================
    window.JWAdmin.showConfirm = function(options) {
        return new Promise((resolve) => {
            const {
                title = 'Confirm Action',
                message = 'Are you sure?',
                confirmText = 'Confirm',
                cancelText = 'Cancel',
                type = 'danger' // danger, warning, info
            } = options;

            // Create overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.6);
                z-index: 9998;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                animation: jwFadeIn 0.2s ease;
            `;

            const icons = {
                danger: { bg: '#fef2f2', color: '#dc2626', icon: 'fa-trash-can' },
                warning: { bg: '#fffbeb', color: '#d97706', icon: 'fa-exclamation-triangle' },
                info: { bg: '#eff6ff', color: '#2563eb', icon: 'fa-circle-info' }
            };

            const iconStyle = icons[type] || icons.info;

            overlay.innerHTML = `
                <div style="
                    background: #fff;
                    border-radius: 16px;
                    padding: 28px;
                    max-width: 400px;
                    width: 100%;
                    text-align: center;
                    animation: jwSlideUp 0.3s ease;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
                ">
                    <div style="
                        width: 56px;
                        height: 56px;
                        border-radius: 50%;
                        background: ${iconStyle.bg};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 16px;
                        font-size: 24px;
                        color: ${iconStyle.color};
                    ">
                        <i class="fa-solid ${iconStyle.icon}"></i>
                    </div>
                    <h3 style="
                        font-family: 'Manrope', sans-serif;
                        font-size: 18px;
                        font-weight: 700;
                        color: #1d1d1f;
                        margin: 0 0 8px;
                    ">${title}</h3>
                    <p style="
                        font-size: 14px;
                        color: #86868b;
                        margin: 0 0 20px;
                        line-height: 1.6;
                    ">${message}</p>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="jw-confirm-cancel" style="
                            display: inline-flex;
                            align-items: center;
                            gap: 8px;
                            padding: 10px 20px;
                            border-radius: 50px;
                            font-size: 13px;
                            font-weight: 600;
                            cursor: pointer;
                            border: 1.5px solid #d1d1d6;
                            background: transparent;
                            color: #1d1d1f;
                            font-family: 'Inter', sans-serif;
                            transition: all 0.25s ease;
                        ">${cancelText}</button>
                        <button class="jw-confirm-ok" style="
                            display: inline-flex;
                            align-items: center;
                            gap: 8px;
                            padding: 10px 20px;
                            border-radius: 50px;
                            font-size: 13px;
                            font-weight: 600;
                            cursor: pointer;
                            border: none;
                            background: ${iconStyle.color};
                            color: #fff;
                            font-family: 'Inter', sans-serif;
                            transition: all 0.25s ease;
                        ">${confirmText}</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Add animation styles
            if (!document.getElementById('jw-confirm-styles')) {
                const styleEl = document.createElement('style');
                styleEl.id = 'jw-confirm-styles';
                styleEl.textContent = `
                    @keyframes jwFadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes jwSlideUp {
                        from { opacity: 0; transform: translateY(20px) scale(0.97); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                `;
                document.head.appendChild(styleEl);
            }

            // Event listeners
            overlay.querySelector('.jw-confirm-cancel').addEventListener('click', () => {
                overlay.remove();
                resolve(false);
            });

            overlay.querySelector('.jw-confirm-ok').addEventListener('click', () => {
                overlay.remove();
                resolve(true);
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve(false);
                }
            });

            // Escape key
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    overlay.remove();
                    document.removeEventListener('keydown', escHandler);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', escHandler);
        });
    };

    // ============================================
    // Escape HTML
    // ============================================
    window.JWAdmin.escapeHTML = function(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    // ============================================
    // Format Date
    // ============================================
    window.JWAdmin.formatDate = function(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        } catch (e) {
            return dateString;
        }
    };

    // ============================================
    // Debounce
    // ============================================
    window.JWAdmin.debounce = function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    console.log(' JAYENWARE Admin Components loaded');
})();

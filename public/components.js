// public/components.js
// JAYENWARE Admin Dashboard - Reusable UI Components
// This file contains all the sidebar, header, and layout components
// No authentication logic is included here

const JAYENWARE = window.JAYENWARE || {};

/**
 * Admin Layout Components
 * Handles sidebar, header, refresh button, and page navigation
 */
JAYENWARE.Components = (function() {
    'use strict';

    // ============================================
    // Configuration
    // ============================================
    const CONFIG = {
        sidebarWidth: '280px',
        mobileBreakpoint: 1024,
        pageTitles: {
            'dashboard': 'Dashboard',
            'hero1': 'Hero 1',
            'hero2': 'Hero 2',
            'hero-primary': 'Hero Banner Management',
            'hero-secondary': 'Secondary Banner Management',
            'admins': 'Admin Users',
            'settings': 'Settings'
        },
        roleMap: {
            'super_admin': 'Super Admin',
            'admin': 'Administrator',
            'moderator': 'Moderator'
        }
    };

    // ============================================
    // Private State
    // ============================================
    let _currentPage = 'dashboard';
    let _userData = null;

    // ============================================
    // Sidebar HTML Template
    // ============================================
    function getSidebarHTML() {
        return `
            <div class="sidebar-header">
                <a href="/" class="sidebar-logo">
                    <img src="/logo.png" alt="JAYENWARE" onerror="this.style.display='none'">
                    <span class="sidebar-logo-text">JAYENWARE</span>
                </a>
            </div>

            <nav class="sidebar-nav">
                <a href="#" class="sidebar-link active" data-page="dashboard">
                    <i class="fa-solid fa-grid-2"></i>
                    <span>Dashboard</span>
                </a>

                <div class="sidebar-section-label">Content Management</div>

                <a href="#" class="sidebar-link" data-page="hero1" data-url="/hero1">
                    <i class="fa-solid fa-image"></i>
                    <span>Hero 1</span>
                    <span class="badge hero1-count">0</span>
                </a>

                <a href="#" class="sidebar-link" data-page="hero2" data-url="/hero2">
                    <i class="fa-solid fa-images"></i>
                    <span>Hero 2</span>
                    <span class="badge hero2-count">0</span>
                </a>

                <a href="#" class="sidebar-link" data-page="hero-primary">
                    <i class="fa-solid fa-image"></i>
                    <span>Hero Banner</span>
                    <span class="badge hero-primary-count">0</span>
                </a>

                <a href="#" class="sidebar-link" data-page="hero-secondary">
                    <i class="fa-solid fa-images"></i>
                    <span>Secondary Banner</span>
                    <span class="badge hero-secondary-count">0</span>
                </a>

                <div class="sidebar-section-label">Administration</div>

                <a href="#" class="sidebar-link" data-page="admins">
                    <i class="fa-solid fa-users-gear"></i>
                    <span>Admin Users</span>
                    <span class="badge admin-count">0</span>
                </a>

                <a href="#" class="sidebar-link" data-page="settings">
                    <i class="fa-solid fa-gear"></i>
                    <span>Settings</span>
                </a>
            </nav>

            <div class="sidebar-footer">
                <div class="sidebar-user">
                    <div class="sidebar-user-avatar user-avatar-display">A</div>
                    <div class="sidebar-user-info">
                        <div class="sidebar-user-name user-name-display">Admin User</div>
                        <div class="sidebar-user-role user-role-display">Administrator</div>
                    </div>
                    <button class="sidebar-logout" id="sidebarLogoutBtn" title="Logout">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // ============================================
    // Top Bar / Header HTML Template
    // ============================================
    function getTopBarHTML() {
        return `
            <div style="display:flex;align-items:center;gap:12px;">
                <button class="mobile-menu-toggle" id="mobileMenuToggle">
                    <i class="fa-solid fa-bars"></i>
                </button>
                <h1 class="top-bar-title page-title-display">Dashboard</h1>
            </div>
            <div class="top-bar-actions">
                <button class="top-bar-btn" id="notificationBtn" title="Notifications">
                    <i class="fa-regular fa-bell"></i>
                    <span class="notification-dot"></span>
                </button>
                <button class="top-bar-btn" id="refreshBtn" title="Refresh">
                    <i class="fa-solid fa-rotate"></i>
                </button>
            </div>
        `;
    }

    // ============================================
    // Sidebar Overlay HTML
    // ============================================
    function getSidebarOverlayHTML() {
        return `<div class="sidebar-overlay" id="sidebarOverlay"></div>`;
    }

    // ============================================
    // Public Methods
    // ============================================

    /**
     * Initialize the sidebar component
     * @param {string} containerSelector - CSS selector for sidebar container
     */
    function initSidebar(containerSelector = '#sidebar') {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.error('Sidebar container not found:', containerSelector);
            return;
        }

        container.innerHTML = getSidebarHTML();
        _bindSidebarEvents();
    }

    /**
     * Initialize the top bar / header
     * @param {string} containerSelector - CSS selector for header container
     */
    function initTopBar(containerSelector = '.top-bar') {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.error('Top bar container not found:', containerSelector);
            return;
        }

        container.innerHTML = getTopBarHTML();
        _bindTopBarEvents();
    }

    /**
     * Initialize the sidebar overlay
     * @param {string} containerSelector - CSS selector for overlay container
     */
    function initOverlay(containerSelector = '#sidebarOverlay') {
        // Check if overlay already exists
        let overlay = document.querySelector(containerSelector);
        if (!overlay) {
            // Create overlay if it doesn't exist
            overlay = document.createElement('div');
            overlay.id = 'sidebarOverlay';
            overlay.className = 'sidebar-overlay';
            
            // Insert after sidebar
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.insertAdjacentElement('afterend', overlay);
            } else {
                document.body.appendChild(overlay);
            }
        }

        _bindOverlayEvents(overlay);
    }

    /**
     * Initialize all layout components at once
     * @param {Object} options - Initialization options
     * @param {string} options.sidebarSelector - Sidebar container selector
     * @param {string} options.topBarSelector - Top bar container selector
     */
    function initAll(options = {}) {
        const {
            sidebarSelector = '#sidebar',
            topBarSelector = '.top-bar'
        } = options;

        initSidebar(sidebarSelector);
        initTopBar(topBarSelector);
        initOverlay();
        _updateGreeting();
    }

    /**
     * Navigate to a specific page
     * @param {string} page - Page identifier
     * @fires JAYENWARE:pageChange - Custom event when page changes
     */
    function navigateTo(page) {
        if (!page) return;

        _currentPage = page;

        // Update sidebar active link
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.page === page) {
                link.classList.add('active');
            }
        });

        // Update page title in header
        const titleElement = document.querySelector('.page-title-display');
        if (titleElement) {
            titleElement.textContent = CONFIG.pageTitles[page] || 'Dashboard';
        }

        // Update URL if page has a data-url attribute
        const activeLink = document.querySelector(`.sidebar-link[data-page="${page}"]`);
        if (activeLink && activeLink.dataset.url) {
            history.pushState(null, '', activeLink.dataset.url);
        }

        // Close mobile sidebar
        closeSidebar();

        // Dispatch custom event for page change
        window.dispatchEvent(new CustomEvent('JAYENWARE:pageChange', {
            detail: { page: page }
        }));

        // Dispatch navigation event
        window.dispatchEvent(new CustomEvent('JAYENWARE:navigate', {
            detail: { page: page }
        }));
    }

    /**
     * Toggle mobile sidebar
     */
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
        
        if (overlay) {
            overlay.classList.toggle('show');
        }
    }

    /**
     * Close mobile sidebar
     */
    function closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        if (sidebar) {
            sidebar.classList.remove('open');
        }
        
        if (overlay) {
            overlay.classList.remove('show');
        }
    }

    /**
     * Update user info in sidebar
     * @param {Object} userData - User data object
     * @param {string} userData.name - User display name
     * @param {string} userData.email - User email
     * @param {string} userData.role - User role (super_admin, admin, moderator)
     * @param {string} userData.avatarLetter - First letter for avatar
     */
    function updateUserInfo(userData) {
        if (!userData) return;
        _userData = userData;

        const avatarEl = document.querySelector('.user-avatar-display');
        const nameEl = document.querySelector('.user-name-display');
        const roleEl = document.querySelector('.user-role-display');

        if (avatarEl) {
            const letter = userData.avatarLetter || 
                          (userData.name ? userData.name.charAt(0).toUpperCase() : 
                          (userData.email ? userData.email.charAt(0).toUpperCase() : 'A'));
            avatarEl.textContent = letter;
        }

        if (nameEl) {
            nameEl.textContent = userData.name || userData.email || 'Admin User';
        }

        if (roleEl) {
            roleEl.textContent = CONFIG.roleMap[userData.role] || 'Administrator';
        }
    }

    /**
     * Update sidebar badge counts
     * @param {Object} counts - Count object
     * @param {number} counts.hero1 - Hero 1 count
     * @param {number} counts.hero2 - Hero 2 count
     * @param {number} counts.heroPrimary - Hero banner count
     * @param {number} counts.heroSecondary - Secondary banner count
     * @param {number} counts.admins - Admin users count
     */
    function updateSidebarCounts(counts = {}) {
        const hero1El = document.querySelector('.hero1-count');
        const hero2El = document.querySelector('.hero2-count');
        const heroPrimaryEl = document.querySelector('.hero-primary-count');
        const heroSecondaryEl = document.querySelector('.hero-secondary-count');
        const adminEl = document.querySelector('.admin-count');

        if (hero1El) hero1El.textContent = counts.hero1 || 0;
        if (hero2El) hero2El.textContent = counts.hero2 || 0;
        if (heroPrimaryEl) heroPrimaryEl.textContent = counts.heroPrimary || 0;
        if (heroSecondaryEl) heroSecondaryEl.textContent = counts.heroSecondary || 0;
        if (adminEl) adminEl.textContent = counts.admins || 0;
    }

    /**
     * Get current active page
     * @returns {string} Current page identifier
     */
    function getCurrentPage() {
        return _currentPage;
    }

    /**
     * Set refresh button callback
     * @param {Function} callback - Function to call on refresh click
     */
    function onRefresh(callback) {
        if (typeof callback !== 'function') return;

        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            // Remove old listeners by cloning
            const newBtn = refreshBtn.cloneNode(true);
            refreshBtn.parentNode.replaceChild(newBtn, refreshBtn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Add spinning animation
                const icon = newBtn.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-spin');
                    setTimeout(() => icon.classList.remove('fa-spin'), 1000);
                }
                callback();
            });
        }
    }

    /**
     * Set logout button callback
     * @param {Function} callback - Function to call on logout click
     */
    function onLogout(callback) {
        if (typeof callback !== 'function') return;

        const logoutBtn = document.getElementById('sidebarLogoutBtn');
        if (logoutBtn) {
            // Remove old listeners by cloning
            const newBtn = logoutBtn.cloneNode(true);
            logoutBtn.parentNode.replaceChild(newBtn, logoutBtn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                callback();
            });
        }
    }

    /**
     * Set notification button callback
     * @param {Function} callback - Function to call on notification click
     */
    function onNotification(callback) {
        if (typeof callback !== 'function') return;

        const notifBtn = document.getElementById('notificationBtn');
        if (notifBtn) {
            const newBtn = notifBtn.cloneNode(true);
            notifBtn.parentNode.replaceChild(newBtn, notifBtn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                callback();
            });
        }
    }

    // ============================================
    // Private Event Binding Methods
    // ============================================
    function _bindSidebarEvents() {
        // Navigation links
        document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.dataset.page;
                navigateTo(page);
            });
        });
    }

    function _bindTopBarEvents() {
        // Mobile menu toggle
        const mobileToggle = document.getElementById('mobileMenuToggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', toggleSidebar);
        }
    }

    function _bindOverlayEvents(overlay) {
        if (overlay) {
            overlay.addEventListener('click', closeSidebar);
        }
    }

    function _updateGreeting() {
        const hour = new Date().getHours();
        let greeting;
        if (hour < 12) greeting = 'Good Morning';
        else if (hour < 17) greeting = 'Good Afternoon';
        else greeting = 'Good Evening';

        const greetingEl = document.getElementById('greetingText');
        if (greetingEl) {
            greetingEl.textContent = greeting;
        }
    }

    // ============================================
    // Public API
    // ============================================
    return {
        initSidebar: initSidebar,
        initTopBar: initTopBar,
        initOverlay: initOverlay,
        initAll: initAll,
        navigateTo: navigateTo,
        toggleSidebar: toggleSidebar,
        closeSidebar: closeSidebar,
        updateUserInfo: updateUserInfo,
        updateSidebarCounts: updateSidebarCounts,
        getCurrentPage: getCurrentPage,
        onRefresh: onRefresh,
        onLogout: onLogout,
        onNotification: onNotification,
        CONFIG: CONFIG
    };

})();

// Export for use in other scripts
window.JAYENWARE = window.JAYENWARE || {};
window.JAYENWARE.Components = JAYENWARE.Components;

console.log('JAYENWARE Components loaded successfully');

// ============================================================================
// components.js - Shared Header, Common Functions & Glassmorphism UI
// Brand: JABIYEN (Premium Apparel)
// ============================================================================

let cart = JSON.parse(localStorage.getItem('jabiyen_cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('jabiyen_wish') || '[]');
let userSession = null;
let allMenuItems = [];
let allCategories = [];
let allSubcategories = [];
let announcementData = null;

window.JABIYEN_COMPONENTS_INITIALIZED = window.JABIYEN_COMPONENTS_INITIALIZED || false;

// ============================================================================
// FONT CONFIGURATION LOADER
// ============================================================================
function loadFontsConfiguration() {
    if (!window.JABIYEN_FONTS) {
        const script = document.createElement('script');
        script.src = '/fonts.js';
        script.async = false;
        script.onload = () => { applyFontVariables(); };
        document.head.appendChild(script);
    } else {
        applyFontVariables();
    }
}

function applyFontVariables() {
    const fonts = window.JABIYEN_FONTS;
    if (!fonts) return;
    const root = document.documentElement;
    const vars = fonts.cssVariables;
    for (const [key, value] of Object.entries(vars)) {
        root.style.setProperty(key, value);
    }
    root.style.setProperty('--font-heading', fonts.families.heading || 'Manrope, sans-serif');
    root.style.setProperty('--font-subtitle', fonts.families.subtitle || 'Sora, sans-serif');
    root.style.setProperty('--font-body', fonts.families.body || 'Inter, sans-serif');
}

// ============================================================================
// ANNOUNCEMENT API FETCH
// ============================================================================
async function fetchAnnouncement() {
    try {
        const response = await fetch('/api/announcement');
        if (!response.ok) throw new Error('Failed to fetch announcement');
        const data = await response.json();
        announcementData = data;
        return data;
    } catch (error) {
        console.error('Announcement fetch error:', error);
        return null;
    }
}

// ============================================================================
// SHARED CSS STYLES - Header, Navigation, Drawers, Cart, Toast ONLY
// ============================================================================
function injectSharedStyles() {
    if (document.getElementById("shared-components-style")) return;

    const styles = `
    <style id="shared-components-style">
        :root {
            --primary: #000000;
            --accent: #ffffff;
            --glass-white: rgba(255, 255, 255, 0.15);
            --glass-white-thick: rgba(255, 255, 255, 0.7);
            --glass-black: rgba(0, 0, 0, 0.6);
            --glass-black-thick: rgba(0, 0, 0, 0.82);
            --glass-border-light: rgba(255, 255, 255, 0.2);
            --glass-border-dark: rgba(0, 0, 0, 0.06);
            --glass-border-inline: rgba(255, 255, 255, 0.15);
            --glass-blur: blur(25px) saturate(200%);
            --bar-height: 36px;
        }
        
        html, body {
            overflow-x: hidden !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important; 
            padding: 0 !important;
            box-sizing: border-box;
        }
        
        *, *:before, *:after { box-sizing: inherit; }
        
        /* ==================== TYPOGRAPHY ==================== */
        .text-heading-hero { font-family: var(--font-heading); font-size: clamp(2.5rem, 6vw, 4.5rem); line-height: 1.05; font-weight: 800; letter-spacing: -0.03em; color: var(--primary); }
        .text-heading-xl { font-family: var(--font-heading); font-size: clamp(2rem, 5vw, 3.5rem); line-height: 1.1; font-weight: 700; letter-spacing: -0.02em; color: var(--primary); }
        .text-heading-lg { font-family: var(--font-heading); font-size: clamp(1.5rem, 4vw, 2.5rem); line-height: 1.15; font-weight: 700; letter-spacing: -0.015em; color: var(--primary); }
        .text-heading-md { font-family: var(--font-heading); font-size: clamp(1.25rem, 3vw, 2rem); line-height: 1.2; font-weight: 600; color: var(--primary); }
        .text-heading-sm { font-family: var(--font-heading); font-size: clamp(1rem, 2.5vw, 1.5rem); line-height: 1.25; font-weight: 600; color: var(--primary); }
        .text-body-sm { font-family: var(--font-body); font-size: 0.875rem; line-height: 1.55; font-weight: 400; color: #2c2c2e; }
        .text-body-xs { font-family: var(--font-body); font-size: 0.75rem; line-height: 1.5; font-weight: 400; color: #3a3a3c; }
        
        /* ==================== TOP ANNOUNCEMENT BAR - DYNAMIC ==================== */
        .top-announcement-bar {
            background: #000000 !important;
            color: #ffffff !important;
            font-family: var(--font-body);
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            height: var(--bar-height);
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100% !important;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 60;
            padding: 0 45px 0 16px;
            text-align: center;
            overflow: hidden;
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, height 0.4s ease;
        }
        .top-announcement-bar.bar-hidden {
            transform: translateY(-100%);
            opacity: 0;
            height: 0 !important;
            pointer-events: none;
        }
        .top-announcement-bar a {
            color: rgba(255,255,255,0.7);
            text-decoration: underline;
            font-weight: 700;
            margin-left: 6px;
            transition: color 0.2s ease;
        }
        .top-announcement-bar a:hover {
            color: #ffffff;
        }
        .announcement-close-btn {
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: rgba(255,255,255,0.6);
            cursor: pointer;
            padding: 4px;
            transition: color 0.2s ease, transform 0.2s ease;
        }
        .announcement-close-btn:hover { color: #ffffff; transform: translateY(-50%) scale(1.1); }

        /* ==================== GLASS NAVIGATION ==================== */
        .glass-nav {
            position: fixed;
            top: var(--bar-height); 
            left: 0 !important; 
            right: 0 !important;
            width: 100% !important; 
            /* Initial state: Transparent, no background */
            background: transparent !important;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            border-bottom: 1px solid transparent;
            box-shadow: none;
            transition: background 0.4s ease, backdrop-filter 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease, top 0.4s ease;
            z-index: 50;
            margin: 0 !important;
            padding: 0 !important;
        }
        .glass-nav.nav-scrolled {
            top: 0 !important; 
            /* Scrolled state: Light white background with blur */
            background: rgba(255,255,255,0.92) !important;
            backdrop-filter: blur(25px) saturate(180%);
            -webkit-backdrop-filter: blur(25px) saturate(180%);
            border-bottom: 1px solid rgba(0,0,0,0.06);
            box-shadow: 0 4px 30px rgba(0,0,0,0.03);
        }
        body.announcement-dismissed .glass-nav:not(.nav-scrolled) { top: 0 !important; }
        .glass-nav > div {
            padding-left: 16px !important;
            padding-right: 12px !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
        }
        @media (min-width: 1024px) {
            .glass-nav > div {
                padding-left: 40px !important;
                padding-right: 28px !important;
            }
        }
        body { 
            padding-top: 0 !important;
            font-family: var(--font-body);
            background-color: #ffffff;
            color: var(--primary);
        }

        /* ==================== HEADER ICONS ==================== */
        .header-icon-btn {
            background: none;
            border: none;
            padding: 4px;
            margin: 0 1px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--primary);
            transition: opacity 0.25s ease;
            position: relative;
        }
        .header-icon-btn:hover { opacity: 0.6; }
        .drawer-close-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 6px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: currentColor;
            transition: opacity 0.25s ease;
        }
        .drawer-close-btn:hover { opacity: 0.5; }

        /* ==================== SIDE DRAWER ==================== */
        .side-menu-overlay {
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.25);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            z-index: 199; opacity: 0; visibility: hidden;
            transition: all 0.45s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .side-menu-overlay.active { opacity: 1; visibility: visible; }
        .side-menu-drawer {
            position: fixed; top: 0; right: 0;
            width: 100%; max-width: 400px;
            height: 100vh; height: 100dvh;
            background: rgba(255,255,255,0.45);
            backdrop-filter: blur(40px) saturate(250%);
            -webkit-backdrop-filter: blur(40px) saturate(250%);
            border-left: 1px solid rgba(255,255,255,0.55);
            z-index: 200;
            transform: translateX(105%); 
            visibility: hidden; 
            transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex; flex-direction: column;
            box-shadow: -20px 0 60px rgba(0,0,0,0.03);
        }
        .side-menu-drawer.open { transform: translateX(0); visibility: visible; }
        .side-menu-header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 20px 24px; border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .side-menu-scroll { flex-grow: 1; overflow-y: auto; padding: 20px 24px; }
        .menu-node-item {
            display: flex; justify-content: space-between; align-items: center;
            padding: 14px 4px; border-bottom: 1px solid rgba(0,0,0,0.04);
            font-family: var(--font-heading);
            font-size: 14px; font-weight: 700; letter-spacing: 0.03em;
            color: var(--primary); text-decoration: none; cursor: pointer;
            transition: all 0.3s ease;
        }
        .menu-node-item:hover { padding-left: 10px; opacity: 0.7; }
        .menu-node-submenu { display: none; padding-left: 16px; border-left: 1.5px solid var(--primary); margin: 4px 0 8px 4px; }
        .menu-node-submenu.open { display: block; }
        .menu-node-sub-item {
            display: block; padding: 10px 12px; font-family: var(--font-subtitle); font-size: 12px; font-weight: 600;
            color: #3a3a3c; text-decoration: none; transition: all 0.2s ease;
        }
        .menu-node-sub-item:hover { color: var(--primary); padding-left: 4px; }
        .side-drawer-footer { padding: 24px; border-top: 1px solid rgba(0,0,0,0.05); background: rgba(255,255,255,0.2); flex-shrink: 0; }

        /* ==================== CART DRAWER - MOBILE OPTIMIZED ==================== */
        #cart-drawer {
            position: fixed; top: 0; right: 0; width: 100%; max-width: 420px; height: 100vh; height: 100dvh;
            background: var(--glass-black-thick) !important; backdrop-filter: var(--glass-blur) !important;
            -webkit-backdrop-filter: var(--glass-blur) !important; border-left: 1px solid var(--glass-border-inline); z-index: 210;
            transform: translateX(105%) !important; visibility: hidden;
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important, visibility 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
            will-change: transform; color: var(--accent) !important; display: flex; flex-direction: column;
        }
        #cart-drawer.open { transform: translateX(0) !important; visibility: visible !important; }
        #cart-drawer h2, #cart-drawer span, #cart-drawer p, #cart-drawer h4, #cart-drawer div { color: var(--accent); }
        #cart-drawer .bg-soft { background: rgba(255,255,255,0.06) !important; border-bottom: 1px solid rgba(255,255,255,0.1); }
        #cart-items > div { background: rgba(255,255,255,0.04) !important; border: 1px solid rgba(255,255,255,0.06); backdrop-filter: blur(12px); border-radius: 16px; }
        .custom-scroll::-webkit-scrollbar { width: 2px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }

        /* ==================== CART ITEM - MOBILE FRIENDLY ==================== */
        .cart-item-card {
            background: rgba(255,255,255,0.04) !important;
            border: 1px solid rgba(255,255,255,0.06) !important;
            backdrop-filter: blur(16px) !important;
            -webkit-backdrop-filter: blur(16px) !important;
            border-radius: 16px !important;
            padding: 12px !important;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
            position: relative;
            overflow: hidden;
        }
        .cart-item-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%);
            pointer-events: none;
        }
        .cart-item-card:hover {
            background: rgba(255,255,255,0.07) !important;
            border-color: rgba(255,255,255,0.12) !important;
        }
        
        .cart-item-image {
            width: 64px;
            height: 64px;
            object-fit: cover;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.06);
            flex-shrink: 0;
            background: rgba(255,255,255,0.03);
        }
        
        .cart-item-title {
            font-family: var(--font-heading);
            font-weight: 700;
            font-size: 12px;
            color: #ffffff;
            line-height: 1.3;
            letter-spacing: -0.01em;
        }
        
        .cart-item-variant {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 2px;
        }
        
        .cart-item-variant-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: rgba(255,255,255,0.06);
            padding: 1px 10px 1px 6px;
            border-radius: 14px;
            font-size: 7px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: rgba(255,255,255,0.65);
            font-family: var(--font-subtitle);
            border: 1px solid rgba(255,255,255,0.03);
        }
        .cart-item-variant-badge .color-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            border: 1px solid rgba(255,255,255,0.12);
            flex-shrink: 0;
        }
        
        .cart-item-barcode {
            font-family: 'Courier New', monospace;
            font-size: 6px;
            letter-spacing: 0.06em;
            color: rgba(255,255,255,0.2);
            margin-top: 1px;
            background: rgba(255,255,255,0.02);
            padding: 1px 8px;
            border-radius: 6px;
            display: inline-block;
            border: 1px solid rgba(255,255,255,0.02);
        }
        
        .cart-item-price {
            font-family: var(--font-body);
            font-weight: 900;
            font-size: 14px;
            color: #ffffff;
            letter-spacing: -0.01em;
        }
        .cart-item-old-price {
            font-family: var(--font-body);
            font-size: 9px;
            text-decoration: line-through;
            color: rgba(255,255,255,0.25);
        }
        
        /* ==================== QUANTITY CONTROLS - MOBILE OPTIMIZED ==================== */
        .cart-item-quantity-control {
            display: flex;
            align-items: center;
            gap: 2px;
            background: rgba(255,255,255,0.06);
            border-radius: 10px;
            padding: 1px 2px;
            border: 1px solid rgba(255,255,255,0.04);
        }
        .cart-item-quantity-control button {
            background: none;
            border: none;
            color: rgba(255,255,255,0.5);
            cursor: pointer;
            padding: 2px 8px;
            font-size: 13px;
            font-weight: 700;
            transition: all 0.2s ease;
            border-radius: 8px;
            min-width: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            touch-action: manipulation;
        }
        .cart-item-quantity-control button:active {
            transform: scale(0.85);
            background: rgba(255,255,255,0.1);
        }
        .cart-item-quantity-control button:hover {
            color: #ffffff;
            background: rgba(255,255,255,0.06);
        }
        .cart-item-quantity-control .qty-num {
            font-size: 11px;
            font-weight: 700;
            min-width: 20px;
            text-align: center;
            color: rgba(255,255,255,0.9);
            font-family: var(--font-body);
            user-select: none;
        }
        
        .cart-item-remove-btn {
            background: none;
            border: none;
            color: rgba(255,255,255,0.12);
            cursor: pointer;
            padding: 4px;
            transition: all 0.3s ease;
            border-radius: 8px;
            line-height: 1;
            touch-action: manipulation;
        }
        .cart-item-remove-btn:active { transform: scale(0.85); }
        .cart-item-remove-btn:hover {
            color: #ef4444;
            background: rgba(239,68,68,0.08);
        }
        
        .cart-item-sku-badge {
            font-family: var(--font-subtitle);
            font-size: 7px;
            font-weight: 600;
            color: rgba(255,255,255,0.2);
            letter-spacing: 0.04em;
            text-transform: uppercase;
            background: rgba(255,255,255,0.02);
            padding: 1px 8px;
            border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.02);
        }
        
        /* ==================== DETAILS TOGGLE ==================== */
        .cart-item-details-toggle {
            background: none;
            border: none;
            color: rgba(255,255,255,0.2);
            cursor: pointer;
            padding: 2px 6px;
            font-size: 7px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            transition: all 0.3s ease;
            font-family: var(--font-subtitle);
            touch-action: manipulation;
            border-radius: 6px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }
        .cart-item-details-toggle:active { transform: scale(0.9); }
        .cart-item-details-toggle:hover {
            color: rgba(255,255,255,0.5);
            background: rgba(255,255,255,0.04);
        }
        .cart-item-details-toggle .toggle-icon {
            transition: transform 0.3s ease;
            font-size: 6px;
        }
        .cart-item-details-toggle .toggle-icon.open {
            transform: rotate(180deg);
        }
        
        .cart-item-extra-details {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, margin 0.3s ease;
            opacity: 0;
            margin-top: 0;
        }
        .cart-item-extra-details.open {
            max-height: 200px;
            opacity: 1;
            margin-top: 6px;
        }
        .cart-item-extra-details-inner {
            display: flex;
            flex-wrap: wrap;
            gap: 3px 8px;
            padding: 6px 8px;
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.03);
        }
        .cart-item-extra-details-inner span {
            font-size: 6px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: rgba(255,255,255,0.3);
            font-family: var(--font-subtitle);
            font-weight: 500;
        }
        .cart-item-extra-details-inner span::before {
            content: '•';
            margin-right: 4px;
            color: rgba(255,255,255,0.08);
        }
        .cart-item-extra-details-inner span:first-child::before { display: none; }
        
        .cart-item-category-tag {
            font-size: 6px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: rgba(255,255,255,0.12);
            font-family: var(--font-body);
            font-weight: 500;
            background: rgba(255,255,255,0.02);
            padding: 1px 8px;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.02);
            display: inline-block;
        }
        
        .cart-item-bottom-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 4px;
            flex-wrap: wrap;
            gap: 4px;
        }

        /* ==================== TOAST ==================== */
        #toast > div {
            background: rgba(255,255,255,0.85) !important; backdrop-filter: blur(40px) saturate(250%) !important;
            -webkit-backdrop-filter: blur(40px) saturate(250%) !important; border: 1px solid rgba(255,255,255,0.55) !important;
            box-shadow: 0 30px 60px rgba(0,0,0,0.1) !important; border-radius: 20px !important; color: var(--primary) !important;
        }
        #toast-icon { background: var(--primary) !important; color: var(--accent) !important; }

        /* ==================== CART EMPTY STATE ==================== */
        .cart-empty-state {
            text-align: center;
            padding: 40px 20px;
        }
        .cart-empty-state i {
            font-size: 44px;
            color: rgba(255,255,255,0.05);
            margin-bottom: 16px;
        }
        .cart-empty-state h3 {
            font-family: var(--font-heading);
            font-size: 16px;
            font-weight: 700;
            color: rgba(255,255,255,0.4);
            margin-bottom: 4px;
        }
        .cart-empty-state p {
            font-family: var(--font-body);
            font-size: 11px;
            color: rgba(255,255,255,0.15);
        }

        /* ==================== CART CHECKOUT SUMMARY ==================== */
        .cart-summary-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 4px 0;
        }
        .cart-summary-row .label { color: rgba(255,255,255,0.35); }
        .cart-summary-row .value { font-weight: 700; color: rgba(255,255,255,0.85); }
        .cart-summary-total {
            border-top: 1px solid rgba(255,255,255,0.06);
            padding-top: 10px;
            margin-top: 4px;
        }
        .cart-summary-total .label {
            font-size: 11px;
            font-weight: 700;
            color: rgba(255,255,255,0.5);
        }
        .cart-summary-total .value {
            font-size: 18px;
            font-weight: 900;
            color: #ffffff;
            letter-spacing: -0.01em;
        }
        .cart-checkout-btn {
            padding: 14px !important;
            font-size: 10px !important;
            border-radius: 14px !important;
            letter-spacing: 0.08em !important;
        }

        .btn-primary {
            font-family: var(--font-body); font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
            background: var(--primary) !important; color: var(--accent) !important; border-radius: 12px !important;
            transition: all 0.3s ease !important;
        }
        .btn-primary:hover { background: #1c1c1e !important; transform: translateY(-1px); }
        #wish-count, #cart-count {
            background: var(--primary) !important; color: var(--accent) !important;
            font-size: 7px !important; font-weight: 700; border: 1px solid rgba(255,255,255,0.55);
            top: -2px !important; right: -2px !important;
            min-width: 16px !important;
            height: 16px !important;
            padding: 0 4px !important;
        }
    </style>
    `;
    document.head.insertAdjacentHTML('beforeend', styles);
}

// ============================================================================
// DATA CONTROLLER & UTILITIES
// ============================================================================
function createSlug(text) {
    if (!text) return '';
    return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
}

async function fetchMenuItems() {
    try {
        const response = await fetch('/api/menu-items');
        if (!response.ok) throw new Error('Failed to fetch menu pipeline');
        allMenuItems = await response.json();
        return allMenuItems;
    } catch (error) {
        console.error('Menu infrastructure error:', error);
        return [];
    }
}

async function fetchCategories() {
    try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        allCategories = await response.json();
        return allCategories;
    } catch (error) {
        console.error('Category framework error:', error);
        return [];
    }
}

async function fetchSubcategories() {
    try {
        const response = await fetch('/api/subcategories');
        if (!response.ok) throw new Error('Failed to fetch subcategories');
        allSubcategories = await response.json();
        return allSubcategories;
    } catch (error) {
        console.error('Subcategory architecture error:', error);
        return [];
    }
}

function buildMenuTree(items, parentId = null) {
    return items
        .filter(item => (item.parent_id || null) === (parentId || null))
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map(item => ({ ...item, children: buildMenuTree(items, item.id) }));
}

function getMenuLinkUrl(item) {
    if (item.link && item.link.trim() !== '') return item.link;
    const slug = item.slug || '';
    switch (item.menu_type) {
        case 'home': return '/';
        case 'products': return '/products';
        case 'category': return item.category_slug ? `/category/${item.category_slug}` : '#';
        case 'subcategory': return (item.category_slug && item.subcategory_slug) ? `/category/${item.category_slug}/${item.subcategory_slug}` : '#';
        case 'contact': return '/contact';
        case 'about': return '/about';
        case 'journal': return '/journal';
        default: return slug ? `/${slug}` : '#';
    }
}

// ============================================================================
// RENDER UNIFIED DRAWER ENGINE
// ============================================================================
function renderUnifiedDrawerMenu(rootItems) {
    let html = '';
    rootItems.forEach((item, index) => {
        const hasChildren = item.children && item.children.length > 0;
        const linkUrl = getMenuLinkUrl(item);
        const uniqueId = `drawer-node-${index}-${Date.now()}`;
        
        if (hasChildren) {
            html += `
            <div>
                <div class="menu-node-item" onclick="toggleDrawerSubmenu('${uniqueId}', this)">
                    <span>${item.title || item.name || ''}</span>
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" class="opacity-40"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="menu-node-submenu" id="${uniqueId}">
                    ${renderDrawerSubItems(item, uniqueId)}
                </div>
            </div>`;
        } else {
            html += `
            <a href="${linkUrl}" class="menu-node-item no-underline">
                <span>${item.title || item.name || ''}</span>
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg" class="opacity-30"><path d="M1 5H13M13 5L9 1M13 5L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </a>`;
        }
    });
    return html;
}

// ============================================================================
// DRAWER INNER LOGICS
// ============================================================================
function renderDrawerSubItems(item, parentId) {
    if (item.menu_type === 'category' && item.show_categories_from_db) {
        return renderDatabaseCategoriesToDrawer(parentId);
    }
    if (item.children && item.children.length > 0) {
        let html = '';
        item.children.forEach((child, idx) => {
            const hasGrandChildren = child.children && child.children.length > 0;
            const linkUrl = getMenuLinkUrl(child);
            const uniqueId = `${parentId}-sub-${idx}`;
            
            if (hasGrandChildren) {
                html += `
                <div>
                    <div class="menu-node-sub-item flex justify-between items-center cursor-pointer font-bold" onclick="toggleDrawerSubmenu('${uniqueId}', this)">
                        <span>${child.title || child.name || ''}</span>
                        <svg width="8" height="5" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" class="opacity-40"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </div>
                    <div class="menu-node-submenu" id="${uniqueId}">
                        ${child.children.map(gc => `<a href="${getMenuLinkUrl(gc)}" class="menu-node-sub-item">${gc.title || gc.name || ''}</a>`).join('')}
                    </div>
                </div>`;
            } else {
                html += `<a href="${linkUrl}" class="menu-node-sub-item">${child.title || child.name || ''}</a>`;
            }
        });
        return html;
    }
    return renderDatabaseCategoriesToDrawer(parentId);
}

function renderDatabaseCategoriesToDrawer(parentId) {
    if (!allCategories || allCategories.length === 0) {
        return '<div class="menu-node-sub-item opacity-40">No configuration found</div>';
    }
    let html = '';
    allCategories.forEach((cat, idx) => {
        const catSlug = cat.slug || createSlug(cat.name);
        const catUrl = `/category/${catSlug}`;
        const uniqueId = `${parentId}-cat-${idx}`;
        const subcategories = allSubcategories.filter(sub => sub.category_id === cat.id);
        
        if (subcategories.length > 0) {
            html += `
            <div>
                <div class="menu-node-sub-item flex justify-between items-center cursor-pointer font-bold text-black" onclick="toggleDrawerSubmenu('${uniqueId}', this)">
                    <span>${cat.name}</span>
                    <svg width="8" height="5" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" class="opacity-40"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
                <div class="menu-node-submenu" id="${uniqueId}">
                    <a href="${catUrl}" class="menu-node-sub-item font-black underline decoration-black/10">All ${cat.name}</a>
                    ${subcategories.map(sub => {
                        const subSlug = sub.slug || createSlug(sub.name);
                        return `<a href="/category/${catSlug}/${subSlug}" class="menu-node-sub-item">${sub.name}</a>`;
                    }).join('')}
                </div>
            </div>`;
        } else {
            html += `<a href="${catUrl}" class="menu-node-sub-item">${cat.name}</a>`;
        }
    });
    return html;
}

// ============================================================================
// HEADER SYSTEM
// ============================================================================
async function renderHeader() {
    if (document.getElementById('main-nav') || document.getElementById('top-announcement-bar')) {
        return;
    }

    const [menuItems, categories, subcategories, announcement] = await Promise.all([
        fetchMenuItems(),
        fetchCategories(),
        fetchSubcategories(),
        fetchAnnouncement()
    ]);
    
    allCategories = categories;
    allSubcategories = subcategories;
    announcementData = announcement;
    const menuTree = buildMenuTree(menuItems);
    
    const isBarDismissed = localStorage.getItem('jabiyen_announcement_hidden') === 'true';
    const hasAnnouncement = announcementData && announcementData.message;
    const shouldShowBar = hasAnnouncement && !isBarDismissed;
    
    if (isBarDismissed) {
        document.body.classList.add('announcement-dismissed');
    }

    let announcementHTML = '';
    if (hasAnnouncement) {
        const bgColor = announcementData.bg_color || '#000000';
        const textColor = announcementData.text_color || '#ffffff';
        const message = announcementData.message || '';
        const linkUrl = announcementData.link_url || '';
        const linkTitle = announcementData.link_title || '';
        
        let linkHTML = '';
        if (linkUrl && linkTitle) {
            linkHTML = `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkTitle}</a>`;
        }
        
        announcementHTML = `
        <div class="top-announcement-bar ${shouldShowBar ? '' : 'bar-hidden'}" 
             id="top-announcement-bar" 
             style="background: ${bgColor} !important; color: ${textColor} !important;">
            <span id="announcement-text">${message} ${linkHTML}</span>
            <button class="announcement-close-btn" onclick="dismissAnnouncementBar()" aria-label="Close Announcement">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </div>
        `;
    } else {
        document.body.classList.add('announcement-dismissed');
        announcementHTML = `
        <div class="top-announcement-bar bar-hidden" id="top-announcement-bar">
            <span id="announcement-text"></span>
        </div>
        `;
    }

    const headerHTML = `
    ${announcementHTML}

    <div class="side-menu-overlay" id="sideMenuOverlay" onclick="closeSideMenu()"></div>
    <div class="side-menu-drawer" id="sideMenuDrawer">
        <div class="side-menu-header">
            <a href="/" class="flex items-center gap-3 no-underline">
                <img src="/logo.png" class="w-10 h-10 rounded-md border border-black/10 shadow-sm object-cover" alt="Logo">
                <span class="font-black text-base sm:text-lg tracking-widest" style="font-family: var(--font-heading); color: var(--primary);">JABIYEN</span>
            </a>
            <button onclick="closeSideMenu()" class="drawer-close-btn" aria-label="Close menu">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
        </div>
        <div class="side-menu-scroll" id="sideMenuContent">
            ${renderUnifiedDrawerMenu(menuTree)}
        </div>
        <div class="side-drawer-footer">
            <a href="/login" class="block w-full py-3.5 bg-black text-white rounded-xl text-center font-bold uppercase tracking-widest text-[9px] no-underline transition hover:bg-neutral-900">Account Architecture</a>
        </div>
    </div>
    
    <nav class="glass-nav" id="main-nav">
        <div class="h-14 lg:h-16 flex justify-between items-center">
            <a href="/" class="flex items-center gap-2.5 shrink-0 no-underline">
                <img src="/logo.png" class="w-10 h-10 lg:w-12 lg:h-12 rounded-md object-cover" alt="JABIYEN Logo">
                <span class="text-base sm:text-lg lg:text-xl font-black tracking-widest" style="font-family: var(--font-heading); color: var(--primary);">JABIYEN</span>
            </a>
            
            <div class="flex items-center shrink-0 gap-0.5">
                <a href="/wishlist" class="header-icon-btn" aria-label="Wishlist">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span id="wish-count" class="absolute text-[7px] w-4 h-4 rounded-full flex items-center justify-center font-bold">0</span>
                </a>
                
                <a href="/cart" onclick="toggleCart();return false;" class="header-icon-btn" aria-label="Cart">
                    <svg width="17" height="19" viewBox="0 0 19 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 6H18V18C18 19.1046 17.1046 20 16 20H3C1.89543 20 1 19.1046 1 18V6Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                        <path d="M5 6C5 3.5 6.5 1 9.5 1C12.5 1 14 3.5 14 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                    <span id="cart-count" class="absolute text-[7px] w-4 h-4 rounded-full flex items-center justify-center font-bold">0</span>
                </a>
                
                <button onclick="openSideMenu()" class="header-icon-btn" aria-label="Open Navigation Menu">
                    <svg width="20" height="13" viewBox="0 0 22 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1H21M1 7.5H21M1 14H21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
        </div>
    </nav>
    
    <div id="cart-drawer" class="shadow-2xl">
        <div class="p-4 border-b flex justify-between items-center bg-soft">
            <h2 class="text-[10px] font-black uppercase tracking-widest">Shopping Vault</h2>
            <button onclick="toggleCart()" class="drawer-close-btn text-gray-400 hover:text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
        </div>
        <div id="cart-items" class="flex-grow overflow-y-auto p-4 space-y-3 custom-scroll"></div>
        <div class="p-4 border-t bg-soft">
            <div class="space-y-1 mb-4">
                <div class="cart-summary-row">
                    <span class="label">Subtotal</span>
                    <span class="value" id="cart-subtotal">৳ 0.00</span>
                </div>
                <div class="cart-summary-row">
                    <span class="label">Items</span>
                    <span class="value" id="cart-item-count">0</span>
                </div>
                <div class="cart-summary-row cart-summary-total">
                    <span class="label">Total</span>
                    <span class="value" id="cart-total">৳ 0.00</span>
                </div>
            </div>
            <a href="/checkout" class="w-full py-3.5 bg-white text-black rounded-xl font-bold uppercase tracking-widest text-[10px] transition text-center block hover:bg-neutral-100 no-underline shadow-lg cart-checkout-btn">Execute Checkout</a>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
}

// ============================================================================
// ANNOUNCEMENT LOGIC
// ============================================================================
function dismissAnnouncementBar() {
    const bar = document.getElementById('top-announcement-bar');
    const nav = document.getElementById('main-nav');
    if (bar) bar.classList.add('bar-hidden');
    localStorage.setItem('jabiyen_announcement_hidden', 'true');
    document.body.classList.add('announcement-dismissed');
    if (nav && !nav.classList.contains('nav-scrolled')) nav.style.top = '0px';
}

// ============================================================================
// TOAST SYSTEM
// ============================================================================
function showToast(text, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'fixed bottom-5 right-5 z-[100] transition-transform duration-300 translate-x-[120%]';
        toast.innerHTML = `
            <div class="shadow-xl p-3.5 flex items-center gap-3 min-w-[240px]">
                <span id="toast-icon" class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0"></span>
                <p id="toast-text" class="text-[10px] font-bold flex-grow tracking-wide" style="font-family: var(--font-body);"></p>
                <button onclick="hideToast()" class="drawer-close-btn text-gray-400 hover:text-black shrink-0"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            </div>
        `;
        document.body.appendChild(toast);
    }
    document.getElementById('toast-text').innerText = text;
    const iconEl = document.getElementById('toast-icon');
    iconEl.innerHTML = type === 'success' ? '✓' : '!';
    toast.style.transform = 'translateX(0)';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.style.transform = 'translateX(120%)'; }, 3000);
}

function hideToast() {
    const toast = document.getElementById('toast');
    if (toast) toast.style.transform = 'translateX(120%)';
}

// ============================================================================
// SIDE DRAWER CONTROLLER
// ============================================================================
function openSideMenu() {
    const drawer = document.getElementById('sideMenuDrawer');
    if (drawer) drawer.classList.add('open');
    const overlay = document.getElementById('sideMenuOverlay');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeSideMenu() {
    const drawer = document.getElementById('sideMenuDrawer');
    if (drawer) drawer.classList.remove('open');
    const overlay = document.getElementById('sideMenuOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
    document.querySelectorAll('.menu-node-submenu.open').forEach(sub => sub.classList.remove('open'));
}

// ============================================================================
// ENHANCED CART SYSTEM
// ============================================================================
function toggleCart() {
    const drawer = document.getElementById('cart-drawer');
    if (drawer) {
        drawer.classList.toggle('open');
        if (drawer.classList.contains('open')) renderCartItems();
    }
}

window.toggleCartItemDetails = function(idx) {
    const details = document.getElementById(`cart-details-${idx}`);
    const icon = document.getElementById(`cart-toggle-icon-${idx}`);
    if (details) {
        details.classList.toggle('open');
        if (icon) icon.classList.toggle('open');
    }
};

window.addToCart = function(productId, options = {}) {
    if (!productId || !options.title) {
        console.error('Product ID and Title are required');
        return;
    }
    
    const existingIndex = cart.findIndex(item => {
        if (item.product_id !== productId) return false;
        if (options.variant_id && item.variant_id === options.variant_id) return true;
        if (!options.variant_id && !item.variant_id) {
            return item.color_id === (options.color_id || null) && 
                   item.size_id === (options.size_id || null);
        }
        return false;
    });
    
    if (existingIndex > -1) {
        cart[existingIndex].quantity += (options.quantity || 1);
        const variantName = options.color_name ? ` ${options.color_name}` : '';
        showToast(`Updated: ${cart[existingIndex].title}${variantName} × ${cart[existingIndex].quantity}`, 'success');
    } else {
        let variantParts = [];
        if (options.color_name) variantParts.push(options.color_name);
        if (options.size_name) variantParts.push(options.size_name);
        const variantDisplay = variantParts.length ? ` (${variantParts.join(' • ')})` : '';
        
        const displayImage = options.color_image || options.img || '/logo.png';
        
        const newItem = {
            id: Date.now(),
            product_id: productId,
            title: options.title,
            price: options.price || 0,
            old_price: options.old_price || null,
            img: displayImage,
            variant_id: options.variant_id || null,
            variant_name: options.variant_name || null,
            color_id: options.color_id || null,
            color_name: options.color_name || null,
            color_code: options.color_code || null,
            color_image: options.color_image || null,
            size_id: options.size_id || null,
            size_name: options.size_name || null,
            main_barcode: options.main_barcode || options.barcode || null,
            variant_barcode: options.variant_barcode || null,
            sku: options.sku || null,
            category: options.category || null,
            subcategory: options.subcategory || null,
            stock: options.stock || null,
            weight: options.weight || null,
            fabric_type: options.fabric_type || null,
            gsm_type: options.gsm_type || null,
            fit_type: options.fit_type || null,
            gender: options.gender || null,
            print_type: options.print_type || null,
            quantity: options.quantity || 1
        };
        
        cart.push(newItem);
        showToast(`Added: ${options.title}${variantDisplay}`, 'success');
    }
    
    saveCart();
    renderCartItems();
};

window.removeFromCart = function(idx) {
    const item = cart[idx];
    if (!item) return;
    let itemName = item.title;
    if (item.color_name) itemName += ` (${item.color_name})`;
    if (item.size_name) itemName += ` ${item.size_name}`;
    if (cart.length === 1 || window.confirm(`Remove "${itemName}" from bag?`)) {
        cart.splice(idx, 1);
        saveCart();
        renderCartItems();
        showToast('Removed from Bag', 'info');
    }
};

window.updateCartQuantity = function(idx, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(idx);
        return;
    }
    cart[idx].quantity = newQuantity;
    saveCart();
    renderCartItems();
};

function renderCartItems() {
    const container = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');
    const itemCountEl = document.getElementById('cart-item-count');
    if (!container) return;
    
    if (!cart.length) {
        container.innerHTML = `
            <div class="cart-empty-state">
                <i class="fa-regular fa-bag-shopping"></i>
                <h3>Your Vault is Empty</h3>
                <p>Start shopping to fill your collection</p>
            </div>
        `;
        if (subtotalEl) subtotalEl.innerText = '৳ 0.00';
        if (totalEl) totalEl.innerText = '৳ 0.00';
        if (itemCountEl) itemCountEl.innerText = '0';
        updateCounts();
        return;
    }
    
    let sub = 0;
    let totalItems = 0;
    
    container.innerHTML = cart.map((item, idx) => {
        const itemTotal = item.price * (item.quantity || 1);
        sub += itemTotal;
        totalItems += (item.quantity || 1);
        
        let variantBadges = [];
        if (item.color_name) {
            const colorDot = item.color_code ? 
                `<span class="color-dot" style="background:${item.color_code};"></span>` : '';
            variantBadges.push(`<span class="cart-item-variant-badge">${colorDot}${item.color_name}</span>`);
        }
        if (item.size_name) {
            variantBadges.push(`<span class="cart-item-variant-badge">${item.size_name}</span>`);
        }
        if (item.sku) {
            variantBadges.push(`<span class="cart-item-sku-badge">SKU: ${item.sku}</span>`);
        }
        
        let barcodeParts = [];
        if (item.main_barcode) barcodeParts.push(`Main: ${item.main_barcode}`);
        if (item.variant_barcode) barcodeParts.push(`Var: ${item.variant_barcode}`);
        const barcodeText = barcodeParts.length ? barcodeParts.join(' | ') : '';
        
        let extraDetails = [];
        if (item.fabric_type) extraDetails.push(`Fabric: ${item.fabric_type}`);
        if (item.fit_type) extraDetails.push(`Fit: ${item.fit_type}`);
        if (item.gsm_type) extraDetails.push(`GSM: ${item.gsm_type}`);
        if (item.weight) extraDetails.push(`Weight: ${item.weight}g`);
        if (item.gender) extraDetails.push(`Gender: ${item.gender}`);
        if (item.print_type) extraDetails.push(`Print: ${item.print_type}`);
        
        let categoryText = '';
        if (item.category) {
            categoryText = item.category;
            if (item.subcategory) categoryText += ` / ${item.subcategory}`;
        }
        
        const hasExtraDetails = extraDetails.length > 0 || categoryText || barcodeText;
        
        return `
        <div class="cart-item-card">
            <div class="flex gap-3">
                <img src="${item.img}" class="cart-item-image" alt="${item.title}" onerror="this.src='/logo.png'">
                <div class="flex-grow min-w-0">
                    <div class="flex items-start justify-between gap-1">
                        <h4 class="cart-item-title">${item.title}</h4>
                    </div>
                    <div class="cart-item-variant">${variantBadges.join('')}</div>
                    <div class="cart-item-bottom-row">
                        <div class="flex items-center gap-2">
                            <span class="cart-item-price">৳${itemTotal.toFixed(2)}</span>
                            ${item.old_price ? `<span class="cart-item-old-price">৳${(item.old_price * item.quantity).toFixed(2)}</span>` : ''}
                        </div>
                        <div class="cart-item-quantity-control">
                            <button onclick="updateCartQuantity(${idx}, ${(item.quantity || 1) - 1})" aria-label="Decrease">−</button>
                            <span class="qty-num">${item.quantity || 1}</span>
                            <button onclick="updateCartQuantity(${idx}, ${(item.quantity || 1) + 1})" aria-label="Increase">+</button>
                        </div>
                    </div>
                    ${hasExtraDetails ? `
                        <button class="cart-item-details-toggle" onclick="toggleCartItemDetails(${idx})">
                            Details <span class="toggle-icon" id="cart-toggle-icon-${idx}">▼</span>
                        </button>
                    ` : ''}
                    <div class="cart-item-extra-details" id="cart-details-${idx}">
                        <div class="cart-item-extra-details-inner">
                            ${categoryText ? `<span> ${categoryText}</span>` : ''}
                            ${barcodeText ? `<span> ${barcodeText}</span>` : ''}
                            ${extraDetails.map(d => `<span>${d}</span>`).join('')}
                        </div>
                    </div>
                </div>
                <button onclick="removeFromCart(${idx})" class="cart-item-remove-btn" aria-label="Remove">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
        </div>`;
    }).join('');
    
    if (subtotalEl) subtotalEl.innerText = `৳${sub.toFixed(2)}`;
    if (totalEl) totalEl.innerText = `৳${sub.toFixed(2)}`;
    if (itemCountEl) itemCountEl.innerText = totalItems;
    updateCounts();
}

window.getCartItemDetails = function(productId, variantId = null) {
    return cart.find(item => {
        if (item.product_id !== productId) return false;
        if (variantId && item.variant_id !== variantId) return false;
        return true;
    }) || null;
};

window.isVariantInCart = function(productId, colorId, sizeId) {
    return cart.some(item => {
        if (item.product_id !== productId) return false;
        if (colorId && item.color_id !== colorId) return false;
        if (sizeId && item.size_id !== sizeId) return false;
        return true;
    });
};

window.getProductQuantityInCart = function(productId) {
    return cart.filter(item => item.product_id === productId)
               .reduce((total, item) => total + (item.quantity || 0), 0);
};

window.getVariantQuantityInCart = function(productId, variantId) {
    const item = cart.find(item => item.product_id === productId && item.variant_id === variantId);
    return item ? item.quantity : 0;
};

window.clearCart = function() {
    if (cart.length === 0) return;
    if (window.confirm('Clear all items from your bag?')) {
        cart = [];
        saveCart();
        renderCartItems();
        showToast('Bag Cleared', 'info');
    }
};

window.getCartSummary = function() {
    return {
        items: cart.map(item => ({
            id: item.id,
            product_id: item.product_id,
            title: item.title,
            price: item.price,
            quantity: item.quantity,
            variant: {
                color: item.color_name,
                color_code: item.color_code,
                color_image: item.color_image,
                size: item.size_name,
                sku: item.sku,
                main_barcode: item.main_barcode,
                variant_barcode: item.variant_barcode
            },
            extra: {
                fabric: item.fabric_type,
                fit: item.fit_type,
                gsm: item.gsm_type,
                weight: item.weight,
                gender: item.gender,
                print: item.print_type
            },
            total: item.price * item.quantity
        })),
        subtotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        total_items: cart.reduce((sum, item) => sum + (item.quantity || 0), 0),
        item_count: cart.length
    };
};

function updateCounts() {
    const cartCount = document.getElementById('cart-count');
    const wishCount = document.getElementById('wish-count');
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (cartCount) {
        cartCount.innerText = totalItems;
        cartCount.style.transition = 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)';
        cartCount.style.transform = 'scale(1.4)';
        setTimeout(() => { cartCount.style.transform = 'scale(1)'; }, 150);
    }
    if (wishCount) wishCount.innerText = wishlist.length;
}

function saveCart() {
    localStorage.setItem('jabiyen_cart', JSON.stringify(cart));
    updateCounts();
}

function toggleWishlist(id) {
    if (wishlist.includes(id)) {
        wishlist = wishlist.filter(x => x !== id);
        showToast('Purged from Registry', 'info');
    } else {
        wishlist.push(id);
        showToast('Saved to Vault Collection ❤️', 'success');
    }
    localStorage.setItem('jabiyen_wish', JSON.stringify(wishlist));
    updateCounts();
}

function toggleDrawerSubmenu(submenuId, element) {
    const submenu = document.getElementById(submenuId);
    if (!submenu) return;
    submenu.classList.toggle('open');
}

function handleNavScroll() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;
    const isBarDismissed = localStorage.getItem('jabiyen_announcement_hidden') === 'true';
    const hasAnnouncement = announcementData && announcementData.message;
    const barHeight = (hasAnnouncement && !isBarDismissed) ? '36px' : '0px';
    
    if (window.scrollY > 20) {
        nav.classList.add('nav-scrolled');
        nav.style.top = '0px';
    } else {
        nav.classList.remove('nav-scrolled');
        nav.style.top = barHeight;
    }
}

// ============================================================================
// APIS & INITIALIZATION
// ============================================================================
window.showToast = showToast;
window.hideToast = hideToast;
window.toggleWishlist = toggleWishlist;
window.addToCart = addToCart;
window.toggleCart = toggleCart;
window.removeFromCart = removeFromCart;
window.updateCartQuantity = updateCartQuantity;
window.toggleCartItemDetails = toggleCartItemDetails;
window.getCartItemDetails = getCartItemDetails;
window.isVariantInCart = isVariantInCart;
window.getProductQuantityInCart = getProductQuantityInCart;
window.getVariantQuantityInCart = getVariantQuantityInCart;
window.clearCart = clearCart;
window.getCartSummary = getCartSummary;
window.openSideMenu = openSideMenu;
window.closeSideMenu = closeSideMenu;
window.toggleDrawerSubmenu = toggleDrawerSubmenu;
window.saveCart = saveCart;
window.renderCartItems = renderCartItems;
window.updateCounts = updateCounts;
window.dismissAnnouncementBar = dismissAnnouncementBar;
window.fetchAnnouncement = fetchAnnouncement;

async function initSharedComponents() {
    if (window.JABIYEN_COMPONENTS_INITIALIZED) return;
    window.JABIYEN_COMPONENTS_INITIALIZED = true;

    loadFontsConfiguration();
    injectSharedStyles();
    await renderHeader();
    
    updateCounts();
    
    window.removeEventListener('scroll', handleNavScroll);
    window.addEventListener('scroll', handleNavScroll);
    handleNavScroll(); 

    const yearEl = document.getElementById('display-year');
    if (yearEl) yearEl.innerText = new Date().getFullYear();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSharedComponents);
} else {
    setTimeout(initSharedComponents, 60);
}

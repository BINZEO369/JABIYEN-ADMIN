// ============================================================
// JAYENWARE FONTS CONFIGURATION
// Centralized font management for the entire website
// ============================================================

const JAYENWARE_FONTS = {
    // Google Fonts Family Names (CSS value)
    families: {
        // Main heading font - Titles, hero text, section headers
        heading: "'Manrope', sans-serif",
        
        // Subtitle font - Secondary headings
        subtitle: "'Sora', sans-serif",
        
        // Body/Description font - Paragraphs, descriptions, buttons, prices
        body: "'Inter', sans-serif"
    },

    // Font weights mapping for each font family
    weights: {
        heading: {
            regular: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
            extrabold: 800
        },
        subtitle: {
            regular: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
            extrabold: 800
        },
        body: {
            light: 300,
            regular: 400,
            medium: 500,
            semibold: 600,
            bold: 700,
            extrabold: 800,
            black: 900
        }
    },

    // CSS Variables injected into :root
    cssVariables: {
        // Font families
        '--font-heading': "'Manrope', sans-serif",
        '--font-subtitle': "'Sora', sans-serif",
        '--font-body': "'Inter', sans-serif",
        '--font-accent': "'Inter', sans-serif",
        
        // Font size scale
        '--text-xs': '0.75rem',     // 12px
        '--text-sm': '0.875rem',    // 14px
        '--text-base': '1rem',       // 16px
        '--text-lg': '1.125rem',    // 18px
        '--text-xl': '1.25rem',     // 20px
        '--text-2xl': '1.5rem',     // 24px
        '--text-3xl': '1.875rem',   // 30px
        '--text-4xl': '2.25rem',    // 36px
        '--text-5xl': '3rem',       // 48px
        
        // Letter spacing
        '--tracking-tight': '-0.5px',
        '--tracking-normal': '0',
        '--tracking-wide': '0.5px',
        '--tracking-wider': '1px',
        '--tracking-widest': '1.5px'
    },

    // Tailwind CSS font configuration
    tailwindConfig: {
        fontFamily: {
            sans: ["'Inter', 'sans-serif'"],
            serif: ["'Manrope', 'sans-serif'"],
            mono: ["'Sora', 'sans-serif'"]
        }
    },

    // Google Fonts URL (auto-generated with all three fonts)
    get googleFontsURL() {
        const manrope = 'Manrope:wght@400;500;600;700;800';
        const sora = 'Sora:wght@400;500;600;700;800';
        const inter = 'Inter:wght@300;400;500;600;700;800;900';
        return `https://fonts.googleapis.com/css2?family=${manrope}&family=${sora}&family=${inter}&display=swap`;
    },

    // CSS text styles for consistent typography
    styles: {
        heroTitle: {
            fontFamily: 'var(--font-heading)',
            fontWeight: 800,
            fontSize: 'var(--text-5xl)',
            letterSpacing: 'var(--tracking-tight)'
        },
        sectionTitle: {
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: 'var(--text-3xl)',
            letterSpacing: 'var(--tracking-tight)'
        },
        sectionSubtitle: {
            fontFamily: 'var(--font-subtitle)',
            fontWeight: 600,
            fontSize: 'var(--text-xl)',
            letterSpacing: 'var(--tracking-normal)'
        },
        cardTitle: {
            fontFamily: 'var(--font-subtitle)',
            fontWeight: 500,
            fontSize: 'var(--text-sm)',
            letterSpacing: 'var(--tracking-normal)'
        },
        description: {
            fontFamily: 'var(--font-body)',
            fontWeight: 400,
            fontSize: 'var(--text-base)',
            letterSpacing: 'var(--tracking-normal)',
            lineHeight: '1.6'
        },
        smallText: {
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            fontSize: 'var(--text-xs)',
            letterSpacing: 'var(--tracking-wide)'
        },
        button: {
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: 'var(--text-xs)',
            letterSpacing: 'var(--tracking-wider)',
            textTransform: 'uppercase'
        },
        price: {
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: 'var(--text-sm)'
        },
        badge: {
            fontFamily: 'var(--font-subtitle)',
            fontWeight: 600,
            fontSize: '0.625rem',
            letterSpacing: 'var(--tracking-wide)',
            textTransform: 'uppercase'
        }
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = JAYENWARE_FONTS;
}

// Auto-initialize when loaded in browser
if (typeof window !== 'undefined') {
    window.JAYENWARE_FONTS = JAYENWARE_FONTS;
    
    // Apply CSS variables to :root
    document.addEventListener('DOMContentLoaded', () => {
        const root = document.documentElement;
        const vars = JAYENWARE_FONTS.cssVariables;
        for (const [key, value] of Object.entries(vars)) {
            root.style.setProperty(key, value);
        }
        
        console.log('✅ JAYENWARE Fonts Loaded:');
        console.log('  📝 Headings:', JAYENWARE_FONTS.families.heading);
        console.log('  📝 Subtitles:', JAYENWARE_FONTS.families.subtitle);
        console.log('  📝 Body/Description:', JAYENWARE_FONTS.families.body);
    });
}

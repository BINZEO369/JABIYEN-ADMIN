Const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase Configuration
const SUPABASE_URL = "https://eiueitoxxqzkolsouuzy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdWVpdG94eHF6a29sc291dXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NjIxNjIsImV4cCI6MjA5OTMzODE2Mn0.zsmN5P-AXeKT-XLgqkq0Bjx8EfjupJs1mjC26l-g7uA";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// ============================================
// Session Management
// ============================================
const activeSessions = new Map();

// ============================================
// Authentication Middleware
// ============================================
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ success: false, error: 'Authorization header missing' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ success: false, error: 'Token missing' });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ success: false, error: 'Invalid or expired token' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(500).json({ success: false, error: 'Authentication failed' });
    }
};

// Admin Authorization Middleware
const authorizeAdmin = async (req, res, next) => {
    try {
        const role = req.user?.app_metadata?.role;
        
        if (!role || !['admin', 'super_admin', 'moderator'].includes(role)) {
            return res.status(403).json({ 
                success: false, 
                error: 'Admin access required. You do not have admin privileges.' 
            });
        }

        // Check if admin is active in admins table
        const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('is_active, role')
            .eq('user_id', req.user.id)
            .single();

        if (adminError || !adminData || !adminData.is_active) {
            return res.status(403).json({ 
                success: false, 
                error: 'Your admin account is inactive or not found.' 
            });
        }

        req.adminRole = adminData.role;
        next();
    } catch (error) {
        res.status(500).json({ success: false, error: 'Authorization failed' });
    }
};

// Super Admin Authorization Middleware
const authorizeSuperAdmin = (req, res, next) => {
    if (req.adminRole !== 'super_admin') {
        return res.status(403).json({ 
            success: false, 
            error: 'Super admin access required.' 
        });
    }
    next();
};

// ============================================
// Authentication Routes
// ============================================

// Sign Up Route (for creating admin accounts)
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, full_name, phone } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email, password, and full name are required' 
            });
        }

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name,
                    phone
                }
            }
        });

        if (authError) throw authError;

        res.status(201).json({
            success: true,
            message: 'Account created successfully. Please check your email for verification.',
            data: authData
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email and password are required' 
            });
        }

        // Sign in with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            if (error.message.includes('Invalid login credentials')) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Invalid email or password' 
                });
            }
            throw error;
        }

        // Check if user is admin
        const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('user_id', data.user.id)
            .single();

        // Update last login if admin
        if (adminData) {
            await supabase
                .from('admins')
                .update({ last_login: new Date().toISOString() })
                .eq('user_id', data.user.id);
        }

        // Store session
        activeSessions.set(data.user.id, {
            token: data.session.access_token,
            user: data.user,
            adminData: adminData
        });

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: data.user,
                session: data.session,
                isAdmin: !!adminData,
                adminRole: adminData?.role || null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Logout Route
app.post('/api/auth/logout', authenticateUser, async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) throw error;
        
        // Remove from active sessions
        activeSessions.delete(req.user.id);
        
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Current User
app.get('/api/auth/user', authenticateUser, async (req, res) => {
    try {
        // Get admin data if exists
        const { data: adminData } = await supabase
            .from('admins')
            .select('*')
            .eq('user_id', req.user.id)
            .single();

        res.json({
            success: true,
            data: {
                user: req.user,
                adminData: adminData || null,
                isAdmin: !!adminData
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Refresh Token
app.post('/api/auth/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;

        if (!refresh_token) {
            return res.status(400).json({ 
                success: false, 
                error: 'Refresh token is required' 
            });
        }

        const { data, error } = await supabase.auth.refreshSession({
            refresh_token
        });

        if (error) throw error;

        res.json({
            success: true,
            data: {
                session: data.session,
                user: data.user
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reset Password Request
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email is required' 
            });
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${req.protocol}://${req.get('host')}/reset-password`
        });

        if (error) throw error;

        res.json({
            success: true,
            message: 'Password reset email sent successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Admin Management Routes
// ============================================

// Get all admins (Super admin only)
app.get('/api/admin/users', authenticateUser, authorizeAdmin, authorizeSuperAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add new admin (Super admin only)
app.post('/api/admin/users', authenticateUser, authorizeAdmin, authorizeSuperAdmin, async (req, res) => {
    try {
        const { email, full_name, phone, role, notes } = req.body;

        if (!email || !full_name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email and full name are required' 
            });
        }

        // Call the add_admin function
        const { data, error } = await supabase
            .rpc('add_admin', {
                p_email: email,
                p_full_name: full_name,
                p_phone: phone,
                p_role: role || 'admin',
                p_notes: notes
            });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update admin (Super admin only)
app.put('/api/admin/users/:id', authenticateUser, authorizeAdmin, authorizeSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role, is_active, notes } = req.body;

        const { data, error } = await supabase
            .rpc('update_admin', {
                p_admin_id: parseInt(id),
                p_role: role,
                p_is_active: is_active,
                p_notes: notes
            });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Remove admin (Super admin only)
app.delete('/api/admin/users/:id', authenticateUser, authorizeAdmin, authorizeSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .rpc('remove_admin', {
                p_admin_id: parseInt(id)
            });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Hero Routes (Primary Banner Slider)
// ============================================

// Get all active heroes (Public)
app.get('/api/heroes', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hero')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all heroes including inactive (Admin only)
app.get('/api/admin/heroes', authenticateUser, authorizeAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hero')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single hero by ID (Admin only)
app.get('/api/admin/heroes/:id', authenticateUser, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('hero')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ success: false, error: 'Hero not found' });
        }
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create hero (Admin only)
app.post('/api/admin/heroes', authenticateUser, authorizeAdmin, async (req, res) => {
    try {
        const { title, subtitle, img, cta_text, cta_link, is_active, sort_order } = req.body;

        const heroData = {
            title,
            subtitle,
            img,
            cta_text,
            cta_link,
            is_active: is_active !== undefined ? is_active : true,
            sort_order: sort_order || 0
        };

        const { data, error } = await supabase
            .from('hero')
            .insert([heroData])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update hero (Admin only)
app.put('/api/admin/heroes/:id', authenticateUser, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const { data, error } = await supabase
            .from('hero')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ success: false, error: 'Hero not found' });
        }
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete hero (Admin only)
app.delete('/api/admin/heroes/:id', authenticateUser, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('hero')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Hero deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Toggle hero active status (Admin only)
app.patch('/api/admin/heroes/:id/toggle', authenticateUser, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: current, error: fetchError } = await supabase
            .from('hero')
            .select('is_active')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        
        const { data, error } = await supabase
            .from('hero')
            .update({ is_active: !current.is_active })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Hero Secondary Routes (Secondary Banner Slider)
// ============================================

// Get all active secondary heroes (Public)
app.get('/api/hero-secondary', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hero_secondary')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all secondary heroes including inactive (Admin only)
app.get('/api/admin/hero-secondary', authenticateUser, authorizeAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hero_secondary')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single secondary hero by ID (Admin only)
app.get('/api/admin/hero-secondary/:id', authenticateUser, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('hero_secondary')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ success: false, error: 'Secondary hero not found' });
        }
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create secondary hero (Admin only)
app.post('/api/admin/hero-secondary', authenticateUser, authorizeAdmin, async (req, res) => {
    try {
        const { title, subtitle, img, cta_text, cta_link, is_active, sort_order } = req.body;

        const heroSecondaryData = {
            title,
            subtitle,
            img,
            cta_text,
            cta_link,
            is_active: is_active !== undefined ? is_active : true,
            sort_order: sort_order || 0
        };

        const { data, error } = await supabase
            .from('hero_secondary')
            .insert([heroSecondaryData])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update secondary hero (Admin only)
app.put('/api/admin/hero-secondary/:id', authenticateUser, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const { data, error } = await supabase
            .from('hero_secondary')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ success: false, error: 'Secondary hero not found' });
        }
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete secondary hero (Admin only)
app.delete('/api/admin/hero-secondary/:id', authenticateUser, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('hero_secondary')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Secondary hero deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Toggle secondary hero active status (Admin only)
app.patch('/api/admin/hero-secondary/:id/toggle', authenticateUser, authorizeAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: current, error: fetchError } = await supabase
            .from('hero_secondary')
            .select('is_active')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;
        
        const { data, error } = await supabase
            .from('hero_secondary')
            .update({ is_active: !current.is_active })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Dashboard Stats
// ============================================
app.get('/api/admin/stats', authenticateUser, authorizeAdmin, async (req, res) => {
    try {
        const [heroCount, secondaryCount, adminCount] = await Promise.all([
            supabase.from('hero').select('*', { count: 'exact', head: true }),
            supabase.from('hero_secondary').select('*', { count: 'exact', head: true }),
            supabase.from('admins').select('*', { count: 'exact', head: true }).eq('is_active', true)
        ]);

        res.json({
            success: true,
            data: {
                totalHeroes: heroCount.count,
                totalSecondaryHeroes: secondaryCount.count,
                totalActiveAdmins: adminCount.count
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// Error Handling Middleware
// ============================================
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Route not found' 
    });
});

// ============================================
// Server Setup
// ============================================
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📝 API Documentation:`);
    console.log(`   - POST /api/auth/signup - Create new user account`);
    console.log(`   - POST /api/auth/login - Login with email and password`);
    console.log(`   - POST /api/auth/logout - Logout current user`);
    console.log(`   - GET  /api/auth/user - Get current user info`);
    console.log(`   - GET  /api/admin/stats - Get dashboard statistics`);
    console.log(`   - GET  /api/admin/heroes - Get all heroes (Admin)`);
    console.log(`   - POST /api/admin/heroes - Create hero (Admin)`);
    console.log(`   - GET  /api/admin/hero-secondary - Get all secondary heroes (Admin)`);
    console.log(`   - POST /api/admin/hero-secondary - Create secondary hero (Admin)`);
});

module.exports = app;

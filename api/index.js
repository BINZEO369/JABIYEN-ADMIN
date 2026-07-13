// ============================================
// admin-server.js - Complete Admin API Server
// Admin Auth & Management | Supabase Integrated
// ============================================

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// ============================================
// SUPABASE CONFIGURATION
// ============================================
const SUPABASE_URL = "https://eiueitoxxqzkolsouuzy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdWVpdG94eHF6a29sc291dXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3NjIxNjIsImV4cCI6MjA5OTMzODE2Mn0.zsmN5P-AXeKT-XLgqkq0Bjx8EfjupJs1mjC26l-g7uA";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================
// MIDDLEWARE
// ============================================
app.use(express.json());

// ============================================
// ADMIN AUTH MIDDLEWARE
// ============================================

async function adminAuth(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        // Verify the token with Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }

        // Check if user is an admin
        const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

        if (adminError || !admin) {
            return res.status(403).json({ success: false, error: 'Admin access required' });
        }

        // Update last login
        await supabase
            .from('admins')
            .update({ last_login: new Date().toISOString() })
            .eq('user_id', user.id);

        // Attach user and admin info to request
        req.user = user;
        req.admin = admin;
        
        next();
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}

// Super Admin only middleware
async function superAdminAuth(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, error: 'No token provided' });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }

        const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .eq('role', 'super_admin')
            .single();

        if (adminError || !admin) {
            return res.status(403).json({ success: false, error: 'Super admin access required' });
        }

        req.user = user;
        req.admin = admin;
        
        next();
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}

// ============================================
// ADMIN AUTHENTICATION API
// ============================================

// Admin Login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email and password are required' 
            });
        }

        // First, sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }

        // Check if the user is an admin
        const { data: adminData, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('user_id', authData.user.id)
            .eq('is_active', true)
            .single();

        if (adminError || !adminData) {
            // Sign out the user since they're not an admin
            await supabase.auth.signOut();
            return res.status(403).json({ 
                success: false, 
                error: 'You do not have admin access' 
            });
        }

        // Update last login
        await supabase
            .from('admins')
            .update({ last_login: new Date().toISOString() })
            .eq('user_id', authData.user.id);

        res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: authData.user.id,
                email: authData.user.email,
                role: adminData.role,
                full_name: adminData.full_name,
                phone: adminData.phone
            },
            session: {
                access_token: authData.session.access_token,
                expires_at: authData.session.expires_at
            }
        });

    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Admin Logout
app.post('/api/admin/logout', async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        res.json({ 
            success: true, 
            message: 'Logged out successfully' 
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Get Current Admin Profile
app.get('/api/admin/profile', adminAuth, async (req, res) => {
    try {
        // Get admin details from admins table
        const { data: adminProfile, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('user_id', req.user.id)
            .single();

        if (adminError) throw adminError;

        // Get user auth metadata
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(req.user.id);
        
        res.json({
            success: true,
            profile: {
                id: req.user.id,
                email: req.user.email,
                full_name: adminProfile.full_name,
                phone: adminProfile.phone,
                role: adminProfile.role,
                is_active: adminProfile.is_active,
                last_login: adminProfile.last_login,
                created_at: adminProfile.created_at,
                metadata: user?.user_metadata || {}
            }
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Update Admin Profile
app.put('/api/admin/profile', adminAuth, async (req, res) => {
    try {
        const { full_name, phone, email } = req.body;

        const updates = {};
        if (full_name) updates.full_name = full_name;
        if (phone) updates.phone = phone;
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('admins')
            .update(updates)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;

        // Update auth email if provided
        if (email && email !== req.user.email) {
            const { error: emailError } = await supabase.auth.updateUser({
                email: email
            });
            if (emailError) throw emailError;
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            profile: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// ============================================
// SUPER ADMIN - ADMIN MANAGEMENT API
// ============================================

// Get All Admins (Super Admin only)
app.get('/api/admin/manage', superAdminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({
            success: true,
            admins: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Get Single Admin (Super Admin only)
app.get('/api/admin/manage/:id', superAdminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Admin not found' 
            });
        }

        res.json({
            success: true,
            admin: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Add New Admin (Super Admin only)
app.post('/api/admin/manage', superAdminAuth, async (req, res) => {
    try {
        const { email, full_name, phone, role, notes } = req.body;

        if (!email || !full_name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email and full name are required' 
            });
        }

        // Call the database function to add admin
        const { data, error } = await supabase.rpc('add_admin', {
            p_email: email,
            p_full_name: full_name,
            p_phone: phone || null,
            p_role: role || 'admin',
            p_notes: notes || null
        });

        if (error) throw error;

        res.json(data);
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Update Admin (Super Admin only)
app.put('/api/admin/manage/:id', superAdminAuth, async (req, res) => {
    try {
        const { role, is_active, notes } = req.body;

        // Call the database function to update admin
        const { data, error } = await supabase.rpc('update_admin', {
            p_admin_id: parseInt(req.params.id),
            p_role: role || null,
            p_is_active: is_active !== undefined ? is_active : null,
            p_notes: notes || null
        });

        if (error) throw error;

        res.json(data);
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Remove Admin (Super Admin only)
app.delete('/api/admin/manage/:id', superAdminAuth, async (req, res) => {
    try {
        // Call the database function to remove admin
        const { data, error } = await supabase.rpc('remove_admin', {
            p_admin_id: parseInt(req.params.id)
        });

        if (error) throw error;

        res.json(data);
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// ============================================
// DASHBOARD STATS API
// ============================================

app.get('/api/admin/stats', adminAuth, async (req, res) => {
    try {
        const [
            { count: productsCount },
            { count: categoriesCount },
            { count: ordersCount },
            { count: usersCount }
        ] = await Promise.all([
            supabase.from('products').select('*', { count: 'exact', head: true }),
            supabase.from('categories').select('*', { count: 'exact', head: true }),
            supabase.from('orders').select('*', { count: 'exact', head: true }),
            supabase.from('profiles').select('*', { count: 'exact', head: true })
        ]);

        res.json({
            success: true,
            stats: {
                products: productsCount || 0,
                categories: categoriesCount || 0,
                orders: ordersCount || 0,
                users: usersCount || 0
            }
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// ============================================
// SESSION VERIFICATION
// ============================================

app.get('/api/admin/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'No token provided' 
            });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid token' 
            });
        }

        const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();

        if (adminError || !admin) {
            return res.status(403).json({ 
                success: false, 
                error: 'Admin access required' 
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: admin.role,
                full_name: admin.full_name
            }
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

module.exports = app;

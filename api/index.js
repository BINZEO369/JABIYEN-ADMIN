// ============================================
// admin-server.js - Complete Admin API Server
// Admin Auth, Management & Hero Banners | Supabase Integrated
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
                created_at: adminProfile.created_at
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

// ============================================
// HERO BANNERS MANAGEMENT API
// ============================================

// ============================================
// PRIMARY HERO BANNERS
// ============================================

// Get all hero banners (admin - including inactive)
app.get('/api/admin/hero', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hero')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            banners: data || []
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Get single hero banner
app.get('/api/admin/hero/:id', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hero')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Hero banner not found' 
            });
        }

        res.json({
            success: true,
            banner: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Create new hero banner
app.post('/api/admin/hero', adminAuth, async (req, res) => {
    try {
        const { title, subtitle, img, cta_text, cta_link, is_active, sort_order } = req.body;

        if (!img) {
            return res.status(400).json({ 
                success: false, 
                error: 'Image URL is required' 
            });
        }

        const { data, error } = await supabase
            .from('hero')
            .insert([{
                title: title || '',
                subtitle: subtitle || '',
                img: img,
                cta_text: cta_text || '',
                cta_link: cta_link || '',
                is_active: is_active !== undefined ? is_active : true,
                sort_order: sort_order || 0
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: 'Hero banner created successfully',
            banner: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Update hero banner
app.put('/api/admin/hero/:id', adminAuth, async (req, res) => {
    try {
        const { title, subtitle, img, cta_text, cta_link, is_active, sort_order } = req.body;

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (subtitle !== undefined) updates.subtitle = subtitle;
        if (img !== undefined) updates.img = img;
        if (cta_text !== undefined) updates.cta_text = cta_text;
        if (cta_link !== undefined) updates.cta_link = cta_link;
        if (is_active !== undefined) updates.is_active = is_active;
        if (sort_order !== undefined) updates.sort_order = sort_order;

        const { data, error } = await supabase
            .from('hero')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Hero banner not found' 
            });
        }

        res.json({
            success: true,
            message: 'Hero banner updated successfully',
            banner: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Delete hero banner
app.delete('/api/admin/hero/:id', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hero')
            .delete()
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Hero banner not found' 
            });
        }

        res.json({
            success: true,
            message: 'Hero banner deleted successfully',
            banner: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Toggle hero banner active status
app.patch('/api/admin/hero/:id/toggle', adminAuth, async (req, res) => {
    try {
        // First get current status
        const { data: current, error: fetchError } = await supabase
            .from('hero')
            .select('is_active')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !current) {
            return res.status(404).json({ 
                success: false, 
                error: 'Hero banner not found' 
            });
        }

        // Toggle the status
        const { data, error } = await supabase
            .from('hero')
            .update({ is_active: !current.is_active })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: `Hero banner ${data.is_active ? 'activated' : 'deactivated'} successfully`,
            banner: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Update hero banner sort order (batch)
app.put('/api/admin/hero/reorder', adminAuth, async (req, res) => {
    try {
        const { items } = req.body; // Array of { id, sort_order }

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Items array is required' 
            });
        }

        // Update each item's sort_order
        const updates = items.map(item => 
            supabase
                .from('hero')
                .update({ sort_order: item.sort_order })
                .eq('id', item.id)
        );

        await Promise.all(updates);

        res.json({
            success: true,
            message: 'Hero banners reordered successfully'
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// ============================================
// SECONDARY HERO BANNERS
// ============================================

// Get all secondary hero banners (admin - including inactive)
app.get('/api/admin/hero-secondary', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hero_secondary')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            banners: data || []
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Get single secondary hero banner
app.get('/api/admin/hero-secondary/:id', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hero_secondary')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Secondary hero banner not found' 
            });
        }

        res.json({
            success: true,
            banner: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Create new secondary hero banner
app.post('/api/admin/hero-secondary', adminAuth, async (req, res) => {
    try {
        const { title, subtitle, img, cta_text, cta_link, is_active, sort_order } = req.body;

        if (!img) {
            return res.status(400).json({ 
                success: false, 
                error: 'Image URL is required' 
            });
        }

        const { data, error } = await supabase
            .from('hero_secondary')
            .insert([{
                title: title || '',
                subtitle: subtitle || '',
                img: img,
                cta_text: cta_text || '',
                cta_link: cta_link || '',
                is_active: is_active !== undefined ? is_active : true,
                sort_order: sort_order || 0
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: 'Secondary hero banner created successfully',
            banner: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Update secondary hero banner
app.put('/api/admin/hero-secondary/:id', adminAuth, async (req, res) => {
    try {
        const { title, subtitle, img, cta_text, cta_link, is_active, sort_order } = req.body;

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (subtitle !== undefined) updates.subtitle = subtitle;
        if (img !== undefined) updates.img = img;
        if (cta_text !== undefined) updates.cta_text = cta_text;
        if (cta_link !== undefined) updates.cta_link = cta_link;
        if (is_active !== undefined) updates.is_active = is_active;
        if (sort_order !== undefined) updates.sort_order = sort_order;

        const { data, error } = await supabase
            .from('hero_secondary')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Secondary hero banner not found' 
            });
        }

        res.json({
            success: true,
            message: 'Secondary hero banner updated successfully',
            banner: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Delete secondary hero banner
app.delete('/api/admin/hero-secondary/:id', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hero_secondary')
            .delete()
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Secondary hero banner not found' 
            });
        }

        res.json({
            success: true,
            message: 'Secondary hero banner deleted successfully',
            banner: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Toggle secondary hero banner active status
app.patch('/api/admin/hero-secondary/:id/toggle', adminAuth, async (req, res) => {
    try {
        // First get current status
        const { data: current, error: fetchError } = await supabase
            .from('hero_secondary')
            .select('is_active')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !current) {
            return res.status(404).json({ 
                success: false, 
                error: 'Secondary hero banner not found' 
            });
        }

        // Toggle the status
        const { data, error } = await supabase
            .from('hero_secondary')
            .update({ is_active: !current.is_active })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: `Secondary hero banner ${data.is_active ? 'activated' : 'deactivated'} successfully`,
            banner: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Update secondary hero banner sort order (batch)
app.put('/api/admin/hero-secondary/reorder', adminAuth, async (req, res) => {
    try {
        const { items } = req.body; // Array of { id, sort_order }

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Items array is required' 
            });
        }

        // Update each item's sort_order
        const updates = items.map(item => 
            supabase
                .from('hero_secondary')
                .update({ sort_order: item.sort_order })
                .eq('id', item.id)
        );

        await Promise.all(updates);

        res.json({
            success: true,
            message: 'Secondary hero banners reordered successfully'
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});


// ============================================
// HERO VIDEOS MANAGEMENT API
// ============================================

// Get all hero videos (admin - including inactive)
app.get('/api/admin/hero-videos', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hero_videos')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            videos: data || []
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Get single hero video
app.get('/api/admin/hero-videos/:id', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hero_videos')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Hero video not found' 
            });
        }

        res.json({
            success: true,
            video: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Create new hero video
app.post('/api/admin/hero-videos', adminAuth, async (req, res) => {
    try {
        const { 
            title, 
            description, 
            video_url, 
            cta_title, 
            cta_link, 
            is_active, 
            sort_order,
            meta_title,
            meta_description,
            video_schema,
            keywords
        } = req.body;

        if (!video_url) {
            return res.status(400).json({ 
                success: false, 
                error: 'Video URL is required' 
            });
        }

        const { data, error } = await supabase
            .from('hero_videos')
            .insert([{
                title: title || null,
                description: description || null,
                video_url: video_url,
                cta_title: cta_title || null,
                cta_link: cta_link || null,
                is_active: is_active !== undefined ? is_active : true,
                sort_order: sort_order || 0,
                meta_title: meta_title || null,
                meta_description: meta_description || null,
                video_schema: video_schema || null,
                keywords: keywords || null
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: 'Hero video created successfully',
            video: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Update hero video
app.put('/api/admin/hero-videos/:id', adminAuth, async (req, res) => {
    try {
        const { 
            title, 
            description, 
            video_url, 
            cta_title, 
            cta_link, 
            is_active, 
            sort_order,
            meta_title,
            meta_description,
            video_schema,
            keywords
        } = req.body;

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (video_url !== undefined) updates.video_url = video_url;
        if (cta_title !== undefined) updates.cta_title = cta_title;
        if (cta_link !== undefined) updates.cta_link = cta_link;
        if (is_active !== undefined) updates.is_active = is_active;
        if (sort_order !== undefined) updates.sort_order = sort_order;
        if (meta_title !== undefined) updates.meta_title = meta_title;
        if (meta_description !== undefined) updates.meta_description = meta_description;
        if (video_schema !== undefined) updates.video_schema = video_schema;
        if (keywords !== undefined) updates.keywords = keywords;

        const { data, error } = await supabase
            .from('hero_videos')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Hero video not found' 
            });
        }

        res.json({
            success: true,
            message: 'Hero video updated successfully',
            video: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Delete hero video
app.delete('/api/admin/hero-videos/:id', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('hero_videos')
            .delete()
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Hero video not found' 
            });
        }

        res.json({
            success: true,
            message: 'Hero video deleted successfully',
            video: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Toggle hero video active status
app.patch('/api/admin/hero-videos/:id/toggle', adminAuth, async (req, res) => {
    try {
        // First get current status
        const { data: current, error: fetchError } = await supabase
            .from('hero_videos')
            .select('is_active')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !current) {
            return res.status(404).json({ 
                success: false, 
                error: 'Hero video not found' 
            });
        }

        // Toggle the status
        const { data, error } = await supabase
            .from('hero_videos')
            .update({ is_active: !current.is_active })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: `Hero video ${data.is_active ? 'activated' : 'deactivated'} successfully`,
            video: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Update hero video sort order (batch)
app.put('/api/admin/hero-videos/reorder', adminAuth, async (req, res) => {
    try {
        const { items } = req.body; // Array of { id, sort_order }

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Items array is required' 
            });
        }

        // Update each item's sort_order
        const updates = items.map(item => 
            supabase
                .from('hero_videos')
                .update({ sort_order: item.sort_order })
                .eq('id', item.id)
        );

        await Promise.all(updates);

        res.json({
            success: true,
            message: 'Hero videos reordered successfully'
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});


// ============================================
// CATEGORIES MANAGEMENT API
// ============================================

// Get all categories (admin - including inactive)
app.get('/api/admin/categories', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .order('sort_order', { ascending: true });

        if (error) throw error;

        res.json({
            success: true,
            categories: data || []
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Get single category
app.get('/api/admin/categories/:id', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Category not found' 
            });
        }

        res.json({
            success: true,
            category: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Get category with subcategories
app.get('/api/admin/categories/:id/with-subcategories', adminAuth, async (req, res) => {
    try {
        // Get category
        const { data: category, error: catError } = await supabase
            .from('categories')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (catError) throw catError;
        if (!category) {
            return res.status(404).json({ 
                success: false, 
                error: 'Category not found' 
            });
        }

        // Get subcategories for this category
        const { data: subcategories, error: subError } = await supabase
            .from('subcategories')
            .select('*')
            .eq('category_id', req.params.id)
            .order('sort_order', { ascending: true });

        if (subError) throw subError;

        res.json({
            success: true,
            category: {
                ...category,
                subcategories: subcategories || []
            }
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Create new category
app.post('/api/admin/categories', adminAuth, async (req, res) => {
    try {
        const { 
            name, 
            image_url, 
            video_url, 
            image_cta_title, 
            image_cta_link, 
            video_cta_title, 
            video_cta_link, 
            is_active, 
            sort_order,
            meta_title,
            meta_description,
            video_schema,
            keywords
        } = req.body;

        if (!name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Category name is required' 
            });
        }

        const { data, error } = await supabase
            .from('categories')
            .insert([{
                name: name,
                image_url: image_url || null,
                video_url: video_url || null,
                image_cta_title: image_cta_title || null,
                image_cta_link: image_cta_link || null,
                video_cta_title: video_cta_title || null,
                video_cta_link: video_cta_link || null,
                is_active: is_active !== undefined ? is_active : true,
                sort_order: sort_order || 0,
                meta_title: meta_title || null,
                meta_description: meta_description || null,
                video_schema: video_schema || null,
                keywords: keywords || null
            }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Category with this name already exists' 
                });
            }
            throw error;
        }

        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Update category
app.put('/api/admin/categories/:id', adminAuth, async (req, res) => {
    try {
        const { 
            name, 
            image_url, 
            video_url, 
            image_cta_title, 
            image_cta_link, 
            video_cta_title, 
            video_cta_link, 
            is_active, 
            sort_order,
            meta_title,
            meta_description,
            video_schema,
            keywords
        } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (image_url !== undefined) updates.image_url = image_url;
        if (video_url !== undefined) updates.video_url = video_url;
        if (image_cta_title !== undefined) updates.image_cta_title = image_cta_title;
        if (image_cta_link !== undefined) updates.image_cta_link = image_cta_link;
        if (video_cta_title !== undefined) updates.video_cta_title = video_cta_title;
        if (video_cta_link !== undefined) updates.video_cta_link = video_cta_link;
        if (is_active !== undefined) updates.is_active = is_active;
        if (sort_order !== undefined) updates.sort_order = sort_order;
        if (meta_title !== undefined) updates.meta_title = meta_title;
        if (meta_description !== undefined) updates.meta_description = meta_description;
        if (video_schema !== undefined) updates.video_schema = video_schema;
        if (keywords !== undefined) updates.keywords = keywords;

        const { data, error } = await supabase
            .from('categories')
            .update(updates)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Category with this name already exists' 
                });
            }
            throw error;
        }
        
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Category not found' 
            });
        }

        res.json({
            success: true,
            message: 'Category updated successfully',
            category: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Delete category
app.delete('/api/admin/categories/:id', adminAuth, async (req, res) => {
    try {
        // Check if category has subcategories
        const { count: subcategoryCount, error: countError } = await supabase
            .from('subcategories')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', req.params.id);

        if (countError) throw countError;

        if (subcategoryCount > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete category. It has ${subcategoryCount} subcategories. Delete subcategories first or reassign them.`
            });
        }

        // Check if category has menu items
        const { count: menuCount, error: menuCountError } = await supabase
            .from('menu_items')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', req.params.id);

        if (menuCountError) throw menuCountError;

        if (menuCount > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete category. It is referenced by ${menuCount} menu items. Remove references first.`
            });
        }

        const { data, error } = await supabase
            .from('categories')
            .delete()
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Category not found' 
            });
        }

        res.json({
            success: true,
            message: 'Category deleted successfully',
            category: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Toggle category active status
app.patch('/api/admin/categories/:id/toggle', adminAuth, async (req, res) => {
    try {
        const { data: current, error: fetchError } = await supabase
            .from('categories')
            .select('is_active')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !current) {
            return res.status(404).json({ 
                success: false, 
                error: 'Category not found' 
            });
        }

        const { data, error } = await supabase
            .from('categories')
            .update({ is_active: !current.is_active })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: `Category ${data.is_active ? 'activated' : 'deactivated'} successfully`,
            category: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Batch reorder categories
app.put('/api/admin/categories/reorder', adminAuth, async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Items array is required' 
            });
        }

        const updates = items.map(item => 
            supabase
                .from('categories')
                .update({ sort_order: item.sort_order })
                .eq('id', item.id)
        );

        await Promise.all(updates);

        res.json({
            success: true,
            message: 'Categories reordered successfully'
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// ============================================
// SUBCATEGORIES MANAGEMENT API
// ============================================

// Get all subcategories (admin - including inactive)
app.get('/api/admin/subcategories', adminAuth, async (req, res) => {
    try {
        let query = supabase
            .from('subcategories')
            .select(`
                *,
                categories:category_id (id, name, slug)
            `)
            .order('sort_order', { ascending: true });

        // Optional: filter by category_id
        if (req.query.category_id) {
            query = query.eq('category_id', req.query.category_id);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            subcategories: data || []
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Get single subcategory
app.get('/api/admin/subcategories/:id', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('subcategories')
            .select(`
                *,
                categories:category_id (id, name, slug)
            `)
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Subcategory not found' 
            });
        }

        res.json({
            success: true,
            subcategory: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Create new subcategory
app.post('/api/admin/subcategories', adminAuth, async (req, res) => {
    try {
        const { 
            category_id,
            name, 
            image_url, 
            video_url, 
            image_cta_title, 
            image_cta_link, 
            video_cta_title, 
            video_cta_link, 
            is_active, 
            sort_order,
            meta_title,
            meta_description,
            video_schema,
            keywords
        } = req.body;

        if (!category_id || !name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Category ID and name are required' 
            });
        }

        // Check if category exists
        const { data: category, error: catError } = await supabase
            .from('categories')
            .select('id')
            .eq('id', category_id)
            .single();

        if (catError || !category) {
            return res.status(400).json({ 
                success: false, 
                error: 'Parent category not found' 
            });
        }

        const { data, error } = await supabase
            .from('subcategories')
            .insert([{
                category_id: category_id,
                name: name,
                image_url: image_url || null,
                video_url: video_url || null,
                image_cta_title: image_cta_title || null,
                image_cta_link: image_cta_link || null,
                video_cta_title: video_cta_title || null,
                video_cta_link: video_cta_link || null,
                is_active: is_active !== undefined ? is_active : true,
                sort_order: sort_order || 0,
                meta_title: meta_title || null,
                meta_description: meta_description || null,
                video_schema: video_schema || null,
                keywords: keywords || null
            }])
            .select(`
                *,
                categories:category_id (id, name, slug)
            `)
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Subcategory with this name already exists in this category' 
                });
            }
            throw error;
        }

        res.status(201).json({
            success: true,
            message: 'Subcategory created successfully',
            subcategory: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Update subcategory
app.put('/api/admin/subcategories/:id', adminAuth, async (req, res) => {
    try {
        const { 
            category_id,
            name, 
            image_url, 
            video_url, 
            image_cta_title, 
            image_cta_link, 
            video_cta_title, 
            video_cta_link, 
            is_active, 
            sort_order,
            meta_title,
            meta_description,
            video_schema,
            keywords
        } = req.body;

        const updates = {};
        if (category_id !== undefined) updates.category_id = category_id;
        if (name !== undefined) updates.name = name;
        if (image_url !== undefined) updates.image_url = image_url;
        if (video_url !== undefined) updates.video_url = video_url;
        if (image_cta_title !== undefined) updates.image_cta_title = image_cta_title;
        if (image_cta_link !== undefined) updates.image_cta_link = image_cta_link;
        if (video_cta_title !== undefined) updates.video_cta_title = video_cta_title;
        if (video_cta_link !== undefined) updates.video_cta_link = video_cta_link;
        if (is_active !== undefined) updates.is_active = is_active;
        if (sort_order !== undefined) updates.sort_order = sort_order;
        if (meta_title !== undefined) updates.meta_title = meta_title;
        if (meta_description !== undefined) updates.meta_description = meta_description;
        if (video_schema !== undefined) updates.video_schema = video_schema;
        if (keywords !== undefined) updates.keywords = keywords;

        // If category_id is being changed, verify new category exists
        if (category_id) {
            const { data: category, error: catError } = await supabase
                .from('categories')
                .select('id')
                .eq('id', category_id)
                .single();

            if (catError || !category) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Parent category not found' 
                });
            }
        }

        const { data, error } = await supabase
            .from('subcategories')
            .update(updates)
            .eq('id', req.params.id)
            .select(`
                *,
                categories:category_id (id, name, slug)
            `)
            .single();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Subcategory with this name already exists in this category' 
                });
            }
            throw error;
        }
        
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Subcategory not found' 
            });
        }

        res.json({
            success: true,
            message: 'Subcategory updated successfully',
            subcategory: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Delete subcategory
app.delete('/api/admin/subcategories/:id', adminAuth, async (req, res) => {
    try {
        // Check if subcategory has menu items
        const { count: menuCount, error: menuCountError } = await supabase
            .from('menu_items')
            .select('*', { count: 'exact', head: true })
            .eq('subcategory_id', req.params.id);

        if (menuCountError) throw menuCountError;

        if (menuCount > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete subcategory. It is referenced by ${menuCount} menu items. Remove references first.`
            });
        }

        const { data, error } = await supabase
            .from('subcategories')
            .delete()
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Subcategory not found' 
            });
        }

        res.json({
            success: true,
            message: 'Subcategory deleted successfully',
            subcategory: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Toggle subcategory active status
app.patch('/api/admin/subcategories/:id/toggle', adminAuth, async (req, res) => {
    try {
        const { data: current, error: fetchError } = await supabase
            .from('subcategories')
            .select('is_active')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !current) {
            return res.status(404).json({ 
                success: false, 
                error: 'Subcategory not found' 
            });
        }

        const { data, error } = await supabase
            .from('subcategories')
            .update({ is_active: !current.is_active })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: `Subcategory ${data.is_active ? 'activated' : 'deactivated'} successfully`,
            subcategory: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Batch reorder subcategories
app.put('/api/admin/subcategories/reorder', adminAuth, async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Items array is required' 
            });
        }

        const updates = items.map(item => 
            supabase
                .from('subcategories')
                .update({ sort_order: item.sort_order })
                .eq('id', item.id)
        );

        await Promise.all(updates);

        res.json({
            success: true,
            message: 'Subcategories reordered successfully'
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// ============================================
// MENU ITEMS MANAGEMENT API
// ============================================

// Get all menu items (admin - including inactive)
app.get('/api/admin/menu-items', adminAuth, async (req, res) => {
    try {
        let query = supabase
            .from('menu_items')
            .select(`
                *,
                parent:parent_id (id, title),
                category:category_id (id, name, slug),
                subcategory:subcategory_id (id, name, slug, category_id)
            `)
            .order('sort_order', { ascending: true });

        // Optional filters
        if (req.query.menu_type) {
            query = query.eq('menu_type', req.query.menu_type);
        }
        if (req.query.parent_id) {
            query = query.eq('parent_id', req.query.parent_id);
        }
        if (req.query.category_id) {
            query = query.eq('category_id', req.query.category_id);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            menu_items: data || []
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Get menu items tree structure
app.get('/api/admin/menu-items/tree', adminAuth, async (req, res) => {
    try {
        // Get all menu items ordered by sort_order
        const { data: allItems, error } = await supabase
            .from('menu_items')
            .select(`
                *,
                category:category_id (id, name, slug),
                subcategory:subcategory_id (id, name, slug)
            `)
            .order('sort_order', { ascending: true });

        if (error) throw error;

        // Build tree structure
        const buildTree = (items, parentId = null) => {
            return items
                .filter(item => item.parent_id === parentId)
                .map(item => ({
                    ...item,
                    children: buildTree(items, item.id)
                }));
        };

        const menuTree = buildTree(allItems || []);

        res.json({
            success: true,
            menu_tree: menuTree
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Get single menu item
app.get('/api/admin/menu-items/:id', adminAuth, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('menu_items')
            .select(`
                *,
                parent:parent_id (id, title),
                category:category_id (id, name, slug),
                subcategory:subcategory_id (id, name, slug)
            `)
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Menu item not found' 
            });
        }

        res.json({
            success: true,
            menu_item: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Create new menu item
app.post('/api/admin/menu-items', adminAuth, async (req, res) => {
    try {
        const { 
            title,
            subtitle,
            link,
            image_url,
            image_cta_title,
            image_cta_link,
            icon_class,
            badge_text,
            badge_color,
            parent_id,
            category_id,
            subcategory_id,
            menu_type,
            sort_order,
            is_active
        } = req.body;

        if (!title || !link) {
            return res.status(400).json({ 
                success: false, 
                error: 'Title and link are required' 
            });
        }

        // Validate parent_id if provided
        if (parent_id) {
            const { data: parent, error: parentError } = await supabase
                .from('menu_items')
                .select('id')
                .eq('id', parent_id)
                .single();

            if (parentError || !parent) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Parent menu item not found' 
                });
            }
        }

        // Validate category_id if provided
        if (category_id) {
            const { data: category, error: catError } = await supabase
                .from('categories')
                .select('id')
                .eq('id', category_id)
                .single();

            if (catError || !category) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Category not found' 
                });
            }
        }

        // Validate subcategory_id if provided
        if (subcategory_id) {
            const { data: subcategory, error: subError } = await supabase
                .from('subcategories')
                .select('id')
                .eq('id', subcategory_id)
                .single();

            if (subError || !subcategory) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Subcategory not found' 
                });
            }
        }

        const { data, error } = await supabase
            .from('menu_items')
            .insert([{
                title: title,
                subtitle: subtitle || null,
                link: link,
                image_url: image_url || null,
                image_cta_title: image_cta_title || null,
                image_cta_link: image_cta_link || null,
                icon_class: icon_class || null,
                badge_text: badge_text || null,
                badge_color: badge_color || null,
                parent_id: parent_id || null,
                category_id: category_id || null,
                subcategory_id: subcategory_id || null,
                menu_type: menu_type || 'link',
                sort_order: sort_order || 0,
                is_active: is_active !== undefined ? is_active : true
            }])
            .select(`
                *,
                parent:parent_id (id, title),
                category:category_id (id, name, slug),
                subcategory:subcategory_id (id, name, slug)
            `)
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: 'Menu item created successfully',
            menu_item: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Update menu item
app.put('/api/admin/menu-items/:id', adminAuth, async (req, res) => {
    try {
        const { 
            title,
            subtitle,
            link,
            image_url,
            image_cta_title,
            image_cta_link,
            icon_class,
            badge_text,
            badge_color,
            parent_id,
            category_id,
            subcategory_id,
            menu_type,
            sort_order,
            is_active
        } = req.body;

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (subtitle !== undefined) updates.subtitle = subtitle;
        if (link !== undefined) updates.link = link;
        if (image_url !== undefined) updates.image_url = image_url;
        if (image_cta_title !== undefined) updates.image_cta_title = image_cta_title;
        if (image_cta_link !== undefined) updates.image_cta_link = image_cta_link;
        if (icon_class !== undefined) updates.icon_class = icon_class;
        if (badge_text !== undefined) updates.badge_text = badge_text;
        if (badge_color !== undefined) updates.badge_color = badge_color;
        if (parent_id !== undefined) updates.parent_id = parent_id;
        if (category_id !== undefined) updates.category_id = category_id;
        if (subcategory_id !== undefined) updates.subcategory_id = subcategory_id;
        if (menu_type !== undefined) updates.menu_type = menu_type;
        if (sort_order !== undefined) updates.sort_order = sort_order;
        if (is_active !== undefined) updates.is_active = is_active;

        // Validate parent_id if provided (and not null)
        if (parent_id) {
            // Prevent circular reference
            if (parent_id == req.params.id) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'A menu item cannot be its own parent' 
                });
            }

            const { data: parent, error: parentError } = await supabase
                .from('menu_items')
                .select('id')
                .eq('id', parent_id)
                .single();

            if (parentError || !parent) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Parent menu item not found' 
                });
            }
        }

        const { data, error } = await supabase
            .from('menu_items')
            .update(updates)
            .eq('id', req.params.id)
            .select(`
                *,
                parent:parent_id (id, title),
                category:category_id (id, name, slug),
                subcategory:subcategory_id (id, name, slug)
            `)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Menu item not found' 
            });
        }

        res.json({
            success: true,
            message: 'Menu item updated successfully',
            menu_item: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Delete menu item
app.delete('/api/admin/menu-items/:id', adminAuth, async (req, res) => {
    try {
        // Check if menu item has children
        const { count: childrenCount, error: countError } = await supabase
            .from('menu_items')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', req.params.id);

        if (countError) throw countError;

        if (childrenCount > 0) {
            return res.status(400).json({
                success: false,
                error: `Cannot delete menu item. It has ${childrenCount} child items. Delete children first or reassign them.`
            });
        }

        const { data, error } = await supabase
            .from('menu_items')
            .delete()
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ 
                success: false, 
                error: 'Menu item not found' 
            });
        }

        res.json({
            success: true,
            message: 'Menu item deleted successfully',
            menu_item: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Toggle menu item active status
app.patch('/api/admin/menu-items/:id/toggle', adminAuth, async (req, res) => {
    try {
        const { data: current, error: fetchError } = await supabase
            .from('menu_items')
            .select('is_active')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !current) {
            return res.status(404).json({ 
                success: false, 
                error: 'Menu item not found' 
            });
        }

        const { data, error } = await supabase
            .from('menu_items')
            .update({ is_active: !current.is_active })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: `Menu item ${data.is_active ? 'activated' : 'deactivated'} successfully`,
            menu_item: data
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

// Batch reorder menu items
app.put('/api/admin/menu-items/reorder', adminAuth, async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Items array is required' 
            });
        }

        const updates = items.map(item => 
            supabase
                .from('menu_items')
                .update({ sort_order: item.sort_order })
                .eq('id', item.id)
        );

        await Promise.all(updates);

        res.json({
            success: true,
            message: 'Menu items reordered successfully'
        });
    } catch (err) {
        res.status(500).json({ 
            success: false, 
            error: err.message 
        });
    }
});

module.exports = app;

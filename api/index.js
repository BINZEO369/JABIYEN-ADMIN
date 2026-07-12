const express = require('express');
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
// ইন-মেমোরি ম্যাপটি ব্যাকআপ এবং অ্যাক্টিভ ট্র্যাকিংয়ের জন্য রাখা হয়েছে, 
// তবে নেটওয়ার্ক ড্রপের কারণে যাতে অটো-লগআউট না হয় সেজন্য এটিকে রিকোয়েস্ট ব্লকার হিসেবে ব্যবহার করা হবে না।
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

        // নেটওয়ার্কের কারণে সাময়িক ড্রপ হলে Supabase SDK নিজে থেকেই টোকেন ক্যাশ ও ভেরিফিকেশন হ্যান্ডেল করে
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ success: false, error: 'Invalid or expired token. Please login again.' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(500).json({ success: false, error: 'Authentication failed due to connection issue' });
    }
};

// Admin Authorization Middleware
const authorizeAdmin = async (req, res, next) => {
    try {
        const tokenRole = req.user?.app_metadata?.role;
        const isAdminRole = tokenRole && ['admin', 'super_admin', 'moderator'].includes(tokenRole);

        // ডাটাবেজ চেক (সাময়িক নেটওয়ার্ক সমস্যার জন্য ট্রাই-ক্যাচ দিয়ে সুরক্ষিত করা হয়েছে)
        let adminData = null;
        let adminError = null;

        try {
            const response = await supabase
                .from('admins')
                .select('is_active, role')
                .eq('user_id', req.user.id)
                .single();
            
            adminData = response.data;
            adminError = response.error;
        } catch (dbErr) {
            console.error('Database fetch fallback active:', dbErr);
            // নেটওয়ার্ক ফেইলরের কারণে ডাটাবেজ কানেক্ট না হলে, টোকেনের JWT রোল চেক করে সেশন সচল রাখবে
            if (isAdminRole) {
                req.adminRole = tokenRole;
                return next();
            }
        }

        // যদি ডাটাবেজ রেসপন্স করে এবং অ্যাডমিন ইন-অ্যাক্টিভ থাকে
        if (adminData && !adminData.is_active) {
            return res.status(403).json({ 
                success: false, 
                error: 'Your admin account has been deactivated.' 
            });
        }

        // চূড়ান্ত রোল ভ্যালিডেশন
        if (!adminData && !isAdminRole) {
            return res.status(403).json({ 
                success: false, 
                error: 'Admin access required. You do not have admin privileges.' 
            });
        }

        req.adminRole = adminData?.role || tokenRole;
        next();
    } catch (error) {
        res.status(500).json({ success: false, error: 'Authorization verification failed' });
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

// Sign Up Route
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password, full_name, phone } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email, password, and full name are required' 
            });
        }

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
        const { data: adminData } = await supabase
            .from('admins')
            .select('*')
            .eq('user_id', data.user.id)
            .single();

        if (adminData) {
            // নন-ব্লকিং আপডেট (লগইন যেন আটকে না যায়)
            supabase
                .from('admins')
                .update({ last_login: new Date().toISOString() })
                .eq('user_id', data.user.id)
                .then(({ error }) => { if(error) console.error("Failed to update last_login", error); });
        }

        // Store session in memory
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
                isAdmin: !!adminData || ['admin', 'super_admin', 'moderator'].includes(data.user?.app_metadata?.role),
                adminRole: adminData?.role || data.user?.app_metadata?.role || null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Logout Route
app.post('/api/auth/logout', authenticateUser, async (req, res) => {
    try {
        activeSessions.delete(req.user.id);
        
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        // যদি Supabase সার্ভার ডাউনও থাকে, লোকাল সেশন ডিলিট করে রেসপন্স সাকসেস দেওয়া হবে
        res.json({ success: true, message: 'Logged out locally' });
    }
});

// Get Current User
app.get('/api/auth/user', authenticateUser, async (req, res) => {
    try {
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
                isAdmin: !!adminData || ['admin', 'super_admin', 'moderator'].includes(req.user?.app_metadata?.role)
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

app.post('/api/admin/users', authenticateUser, authorizeAdmin, authorizeSuperAdmin, async (req, res) => {
    try {
        const { email, full_name, phone, role, notes } = req.body;

        if (!email || !full_name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email and full name are required' 
            });
        }

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
});

module.exports = app;

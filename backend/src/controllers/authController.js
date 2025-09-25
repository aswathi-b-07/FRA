const supabase = require('../utils/supabaseClient');

const authController = {
  // Sign up new user
  signup: async (req, res) => {
    try {
      const { email, password, fullName, role = 'user' } = req.body;

      if (!email || !password || !fullName) {
        return res.status(400).json({ 
          error: 'Email, password, and full name are required' 
        });
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          full_name: fullName,
          role: role
        },
        email_confirm: true
      });

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.user_metadata.full_name,
          role: data.user.user_metadata.role
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get user profile
  getProfile: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      res.json({
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name || '',
        role: user.user_metadata?.role || 'user',
        createdAt: user.created_at
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.split(' ')[1];
      const { fullName, role } = req.body;

      const { data, error } = await supabase.auth.admin.updateUserById(
        req.user.id,
        {
          user_metadata: {
            full_name: fullName,
            role: role
          }
        }
      );

      if (error) {
        return res.status(400).json({ error: error.message });
      }

      res.json({
        message: 'Profile updated successfully',
        user: {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.user_metadata.full_name,
          role: data.user.user_metadata.role
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};

module.exports = authController;

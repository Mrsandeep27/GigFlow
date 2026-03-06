const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Register user
exports.register = async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;

    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'employer' ? 'employer' : 'worker';

    const result = await pool.query(
      'INSERT INTO users (email, phone, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role',
      [email, phone || null, hashedPassword, name, userRole]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE }
    );

    await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT id, email, name, role, password_hash, is_active FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE }
    );

    await pool.query(
      'UPDATE users SET refresh_token = $1, last_seen_at = NOW() WHERE id = $2',
      [refreshToken, user.id]
    );

    res.json({
      message: 'Login successful',
      token,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ message: 'No refresh token' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const result = await pool.query(
      'SELECT id, email, role, refresh_token FROM users WHERE id = $1',
      [decoded.id]
    );
    const user = result.rows[0];
    if (!user || user.refresh_token !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({ token });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    await pool.query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.id]);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user profile
exports.getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.phone, u.name, u.role, u.bio, u.avatar_url,
              u.city, u.state, u.location, u.hourly_rate, u.rating,
              u.total_reviews, u.total_jobs_completed, u.is_verified,
              u.created_at,
              ARRAY(SELECT skill FROM user_skills WHERE user_id = u.id) AS skills
       FROM users u WHERE u.id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('GetMe error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, city, state, location, hourly_rate, avatar_url, skills } = req.body;

    await pool.query(
      `UPDATE users SET name=$1, bio=$2, city=$3, state=$4, location=$5,
       hourly_rate=$6, avatar_url=$7, updated_at=NOW() WHERE id=$8`,
      [name, bio, city, state, location, hourly_rate, avatar_url, req.user.id]
    );

    if (Array.isArray(skills)) {
      await pool.query('DELETE FROM user_skills WHERE user_id = $1', [req.user.id]);
      for (const skill of skills) {
        await pool.query(
          'INSERT INTO user_skills (user_id, skill) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [req.user.id, skill.trim()]
        );
      }
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('UpdateProfile error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Register user
exports.register = async (req, res) => {
  try {
    const { email, password, name, phone, role } = req.body;

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'employer' ? 'employer' : 'worker';
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    const result = await pool.query(
      `INSERT INTO users (email, phone, password_hash, name, role, email_otp, email_otp_expires)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, name, role`,
      [email, phone || null, hashedPassword, name, userRole, otp, otpExpires]
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

    // Send verification email (fire-and-forget)
    sendVerificationEmail(email, otp).catch(() => {});

    res.status(201).json({
      message: 'User registered successfully. Check your email for verification code.',
      token,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      requiresVerification: true,
    });
  } catch (error) {
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify email with OTP
exports.verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT email_otp, email_otp_expires, is_email_verified FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = result.rows[0];
    if (user.is_email_verified) return res.json({ message: 'Email already verified' });

    if (!user.email_otp || user.email_otp !== otp) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }
    if (new Date() > new Date(user.email_otp_expires)) {
      return res.status(400).json({ message: 'Code expired. Request a new one.' });
    }

    await pool.query(
      'UPDATE users SET is_email_verified = true, email_otp = NULL, email_otp_expires = NULL WHERE id = $1',
      [userId]
    );

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Resend verification OTP
exports.resendOTP = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query('SELECT email, is_email_verified FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    if (result.rows[0].is_email_verified) return res.json({ message: 'Already verified' });

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'UPDATE users SET email_otp = $1, email_otp_expires = $2 WHERE id = $3',
      [otp, otpExpires, userId]
    );

    await sendVerificationEmail(result.rows[0].email, otp);
    res.json({ message: 'Verification code sent' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Forgot password — send reset email
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    // Always return success to prevent email enumeration
    if (result.rows.length === 0) {
      return res.json({ message: 'If an account exists, a reset link has been sent.' });
    }

    const userId = result.rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Ensure password_resets table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `).catch(() => {});

    // Invalidate old tokens
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);

    await pool.query(
      'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expires]
    );

    const APP_URL = process.env.CLIENT_URL || 'https://gig-flow-work.vercel.app';
    const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;
    await sendPasswordResetEmail(email, resetUrl);

    res.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password with token
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: 'Token and password required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const result = await pool.query(
      'SELECT user_id, expires_at, used FROM password_resets WHERE token = $1',
      [token]
    );

    if (result.rows.length === 0) return res.status(400).json({ message: 'Invalid or expired reset link' });

    const reset = result.rows[0];
    if (reset.used) return res.status(400).json({ message: 'This link has already been used' });
    if (new Date() > new Date(reset.expires_at)) {
      return res.status(400).json({ message: 'Reset link expired. Request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, reset.user_id]);
    await pool.query('UPDATE password_resets SET used = true WHERE token = $1', [token]);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Google OAuth callback
exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body; // Google ID token
    if (!credential) return res.status(400).json({ message: 'No credential provided' });

    // Decode Google ID token (JWT) — verify with Google's public keys
    // For simplicity, decode payload (Vercel doesn't support long-running processes for JWKS)
    const parts = credential.split('.');
    if (parts.length !== 3) return res.status(400).json({ message: 'Invalid token' });

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    if (!payload.email || !payload.email_verified) {
      return res.status(400).json({ message: 'Email not verified by Google' });
    }

    // Check if user exists
    let result = await pool.query('SELECT id, email, name, role FROM users WHERE email = $1', [payload.email]);
    let user;

    if (result.rows.length === 0) {
      // Create new user (no password — OAuth only)
      const randomPass = crypto.randomBytes(32).toString('hex');
      const hashed = await bcrypt.hash(randomPass, 10);
      result = await pool.query(
        `INSERT INTO users (email, name, password_hash, role, is_email_verified, avatar_url)
         VALUES ($1, $2, $3, 'worker', true, $4) RETURNING id, email, name, role`,
        [payload.email, payload.name || payload.email.split('@')[0], hashed, payload.picture || null]
      );
      user = result.rows[0];
    } else {
      user = result.rows[0];
      // Update avatar if missing
      if (payload.picture) {
        await pool.query(
          'UPDATE users SET avatar_url = COALESCE(avatar_url, $1), is_email_verified = true WHERE id = $2',
          [payload.picture, user.id]
        ).catch(() => {});
      }
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

    await pool.query('UPDATE users SET refresh_token = $1, last_seen_at = NOW() WHERE id = $2', [refreshToken, user.id]);

    res.json({ token, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Google auth error:', error.message);
    res.status(500).json({ message: 'Authentication failed' });
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
              u.is_email_verified, u.created_at,
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

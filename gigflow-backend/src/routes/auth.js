const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role').optional().isIn(['worker', 'employer']),
], validate, authController.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, authController.login);

router.post('/refresh', authController.refreshToken);
router.post('/logout', authMiddleware, authController.logout);

router.get('/me', authMiddleware, authController.getMe);
router.put('/me', authMiddleware, authController.updateProfile);

// Email verification
router.post('/verify-email', authMiddleware, authController.verifyEmail);
router.post('/resend-otp', authMiddleware, authController.resendOTP);

// Forgot / Reset password
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], validate, authController.forgotPassword);

router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 6 }),
], validate, authController.resetPassword);

// Google OAuth
router.post('/google', authController.googleAuth);

module.exports = router;

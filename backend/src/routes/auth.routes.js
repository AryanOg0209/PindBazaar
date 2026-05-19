const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtpLogin, register, me, loginDirect } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Send OTP (signup only)
router.post('/send-otp', sendOtp);

// Verify OTP + register new user
router.post('/register', register);

// OTP-based login (kept for admin / fallback)
router.post('/login', verifyOtpLogin);

// Direct login — returning users, no OTP needed
router.post('/login-direct', loginDirect);

// Get current user
router.get('/me', authenticate, me);

module.exports = router;

const prisma = require('../utils/prisma');
const { generateOTP, otpExpiry, sendOTP } = require('../utils/otp');
const jwt = require('jsonwebtoken');

// POST /api/auth/send-otp
async function sendOtp(req, res) {
  try {
    const { phone } = req.body;
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Valid 10-digit phone number required' });
    }

    const code = generateOTP(parseInt(process.env.OTP_LENGTH) || 6);
    const expiresAt = otpExpiry(parseInt(process.env.OTP_EXPIRY_MINUTES) || 10);

    // Invalidate old OTPs for this phone
    await prisma.otpCode.updateMany({
      where: { phone, used: false },
      data: { used: true },
    });

    // Store new OTP
    await prisma.otpCode.create({
      data: { phone, code, expiresAt },
    });

    await sendOTP(phone, code);

    res.json({ message: 'OTP sent successfully', phone });
  } catch (err) {
    console.error('sendOtp error:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
}

// POST /api/auth/verify-otp  (login flow)
async function verifyOtpLogin(req, res) {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'Phone and code required' });

    const otpRecord = await prisma.otpCode.findFirst({
      where: { phone, code, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) return res.status(400).json({ error: 'Invalid or expired OTP' });

    // Mark OTP used
    await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });

    // Find user
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) return res.status(404).json({ error: 'No account found. Please register first.' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('verifyOtpLogin error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/auth/register  – step 1: create user with phone + role
async function register(req, res) {
  try {
    const { phone, code, role } = req.body;

    const validRoles = ['farmer', 'industry', 'baler', 'mover'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (!phone || !/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Valid phone required' });

    // Verify OTP
    const otpRecord = await prisma.otpCode.findFirst({
      where: { phone, code, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otpRecord) return res.status(400).json({ error: 'Invalid or expired OTP' });

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) return res.status(409).json({ error: 'Account already exists. Please login.' });

    await prisma.otpCode.update({ where: { id: otpRecord.id }, data: { used: true } });

    const user = await prisma.user.create({ data: { phone, role } });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/auth/me
async function me(req, res) {
  try {
    res.json({ user: sanitizeUser(req.user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/auth/login-direct  – returning users: just phone, no OTP
async function loginDirect(req, res) {
  try {
    const { phone } = req.body;
    if (!phone || !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Valid 10-digit phone number required' });
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return res.status(404).json({
        error: 'No account found for this number. Please sign up first.',
        notFound: true,
      });
    }

    // Admins can always log in
    if (user.role !== 'admin') {
      if (user.status === 'pending') {
        return res.status(403).json({
          error: 'Your account is pending admin verification. Please wait for approval.',
          status: 'pending',
        });
      }
      if (user.status === 'rejected') {
        return res.status(403).json({
          error: 'Your application was rejected. Contact support for more information.',
          status: 'rejected',
          adminNotes: user.adminNotes,
        });
      }
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('loginDirect error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

function sanitizeUser(user) {
  const { ...safe } = user;
  return safe;
}

module.exports = { sendOtp, verifyOtpLogin, register, me, loginDirect };


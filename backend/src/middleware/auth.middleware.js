const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

/**
 * Verifies JWT token from Authorization header
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Restrict access to admin role only
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Restrict access to approved users only
 */
function requireApproved(req, res, next) {
  if (req.user.status !== 'approved' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Account pending admin approval', status: req.user.status });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireApproved };

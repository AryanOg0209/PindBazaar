require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const districtRoutes = require('./routes/district.routes');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

const marketRoutes        = require('./routes/market.routes');
const orderRoutes         = require('./routes/order.routes');
const aiRoutes            = require('./routes/ai.routes');
const dashboardRoutes     = require('./routes/dashboard.routes');
const verificationRoutes  = require('./routes/verification.routes');
const trackingRoutes = require('./routes/tracking.routes');
const mapRoutes      = require('./routes/map.routes');
const workflowRoutes = require('./routes/workflow.routes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/districts', districtRoutes);
app.use('/api/market',     marketRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/ai',         aiRoutes);
app.use('/api/dashboard',  dashboardRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/map',      mapRoutes);
app.use('/api/workflow', workflowRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🌾 PindBazaar backend running on http://localhost:${PORT}`);
});

module.exports = app;

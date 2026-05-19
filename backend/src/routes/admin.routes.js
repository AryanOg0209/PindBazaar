const express = require('express');
const router = express.Router();
const {
  listApplications,
  getApplication,
  approveApplication,
  rejectApplication,
  getStats,
  listUsers,
  getActivity,
  sendNotification,
  createAdmin,
} = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

router.use(authenticate, requireAdmin);

router.get('/stats', getStats);
router.get('/users', listUsers);
router.get('/activity', getActivity);
router.post('/notifications', sendNotification);
router.post('/admins', createAdmin);
router.get('/applications', listApplications);
router.get('/applications/:id', getApplication);
router.put('/applications/:id/approve', approveApplication);
router.put('/applications/:id/reject', rejectApplication);

module.exports = router;

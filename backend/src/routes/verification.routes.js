const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { getVerificationStatus, triggerReanalysis } = require('../controllers/verification.controller');

router.get('/status', authenticate, getVerificationStatus);
router.post('/reanalyze/:userId', authenticate, requireAdmin, triggerReanalysis);

module.exports = router;

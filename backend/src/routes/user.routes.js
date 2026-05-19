const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, uploadDocuments, getStatus } = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/status', getStatus);
router.post(
  '/documents',
  upload.fields([
    { name: 'aadhaar', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
    { name: 'land_record', maxCount: 2 },
    { name: 'machine_photo', maxCount: 3 },
    { name: 'vehicle_rc', maxCount: 1 },
    { name: 'gst_certificate', maxCount: 1 },
  ]),
  uploadDocuments
);

module.exports = router;

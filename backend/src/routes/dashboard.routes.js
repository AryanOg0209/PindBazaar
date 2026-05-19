const express = require('express');
const router = express.Router();
const { getStats, getWeather, getEquipment } = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/stats',     getStats);
router.get('/weather',   getWeather);
router.get('/equipment', getEquipment);

module.exports = router;

const express = require('express');
const router = express.Router();
const { getServices } = require('../controllers/map.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/services', getServices);

module.exports = router;

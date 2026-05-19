const express = require('express');
const router = express.Router();
const marketController = require('../controllers/market.controller');
const { authenticate, requireApproved } = require('../middleware/auth.middleware');

router.post('/', authenticate, requireApproved, marketController.createListing);
router.get('/', authenticate, requireApproved, marketController.getListings);
router.get('/:id', authenticate, requireApproved, marketController.getListingById);

module.exports = router;

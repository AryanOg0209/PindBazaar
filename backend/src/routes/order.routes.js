const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { authenticate, requireApproved } = require('../middleware/auth.middleware');

router.post('/', authenticate, requireApproved, orderController.createOrder);
router.get('/', authenticate, requireApproved, orderController.getUserOrders);
router.patch('/:id/status', authenticate, requireApproved, orderController.updateOrderStatus);

module.exports = router;

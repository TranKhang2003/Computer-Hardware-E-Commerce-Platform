// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, authorize, optionalAuth } = require('../middlewares/auth.middleware');

// Customer routes
router.post('/', optionalAuth, orderController.createOrder);
router.get('/my-orders', authenticate, orderController.getMyOrders);

// ✅ NEW: Guest order tracking - đặt TRƯỚC route /:orderId
router.post('/track', orderController.trackGuestOrder);

router.get('/:orderId', optionalAuth, orderController.getOrderById);
router.post('/:orderId/cancel', authenticate, orderController.cancelOrder);

// Discount validation
router.post('/validate-discount', orderController.validateDiscountCode);

// Admin routes
router.get('/admin/all', authenticate, authorize('admin'), orderController.getAllOrders);
router.patch('/admin/:orderId/status', authenticate, authorize('admin'), orderController.updateOrderStatus);

module.exports = router;
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { optionalAuth } = require('../middlewares/auth.middleware');
const guestCartMiddleware = require('../middlewares/guestCart.middleware');

// Optional auth middleware - không bắt buộc login
router.use(optionalAuth);
router.use(guestCartMiddleware);

// Routes
router.get('/', cartController.getCart);
router.post('/add', cartController.addItem);
router.put('/update', cartController.updateQuantity);
router.delete('/remove', cartController.removeItem);
router.delete('/clear', cartController.clearCart);
router.post('/merge', cartController.mergeCart);
router.post('/sync', cartController.syncCart);

module.exports = router;
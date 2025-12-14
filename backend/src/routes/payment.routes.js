const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
// const { authenticate, optionalAuth } = require('../middlewares/auth');
const { optionalAuth } = require('../middlewares/auth.middleware');

// Create VNPay payment URL
router.post('/vnpay/create', optionalAuth, paymentController.createVNPayPayment);


// VNPay IPN (callback from VNPay server)
// router.get('/vnpay/vnpay_ipn', paymentController.vnpayIPN);

// VNPay return URL (when user returns from VNPay)
router.get('/vnpay/return', paymentController.vnpayReturn);

// Query payment status
// router.get('/vnpay/query', authenticate, paymentController.queryPaymentStatus);

module.exports = router;
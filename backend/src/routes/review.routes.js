const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
// const { protect, optionalAuth } = require('../middlewares/auth.middleware');
const { authenticate } = require('../middlewares/auth.middleware');

// review.routes.js
router.get('/products/:productId/reviews', reviewController.getProductReviews);
router.post('/products/:productId/reviews', authenticate, reviewController.createReview);

// Protected routes
// router.post('/', authenticate, reviewController.createReview);
// router.get('/my-reviews', protect, reviewController.getUserReviews);
// router.put('/:id', protect, reviewController.updateReview);
// router.delete('/:id', protect, reviewController.deleteReview);
// router.post('/:id/helpful', protect, reviewController.markHelpful);

module.exports = router;

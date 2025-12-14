// src/routes/product.routes.js
const express = require('express');
const router = express.Router({ mergeParams: true });

const productController = require('../controllers/productController');
const { optionalAuth } = require('../middlewares/auth.middleware');

// Import comment routes
const commentRoutes = require('./comment.routes');

// ============================================================
// COMMENT ROUTES (MUST BE HERE)
// ============================================================
// Mọi request dạng:
//   /api/v1/products/:productId/comments/...  
// sẽ đi vào file comment.routes.js
router.use('/:productId/comments', commentRoutes);

// ============================================================
// PUBLIC PRODUCT ROUTES
// ============================================================

// Categories & Brands (luôn để trước)
router.get('/categories', productController.getCategories);
router.get('/brands', productController.getBrands);

// List all products + filtering
router.get('/', optionalAuth, productController.getAllProducts);

// Related products
router.get('/:productId/related', optionalAuth, productController.getRelatedProducts);

// Get product by slug (đặt trước /:id để tránh conflict)
router.get('/slug/:slug', productController.getProductBySlug);

// Final fallback — GET product by id
router.get('/:id', optionalAuth, productController.getProductById);

module.exports = router;

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminProductController = require('../controllers/adminProductController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const userController = require('../controllers/userController');
const orderController = require('../controllers/orderController');
const multer = require('multer');
const { uploadToS3, deleteFromS3 } = require('../services/uploadService');

router.get(
    '/blacklist/stats',
    authenticate,
    authorize('admin'),
    adminController.getBlacklistStats
);

router.delete(
    '/blacklist/clear',
    authenticate,
    authorize('admin'),
    adminController.clearBlacklist
);

router.get(
    '/blacklist/:jti',
    authenticate,
    authorize('admin'),
    adminController.getTokenInfo
);

router.post(
    '/users/:userId/revoke-tokens',
    authenticate,
    authorize('admin'),
    adminController.revokeUserTokens
);

router.get(
    '/health',
    authenticate,
    authorize('admin'),
    adminController.getSystemHealth
);

router.post(
    '/cleanup',
    authenticate,
    authorize('admin'),
    adminController.cleanupExpiredTokens
);

router.get(
    '/products',
    authenticate,
    authorize('admin'),
    adminProductController.getAllProducts
);

router.post(
    '/products',
    authenticate,
    authorize('admin'),
    adminProductController.createProduct
);

router.get(
    '/products/:id',
    authenticate,
    authorize('admin'),
    adminProductController.getProductById
);

router.put(
    '/products/:id',
    authenticate,
    authorize('admin'),
    adminProductController.updateProduct
);

router.delete(
    '/products/:id',
    authenticate,
    authorize('admin'),
    adminProductController.deleteProduct
);

router.get(
    '/dashboard',
    authenticate,
    authorize('admin'),
    adminController.getDashboardStats
);

router.get(
    '/analytics',
    authenticate,
    authorize('admin'),
    adminController.getAnalytics
);


router.get(
    '/users',
    authenticate,
    authorize('admin'),
    userController.getAllUsers
);

router.put(
    '/users/:userId/ban',
    authenticate,
    authorize('admin'),
    userController.toggleUserBan
);

router.get(
    '/orders',
    authenticate,
    authorize('admin'),
    orderController.getAllOrders
);

router.get(
    '/discounts',
    authenticate,
    authorize('admin'),
    adminController.getAllDiscounts
);

router.post(
    '/discounts',
    authenticate,
    authorize('admin'),
    adminController.createDiscount
);

router.delete(
    '/discounts/:code',
    authenticate,
    authorize('admin'),
    adminController.deleteDiscount
);

router.get(
    '/discounts/:code/usage',
    authenticate,
    authorize('admin'),
    adminController.getDiscountUsage
);


const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        // Chỉ cho phép upload ảnh
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP are allowed.'));
        }
    },
});


router.post(
    '/upload/image',
    authenticate,
    authorize('admin'),
    upload.single('image'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No image file provided',
                });
            }

            const imageUrl = await uploadToS3(req.file);

            res.status(200).json({
                success: true,
                data: {
                    url: imageUrl,
                    filename: req.file.originalname,
                    size: req.file.size,
                },
                message: 'Image uploaded successfully',
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to upload image',
            });
        }
    }
);

router.post(
    '/upload/images',
    authenticate,
    authorize('admin'),
    upload.array('images', 10),
    async (req, res) => {
        try {

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No image files provided',
                });
            }

            const uploadPromises = req.files.map(file => uploadToS3(file));
            const imageUrls = await Promise.all(uploadPromises);

            res.status(200).json({
                success: true,
                data: {
                    urls: imageUrls,
                    count: imageUrls.length,
                },
                message: `${imageUrls.length} images uploaded successfully`,
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to upload images',
            });
        }
    }
);

router.delete(
    '/upload/image',
    authenticate,
    authorize('admin'),
    async (req, res) => {
        try {
            const { url } = req.body;

            if (!url) {
                return res.status(400).json({
                    success: false,
                    message: 'Image URL is required',
                });
            }

            const deleted = await deleteFromS3(url);

            if (deleted) {
                res.status(200).json({
                    success: true,
                    message: 'Image deleted successfully',
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Failed to delete image',
                });
            }
        } catch (error) {
            console.error('Delete error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to delete image',
            });
        }
    }
);

// Error handler cho multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size is too large. Maximum size is 5MB',
            });
        }
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
    next(error);
});


module.exports = router;
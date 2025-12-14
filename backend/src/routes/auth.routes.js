const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const rateLimit = require('express-rate-limit');
const passport = require('../config/passport');
const multer = require('multer');
const { uploadToS3, deleteFromS3 } = require('../services/uploadService');

// Rate limiters
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts
    message: {
        success: false,
        message: 'Too many login attempts, please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations
    message: {
        success: false,
        message: 'Too many accounts created from this IP, please try again after an hour'
    }
});

const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 refresh requests
    message: {
        success: false,
        message: 'Too many refresh requests, please try again later'
    }
});

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP are allowed.'));
        }
    },
});


router.post('/register', registerLimiter, authController.register);
// router.post('/login', loginLimiter, authController.login);
router.post('/login', authController.login);
router.post('/refresh', refreshLimiter, authController.refreshToken);

// Gửi link reset password
router.post('/forgot-password', authController.forgotPassword);
// Reset password
router.post('/reset-password', authController.resetPassword);

router.get('/me', authenticate, authController.getCurrentUser);
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);

// User profile routes
router.patch('/profile', authenticate, authController.updateProfile);
router.post('/profile/change-password', authenticate, authController.changePassword);

// Avatar upload route
router.post(
    '/profile/avatar',
    authenticate,
    upload.single('avatar'),
    async (req, res, next) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No avatar file provided',
                });
            }

            const User = require('../models/User');
            const user = await User.findById(req.user.id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }

            // Delete old avatar if exists
            if (user.avatarUrl) {
                await deleteFromS3(user.avatarUrl);
            }

            // Upload new avatar
            const avatarUrl = await uploadToS3(req.file, 'avatars');

            // Update userk
            user.avatarUrl = avatarUrl;
            await user.save();

            res.status(200).json({
                success: true,
                data: {
                    avatarUrl,
                    user: user.toJSON(),
                },
                message: 'Avatar uploaded successfully',
            });
        } catch (error) {
            console.error('Avatar upload error:', error);
            next(error);
        }
    }
);

// Delete avatar route
router.delete('/profile/avatar', authenticate, async (req, res, next) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        if (!user.avatarUrl) {
            return res.status(400).json({
                success: false,
                message: 'No avatar to delete',
            });
        }

        // Delete from S3
        await deleteFromS3(user.avatarUrl);

        // Update user
        user.avatarUrl = null;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Avatar deleted successfully',
            data: {
                user: user.toJSON(),
            },
        });
    } catch (error) {
        console.error('Avatar delete error:', error);
        next(error);
    }
});


// Address management routes
router.post('/profile/addresses', authenticate, authController.addAddress);
router.patch('/profile/addresses/:addressId', authenticate, authController.updateAddress);
router.delete('/profile/addresses/:addressId', authenticate, authController.deleteAddress);
router.patch('/profile/addresses/:addressId/default', authenticate, authController.setDefaultAddress);


// ✅ Google OAuth - FIX failureRedirect
router.get('/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: `${process.env.CLIENT_URL}/oauth-failure?error=google_auth_failed`
    }),
    authController.oauthCallback
);

// ✅ Facebook OAuth - FIX failureRedirect
router.get('/facebook', passport.authenticate('facebook', {
    scope: ['public_profile', 'email']
}));

router.get('/facebook/callback',
    passport.authenticate('facebook', {
        session: false,
        failureRedirect: `${process.env.CLIENT_URL}/oauth-failure?error=facebook_auth_failed`
    }),
    authController.oauthCallback
);


module.exports = router;
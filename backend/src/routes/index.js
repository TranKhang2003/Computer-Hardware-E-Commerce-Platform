const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const redisClient = require('../config/redis');

// Import route modules
const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const cartRoutes = require('./cart.routes');
const orderRoutes = require('./order.routes');
const paymentRoutes = require('./payment.routes');
const reviewRoutes = require('./review.routes');
const adminRoutes = require('./admin.routes');
const commentRoutes = require('./comment.routes');


// Mount routes
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/payment', paymentRoutes);
router.use('/', reviewRoutes); // Reviews 
router.use('/admin', adminRoutes);
router.use('/', commentRoutes);


// Health check endpoint
router.get('/health', async (req, res) => {
    try {
        const redisHealth = await redisClient.healthCheck();

        res.json({
            success: true,
            message: 'API is running',
            timestamp: new Date().toISOString(),
            services: {
                api: 'healthy',
                database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
                redis: redisHealth
            },
            uptime: process.uptime(),
            memory: process.memoryUsage()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Health check failed',
            error: error.message
        });
    }
});

module.exports = router;
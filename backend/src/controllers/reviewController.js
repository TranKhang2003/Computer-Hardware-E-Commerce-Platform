// reviewController.js
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

class ReviewController {
    constructor() {
        this.createReview = this.createReview.bind(this);
        this.getProductReviews = this.getProductReviews.bind(this);
        this.updateProductStats = this.updateProductStats.bind(this);
    }

    async createReview(req, res, next) {
        try {
            const { rating, comment, images, orderId } = req.body;
            const { productId } = req.params;

            // Validate ObjectId
            if (!mongoose.Types.ObjectId.isValid(productId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid product ID'
                });
            }

            // Check existing review
            const existingReview = await Review.findOne({
                productId: productId,
                userId: req.user.id
            });

            if (existingReview) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already reviewed this product'
                });
            }

            // Verify product exists
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Check verified purchase
            let isVerifiedPurchase = false;

            if (orderId) {
                const order = await Order.findOne({
                    _id: orderId,
                    user: req.user.id,
                    'items.product': productId,
                    status: 'delivered'
                });

                if (order) isVerifiedPurchase = true;
            }

            // Create review
            const review = await Review.create({
                productId: productId,
                userId: req.user.id,
                orderId: orderId || null,
                rating,
                comment,
                images: images || [],
                isVerifiedPurchase,
                status: 'approved'
            });

            // Update product stats
            await this.updateProductStats(productId);

            // Populate user info
            await review.populate('userId', 'fullName avatarUrl');

            res.status(201).json({
                success: true,
                data: review,
                message: 'Review created successfully'
            });
        } catch (error) {
            console.error('Create review error:', error);
            next(error);
        }
    }

    async getProductReviews(req, res, next) {
        try {
            const { productId } = req.params;
            const { page = 1, limit = 10, sort = 'recent' } = req.query;

            // Validate ObjectId
            if (!mongoose.Types.ObjectId.isValid(productId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid product ID'
                });
            }

            // Sort options
            let sortObj = { createdAt: -1 };

            if (sort === 'helpful') {
                sortObj = { helpfulCount: -1, createdAt: -1 };
            } else if (sort === 'rating-high') {
                sortObj = { rating: -1, createdAt: -1 };
            } else if (sort === 'rating-low') {
                sortObj = { rating: 1, createdAt: -1 };
            }

            const skip = (page - 1) * limit;

            // Fetch reviews
            const reviews = await Review.find({
                productId: productId,
                status: 'approved'
            })
                .sort(sortObj)
                .limit(Number(limit))
                .skip(skip)
                .populate('userId', 'fullName avatarUrl')
                .lean();

            const total = await Review.countDocuments({
                productId: productId,
                status: 'approved'
            });

            // Rating distribution
            const ratingDistribution = await Review.aggregate([
                {
                    $match: {
                        productId: new mongoose.Types.ObjectId(productId),
                        status: 'approved'
                    }
                },
                {
                    $group: {
                        _id: '$rating',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: -1 } }
            ]);

            // Calculate average rating
            const stats = await Review.aggregate([
                {
                    $match: {
                        productId: new mongoose.Types.ObjectId(productId),
                        status: 'approved'
                    }
                },
                {
                    $group: {
                        _id: null,
                        averageRating: { $avg: '$rating' },
                        totalReviews: { $sum: 1 }
                    }
                }
            ]);

            res.json({
                success: true,
                data: {
                    reviews,
                    ratingDistribution,
                    summary: {
                        averageRating: stats[0]?.averageRating
                            ? Math.round(stats[0].averageRating * 10) / 10
                            : 0,
                        totalReviews: stats[0]?.totalReviews || 0
                    },
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            console.error('Get reviews error:', error);
            next(error);
        }
    }

    // Helper method: Update product rating stats
    async updateProductStats(productId) {
        try {
            const stats = await Review.aggregate([
                {
                    $match: {
                        productId: new mongoose.Types.ObjectId(productId),
                        status: 'approved'
                    }
                },
                {
                    $group: {
                        _id: '$productId',
                        averageRating: { $avg: '$rating' },
                        reviewCount: { $sum: 1 }
                    }
                }
            ]);

            if (stats.length > 0) {
                await Product.findByIdAndUpdate(productId, {
                    averageRating:
                        Math.round(stats[0].averageRating * 10) / 10,
                    reviewCount: stats[0].reviewCount
                });
            }
        } catch (error) {
            console.error('Update product stats error:', error);
        }
    }
}

module.exports = new ReviewController();

// src/controllers/commentController.js
const Comment = require('../models/Comment');
const Product = require('../models/Product');
const SocketService = require('../services/socketService');
const { validationResult } = require('express-validator');

class CommentController {
    /**
     * @desc    Get all comments for a product
     * @route   GET /api/v1/products/:productId/comments
     * @access  Public
     */
    async getProductComments(req, res) {
        try {
            const { productId } = req.params;


            // Verify product exists
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }


            // Fetch all comments
            const comments = await Comment.find({ productId })
                .populate('userId', 'fullName email avatarUrl')
                .sort({ createdAt: -1 })
                .lean();


            res.status(200).json({
                success: true,
                data: comments,
                count: comments.length
            });
        } catch (error) {
            console.error('Get comments error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch comments',
                error: error.message
            });
        }
    }

    /**
     * @desc    Create a new comment
     * @route   POST /api/v1/products/:productId/comments
     * @access  Public (with optional auth)
     */
    async createComment(req, res) {
        try {
            // Validate input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { productId } = req.params;
            const { comment, parentId, authorName, authorEmail } = req.body;

            // Verify product exists
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Verify parent comment if provided
            if (parentId) {
                const parentComment = await Comment.findById(parentId);
                if (!parentComment) {
                    return res.status(404).json({
                        success: false,
                        message: 'Parent comment not found'
                    });
                }
            }

            // Get IP address
            const ipAddress = req.ip || req.connection.remoteAddress;

            // Create new comment
            const newComment = new Comment({
                productId,
                userId: req.user?._id,
                parentId: parentId || null,
                authorName: authorName || req.user?.fullName || 'Anonymous',
                authorEmail: authorEmail || req.user?.email,
                comment,
                ipAddress
            });

            await newComment.save();

            // Populate user data
            await newComment.populate('userId', 'fullName email avatarUrl');

            // 🔥 EMIT WEBSOCKET EVENT
            const io = req.app.get('io');
            SocketService.emitCommentCreated(io, productId, newComment.toObject());

            res.status(201).json({
                success: true,
                message: 'Comment posted successfully',
                data: newComment
            });
        } catch (error) {
            console.error('Create comment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to post comment',
                error: error.message
            });
        }
    }

    /**
     * @desc    Update a comment
     * @route   PUT /api/v1/products/:productId/comments/:commentId
     * @access  Private (Owner only)
     */
    async updateComment(req, res) {
        try {
            // Validate input
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { productId, commentId } = req.params;
            const { comment } = req.body;

            // Find comment
            const existingComment = await Comment.findOne({
                _id: commentId,
                productId
            });

            if (!existingComment) {
                return res.status(404).json({
                    success: false,
                    message: 'Comment not found'
                });
            }

            // Check ownership
            if (req.user && existingComment.userId) {
                if (existingComment.userId.toString() !== req.user._id.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'You can only edit your own comments'
                    });
                }
            }

            // Update comment
            existingComment.comment = comment;
            existingComment.isEdited = true;
            existingComment.updatedAt = Date.now();

            await existingComment.save();
            await existingComment.populate('userId', 'fullName email avatarUrl');

            // 🔥 EMIT WEBSOCKET EVENT
            const io = req.app.get('io');
            SocketService.emitCommentUpdated(io, productId, existingComment.toObject());

            res.status(200).json({
                success: true,
                message: 'Comment updated successfully',
                data: existingComment
            });
        } catch (error) {
            console.error('Update comment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update comment',
                error: error.message
            });
        }
    }

    /**
     * @desc    Delete a comment
     * @route   DELETE /api/v1/products/:productId/comments/:commentId
     * @access  Private (Owner only)
     */
    async deleteComment(req, res) {
        try {
            const { productId, commentId } = req.params;

            // Find comment
            const comment = await Comment.findOne({
                _id: commentId,
                productId
            });

            if (!comment) {
                return res.status(404).json({
                    success: false,
                    message: 'Comment not found'
                });
            }

            // Check ownership
            if (req.user && comment.userId) {
                if (comment.userId.toString() !== req.user._id.toString()) {
                    return res.status(403).json({
                        success: false,
                        message: 'You can only delete your own comments'
                    });
                }
            }

            // Find all child comments
            const childComments = await Comment.find({ parentId: commentId });
            const deletedIds = [commentId, ...childComments.map(c => c._id.toString())];

            // Delete comment and replies
            await Comment.deleteMany({
                $or: [
                    { _id: commentId },
                    { parentId: commentId }
                ]
            });

            // 🔥 EMIT WEBSOCKET EVENT
            const io = req.app.get('io');
            SocketService.emitCommentDeleted(io, productId, commentId, deletedIds);

            res.status(200).json({
                success: true,
                message: 'Comment deleted successfully'
            });
        } catch (error) {
            console.error('Delete comment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete comment',
                error: error.message
            });
        }
    }

    /**
     * @desc    Get comment count for a product
     * @route   GET /api/v1/products/:productId/comments/count
     * @access  Public
     */
    async getCommentCount(req, res) {
        try {
            const { productId } = req.params;
            const count = await Comment.countDocuments({ productId });

            res.status(200).json({
                success: true,
                data: { count }
            });
        } catch (error) {
            console.error('Get comment count error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get comment count',
                error: error.message
            });
        }
    }
}

module.exports = new CommentController();
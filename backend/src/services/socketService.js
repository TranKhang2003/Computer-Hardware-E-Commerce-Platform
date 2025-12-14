// src/services/socket.service.js
const logger = require('../utils/logger');

class SocketService {
    /**
     * Emit comment created event to product room
     * @param {Object} io - Socket.io instance
     * @param {String} productId - Product ID
     * @param {Object} comment - Comment object
     */
    static emitCommentCreated(io, productId, comment) {
        try {
            io.to(`product-${productId}`).emit('comment-created', {
                comment: comment
            });
            logger.info(`[Socket] Emitted comment-created for product: ${productId}`);
        } catch (error) {
            logger.error('[Socket] Error emitting comment-created:', error);
        }
    }

    /**
     * Emit comment updated event to product room
     * @param {Object} io - Socket.io instance
     * @param {String} productId - Product ID
     * @param {Object} comment - Updated comment object
     */
    static emitCommentUpdated(io, productId, comment) {
        try {
            io.to(`product-${productId}`).emit('comment-updated', {
                comment: comment
            });
            logger.info(`[Socket] Emitted comment-updated for product: ${productId}`);
        } catch (error) {
            logger.error('[Socket] Error emitting comment-updated:', error);
        }
    }

    /**
     * Emit comment deleted event to product room
     * @param {Object} io - Socket.io instance
     * @param {String} productId - Product ID
     * @param {String} commentId - Deleted comment ID
     * @param {Array} deletedIds - Array of all deleted comment IDs (including replies)
     */
    static emitCommentDeleted(io, productId, commentId, deletedIds) {
        try {
            io.to(`product-${productId}`).emit('comment-deleted', {
                commentId,
                deletedIds
            });
            logger.info(`[Socket] Emitted comment-deleted for product: ${productId}`);
        } catch (error) {
            logger.error('[Socket] Error emitting comment-deleted:', error);
        }
    }

    /**
     * Get online users count in a product room
     * @param {Object} io - Socket.io instance
     * @param {String} productId - Product ID
     * @returns {Number} Online users count
     */
    static getOnlineCount(io, productId) {
        try {
            const room = io.sockets.adapter.rooms.get(`product-${productId}`);
            return room ? room.size : 0;
        } catch (error) {
            logger.error('[Socket] Error getting online count:', error);
            return 0;
        }
    }

    /**
     * Get all connected sockets count
     * @param {Object} io - Socket.io instance
     * @returns {Number} Total connected sockets
     */
    static getTotalConnections(io) {
        try {
            return io.engine.clientsCount;
        } catch (error) {
            logger.error('[Socket] Error getting total connections:', error);
            return 0;
        }
    }

    /**
     * Broadcast to all users in a product room
     * @param {Object} io - Socket.io instance
     * @param {String} productId - Product ID
     * @param {String} event - Event name
     * @param {Object} data - Data to send
     */
    static broadcastToProduct(io, productId, event, data) {
        try {
            io.to(`product-${productId}`).emit(event, data);
            logger.info(`[Socket] Broadcasted ${event} to product: ${productId}`);
        } catch (error) {
            logger.error(`[Socket] Error broadcasting ${event}:`, error);
        }
    }

    /**
     * Emit notification to specific user
     * @param {Object} io - Socket.io instance
     * @param {String} userId - User ID
     * @param {String} event - Event name
     * @param {Object} data - Data to send
     */
    static emitToUser(io, userId, event, data) {
        try {
            io.to(userId).emit(event, data);
            logger.info(`[Socket] Emitted ${event} to user: ${userId}`);
        } catch (error) {
            logger.error(`[Socket] Error emitting ${event} to user:`, error);
        }
    }
}

module.exports = SocketService;

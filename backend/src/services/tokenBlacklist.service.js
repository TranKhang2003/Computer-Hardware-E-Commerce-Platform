const jwt = require('jsonwebtoken');
const redisClient = require('../config/redis');
const logger = require('../utils/logger');

class TokenBlacklistService {
    constructor() {
        this.prefix = 'blacklist:token:';
    }

    /**
     * Blacklist một access token
     */
    async blacklist(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const jti = decoded.jti;
            const remainingTime = decoded.exp - Math.floor(Date.now() / 1000);

            if (remainingTime <= 0) {
                logger.info('Token already expired, no need to blacklist');
                return false;
            }

            const client = redisClient.getClient();

            await client.setEx(
                `${this.prefix}${jti}`,
                remainingTime,
                JSON.stringify({
                    jti,
                    userId: decoded.id,
                    blacklistedAt: new Date().toISOString(),
                    expiresAt: new Date(decoded.exp * 1000).toISOString()
                })
            );

            logger.info(`✅ Token blacklisted: ${jti} (TTL: ${remainingTime}s)`);
            return true;
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                logger.info('Token already expired');
                return false;
            }
            logger.error('❌ Error blacklisting token:', error.message);
            return false;
        }
    }

    /**
     * Kiểm tra token có bị blacklist không
     */
    async isBlacklisted(token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const jti = decoded.jti;

            const client = redisClient.getClient();
            const result = await client.get(`${this.prefix}${jti}`);

            return result !== null;
        } catch (error) {
            if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
                return false;
            }
            logger.error('❌ Error checking blacklist:', error.message);
            return false;
        }
    }

    /**
     * Get blacklist statistics
     */
    async getStats() {
        try {
            const client = redisClient.getClient();
            const keys = await client.keys(`${this.prefix}*`);

            return {
                type: 'redis',
                totalBlacklisted: keys.length,
                status: 'connected',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                type: 'redis',
                status: 'error',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Xóa tất cả blacklisted tokens (admin only)
     */
    async clearAll() {
        try {
            const client = redisClient.getClient();
            const keys = await client.keys(`${this.prefix}*`);

            if (keys.length === 0) {
                return 0;
            }

            const deleted = await client.del(keys);
            logger.info(`🗑️ Cleared ${deleted} blacklisted tokens`);
            return deleted;
        } catch (error) {
            logger.error('❌ Error clearing blacklist:', error.message);
            return 0;
        }
    }

    async getTokenInfo(jti) {
        try {
            const client = redisClient.getClient();
            const result = await client.get(`${this.prefix}${jti}`);

            if (!result) return null;

            return JSON.parse(result);
        } catch (error) {
            logger.error('❌ Error getting token info:', error.message);
            return null;
        }
    }
}

module.exports = new TokenBlacklistService();
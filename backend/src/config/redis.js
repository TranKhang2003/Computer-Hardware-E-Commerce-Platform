const redis = require('redis');
const logger = require('../utils/logger');

class RedisClient {
    constructor() {
        this.client = null;
        this.isConnected = false;
    }

    async connect() {
        try {
            this.client = redis.createClient({
                url: process.env.REDIS_URL || 'redis://localhost:6379',
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > 10) {
                            logger.error('❌ Redis connection failed after 10 retries');
                            return new Error('Redis unavailable');
                        }
                        const delay = Math.min(retries * 100, 3000);
                        logger.info(`🔄 Redis reconnecting... attempt ${retries} (delay: ${delay}ms)`);
                        return delay;
                    }
                }
            });

            // Event handlers
            this.client.on('error', (err) => {
                logger.error('❌ Redis Client Error:', err.message);
                this.isConnected = false;
            });

            this.client.on('connect', () => {
                logger.info('🔌 Redis connecting...');
            });

            this.client.on('ready', () => {
                logger.info('✅ Redis connected and ready');
                this.isConnected = true;
            });

            this.client.on('reconnecting', () => {
                logger.info('🔄 Redis reconnecting...');
                this.isConnected = false;
            });

            this.client.on('end', () => {
                logger.info('🔴 Redis connection closed');
                this.isConnected = false;
            });

            // Connect
            await this.client.connect();

            // Test connection
            await this.client.ping();
            logger.info('✅ Redis ping successful');

            return this.client;
        } catch (error) {
            logger.error('❌ Failed to connect to Redis:', error.message);
            throw error;
        }
    }

    getClient() {
        if (!this.isConnected || !this.client) {
            throw new Error('Redis client is not connected');
        }
        return this.client;
    }

    // Method để tạo duplicate client cho Socket.io adapter
    duplicate() {
        if (!this.client) {
            throw new Error('Cannot duplicate: Redis client is not initialized');
        }
        return this.client.duplicate();
    }

    async disconnect() {
        if (this.client) {
            await this.client.quit();
            logger.info('✅ Redis disconnected gracefully');
        }
    }

    // Health check
    async healthCheck() {
        try {
            if (!this.isConnected) {
                return { status: 'disconnected', message: 'Redis is not connected' };
            }

            const pong = await this.client.ping();
            return {
                status: 'healthy',
                message: 'Redis is working',
                response: pong
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                message: error.message
            };
        }
    }
}

// Export singleton instance
const redisClient = new RedisClient();
module.exports = redisClient;
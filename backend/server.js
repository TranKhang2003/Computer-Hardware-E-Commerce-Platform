require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const { createAdapter } = require('@socket.io/redis-adapter');
const connectDB = require('./src/config/database');
const redisClient = require('./src/config/redis');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
});

// Make io accessible throughout the app
app.set('io', io);

// ============================================================
// REDIS ADAPTER FOR HORIZONTAL SCALING
// ============================================================

const setupRedisAdapter = async () => {
    try {
        // Create duplicate Redis clients for pub/sub
        // Sử dụng method duplicate() từ redisClient wrapper
        const pubClient = redisClient.duplicate();
        const subClient = redisClient.duplicate();

        // Connect both clients
        await Promise.all([
            pubClient.connect(),
            subClient.connect()
        ]);

        logger.info('✅ Redis pub/sub clients connected');

        // Setup Redis adapter
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Socket.io Redis adapter configured');

        // Handle Redis adapter errors
        pubClient.on('error', (err) => {
            logger.error('❌ Redis Pub Client Error:', err);
        });

        subClient.on('error', (err) => {
            logger.error('❌ Redis Sub Client Error:', err);
        });

        return { pubClient, subClient };
    } catch (error) {
        logger.error('❌ Failed to setup Redis adapter:', error);
        throw error;
    }
};

// ============================================================
// SOCKET.IO EVENT HANDLERS
// ============================================================

const onlineUsers = new Map();

io.on('connection', (socket) => {
    const instanceId = process.env.INSTANCE_ID || 'default';
    logger.info(`[Socket.io] User connected: ${socket.id} (Server: ${instanceId})`);

    // Join product room
    socket.on('join-product', async (productId) => {
        await socket.join(`product-${productId}`);
        socket.currentProduct = productId;

        logger.info(`[Socket.io] User ${socket.id} joined product: ${productId}`);

        // Get room size across all servers
        const sockets = await io.in(`product-${productId}`).fetchSockets();
        const onlineCount = sockets.length;

        io.to(`product-${productId}`).emit('online-count', onlineCount);
    });

    // Leave product room
    socket.on('leave-product', async (productId) => {
        await socket.leave(`product-${productId}`);

        logger.info(`[Socket.io] User ${socket.id} left product: ${productId}`);

        // Get room size across all servers
        const sockets = await io.in(`product-${productId}`).fetchSockets();
        const onlineCount = sockets.length;

        io.to(`product-${productId}`).emit('online-count', onlineCount);

        if (socket.currentProduct === productId) {
            socket.currentProduct = null;
        }
    });

    // Typing start
    socket.on('typing-start', ({ productId, userName }) => {
        socket.to(`product-${productId}`).emit('user-typing', {
            socketId: socket.id,
            userName: userName || 'Someone'
        });
    });

    // Typing stop
    socket.on('typing-stop', ({ productId }) => {
        socket.to(`product-${productId}`).emit('user-stopped-typing', {
            socketId: socket.id
        });
    });

    // Disconnect
    socket.on('disconnect', async (reason) => {
        logger.info(`[Socket.io] User disconnected: ${socket.id}, Reason: ${reason}`);

        if (socket.currentProduct) {
            // Get room size across all servers
            const sockets = await io.in(`product-${socket.currentProduct}`).fetchSockets();
            const onlineCount = sockets.length;

            io.to(`product-${socket.currentProduct}`).emit('online-count', onlineCount);
        }
    });

    // Error
    socket.on('error', (error) => {
        logger.error(`[Socket.io] Socket error for ${socket.id}:`, error);
    });
});

// Monitor connections every 5 minutes
setInterval(async () => {
    const socketCount = io.engine.clientsCount;
    const instanceId = process.env.INSTANCE_ID || 'default';

    try {
        // Get all connected sockets across all servers
        const allSockets = await io.fetchSockets();
        const totalConnections = allSockets.length;

        logger.info(`[Socket.io] Instance ${instanceId} - Local: ${socketCount}, Total across cluster: ${totalConnections}`);
    } catch (error) {
        logger.error('[Socket.io] Error fetching socket count:', error);
    }
}, 300000);

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

let pubClient, subClient;

const gracefulShutdown = async (signal) => {
    logger.info(`\n${signal} received. Starting graceful shutdown...`);

    try {
        logger.info('Closing Socket.io connections...');
        io.close(() => {
            logger.info('✅ Socket.io closed');
        });

        // Disconnect Redis pub/sub clients
        if (pubClient) {
            await pubClient.quit();
            logger.info('✅ Redis Pub client disconnected');
        }

        if (subClient) {
            await subClient.quit();
            logger.info('✅ Redis Sub client disconnected');
        }

        await redisClient.disconnect();
        logger.info('✅ Redis main client disconnected');

        if (connectDB.disconnect) {
            await connectDB.disconnect();
        }
        logger.info('✅ MongoDB disconnected');

        server.close(() => {
            logger.info('✅ Server closed');
            process.exit(0);
        });

        setTimeout(() => {
            logger.error('⚠️ Forcing shutdown after 10 seconds');
            process.exit(1);
        }, 10000);

    } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
    }
};

// ============================================================
// START SERVER
// ============================================================

const startServer = async () => {
    try {
        await connectDB();
        logger.info('✅ MongoDB connected');

        await redisClient.connect();
        logger.info('✅ Redis connected');

        // Setup Redis adapter for Socket.io
        const redisClients = await setupRedisAdapter();
        pubClient = redisClients.pubClient;
        subClient = redisClients.subClient;

        server.listen(PORT, () => {
            const instanceId = process.env.INSTANCE_ID || 'default';
            logger.info('═══════════════════════════════════════════');
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`🏷️  Instance ID: ${instanceId}`);
            logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            logger.info(`🏥 Health check: http://localhost:${PORT}/api/v1/health`);
            logger.info(`🔌 Socket.io ready with Redis adapter`);
            logger.info(`📡 Horizontal scaling enabled`);
            logger.info('═══════════════════════════════════════════');
        });

        process.on('unhandledRejection', (err) => {
            logger.error('❌ Unhandled Rejection:', err);
            gracefulShutdown('UNHANDLED_REJECTION');
        });

        process.on('uncaughtException', (err) => {
            logger.error('❌ Uncaught Exception:', err);
            gracefulShutdown('UNCAUGHT_EXCEPTION');
        });

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        logger.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Export for testing
module.exports = { server, io };
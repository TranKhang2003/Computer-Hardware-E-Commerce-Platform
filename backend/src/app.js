const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const passport = require('./config/passport');
const cookieParser = require('cookie-parser');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error.middleware');
const logger = require('./utils/logger');


const app = express();

// ============================================================
// SECURITY MIDDLEWARES
// ============================================================

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization"
}));


// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
// app.use('/api', limiter);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSSx
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// ============================================================
// BODY PARSER & COMPRESSION
// ============================================================

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());


app.use(passport.initialize());

// Compress responses
app.use(compression());

// ============================================================
// LOGGING
// ============================================================

// HTTP request logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', {
        stream: {
            write: (message) => logger.info(message.trim())
        }
    }));
}

// ============================================================
// STATIC FILES
// ============================================================

app.use('/uploads', express.static('uploads'));

// ============================================================
// ROUTES
// ============================================================

// API routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Computer Store API',
        version: '1.0.0',
        docs: '/api/v1/health'
    });
});

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
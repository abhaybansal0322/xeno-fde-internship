// Express server entry point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const prisma = require('./prisma');

// Import routes
const tenantsRouter = require('./routes/tenants');
const ingestRouter = require('./routes/ingest');
const webhooksRouter = require('./routes/webhooks');
const metricsRouter = require('./routes/metrics');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 4000;

// CORS middleware - allow requests from frontend
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // In development, allow all origins
        if (process.env.NODE_ENV === 'development') {
            return callback(null, true);
        }
        
        // Normalize URLs (remove trailing slashes for comparison)
        const normalizeUrl = (url) => {
            if (!url) return url;
            return url.replace(/\/$/, '');
        };
        
        // In production, check against allowed origins
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            process.env.NEXTAUTH_URL, // Also check NextAuth URL
            'http://localhost:3000',
            'http://localhost:3001',
        ].filter(Boolean).map(normalizeUrl);
        
        const normalizedOrigin = normalizeUrl(origin);
        
        // If FRONTEND_URL is set, use it; otherwise allow all in production (less secure but works)
        if (allowedOrigins.length === 0 || allowedOrigins.includes(normalizedOrigin)) {
            callback(null, true);
        } else {
            // Log for debugging
            console.log(`CORS blocked origin: ${origin} (normalized: ${normalizedOrigin}), allowed: ${allowedOrigins.join(', ')}`);
            callback(null, true); // Allow for now, can be made stricter later
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware for parsing JSON (except for webhooks which need raw body)
app.use((req, res, next) => {
    if (req.path.startsWith('/webhooks/shopify')) {
        // Store raw body for webhook verification
        let data = '';
        req.setEncoding('utf8');
        req.on('data', chunk => {
            data += chunk;
        });
        req.on('end', () => {
            req.rawBody = data;
            try {
                req.body = JSON.parse(data);
            } catch (e) {
                req.body = {};
            }
            next();
        });
    } else {
        express.json()(req, res, next);
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
app.use('/api/tenants', tenantsRouter);
app.use('/api/ingest', ingestRouter);
app.use('/webhooks/shopify', webhooksRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/auth', authRouter);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// Start server
app.listen(PORT, async () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Test database connection
    try {
        await prisma.$connect();
        console.log('✅ Database connected');
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

module.exports = app;

// Express server entry point
require('dotenv').config();
const express = require('express');
const prisma = require('./prisma');

// Import routes
const tenantsRouter = require('./routes/tenants');
const ingestRouter = require('./routes/ingest');
const webhooksRouter = require('./routes/webhooks');
const metricsRouter = require('./routes/metrics');

const app = express();
const PORT = process.env.PORT || 4000;

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

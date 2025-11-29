// Data ingestion routes
const express = require('express');
const router = express.Router();
const { syncAll } = require('../lib/syncService');

/**
 * POST /api/ingest/sync?tenantId=<id>
 * Trigger manual sync for a tenant
 * Fetches customers, products, orders from Shopify and upserts to DB
 */
router.post('/sync', async (req, res) => {
    try {
        const { tenantId } = req.query;

        if (!tenantId) {
            return res.status(400).json({
                error: 'Missing required query parameter: tenantId',
            });
        }

        // Run sync
        const result = await syncAll(tenantId);

        res.json({
            success: true,
            tenantId,
            ...result,
        });
    } catch (error) {
        console.error('Error during sync:', error);

        res.status(500).json({
            error: 'Sync failed',
            message: error.message,
        });
    }
});

module.exports = router;

// Data ingestion routes
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { syncAll } = require('../lib/syncService');
const { requireUserEmail } = require('../middleware/auth');

/**
 * POST /api/ingest/sync?tenantId=<id>
 * Trigger manual sync for a tenant
 * Fetches customers, products, orders from Shopify and upserts to DB
 * Requires X-User-Email header - verifies tenant belongs to user
 */
router.post('/sync', requireUserEmail, async (req, res) => {
    try {
        const { tenantId } = req.query;
        const userEmail = req.userEmail;

        if (!tenantId) {
            return res.status(400).json({
                error: 'Missing required query parameter: tenantId',
            });
        }

        // Verify tenant belongs to user
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
            });
        }

        const tenant = await prisma.tenant.findFirst({
            where: {
                id: tenantId,
                userId: user.id,
            },
        });

        if (!tenant) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'This store does not belong to you',
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

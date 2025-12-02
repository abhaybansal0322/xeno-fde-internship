// Tenant onboarding routes
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { getUserEmail, requireUserEmail } = require('../middleware/auth');

/**
 * GET /api/tenants
 * List all tenants for the current user (without sensitive data like accessToken)
 * Requires X-User-Email header
 */
router.get('/', requireUserEmail, async (req, res) => {
    try {
        const userEmail = req.userEmail;

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
            });
        }

        // Get tenants for this user
        const tenants = await prisma.tenant.findMany({
            where: {
                userId: user.id,
            },
            select: {
                id: true,
                name: true,
                shopifyDomain: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        res.json(tenants);
    } catch (error) {
        console.error('Error fetching tenants:', error);
        res.status(500).json({
            error: 'Failed to fetch tenants',
            message: error.message,
        });
    }
});

/**
 * POST /api/tenants/onboard
 * Create a new tenant (Shopify store) for the current user
 * Body: { name, shopifyDomain, accessToken }
 * Requires X-User-Email header
 */
router.post('/onboard', requireUserEmail, async (req, res) => {
    try {
        const { name, shopifyDomain, accessToken } = req.body;
        const userEmail = req.userEmail;

        // Validate required fields
        if (!name || !shopifyDomain || !accessToken) {
            return res.status(400).json({
                error: 'Missing required fields: name, shopifyDomain, accessToken',
            });
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
            });
        }

        // Create tenant linked to user
        const tenant = await prisma.tenant.create({
            data: {
                name,
                shopifyDomain,
                accessToken,
                userId: user.id,
            },
        });

        res.status(201).json({
            tenantId: tenant.id,
            name: tenant.name,
            shopifyDomain: tenant.shopifyDomain,
            createdAt: tenant.createdAt,
        });
    } catch (error) {
        console.error('Error creating tenant:', error);

        // Handle unique constraint violation
        if (error.code === 'P2002') {
            return res.status(409).json({
                error: 'You already have a store with this Shopify domain connected',
            });
        }

        res.status(500).json({
            error: 'Failed to create tenant',
            message: error.message,
        });
    }
});

module.exports = router;

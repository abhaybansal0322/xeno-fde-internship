// Tenant onboarding routes
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

/**
 * POST /api/tenants/onboard
 * Create a new tenant (Shopify store)
 * Body: { name, shopifyDomain, accessToken }
 */
router.post('/onboard', async (req, res) => {
    try {
        const { name, shopifyDomain, accessToken } = req.body;

        // Validate required fields
        if (!name || !shopifyDomain || !accessToken) {
            return res.status(400).json({
                error: 'Missing required fields: name, shopifyDomain, accessToken',
            });
        }

        // Create tenant
        const tenant = await prisma.tenant.create({
            data: {
                name,
                shopifyDomain,
                accessToken,
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
                error: 'Tenant with this Shopify domain already exists',
            });
        }

        res.status(500).json({
            error: 'Failed to create tenant',
            message: error.message,
        });
    }
});

module.exports = router;

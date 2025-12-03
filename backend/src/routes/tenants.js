// Tenant onboarding routes
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { getUserEmail, requireUserEmail } = require('../middleware/auth');
const axios = require('axios');

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
 * POST /api/tenants/validate
 * Validate Shopify credentials before onboarding
 * Body: { shopifyDomain, accessToken }
 * This endpoint tests the credentials by making a test API call to Shopify
 */
router.post('/validate', async (req, res) => {
    try {
        const { shopifyDomain, accessToken } = req.body;

        // Validate required fields
        if (!shopifyDomain || !accessToken) {
            return res.status(400).json({
                error: 'Missing required fields: shopifyDomain, accessToken',
            });
        }

        // Normalize shop domain
        const normalizedShop = shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const shop = normalizedShop.includes('.myshopify.com') 
            ? normalizedShop 
            : `${normalizedShop}.myshopify.com`;

        // Test credentials by fetching shop info (lightweight API call)
        try {
            const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
            const shopInfoResponse = await axios.get(
                `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
                {
                    headers: {
                        'X-Shopify-Access-Token': accessToken,
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000, // 10 second timeout
                }
            );

            const shopData = shopInfoResponse.data.shop;

            res.json({
                valid: true,
                shop: {
                    name: shopData.name,
                    domain: shopData.domain,
                    email: shopData.email,
                    currency: shopData.currency,
                },
            });
        } catch (error) {
            if (error.response) {
                const status = error.response.status;
                const errorData = error.response.data;

                if (status === 401) {
                    return res.status(401).json({
                        valid: false,
                        error: 'Invalid access token',
                        message: 'The provided access token is invalid or expired. Please check your credentials.',
                    });
                } else if (status === 403) {
                    return res.status(403).json({
                        valid: false,
                        error: 'Insufficient permissions',
                        message: 'The access token does not have the required permissions. Please ensure it has read access to customers, orders, and products.',
                    });
                } else {
                    return res.status(status).json({
                        valid: false,
                        error: 'Shopify API error',
                        message: errorData?.errors?.[0]?.message || `Shopify API returned ${status}`,
                    });
                }
            } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                return res.status(503).json({
                    valid: false,
                    error: 'Connection failed',
                    message: 'Could not connect to Shopify. Please check the shop domain and try again.',
                });
            } else {
                return res.status(500).json({
                    valid: false,
                    error: 'Validation failed',
                    message: error.message || 'Unknown error occurred while validating credentials',
                });
            }
        }
    } catch (error) {
        console.error('Error validating Shopify credentials:', error);
        res.status(500).json({
            valid: false,
            error: 'Validation error',
            message: error.message,
        });
    }
});

/**
 * POST /api/tenants/onboard
 * Create a new tenant (Shopify store) for the current user
 * Body: { name, shopifyDomain, accessToken }
 * Requires X-User-Email header
 * This endpoint validates credentials before creating the tenant
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

        // Normalize shop domain
        const normalizedShop = shopifyDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
        const shop = normalizedShop.includes('.myshopify.com') 
            ? normalizedShop 
            : `${normalizedShop}.myshopify.com`;

        // Validate Shopify credentials before creating tenant
        // This ensures we catch invalid tokens before storing them
        try {
            const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';
            await axios.get(
                `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
                {
                    headers: {
                        'X-Shopify-Access-Token': accessToken,
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000,
                }
            );
        } catch (error) {
            if (error.response) {
                const status = error.response.status;
                if (status === 401) {
                    return res.status(401).json({
                        error: 'Invalid access token',
                        message: 'The provided access token is invalid or expired. Please check your credentials.',
                    });
                } else if (status === 403) {
                    return res.status(403).json({
                        error: 'Insufficient permissions',
                        message: 'The access token does not have the required permissions.',
                    });
                } else {
                    return res.status(status).json({
                        error: 'Shopify API error',
                        message: error.response.data?.errors?.[0]?.message || `Shopify API returned ${status}`,
                    });
                }
            } else {
                return res.status(503).json({
                    error: 'Connection failed',
                    message: 'Could not connect to Shopify. Please check the shop domain and try again.',
                });
            }
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

        // Create tenant linked to user (using normalized shop domain)
        const tenant = await prisma.tenant.create({
            data: {
                name,
                shopifyDomain: shop, // Use normalized domain
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

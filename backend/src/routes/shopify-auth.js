// Shopify OAuth authentication routes
// Based on Shopify App Template best practices
const express = require('express');
const axios = require('axios');
const router = express.Router();
const prisma = require('../prisma');
const { 
    generateAuthUrl, 
    exchangeCodeForToken, 
    verifyHMAC,
    isValidShopDomain 
} = require('../lib/shopifyOAuth');
const { requireUserEmail } = require('../middleware/auth');

/**
 * GET /api/shopify/install
 * Initiate Shopify OAuth installation flow
 * Query params: shop (shop domain)
 * Requires X-User-Email header
 */
router.get('/install', requireUserEmail, async (req, res) => {
    try {
        const { shop } = req.query;
        const userEmail = req.userEmail;

        // Validate shop domain
        if (!shop || !isValidShopDomain(shop)) {
            return res.status(400).json({
                error: 'Invalid shop domain. Format: mystore.myshopify.com',
            });
        }

        // Verify required environment variables
        const apiKey = process.env.SHOPIFY_API_KEY;
        const apiSecret = process.env.SHOPIFY_API_SECRET;

        if (!apiKey || !apiSecret) {
            return res.status(500).json({
                error: 'Shopify API credentials not configured. Please set SHOPIFY_API_KEY and SHOPIFY_API_SECRET.',
            });
        }

        // Get user
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
            });
        }

        // Check if tenant already exists
        const existingTenant = await prisma.tenant.findFirst({
            where: {
                shopifyDomain: shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`,
                userId: user.id,
            },
        });

        if (existingTenant) {
            return res.status(409).json({
                error: 'Store already connected',
                message: `You already have ${shop} connected. Please disconnect it first to reconnect.`,
                tenantId: existingTenant.id,
            });
        }

        // Get redirect URI from environment or construct it
        const baseUrl = process.env.API_BASE_URL || req.protocol + '://' + req.get('host');
        const redirectUri = `${baseUrl}/api/shopify/callback`;

        // Required scopes
        const scopes = [
            'read_customers',
            'read_orders',
            'read_products',
        ];

        // Generate authorization URL
        const { authUrl, state } = generateAuthUrl(shop, apiKey, redirectUri, scopes);

        // Store state in session/cookie for verification (optional - can also verify via HMAC)
        // For simplicity, we'll verify via HMAC in callback

        res.json({
            authUrl,
            shop,
            state,
        });
    } catch (error) {
        console.error('Error initiating OAuth flow:', error);
        res.status(500).json({
            error: 'Failed to initiate Shopify OAuth flow',
            message: error.message,
        });
    }
});

/**
 * GET /api/shopify/callback
 * Handle Shopify OAuth callback
 * Query params: code, shop, state, hmac
 */
router.get('/callback', async (req, res) => {
    try {
        const { code, shop, state, hmac } = req.query;

        // Verify required parameters
        if (!code || !shop || !hmac) {
            return res.status(400).json({
                error: 'Missing required parameters: code, shop, or hmac',
            });
        }

        // Verify shop domain
        if (!isValidShopDomain(shop)) {
            return res.status(400).json({
                error: 'Invalid shop domain',
            });
        }

        // Verify HMAC signature
        const apiSecret = process.env.SHOPIFY_API_SECRET;
        if (!apiSecret) {
            return res.status(500).json({
                error: 'Shopify API secret not configured',
            });
        }

        const isValid = verifyHMAC(req.query, apiSecret);
        if (!isValid) {
            return res.status(401).json({
                error: 'Invalid HMAC signature',
            });
        }

        // Exchange code for access token
        const apiKey = process.env.SHOPIFY_API_KEY;
        const normalizedShop = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;

        const { accessToken, scope } = await exchangeCodeForToken(
            normalizedShop,
            code,
            apiKey,
            apiSecret
        );

        // Get user email from state or session (for now, we'll need to pass it via frontend redirect)
        // In a production app, you'd store state->userEmail mapping or use session
        // For now, redirect to frontend with shop info and let frontend handle tenant creation
        
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = new URL(`${frontendUrl}/auth/shopify/callback`);
        
        redirectUrl.searchParams.set('shop', normalizedShop);
        redirectUrl.searchParams.set('access_token', accessToken);
        redirectUrl.searchParams.set('scope', scope);

        // Redirect to frontend to complete tenant creation
        res.redirect(redirectUrl.toString());

    } catch (error) {
        console.error('Error handling OAuth callback:', error);
        
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const errorUrl = new URL(`${frontendUrl}/auth/shopify/error`);
        errorUrl.searchParams.set('error', error.message);
        
        res.redirect(errorUrl.toString());
    }
});

/**
 * POST /api/shopify/complete
 * Complete tenant creation after OAuth callback
 * Body: { shop, accessToken, scope }
 * Requires X-User-Email header
 */
router.post('/complete', requireUserEmail, async (req, res) => {
    try {
        const { shop, accessToken, scope } = req.body;
        const userEmail = req.userEmail;

        // Validate required fields
        if (!shop || !accessToken) {
            return res.status(400).json({
                error: 'Missing required fields: shop, accessToken',
            });
        }

        // Verify shop domain
        if (!isValidShopDomain(shop)) {
            return res.status(400).json({
                error: 'Invalid shop domain',
            });
        }

        // Get user
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
        });

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
            });
        }

        const normalizedShop = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;

        // Check if tenant already exists
        const existingTenant = await prisma.tenant.findFirst({
            where: {
                shopifyDomain: normalizedShop,
                userId: user.id,
            },
        });

        if (existingTenant) {
            // Update access token if tenant exists
            const updatedTenant = await prisma.tenant.update({
                where: { id: existingTenant.id },
                data: {
                    accessToken: accessToken,
                    updatedAt: new Date(),
                },
            });

            return res.json({
                success: true,
                tenant: {
                    tenantId: updatedTenant.id,
                    name: updatedTenant.name,
                    shopifyDomain: updatedTenant.shopifyDomain,
                    createdAt: updatedTenant.createdAt,
                },
                message: 'Store connection updated',
            });
        }

        // Fetch shop info to get store name
        let storeName = normalizedShop.replace('.myshopify.com', '');
        try {
            const shopInfoResponse = await axios.get(
                `https://${normalizedShop}/admin/api/2024-01/shop.json`,
                {
                    headers: {
                        'X-Shopify-Access-Token': accessToken,
                    },
                }
            );
            storeName = shopInfoResponse.data.shop.name || storeName;
        } catch (error) {
            console.warn('Could not fetch shop info, using domain as name:', error.message);
        }

        // Create tenant
        const tenant = await prisma.tenant.create({
            data: {
                name: storeName,
                shopifyDomain: normalizedShop,
                accessToken: accessToken,
                userId: user.id,
            },
        });

        res.status(201).json({
            success: true,
            tenant: {
                tenantId: tenant.id,
                name: tenant.name,
                shopifyDomain: tenant.shopifyDomain,
                createdAt: tenant.createdAt,
            },
        });
    } catch (error) {
        console.error('Error completing OAuth flow:', error);

        // Handle unique constraint violation
        if (error.code === 'P2002') {
            return res.status(409).json({
                error: 'Store already connected',
                message: 'This store is already connected to your account',
            });
        }

        res.status(500).json({
            error: 'Failed to complete Shopify connection',
            message: error.message,
        });
    }
});

module.exports = router;


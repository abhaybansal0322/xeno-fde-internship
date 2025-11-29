/**
 * Shopify Webhook Verification Utility
 * 
 * Provides HMAC-SHA256 signature validation for Shopify webhooks
 * to ensure requests are authentic and from Shopify.
 * 
 * Usage:
 * 1. Import this module in your webhook routes
 * 2. Use verifyWebhookMiddleware as Express middleware
 * 3. Or use verifyWebhook directly for custom verification
 */

const crypto = require('crypto');

/**
 * Verify Shopify webhook HMAC signature
 * 
 * @param {string} body - Raw request body (must be string, not parsed JSON)
 * @param {string} hmacHeader - HMAC signature from X-Shopify-Hmac-Sha256 header
 * @param {string} secret - Shopify webhook secret (from app settings)
 * @returns {boolean} - True if signature is valid
 */
function verifyWebhook(body, hmacHeader, secret) {
    if (!body || !hmacHeader || !secret) {
        console.error('[WEBHOOK] Missing required parameters for verification');
        return false;
    }

    try {
        // Generate HMAC signature using webhook secret
        const hash = crypto
            .createHmac('sha256', secret)
            .update(body, 'utf8')
            .digest('base64');

        // Use timing-safe comparison to prevent timing attacks
        const isValid = crypto.timingSafeEqual(
            Buffer.from(hash),
            Buffer.from(hmacHeader)
        );

        if (!isValid) {
            console.warn('[WEBHOOK] Invalid HMAC signature detected');
        }

        return isValid;
    } catch (error) {
        console.error('[WEBHOOK] Error during verification:', error);
        return false;
    }
}

/**
 * Express middleware for webhook verification
 * 
 * Usage:
 * app.post('/webhooks/shopify/:topic', verifyWebhookMiddleware, yourHandler);
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function verifyWebhookMiddleware(req, res, next) {
    // Get HMAC from header
    const hmacHeader = req.get('X-Shopify-Hmac-Sha256');

    if (!hmacHeader) {
        console.warn('[WEBHOOK] Missing X-Shopify-Hmac-Sha256 header');
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing HMAC signature',
        });
    }

    // Get webhook secret from environment
    const secret = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_API_SECRET;

    if (!secret) {
        console.error('[WEBHOOK] SHOPIFY_WEBHOOK_SECRET not configured');
        return res.status(500).json({
            error: 'Configuration Error',
            message: 'Webhook secret not configured',
        });
    }

    // Get raw body (must be string, not parsed JSON)
    // Note: Ensure you're using express.raw() or similar for webhook routes
    const rawBody = req.rawBody || JSON.stringify(req.body);

    // Verify signature
    const isValid = verifyWebhook(rawBody, hmacHeader, secret);

    if (!isValid) {
        console.warn('[WEBHOOK] Invalid webhook signature from:', req.get('X-Shopify-Shop-Domain'));
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid webhook signature',
        });
    }

    // Additional validation: Check shop domain (optional but recommended)
    const shopDomain = req.get('X-Shopify-Shop-Domain');
    if (shopDomain) {
        req.shopifyDomain = shopDomain;
    }

    // Verification successful - proceed to handler
    next();
}

/**
 * Extract webhook metadata from headers
 * 
 * @param {Object} req - Express request object
 * @returns {Object} - Webhook metadata
 */
function extractWebhookMetadata(req) {
    return {
        topic: req.get('X-Shopify-Topic'),
        shopDomain: req.get('X-Shopify-Shop-Domain'),
        apiVersion: req.get('X-Shopify-API-Version'),
        webhookId: req.get('X-Shopify-Webhook-Id'),
        triggeredAt: req.get('X-Shopify-Triggered-At'),
    };
}

module.exports = {
    verifyWebhook,
    verifyWebhookMiddleware,
    extractWebhookMetadata,
};

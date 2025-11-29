// HMAC verification for Shopify webhooks
const crypto = require('crypto');

/**
 * Verify Shopify webhook HMAC signature
 * @param {string} rawBody - Raw request body as string
 * @param {string} hmacHeader - X-Shopify-Hmac-Sha256 header value
 * @param {string} secret - Shopify API secret
 * @returns {boolean} - True if valid, false otherwise
 */
function verifyWebhook(rawBody, hmacHeader, secret) {
    if (!hmacHeader || !secret) {
        return false;
    }

    try {
        // Compute HMAC-SHA256 of the raw body
        const hash = crypto
            .createHmac('sha256', secret)
            .update(rawBody, 'utf8')
            .digest('base64');

        // Compare with header (timing-safe comparison)
        return crypto.timingSafeEqual(
            Buffer.from(hash),
            Buffer.from(hmacHeader)
        );
    } catch (error) {
        console.error('Webhook verification error:', error.message);
        return false;
    }
}

module.exports = { verifyWebhook };

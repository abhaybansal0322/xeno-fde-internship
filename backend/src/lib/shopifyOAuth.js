// Shopify OAuth flow implementation
// Based on Shopify App Template best practices: https://github.com/Shopify/shopify-app-template-remix
const crypto = require('crypto');
const axios = require('axios');

/**
 * Generate OAuth authorization URL for Shopify app installation
 * @param {string} shopDomain - Shopify shop domain (e.g., "mystore.myshopify.com")
 * @param {string} apiKey - Shopify API key (from Partner Dashboard)
 * @param {string} redirectUri - OAuth callback URL
 * @param {string[]} scopes - Required API scopes
 * @param {string} state - Optional state parameter for CSRF protection
 * @returns {string} - Authorization URL
 */
function generateAuthUrl(shopDomain, apiKey, redirectUri, scopes, state = null) {
    const normalizedShop = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const shop = normalizedShop.includes('.myshopify.com') 
        ? normalizedShop 
        : `${normalizedShop}.myshopify.com`;

    // Default scopes if not provided
    const requiredScopes = scopes || [
        'read_customers',
        'read_orders',
        'read_products',
    ];

    const scopeString = requiredScopes.join(',');

    // Generate state for CSRF protection if not provided
    const stateParam = state || crypto.randomBytes(16).toString('hex');

    const params = new URLSearchParams({
        client_id: apiKey,
        scope: scopeString,
        redirect_uri: redirectUri,
        state: stateParam,
    });

    return {
        authUrl: `https://${shop}/admin/oauth/authorize?${params.toString()}`,
        state: stateParam,
    };
}

/**
 * Exchange authorization code for access token
 * @param {string} shopDomain - Shopify shop domain
 * @param {string} code - Authorization code from OAuth callback
 * @param {string} apiKey - Shopify API key
 * @param {string} apiSecret - Shopify API secret
 * @returns {Promise<{accessToken: string, scope: string}>}
 */
async function exchangeCodeForToken(shopDomain, code, apiKey, apiSecret) {
    const normalizedShop = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const shop = normalizedShop.includes('.myshopify.com') 
        ? normalizedShop 
        : `${normalizedShop}.myshopify.com`;

    const tokenUrl = `https://${shop}/admin/oauth/access_token`;

    try {
        const response = await axios.post(tokenUrl, {
            client_id: apiKey,
            client_secret: apiSecret,
            code: code,
        }, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        return {
            accessToken: response.data.access_token,
            scope: response.data.scope,
        };
    } catch (error) {
        console.error('Error exchanging code for token:', error.response?.data || error.message);
        throw new Error(
            `Failed to exchange authorization code for access token: ${
                error.response?.data?.error_description || error.message
            }`
        );
    }
}

/**
 * Verify HMAC signature from Shopify OAuth callback
 * @param {object} query - Query parameters from callback
 * @param {string} apiSecret - Shopify API secret
 * @returns {boolean}
 */
function verifyHMAC(query, apiSecret) {
    const { hmac, ...params } = query;
    
    if (!hmac) {
        return false;
    }

    // Remove hmac and signature from params
    delete params.signature;

    // Sort parameters alphabetically
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');

    // Generate HMAC
    const calculatedHMAC = crypto
        .createHmac('sha256', apiSecret)
        .update(sortedParams)
        .digest('hex');

    // Compare HMACs using safe comparison
    return crypto.timingSafeEqual(
        Buffer.from(hmac),
        Buffer.from(calculatedHMAC)
    );
}

/**
 * Verify shop domain format
 * @param {string} shop - Shop domain to verify
 * @returns {boolean}
 */
function isValidShopDomain(shop) {
    if (!shop) return false;
    
    const normalized = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
    
    return shopRegex.test(normalized);
}

module.exports = {
    generateAuthUrl,
    exchangeCodeForToken,
    verifyHMAC,
    isValidShopDomain,
};



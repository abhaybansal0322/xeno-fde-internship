// Shopify REST Admin API client wrapper
const axios = require('axios');

/**
 * Helper to fetch all pages of a resource using cursor-based pagination
 * @param {string} initialUrl - Initial URL to fetch
 * @param {string} accessToken - Shopify access token
 * @param {string} resourceKey - Key in response JSON (e.g., 'customers', 'products')
 * @returns {Promise<Array>} - Array of all raw resources
 */
async function fetchAllResources(initialUrl, accessToken, resourceKey) {
    let results = [];
    let nextUrl = initialUrl;

    while (nextUrl) {
        try {
            const response = await axios.get(nextUrl, {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            });

            const data = response.data[resourceKey];
            if (Array.isArray(data)) {
                results = results.concat(data);
            }

            // Parse Link header for next page
            // Header format: <https://...>; rel="previous", <https://...>; rel="next"
            const linkHeader = response.headers.link;
            nextUrl = null;

            if (linkHeader) {
                const links = linkHeader.split(',');
                for (const link of links) {
                    const match = link.match(/<([^>]+)>;\s*rel="next"/);
                    if (match) {
                        nextUrl = match[1];
                        break;
                    }
                }
            }
        } catch (error) {
            console.error(`Error fetching ${resourceKey}:`, error.message);
            throw new Error(`Failed to fetch ${resourceKey}: ${error.message}`);
        }
    }

    return results;
}

/**
 * Fetch all customers from Shopify store
 * @param {string} shopifyDomain - e.g., "mystore.myshopify.com"
 * @param {string} accessToken - Shopify access token
 * @returns {Promise<Array>} - Array of customer objects
 */
async function fetchCustomers(shopifyDomain, accessToken) {
    const url = `https://${shopifyDomain}/admin/api/2024-01/customers.json?limit=250`;

    const customers = await fetchAllResources(url, accessToken, 'customers');

    return customers.map(customer => ({
        shopifyId: String(customer.id),
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name,
        totalSpent: parseFloat(customer.total_spent) || 0,
    }));
}

/**
 * Fetch all products from Shopify store
 * @param {string} shopifyDomain
 * @param {string} accessToken
 * @returns {Promise<Array>} - Array of product objects
 */
async function fetchProducts(shopifyDomain, accessToken) {
    const url = `https://${shopifyDomain}/admin/api/2024-01/products.json?limit=250`;

    const products = await fetchAllResources(url, accessToken, 'products');

    return products.map(product => ({
        shopifyId: String(product.id),
        title: product.title,
        vendor: product.vendor,
        productType: product.product_type,
        // Use first variant price or 0
        price: product.variants?.[0]?.price ? parseFloat(product.variants[0].price) : 0,
    }));
}

/**
 * Fetch all orders from Shopify store
 * @param {string} shopifyDomain
 * @param {string} accessToken
 * @returns {Promise<Array>} - Array of order objects
 */
async function fetchOrders(shopifyDomain, accessToken) {
    const url = `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any&limit=250`;

    const orders = await fetchAllResources(url, accessToken, 'orders');

    return orders.map(order => ({
        shopifyId: String(order.id),
        customerId: order.customer?.id ? String(order.customer.id) : null,
        orderNumber: order.order_number ? String(order.order_number) : null,
        totalPrice: parseFloat(order.total_price) || 0,
        orderDate: new Date(order.created_at),
    }));
}

module.exports = {
    fetchCustomers,
    fetchProducts,
    fetchOrders,
};

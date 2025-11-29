// Shopify REST Admin API client wrapper
const axios = require('axios');

/**
 * Fetch customers from Shopify store
 * @param {string} shopifyDomain - e.g., "mystore.myshopify.com"
 * @param {string} accessToken - Shopify access token
 * @returns {Promise<Array>} - Array of customer objects
 */
async function fetchCustomers(shopifyDomain, accessToken) {
    const url = `https://${shopifyDomain}/admin/api/2024-01/customers.json`;

    try {
        const response = await axios.get(url, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
        });

        return response.data.customers.map(customer => ({
            shopifyId: String(customer.id),
            email: customer.email,
            firstName: customer.first_name,
            lastName: customer.last_name,
            totalSpent: parseFloat(customer.total_spent) || 0,
        }));
    } catch (error) {
        console.error('Error fetching customers:', error.message);
        throw new Error(`Failed to fetch customers: ${error.message}`);
    }
}

/**
 * Fetch products from Shopify store
 * @param {string} shopifyDomain
 * @param {string} accessToken
 * @returns {Promise<Array>} - Array of product objects
 */
async function fetchProducts(shopifyDomain, accessToken) {
    const url = `https://${shopifyDomain}/admin/api/2024-01/products.json`;

    try {
        const response = await axios.get(url, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
        });

        return response.data.products.map(product => ({
            shopifyId: String(product.id),
            title: product.title,
            vendor: product.vendor,
            productType: product.product_type,
            // Use first variant price or 0
            price: product.variants?.[0]?.price ? parseFloat(product.variants[0].price) : 0,
        }));
    } catch (error) {
        console.error('Error fetching products:', error.message);
        throw new Error(`Failed to fetch products: ${error.message}`);
    }
}

/**
 * Fetch orders from Shopify store
 * @param {string} shopifyDomain
 * @param {string} accessToken
 * @returns {Promise<Array>} - Array of order objects
 */
async function fetchOrders(shopifyDomain, accessToken) {
    const url = `https://${shopifyDomain}/admin/api/2024-01/orders.json?status=any`;

    try {
        const response = await axios.get(url, {
            headers: {
                'X-Shopify-Access-Token': accessToken,
                'Content-Type': 'application/json',
            },
        });

        return response.data.orders.map(order => ({
            shopifyId: String(order.id),
            customerId: order.customer?.id ? String(order.customer.id) : null,
            orderNumber: order.order_number ? String(order.order_number) : null,
            totalPrice: parseFloat(order.total_price) || 0,
            orderDate: new Date(order.created_at),
        }));
    } catch (error) {
        console.error('Error fetching orders:', error.message);
        throw new Error(`Failed to fetch orders: ${error.message}`);
    }
}

module.exports = {
    fetchCustomers,
    fetchProducts,
    fetchOrders,
};

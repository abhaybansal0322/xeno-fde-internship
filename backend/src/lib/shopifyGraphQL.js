// Shopify GraphQL Admin API client
// Based on Shopify App Template best practices
const axios = require('axios');

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

/**
 * Execute GraphQL query against Shopify Admin API
 * @param {string} shopDomain - Shopify shop domain
 * @param {string} accessToken - Access token
 * @param {string} query - GraphQL query string
 * @param {object} variables - GraphQL variables (optional)
 * @returns {Promise<object>} - GraphQL response
 */
async function graphqlRequest(shopDomain, accessToken, query, variables = {}) {
    const normalizedShop = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const shop = normalizedShop.includes('.myshopify.com') 
        ? normalizedShop 
        : `${normalizedShop}.myshopify.com`;

    const url = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

    try {
        const response = await axios.post(
            url,
            {
                query,
                variables,
            },
            {
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Check for GraphQL errors
        if (response.data.errors) {
            const errorMessages = response.data.errors.map(e => e.message).join(', ');
            throw new Error(`GraphQL errors: ${errorMessages}`);
        }

        return response.data.data;
    } catch (error) {
        if (error.response) {
            const status = error.response.status;
            const errorData = error.response.data;

            if (status === 401) {
                throw new Error('Shopify API authentication failed (401). Please check your access token.');
            } else if (status === 403) {
                throw new Error('Shopify API permission denied (403). Your access token may not have the required scopes.');
            } else if (errorData.errors) {
                const errorMessages = errorData.errors.map(e => e.message || JSON.stringify(e)).join(', ');
                throw new Error(`GraphQL errors: ${errorMessages}`);
            } else {
                throw new Error(`GraphQL request failed: ${status} ${error.response.statusText}`);
            }
        }
        throw error;
    }
}

/**
 * Fetch customers using GraphQL (more efficient pagination)
 * @param {string} shopDomain - Shopify shop domain
 * @param {string} accessToken - Access token
 * @param {number} limit - Number of customers per page (max 250)
 * @returns {Promise<Array>} - Array of customer objects
 */
async function fetchCustomersGraphQL(shopDomain, accessToken, limit = 250) {
    const customers = [];
    let cursor = null;
    let hasNextPage = true;

    while (hasNextPage) {
        const query = `
            query getCustomers($first: Int!, $after: String) {
                customers(first: $first, after: $after) {
                    edges {
                        node {
                            id
                            email
                            firstName
                            lastName
                            totalSpent {
                                amount
                                currencyCode
                            }
                        }
                        cursor
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        const variables = {
            first: limit,
            after: cursor,
        };

        const data = await graphqlRequest(shopDomain, accessToken, query, variables);
        
        if (data.customers?.edges) {
            for (const edge of data.customers.edges) {
                const customer = edge.node;
                customers.push({
                    shopifyId: customer.id.replace('gid://shopify/Customer/', ''),
                    email: customer.email,
                    firstName: customer.firstName,
                    lastName: customer.lastName,
                    totalSpent: parseFloat(customer.totalSpent?.amount || '0') || 0,
                });
            }

            hasNextPage = data.customers.pageInfo.hasNextPage;
            cursor = data.customers.pageInfo.endCursor;
        } else {
            hasNextPage = false;
        }
    }

    return customers;
}

/**
 * Fetch orders using GraphQL
 * @param {string} shopDomain - Shopify shop domain
 * @param {string} accessToken - Access token
 * @param {number} limit - Number of orders per page
 * @returns {Promise<Array>} - Array of order objects
 */
async function fetchOrdersGraphQL(shopDomain, accessToken, limit = 250) {
    const orders = [];
    let cursor = null;
    let hasNextPage = true;

    while (hasNextPage) {
        const query = `
            query getOrders($first: Int!, $after: String) {
                orders(first: $first, after: $after, reverse: true) {
                    edges {
                        node {
                            id
                            name
                            customer {
                                id
                            }
                            totalPriceSet {
                                shopMoney {
                                    amount
                                }
                            }
                            createdAt
                        }
                        cursor
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        const variables = {
            first: limit,
            after: cursor,
        };

        const data = await graphqlRequest(shopDomain, accessToken, query, variables);
        
        if (data.orders?.edges) {
            for (const edge of data.orders.edges) {
                const order = edge.node;
                orders.push({
                    shopifyId: order.id.replace('gid://shopify/Order/', ''),
                    customerId: order.customer?.id?.replace('gid://shopify/Customer/', '') || null,
                    orderNumber: order.name || null,
                    totalPrice: parseFloat(order.totalPriceSet?.shopMoney?.amount || '0') || 0,
                    orderDate: new Date(order.createdAt),
                });
            }

            hasNextPage = data.orders.pageInfo.hasNextPage;
            cursor = data.orders.pageInfo.endCursor;
        } else {
            hasNextPage = false;
        }
    }

    return orders;
}

/**
 * Fetch products using GraphQL
 * @param {string} shopDomain - Shopify shop domain
 * @param {string} accessToken - Access token
 * @param {number} limit - Number of products per page
 * @returns {Promise<Array>} - Array of product objects
 */
async function fetchProductsGraphQL(shopDomain, accessToken, limit = 250) {
    const products = [];
    let cursor = null;
    let hasNextPage = true;

    while (hasNextPage) {
        const query = `
            query getProducts($first: Int!, $after: String) {
                products(first: $first, after: $after) {
                    edges {
                        node {
                            id
                            title
                            vendor
                            productType
                            variants(first: 1) {
                                edges {
                                    node {
                                        price
                                    }
                                }
                            }
                        }
                        cursor
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        `;

        const variables = {
            first: limit,
            after: cursor,
        };

        const data = await graphqlRequest(shopDomain, accessToken, query, variables);
        
        if (data.products?.edges) {
            for (const edge of data.products.edges) {
                const product = edge.node;
                const price = product.variants?.edges?.[0]?.node?.price || '0';
                
                products.push({
                    shopifyId: product.id.replace('gid://shopify/Product/', ''),
                    title: product.title,
                    vendor: product.vendor,
                    productType: product.productType,
                    price: parseFloat(price) || 0,
                });
            }

            hasNextPage = data.products.pageInfo.hasNextPage;
            cursor = data.products.pageInfo.endCursor;
        } else {
            hasNextPage = false;
        }
    }

    return products;
}

module.exports = {
    graphqlRequest,
    fetchCustomersGraphQL,
    fetchOrdersGraphQL,
    fetchProductsGraphQL,
};



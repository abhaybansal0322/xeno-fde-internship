// Shopify GraphQL Admin API client
// Based on Shopify App Template best practices
const axios = require('axios');

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

// Split a display/name string into first/last components
function splitName(displayName) {
    if (!displayName) return { firstName: null, lastName: null };

    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) {
        return { firstName: parts[0] || null, lastName: null };
    }

    const lastName = parts.pop();
    const firstName = parts.join(' ').trim() || null;
    return { firstName, lastName: lastName || null };
}

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

        // Check for GraphQL errors first
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
        // Use correct GraphQL query structure with nodes and proper field names
        const query = `#graphql
            query getCustomers($first: Int!, $after: String) {
                customers(first: $first, after: $after) {
                    nodes {
                        id
                        firstName
                        lastName
                        displayName
                        defaultEmailAddress {
                            emailAddress
                            marketingState
                        }
                        defaultPhoneNumber {
                            phoneNumber
                            marketingState
                            marketingCollectedFrom
                        }
                        createdAt
                        updatedAt
                        numberOfOrders
                        state
                        amountSpent {
                            amount
                            currencyCode
                        }
                        verifiedEmail
                        taxExempt
                        tags
                        addresses {
                            id
                            firstName
                            lastName
                            address1
                            city
                            province
                            country
                            zip
                            phone
                            name
                            provinceCode
                            countryCodeV2
                        }
                        defaultAddress {
                            id
                            firstName
                            lastName
                            address1
                            city
                            province
                            country
                            zip
                            phone
                            name
                            provinceCode
                            countryCodeV2
                        }
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

        if (data && data.customers && data.customers.nodes) {
            for (const customer of data.customers.nodes) {
                // Extract firstName and lastName - check multiple sources
                let firstName = customer.firstName || null;
                let lastName = customer.lastName || null;

                // If not found at top level, check defaultAddress
                if (!firstName && customer.defaultAddress?.firstName) {
                    firstName = customer.defaultAddress.firstName;
                }
                if (!lastName && customer.defaultAddress?.lastName) {
                    lastName = customer.defaultAddress.lastName;
                }

                // If still not found, check addresses array
                if ((!firstName || !lastName) && Array.isArray(customer.addresses) && customer.addresses.length > 0) {
                    // Try to find default address in list, or use first one
                    const defaultAddr = customer.addresses.find(addr => addr.id === customer.defaultAddress?.id) || customer.addresses[0];
                    if (defaultAddr) {
                        if (!firstName && defaultAddr.firstName) {
                            firstName = defaultAddr.firstName;
                        }
                        if (!lastName && defaultAddr.lastName) {
                            lastName = defaultAddr.lastName;
                        }
                    }
                }

                // Fallback to displayName if still missing
                if (!firstName || !lastName) {
                    const displayName = customer.displayName;
                    if (displayName) {
                        const parts = displayName.trim().split(/\s+/).filter(p => p.length > 0);
                        if (parts.length === 1) {
                            if (!firstName) firstName = parts[0];
                        } else if (parts.length > 1) {
                            if (!firstName) firstName = parts.slice(0, -1).join(' ').trim();
                            if (!lastName) lastName = parts[parts.length - 1];
                        }
                    }
                }

                // Extract email from defaultEmailAddress
                let email = null;
                if (customer.defaultEmailAddress?.emailAddress) {
                    email = customer.defaultEmailAddress.emailAddress;
                }

                // Extract totalSpent from amountSpent
                let totalSpent = 0;
                if (customer.amountSpent?.amount) {
                    totalSpent = parseFloat(customer.amountSpent.amount) || 0;
                }

                const mappedCustomer = {
                    shopifyId: customer.id ? customer.id.replace('gid://shopify/Customer/', '') : null,
                    email: email || null,
                    firstName: firstName || null,
                    lastName: lastName || null,
                    totalSpent: totalSpent,
                };

                customers.push(mappedCustomer);
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
                            lineItems(first: 20) {
                                nodes {
                                    id
                                    title
                                    quantity
                                    originalTotalSet {
                                        shopMoney {
                                            amount
                                        }
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

        if (data.orders?.edges) {
            for (const edge of data.orders.edges) {
                const order = edge.node;
                const lineItems = order.lineItems?.nodes?.map(item => ({
                    shopifyId: item.id.replace('gid://shopify/LineItem/', ''),
                    title: item.title,
                    quantity: item.quantity,
                    price: parseFloat(item.originalTotalSet?.shopMoney?.amount || '0') / (item.quantity || 1),
                })) || [];

                orders.push({
                    shopifyId: order.id.replace('gid://shopify/Order/', ''),
                    customerId: order.customer?.id?.replace('gid://shopify/Customer/', '') || null,
                    orderNumber: order.name || null,
                    totalPrice: parseFloat(order.totalPriceSet?.shopMoney?.amount || '0') || 0,
                    orderDate: new Date(order.createdAt),
                    lineItems,
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

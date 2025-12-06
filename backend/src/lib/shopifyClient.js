// Shopify REST Admin API client wrapper
// Based on Shopify App Template best practices
const axios = require('axios');

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function requestWithRetry(url, options, retries = 3) {
    try {
        return await axios.get(url, options);
    } catch (error) {
        if (error.response && error.response.status === 429 && retries > 0) {
            const retryAfter = error.response.headers['retry-after'];
            const waitTime = retryAfter ? parseFloat(retryAfter) * 1000 : 2000;
            console.log(`Rate limited. Waiting ${waitTime}ms...`);
            await wait(waitTime + 500); // Add a small buffer
            return requestWithRetry(url, options, retries - 1);
        }
        throw error;
    }
}

// Extract first/last name with multiple fallbacks
// Only uses properties that actually exist in the customer object
function deriveNameParts(customer) {
    if (!customer || typeof customer !== 'object') {
        return { firstName: null, lastName: null };
    }

    let firstName = null;
    let lastName = null;

    // Check top-level properties only if they exist
    if ('first_name' in customer && customer.first_name) {
        firstName = customer.first_name;
    } else if ('firstName' in customer && customer.firstName) {
        firstName = customer.firstName;
    }

    if ('last_name' in customer && customer.last_name) {
        lastName = customer.last_name;
    } else if ('lastName' in customer && customer.lastName) {
        lastName = customer.lastName;
    }

    // Check default_address only if it exists and has the properties
    if (!firstName || !lastName) {
        const defaultAddr = customer.default_address;
        if (defaultAddr && typeof defaultAddr === 'object') {
            // Check REST API format (first_name, last_name)
            if (!firstName && 'first_name' in defaultAddr && defaultAddr.first_name) {
                firstName = defaultAddr.first_name;
            }
            if (!lastName && 'last_name' in defaultAddr && defaultAddr.last_name) {
                lastName = defaultAddr.last_name;
            }
            // Check GraphQL format (firstName, lastName)
            if (!firstName && 'firstName' in defaultAddr && defaultAddr.firstName) {
                firstName = defaultAddr.firstName;
            }
            if (!lastName && 'lastName' in defaultAddr && defaultAddr.lastName) {
                lastName = defaultAddr.lastName;
            }
        }
    }

    // Check addresses array only if it exists and is an array
    if ((!firstName || !lastName) && Array.isArray(customer.addresses) && customer.addresses.length > 0) {
        const defaultAddr = customer.addresses.find(addr => addr && addr.default === true) || customer.addresses[0];
        if (defaultAddr && typeof defaultAddr === 'object') {
            if (!firstName && 'first_name' in defaultAddr && defaultAddr.first_name) {
                firstName = defaultAddr.first_name;
            }
            if (!lastName && 'last_name' in defaultAddr && defaultAddr.last_name) {
                lastName = defaultAddr.last_name;
            }
        }
    }

    // Display/full name fallback - only if properties exist
    if (!firstName || !lastName) {
        let displayName = null;
        if ('display_name' in customer && customer.display_name) {
            displayName = customer.display_name;
        } else if ('name' in customer && customer.name) {
            displayName = customer.name;
        } else if (customer.default_address && typeof customer.default_address === 'object' && 'name' in customer.default_address && customer.default_address.name) {
            displayName = customer.default_address.name;
        }

        if (displayName && typeof displayName === 'string') {
            const parts = displayName.trim().split(/\s+/).filter(p => p.length > 0);
            if (parts.length === 1) {
                if (!firstName) {
                    firstName = parts[0];
                }
            } else if (parts.length > 1) {
                const extractedLast = parts[parts.length - 1];
                const extractedFirst = parts.slice(0, -1).join(' ').trim();
                if (!firstName && extractedFirst) {
                    firstName = extractedFirst;
                }
                if (!lastName && extractedLast) {
                    lastName = extractedLast;
                }
            }
        }
    }

    return {
        firstName: firstName || null,
        lastName: lastName || null
    };
}

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
            const response = await requestWithRetry(nextUrl, {
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
            if (error.response) {
                const status = error.response.status;
                const statusText = error.response.statusText;
                const errorData = error.response.data;

                if (status === 401) {
                    console.error(`Shopify API 401 Unauthorized for ${resourceKey}:`, {
                        status,
                        statusText,
                        error: errorData?.errors || errorData?.error || 'Invalid or expired access token',
                        url: nextUrl || initialUrl,
                    });
                    throw new Error(`Shopify API authentication failed (401). Please check your access token and API permissions. Error: ${errorData?.errors?.[0]?.message || errorData?.error || 'Unauthorized'}`);
                } else if (status === 403) {
                    console.error(`Shopify API 403 Forbidden for ${resourceKey}:`, {
                        status,
                        statusText,
                        error: errorData?.errors || errorData?.error,
                    });
                    throw new Error(`Shopify API permission denied (403). Your access token may not have the required scopes. Error: ${errorData?.errors?.[0]?.message || errorData?.error || 'Forbidden'}`);
                } else {
                    console.error(`Error fetching ${resourceKey}:`, {
                        status,
                        statusText,
                        error: errorData,
                        message: error.message,
                    });
                    throw new Error(`Failed to fetch ${resourceKey}: ${status} ${statusText} - ${errorData?.errors?.[0]?.message || error.message}`);
                }
            } else {
                console.error(`Error fetching ${resourceKey}:`, error.message);
                throw new Error(`Failed to fetch ${resourceKey}: ${error.message}`);
            }
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
    // Fetch all customers - get full objects to ensure we have all data
    // Don't use fields parameter to get complete customer data including nested addresses
    const url = `https://${shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}/customers.json?limit=250`;

    const customers = await fetchAllResources(url, accessToken, 'customers');

    // ALWAYS fetch individual customer details to ensure we get complete data
    // The list endpoint may not return all fields
    const BATCH_SIZE = 5; // Reduced from 10 to avoid rate limits

    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        const batch = customers.slice(i, i + BATCH_SIZE);

        const detailPromises = batch.map(async (customer) => {
            try {
                const detailUrl = `https://${shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}/customers/${customer.id}.json`;
                const response = await requestWithRetry(detailUrl, {
                    headers: {
                        'X-Shopify-Access-Token': accessToken,
                        'Content-Type': 'application/json',
                    },
                });
                return { id: customer.id, data: response.data.customer };
            } catch (error) {
                console.error(`Failed to fetch details for customer ${customer.id}:`, error.message);
                return { id: customer.id, data: null };
            }
        });

        const detailedCustomers = await Promise.all(detailPromises);

        // Merge detailed data back into customers array
        detailedCustomers.forEach(({ id, data }) => {
            if (data) {
                const originalIdx = customers.findIndex(c => c.id === id);
                if (originalIdx !== -1) {
                    customers[originalIdx] = { ...customers[originalIdx], ...data };
                }
            }
        });

        // Delay between batches to avoid rate limits
        if (i + BATCH_SIZE < customers.length) {
            await wait(1000); // Increased from 500ms
        }
    }

    return customers.map((customer, index) => {
        if (!customer || typeof customer !== 'object') {
            return {
                shopifyId: null,
                email: null,
                firstName: null,
                lastName: null,
                totalSpent: 0,
            };
        }

        // Log first customer to see what properties are available
        if (index === 0) {
            console.log('=== CUSTOMER OBJECT PROPERTIES ===');
            console.log('All keys:', Object.keys(customer));
            console.log('Customer object:', JSON.stringify(customer, null, 2));
            console.log('=== END CUSTOMER OBJECT ===');
        }

        // Extract email - only use properties that exist
        let email = null;
        if ('email' in customer && customer.email) {
            email = customer.email;
        } else if (customer.default_address && typeof customer.default_address === 'object' && 'email' in customer.default_address && customer.default_address.email) {
            email = customer.default_address.email;
        }

        const { firstName, lastName } = deriveNameParts(customer);

        // Extract totalSpent - only use properties that exist
        let totalSpent = 0;
        if ('total_spent' in customer && customer.total_spent) {
            totalSpent = parseFloat(customer.total_spent) || 0;
        } else if ('totalSpent' in customer && customer.totalSpent) {
            totalSpent = parseFloat(customer.totalSpent) || 0;
        }

        // Extract shopifyId - only if id exists
        let shopifyId = null;
        if ('id' in customer && customer.id) {
            shopifyId = String(customer.id);
        }

        return {
            shopifyId,
            email,
            firstName,
            lastName,
            totalSpent,
        };
    });
}

/**
 * Fetch all products from Shopify store
 * @param {string} shopifyDomain
 * @param {string} accessToken
 * @returns {Promise<Array>} - Array of product objects
 */
async function fetchProducts(shopifyDomain, accessToken) {
    const url = `https://${shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`;

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
    const url = `https://${shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}/orders.json?status=any&limit=250`;

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

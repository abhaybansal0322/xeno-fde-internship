// Shopify REST Admin API client wrapper
// Based on Shopify App Template best practices
const axios = require('axios');

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-01';

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
    // Fetch all customers - don't use fields parameter to get all available data
    const url = `https://${shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}/customers.json?limit=250`;

    const customers = await fetchAllResources(url, accessToken, 'customers');
    
    // If customers are missing email/name, try fetching individual customer details
    const customersNeedingDetails = customers.filter(c => !c.email && !c.first_name && !c.last_name);
    
    if (customersNeedingDetails.length > 0) {
        console.log(`Fetching detailed info for ${customersNeedingDetails.length} customers missing email/name...`);
        
        // Fetch individual customer details in parallel (limit to 10 at a time to avoid rate limits)
        const detailPromises = customersNeedingDetails.slice(0, 10).map(async (customer) => {
            try {
                const detailUrl = `https://${shopifyDomain}/admin/api/${SHOPIFY_API_VERSION}/customers/${customer.id}.json`;
                const response = await axios.get(detailUrl, {
                    headers: {
                        'X-Shopify-Access-Token': accessToken,
                        'Content-Type': 'application/json',
                    },
                });
                return response.data.customer;
            } catch (error) {
                console.warn(`Failed to fetch details for customer ${customer.id}:`, error.message);
                return customer; // Return original if fetch fails
            }
        });
        
        const detailedCustomers = await Promise.all(detailPromises);
        
        // Merge detailed data back into customers array
        detailedCustomers.forEach((detailed, idx) => {
            const originalIdx = customers.findIndex(c => c.id === customersNeedingDetails[idx].id);
            if (originalIdx !== -1 && detailed) {
                customers[originalIdx] = { ...customers[originalIdx], ...detailed };
            }
        });
    }

    // Log first customer's raw data to see what Shopify is actually returning
    if (customers.length > 0) {
        console.log('=== RAW SHOPIFY CUSTOMER DATA (First Customer) ===');
        console.log(JSON.stringify(customers[0], null, 2));
        console.log('=== END RAW DATA ===');
    }

    return customers.map((customer, index) => {
        // Extract email - check top level first, then default_address
        let email = customer.email || null;
        if (!email && customer.default_address?.email) {
            email = customer.default_address.email;
        }

        // Extract first_name and last_name - check multiple locations
        let firstName = customer.first_name || customer.firstName || null;
        let lastName = customer.last_name || customer.lastName || null;
        
        // If not found at top level, check default_address
        if (!firstName && customer.default_address?.first_name) {
            firstName = customer.default_address.first_name;
        }
        if (!lastName && customer.default_address?.last_name) {
            lastName = customer.default_address.last_name;
        }
        
        // If still not found, check addresses array
        if (!firstName && !lastName && customer.addresses && customer.addresses.length > 0) {
            const defaultAddr = customer.addresses.find(addr => addr.default) || customer.addresses[0];
            if (defaultAddr) {
                firstName = defaultAddr.first_name || firstName;
                lastName = defaultAddr.last_name || lastName;
            }
        }

        const totalSpent = parseFloat(customer.total_spent || customer.totalSpent || '0') || 0;

        // Log if customer has missing critical data
        if (!email && !firstName && !lastName) {
            console.warn(`Customer ${index + 1} (ID: ${customer.id}) has missing data:`, {
                allKeys: Object.keys(customer),
                email,
                first_name: customer.first_name,
                last_name: customer.last_name,
                firstName: customer.firstName,
                lastName: customer.lastName,
            });
        }

        const mappedCustomer = {
            shopifyId: String(customer.id),
            email,
            firstName,
            lastName,
            totalSpent,
        };

        // Log the mapped result for first customer
        if (index === 0) {
            console.log('=== MAPPED CUSTOMER DATA ===');
            console.log(JSON.stringify(mappedCustomer, null, 2));
            console.log('=== END MAPPED DATA ===');
        }

        return mappedCustomer;
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

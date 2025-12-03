// Sync service with idempotent upsert logic
const prisma = require('../prisma');
const { fetchCustomers, fetchProducts, fetchOrders } = require('./shopifyClient');
const { fetchCustomersGraphQL } = require('./shopifyGraphQL');

/**
 * Upsert customers for a tenant (idempotent)
 * Uses batch operations for better performance
 * @param {string} tenantId
 * @param {Array} customers - Array of customer objects from Shopify
 * @returns {Promise<number>} - Count of upserted customers
 */
async function upsertCustomers(tenantId, customers) {
    if (customers.length === 0) return 0;

    // Process in batches to avoid overwhelming the database
    const BATCH_SIZE = 100;
    let count = 0;

    for (let i = 0; i < customers.length; i += BATCH_SIZE) {
        const batch = customers.slice(i, i + BATCH_SIZE);
        
        // Use createMany with skipDuplicates for better performance
        // First, try to create new records
        const batchData = batch.map(customer => {
            // Log for debugging
            if (!customer.email && !customer.firstName && !customer.lastName) {
                console.warn('Customer with missing data:', customer);
            }
            return {
                tenantId,
                shopifyId: customer.shopifyId,
                email: customer.email || null,
                firstName: customer.firstName || null,
                lastName: customer.lastName || null,
                totalSpent: customer.totalSpent || 0,
            };
        });
        
        await prisma.customer.createMany({
            data: batchData,
            skipDuplicates: true,
        });

        // Then update existing records
        await Promise.all(
            batch.map(customer =>
                prisma.customer.updateMany({
                    where: {
                        tenantId,
                        shopifyId: customer.shopifyId,
                    },
                    data: {
                        email: customer.email || null,
                        firstName: customer.firstName || null,
                        lastName: customer.lastName || null,
                        totalSpent: customer.totalSpent || 0,
                    },
                })
            )
        );

        count += batch.length;
    }

    return count;
}

/**
 * Upsert products for a tenant (idempotent)
 * Uses batch operations for better performance
 * @param {string} tenantId
 * @param {Array} products - Array of product objects from Shopify
 * @returns {Promise<number>} - Count of upserted products
 */
async function upsertProducts(tenantId, products) {
    if (products.length === 0) return 0;

    // Process in batches to avoid overwhelming the database
    const BATCH_SIZE = 100;
    let count = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
        const batch = products.slice(i, i + BATCH_SIZE);
        
        // Use createMany with skipDuplicates for better performance
        await prisma.product.createMany({
            data: batch.map(product => ({
                tenantId,
                shopifyId: product.shopifyId,
                title: product.title,
                vendor: product.vendor,
                productType: product.productType,
                price: product.price,
            })),
            skipDuplicates: true,
        });

        // Then update existing records
        await Promise.all(
            batch.map(product =>
                prisma.product.updateMany({
                    where: {
                        tenantId,
                        shopifyId: product.shopifyId,
                    },
                    data: {
                        title: product.title,
                        vendor: product.vendor,
                        productType: product.productType,
                        price: product.price,
                    },
                })
            )
        );

        count += batch.length;
    }

    return count;
}

/**
 * Upsert orders for a tenant (idempotent)
 * Handles customer linking by shopifyId
 * Uses batch operations for better performance
 * @param {string} tenantId
 * @param {Array} orders - Array of order objects from Shopify
 * @returns {Promise<number>} - Count of upserted orders
 */
async function upsertOrders(tenantId, orders) {
    if (orders.length === 0) return 0;

    // First, get all customer IDs in a single query for better performance
    const customerShopifyIds = [...new Set(orders.map(o => o.customerId).filter(Boolean))];
    const customersMap = new Map();
    
    if (customerShopifyIds.length > 0) {
        const customers = await prisma.customer.findMany({
            where: {
                tenantId,
                shopifyId: { in: customerShopifyIds },
            },
            select: {
                id: true,
                shopifyId: true,
            },
        });
        
        customers.forEach(c => customersMap.set(c.shopifyId, c.id));
    }

    // Process in batches
    const BATCH_SIZE = 100;
    let count = 0;

    for (let i = 0; i < orders.length; i += BATCH_SIZE) {
        const batch = orders.slice(i, i + BATCH_SIZE);
        
        // Prepare batch data with customer IDs
        const batchData = batch.map(order => ({
            tenantId,
            shopifyId: order.shopifyId,
            customerId: order.customerId ? customersMap.get(order.customerId) || null : null,
            orderNumber: order.orderNumber,
            totalPrice: order.totalPrice,
            orderDate: order.orderDate,
        }));

        // Use createMany with skipDuplicates
        await prisma.order.createMany({
            data: batchData,
            skipDuplicates: true,
        });

        // Update existing records
        await Promise.all(
            batch.map(order => {
                const customerId = order.customerId ? customersMap.get(order.customerId) || null : null;
                return prisma.order.updateMany({
                    where: {
                        tenantId,
                        shopifyId: order.shopifyId,
                    },
                    data: {
                        customerId,
                        orderNumber: order.orderNumber,
                        totalPrice: order.totalPrice,
                        orderDate: order.orderDate,
                    },
                });
            })
        );

        count += batch.length;
    }

    return count;
}

/**
 * Orchestrate full sync for a tenant
 * Fetches and upserts customers, products, and orders
 * @param {string} tenantId
 * @returns {Promise<Object>} - Summary with counts
 */
async function syncAll(tenantId) {
    // Get tenant info
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
    });

    if (!tenant) {
        throw new Error('Tenant not found');
    }

    // Fetch all data from Shopify
    console.log(`Starting sync for tenant: ${tenant.name}`);
    console.log(`Using Shopify domain: ${tenant.shopifyDomain}`);

    // Try GraphQL first (more reliable), fallback to REST
    let customers;
    try {
        console.log('Attempting to fetch customers via GraphQL...');
        customers = await fetchCustomersGraphQL(tenant.shopifyDomain, tenant.accessToken);
        console.log(`✓ Fetched ${customers.length} customers via GraphQL`);
    } catch (graphqlError) {
        console.warn('GraphQL fetch failed, falling back to REST API:', graphqlError.message);
        console.log('Attempting to fetch customers via REST API...');
        customers = await fetchCustomers(tenant.shopifyDomain, tenant.accessToken);
        console.log(`✓ Fetched ${customers.length} customers via REST API`);
    }

    const [products, orders] = await Promise.all([
        fetchProducts(tenant.shopifyDomain, tenant.accessToken),
        fetchOrders(tenant.shopifyDomain, tenant.accessToken),
    ]);

    console.log(`Fetched ${customers.length} customers, ${products.length} products, ${orders.length} orders`);
    
    // Log sample customer data to debug
    if (customers.length > 0) {
        console.log('=== SAMPLE CUSTOMER DATA AFTER FETCH ===');
        console.log(JSON.stringify(customers[0], null, 2));
        console.log('=== END SAMPLE DATA ===');
    } else {
        console.warn('⚠️ No customers fetched!');
    }

    // Upsert in order: customers first (for order-customer linking)
    const customersUpserted = await upsertCustomers(tenantId, customers);
    const productsUpserted = await upsertProducts(tenantId, products);
    const ordersUpserted = await upsertOrders(tenantId, orders);

    console.log(`Sync complete: ${customersUpserted} customers, ${productsUpserted} products, ${ordersUpserted} orders`);

    return {
        customersUpserted,
        productsUpserted,
        ordersUpserted,
    };
}

module.exports = {
    upsertCustomers,
    upsertProducts,
    upsertOrders,
    syncAll,
};

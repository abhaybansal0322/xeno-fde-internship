// Sync service with idempotent upsert logic
const prisma = require('../prisma');
const { fetchCustomers, fetchProducts, fetchOrders } = require('./shopifyClient');
const { fetchCustomersGraphQL, fetchOrdersGraphQL } = require('./shopifyGraphQL');

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
        const batchData = batch.map(customer => ({
            tenantId,
            shopifyId: customer.shopifyId,
            email: customer.email || null,
            firstName: customer.firstName || null,
            lastName: customer.lastName || null,
            totalSpent: customer.totalSpent || 0,
        }));

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
    const BATCH_SIZE = 50; // Reduced batch size due to line items
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

        // 1. Upsert Orders
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

        // 2. Handle Line Items
        // Fetch the internal IDs of the orders we just upserted
        const shopifyIds = batch.map(o => o.shopifyId);
        const savedOrders = await prisma.order.findMany({
            where: {
                tenantId,
                shopifyId: { in: shopifyIds },
            },
            select: { id: true, shopifyId: true },
        });

        const orderIdMap = new Map(savedOrders.map(o => [o.shopifyId, o.id]));

        // Prepare line items
        const lineItemsData = [];
        for (const order of batch) {
            const orderId = orderIdMap.get(order.shopifyId);
            if (orderId && order.lineItems && Array.isArray(order.lineItems)) {
                for (const item of order.lineItems) {
                    lineItemsData.push({
                        orderId,
                        shopifyId: item.shopifyId,
                        title: item.title,
                        quantity: item.quantity,
                        price: item.price,
                    });
                }
            }
        }

        if (lineItemsData.length > 0) {
            // Delete existing line items for these orders to avoid duplicates/stale data
            // (Simpler than upserting individual line items)
            await prisma.orderLineItem.deleteMany({
                where: {
                    orderId: { in: Array.from(orderIdMap.values()) },
                },
            });

            // Insert new line items
            await prisma.orderLineItem.createMany({
                data: lineItemsData,
            });
        }

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

    // Use GraphQL API first for better performance (avoids N+1 problem)
    // Fallback to REST API if GraphQL fails
    let customers;
    try {
        customers = await fetchCustomersGraphQL(tenant.shopifyDomain, tenant.accessToken);
    } catch (graphqlError) {
        console.warn(`GraphQL fetch failed, falling back to REST: ${graphqlError.message}`);
        try {
            customers = await fetchCustomers(tenant.shopifyDomain, tenant.accessToken);
        } catch (restError) {
            throw new Error(`Failed to fetch customers: ${restError.message} (GraphQL error: ${graphqlError.message})`);
        }
    }

    // Use GraphQL for orders to get line items efficiently
    let orders;
    try {
        orders = await fetchOrdersGraphQL(tenant.shopifyDomain, tenant.accessToken);
    } catch (e) {
        console.warn('GraphQL orders fetch failed, falling back to REST', e);
        orders = await fetchOrders(tenant.shopifyDomain, tenant.accessToken);
    }

    const products = await fetchProducts(tenant.shopifyDomain, tenant.accessToken);

    // Upsert in order: customers first (for order-customer linking)
    const customersUpserted = await upsertCustomers(tenantId, customers);
    const productsUpserted = await upsertProducts(tenantId, products);
    const ordersUpserted = await upsertOrders(tenantId, orders);

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

// Sync service with idempotent upsert logic
const prisma = require('../prisma');
const { fetchCustomers, fetchProducts, fetchOrders } = require('./shopifyClient');

/**
 * Upsert customers for a tenant (idempotent)
 * @param {string} tenantId
 * @param {Array} customers - Array of customer objects from Shopify
 * @returns {Promise<number>} - Count of upserted customers
 */
async function upsertCustomers(tenantId, customers) {
    let count = 0;

    for (const customer of customers) {
        await prisma.customer.upsert({
            where: {
                tenantId_shopifyId: {
                    tenantId,
                    shopifyId: customer.shopifyId,
                },
            },
            update: {
                email: customer.email,
                firstName: customer.firstName,
                lastName: customer.lastName,
                totalSpent: customer.totalSpent,
            },
            create: {
                tenantId,
                shopifyId: customer.shopifyId,
                email: customer.email,
                firstName: customer.firstName,
                lastName: customer.lastName,
                totalSpent: customer.totalSpent,
            },
        });
        count++;
    }

    return count;
}

/**
 * Upsert products for a tenant (idempotent)
 * @param {string} tenantId
 * @param {Array} products - Array of product objects from Shopify
 * @returns {Promise<number>} - Count of upserted products
 */
async function upsertProducts(tenantId, products) {
    let count = 0;

    for (const product of products) {
        await prisma.product.upsert({
            where: {
                tenantId_shopifyId: {
                    tenantId,
                    shopifyId: product.shopifyId,
                },
            },
            update: {
                title: product.title,
                vendor: product.vendor,
                productType: product.productType,
                price: product.price,
            },
            create: {
                tenantId,
                shopifyId: product.shopifyId,
                title: product.title,
                vendor: product.vendor,
                productType: product.productType,
                price: product.price,
            },
        });
        count++;
    }

    return count;
}

/**
 * Upsert orders for a tenant (idempotent)
 * Handles customer linking by shopifyId
 * @param {string} tenantId
 * @param {Array} orders - Array of order objects from Shopify
 * @returns {Promise<number>} - Count of upserted orders
 */
async function upsertOrders(tenantId, orders) {
    let count = 0;

    for (const order of orders) {
        // Find customer by shopifyId if provided
        let customerId = null;
        if (order.customerId) {
            const customer = await prisma.customer.findUnique({
                where: {
                    tenantId_shopifyId: {
                        tenantId,
                        shopifyId: order.customerId,
                    },
                },
            });
            customerId = customer?.id || null;
        }

        await prisma.order.upsert({
            where: {
                tenantId_shopifyId: {
                    tenantId,
                    shopifyId: order.shopifyId,
                },
            },
            update: {
                customerId,
                orderNumber: order.orderNumber,
                totalPrice: order.totalPrice,
                orderDate: order.orderDate,
            },
            create: {
                tenantId,
                shopifyId: order.shopifyId,
                customerId,
                orderNumber: order.orderNumber,
                totalPrice: order.totalPrice,
                orderDate: order.orderDate,
            },
        });
        count++;
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

    const [customers, products, orders] = await Promise.all([
        fetchCustomers(tenant.shopifyDomain, tenant.accessToken),
        fetchProducts(tenant.shopifyDomain, tenant.accessToken),
        fetchOrders(tenant.shopifyDomain, tenant.accessToken),
    ]);

    console.log(`Fetched ${customers.length} customers, ${products.length} products, ${orders.length} orders`);

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

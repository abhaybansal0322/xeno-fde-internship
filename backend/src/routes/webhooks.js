// Shopify webhook receiver
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { verifyWebhook } = require('../lib/verifyWebhook');
const { upsertCustomers, upsertProducts, upsertOrders } = require('../lib/syncService');

/**
 * POST /webhooks/shopify/:topic
 * Receive and process Shopify webhooks
 * Topics: customers/create, customers/update, products/create, products/update, 
 *         orders/create, orders/updated, etc.
 */
router.post('/:topic', async (req, res) => {
    try {
        const { topic } = req.params;
        const hmacHeader = req.headers['x-shopify-hmac-sha256'];
        const shopDomain = req.headers['x-shopify-shop-domain'];

        // Get raw body for HMAC verification
        const rawBody = req.rawBody || JSON.stringify(req.body);

        // Verify webhook authenticity
        const isValid = verifyWebhook(
            rawBody,
            hmacHeader,
            process.env.SHOPIFY_API_SECRET
        );

        if (!isValid) {
            console.warn('Invalid webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Find tenant by shop domain
        const tenant = await prisma.tenant.findUnique({
            where: { shopifyDomain: shopDomain },
        });

        if (!tenant) {
            console.warn(`Tenant not found for domain: ${shopDomain}`);
            return res.status(404).json({ error: 'Tenant not found' });
        }

        // Process webhook based on topic
        const webhookData = req.body;

        if (topic.startsWith('customers/')) {
            // Handle customer webhooks
            const customerData = [{
                shopifyId: String(webhookData.id),
                email: webhookData.email,
                firstName: webhookData.first_name,
                lastName: webhookData.last_name,
                totalSpent: parseFloat(webhookData.total_spent) || 0,
            }];
            await upsertCustomers(tenant.id, customerData);

        } else if (topic.startsWith('products/')) {
            // Handle product webhooks
            const productData = [{
                shopifyId: String(webhookData.id),
                title: webhookData.title,
                vendor: webhookData.vendor,
                productType: webhookData.product_type,
                price: webhookData.variants?.[0]?.price ? parseFloat(webhookData.variants[0].price) : 0,
            }];
            await upsertProducts(tenant.id, productData);

        } else if (topic.startsWith('orders/')) {
            // Handle order webhooks
            const orderData = [{
                shopifyId: String(webhookData.id),
                customerId: webhookData.customer?.id ? String(webhookData.customer.id) : null,
                orderNumber: webhookData.order_number ? String(webhookData.order_number) : null,
                totalPrice: parseFloat(webhookData.total_price) || 0,
                orderDate: new Date(webhookData.created_at),
            }];
            await upsertOrders(tenant.id, orderData);
        }

        console.log(`Processed webhook: ${topic} for tenant ${tenant.name}`);

        // Respond quickly to Shopify
        res.status(200).json({ received: true });

    } catch (error) {
        console.error('Webhook processing error:', error);
        // Still return 200 to prevent Shopify retries for our internal errors
        res.status(200).json({ received: true, error: error.message });
    }
});

module.exports = router;

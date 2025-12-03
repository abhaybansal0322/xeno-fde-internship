// Metrics and analytics routes
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { requireUserEmail } = require('../middleware/auth');

/**
 * Helper to verify tenant belongs to user
 */
async function verifyTenantAccess(tenantId, userEmail) {
    const user = await prisma.user.findUnique({
        where: { email: userEmail },
    });

    if (!user) {
        return { valid: false, error: 'User not found' };
    }

    const tenant = await prisma.tenant.findFirst({
        where: {
            id: tenantId,
            userId: user.id,
        },
    });

    if (!tenant) {
        return { valid: false, error: 'Access denied - tenant does not belong to user' };
    }

    return { valid: true };
}

/**
 * GET /api/metrics?tenantId=<id>&start=<date>&end=<date>
 * Get analytics metrics for a tenant
 * Query params: tenantId (required), start (optional), end (optional)
 * Requires X-User-Email header
 */
router.get('/', requireUserEmail, async (req, res) => {
    try {
        const { tenantId, start, end } = req.query;
        const userEmail = req.userEmail;

        if (!tenantId) {
            return res.status(400).json({
                error: 'Missing required query parameter: tenantId',
            });
        }

        // Verify tenant access
        const accessCheck = await verifyTenantAccess(tenantId, userEmail);
        if (!accessCheck.valid) {
            return res.status(403).json({
                error: accessCheck.error,
            });
        }

        // Build date filter
        const dateFilter = {};
        if (start) dateFilter.gte = new Date(start);
        if (end) dateFilter.lte = new Date(end);

        const orderFilter = {
            tenantId,
            ...(Object.keys(dateFilter).length > 0 && { orderDate: dateFilter }),
        };

        // Get counts (optimized - don't fetch all orders if not needed for date grouping)
        const [customersCount, ordersCount] = await Promise.all([
            prisma.customer.count({ where: { tenantId } }),
            prisma.order.count({ where: orderFilter }),
        ]);

        // Only fetch orders if we need date grouping or revenue calculation
        // For top customers, we don't need all orders - optimize by limiting
        let orders = [];
        let totalRevenue = 0;
        let ordersByDate = [];

        if (start || end) {
            // If date range is specified, fetch orders for grouping
            orders = await prisma.order.findMany({
                where: orderFilter,
                select: {
                    orderDate: true,
                    totalPrice: true,
                },
                take: 10000, // Limit to prevent timeout on large datasets
            });

            // Calculate total revenue
            totalRevenue = orders.reduce(
                (sum, order) => sum + parseFloat(order.totalPrice || 0),
                0
            );

            // Group orders by date
            const ordersByDateMap = {};
            orders.forEach(order => {
                const date = order.orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
                if (!ordersByDateMap[date]) {
                    ordersByDateMap[date] = { count: 0, revenue: 0 };
                }
                ordersByDateMap[date].count++;
                ordersByDateMap[date].revenue += parseFloat(order.totalPrice || 0);
            });

            ordersByDate = Object.entries(ordersByDateMap).map(([date, data]) => ({
                date,
                count: data.count,
                revenue: data.revenue,
            })).sort((a, b) => a.date.localeCompare(b.date));
        } else {
            // If no date range, calculate revenue efficiently using aggregation
            const revenueResult = await prisma.order.aggregate({
                where: { tenantId },
                _sum: {
                    totalPrice: true,
                },
            });
            totalRevenue = parseFloat(revenueResult._sum.totalPrice || 0);
        }

        // Get top 5 customers by total spent (optimized - separate query)
        const topCustomers = await prisma.customer.findMany({
            where: { tenantId },
            orderBy: { totalSpent: 'desc' },
            take: 5,
            select: {
                firstName: true,
                lastName: true,
                email: true,
                totalSpent: true,
            },
        });

        const topCustomersFormatted = topCustomers.map(customer => ({
            name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'N/A',
            email: customer.email || 'N/A',
            totalSpent: parseFloat(customer.totalSpent),
        }));

        res.json({
            tenantId,
            dateRange: {
                start: start || null,
                end: end || null,
            },
            totalCustomers: customersCount,
            totalOrders: ordersCount,
            totalRevenue,
            ordersByDate,
            topCustomers: topCustomersFormatted,
        });

    } catch (error) {
        console.error('Error fetching metrics:', error);

        res.status(500).json({
            error: 'Failed to fetch metrics',
            message: error.message,
        });
    }
});

/**
 * GET /api/metrics/customers?tenantId=<id>
 * Get list of all customers for a tenant
 * Requires X-User-Email header
 */
router.get('/customers', requireUserEmail, async (req, res) => {
    try {
        const { tenantId } = req.query;
        const userEmail = req.userEmail;

        if (!tenantId) {
            return res.status(400).json({
                error: 'Missing required query parameter: tenantId',
            });
        }

        // Verify tenant access
        const accessCheck = await verifyTenantAccess(tenantId, userEmail);
        if (!accessCheck.valid) {
            return res.status(403).json({
                error: accessCheck.error,
            });
        }

        const customers = await prisma.customer.findMany({
            where: { tenantId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                totalSpent: true,
                createdAt: true,
            },
            orderBy: { totalSpent: 'desc' },
        });

        const formattedCustomers = customers.map(customer => {
            // Build name from firstName and lastName, or use email, or fallback
            let name = 'N/A';
            if (customer.firstName || customer.lastName) {
                name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
            } else if (customer.email) {
                // Use email as name if no first/last name
                name = customer.email.split('@')[0];
            }

            return {
                id: customer.id,
                name,
                email: customer.email || 'N/A',
                totalSpent: parseFloat(customer.totalSpent || 0) || 0,
                createdAt: customer.createdAt,
            };
        });

        res.json({
            tenantId,
            customers: formattedCustomers,
            count: formattedCustomers.length,
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({
            error: 'Failed to fetch customers',
            message: error.message,
        });
    }
});

/**
 * GET /api/metrics/top-customers?tenantId=<id>
 * Get top 5 customers for a tenant (lightweight endpoint)
 * Requires X-User-Email header
 */
router.get('/top-customers', requireUserEmail, async (req, res) => {
    try {
        const { tenantId } = req.query;
        const userEmail = req.userEmail;

        if (!tenantId) {
            return res.status(400).json({
                error: 'Missing required query parameter: tenantId',
            });
        }

        // Verify tenant access
        const accessCheck = await verifyTenantAccess(tenantId, userEmail);
        if (!accessCheck.valid) {
            return res.status(403).json({
                error: accessCheck.error,
            });
        }

        // Get top 5 customers by total spent (optimized query)
        const topCustomers = await prisma.customer.findMany({
            where: { tenantId },
            orderBy: { totalSpent: 'desc' },
            take: 5,
            select: {
                firstName: true,
                lastName: true,
                email: true,
                totalSpent: true,
            },
        });

        const topCustomersFormatted = topCustomers.map(customer => ({
            name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'N/A',
            email: customer.email || 'N/A',
            totalSpent: parseFloat(customer.totalSpent) || 0,
        }));

        res.json({
            tenantId,
            topCustomers: topCustomersFormatted,
        });
    } catch (error) {
        console.error('Error fetching top customers:', error);
        res.status(500).json({
            error: 'Failed to fetch top customers',
            message: error.message,
        });
    }
});

/**
 * GET /api/metrics/orders?tenantId=<id>
 * Get list of all orders for a tenant
 * Requires X-User-Email header
 */
router.get('/orders', requireUserEmail, async (req, res) => {
    try {
        const { tenantId } = req.query;
        const userEmail = req.userEmail;

        if (!tenantId) {
            return res.status(400).json({
                error: 'Missing required query parameter: tenantId',
            });
        }

        // Verify tenant access
        const accessCheck = await verifyTenantAccess(tenantId, userEmail);
        if (!accessCheck.valid) {
            return res.status(403).json({
                error: accessCheck.error,
            });
        }

        const orders = await prisma.order.findMany({
            where: { tenantId },
            select: {
                id: true,
                orderNumber: true,
                totalPrice: true,
                orderDate: true,
                createdAt: true,
                customer: {
                    select: {
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { orderDate: 'desc' },
        });

        const formattedOrders = orders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber || 'N/A',
            totalPrice: parseFloat(order.totalPrice),
            orderDate: order.orderDate,
            customerName: order.customer 
                ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || order.customer.email || 'Guest'
                : 'Guest',
            customerEmail: order.customer?.email || 'N/A',
            createdAt: order.createdAt,
        }));

        res.json({
            tenantId,
            orders: formattedOrders,
            count: formattedOrders.length,
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({
            error: 'Failed to fetch orders',
            message: error.message,
        });
    }
});

module.exports = router;

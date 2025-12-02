// Metrics and analytics routes
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

/**
 * GET /api/metrics?tenantId=<id>&start=<date>&end=<date>
 * Get analytics metrics for a tenant
 * Query params: tenantId (required), start (optional), end (optional)
 */
router.get('/', async (req, res) => {
    try {
        const { tenantId, start, end } = req.query;

        if (!tenantId) {
            return res.status(400).json({
                error: 'Missing required query parameter: tenantId',
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

        // Get counts
        const [customersCount, ordersCount, orders] = await Promise.all([
            prisma.customer.count({ where: { tenantId } }),
            prisma.order.count({ where: orderFilter }),
            prisma.order.findMany({
                where: orderFilter,
                select: {
                    orderDate: true,
                    totalPrice: true,
                },
            }),
        ]);

        // Calculate total revenue
        const totalRevenue = orders.reduce(
            (sum, order) => sum + parseFloat(order.totalPrice),
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
            ordersByDateMap[date].revenue += parseFloat(order.totalPrice);
        });

        const ordersByDate = Object.entries(ordersByDateMap).map(([date, data]) => ({
            date,
            count: data.count,
            revenue: data.revenue,
        })).sort((a, b) => a.date.localeCompare(b.date));

        // Get top 5 customers by total spent
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

module.exports = router;

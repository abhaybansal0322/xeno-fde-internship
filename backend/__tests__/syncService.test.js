// Unit tests for syncService upsert logic
const { upsertOrders } = require('../src/lib/syncService');

// Mock Prisma
jest.mock('../src/prisma', () => ({
    customer: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
    },
    order: {
        upsert: jest.fn(),
        createMany: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
    },
    orderLineItem: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
    },
}));

const prisma = require('../src/prisma');

describe('SyncService - upsertOrders', () => {
    const mockTenantId = 'tenant-123';
    const mockCustomerId = 'customer-456';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should upsert orders with idempotency', async () => {
        // Mock customer lookup (using findMany for batch lookup)
        prisma.customer.findMany.mockResolvedValue([
            {
                id: mockCustomerId,
                shopifyId: '9876543210',
            },
        ]);

        // Mock batch operations
        prisma.order.createMany.mockResolvedValue({ count: 1 });
        prisma.order.updateMany.mockResolvedValue({ count: 1 });

        // Mock line item operations
        prisma.order.findMany.mockResolvedValue([
            { id: 'order-1', shopifyId: '1234567890' }
        ]);
        prisma.orderLineItem.deleteMany.mockResolvedValue({ count: 0 });
        prisma.orderLineItem.createMany.mockResolvedValue({ count: 1 });

        const orders = [
            {
                shopifyId: '1234567890',
                customerId: '9876543210',
                orderNumber: '1001',
                totalPrice: 99.99,
                orderDate: new Date('2024-01-15'),
                lineItems: [
                    { shopifyId: 'li-1', title: 'Product 1', quantity: 1, price: 99.99 }
                ]
            },
        ];

        const count = await upsertOrders(mockTenantId, orders);

        expect(count).toBe(1);
        expect(prisma.customer.findMany).toHaveBeenCalledWith({
            where: {
                tenantId: mockTenantId,
                shopifyId: { in: ['9876543210'] },
            },
            select: {
                id: true,
                shopifyId: true,
            },
        });
        expect(prisma.order.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({
                    tenantId: mockTenantId,
                    shopifyId: '1234567890',
                    customerId: mockCustomerId,
                    orderNumber: '1001',
                    totalPrice: 99.99,
                }),
            ]),
            skipDuplicates: true,
        });
        expect(prisma.order.updateMany).toHaveBeenCalled();

        // Verify line item operations
        expect(prisma.order.findMany).toHaveBeenCalled();
        expect(prisma.orderLineItem.deleteMany).toHaveBeenCalled();
        expect(prisma.orderLineItem.createMany).toHaveBeenCalled();
    });

    test('should handle orders without customer (guest checkout)', async () => {
        // Mock batch operations
        prisma.order.createMany.mockResolvedValue({ count: 1 });
        prisma.order.updateMany.mockResolvedValue({ count: 1 });

        // Mock line item operations
        prisma.order.findMany.mockResolvedValue([
            { id: 'order-2', shopifyId: '1111111111' }
        ]);
        prisma.orderLineItem.deleteMany.mockResolvedValue({ count: 0 });
        prisma.orderLineItem.createMany.mockResolvedValue({ count: 0 });

        const orders = [
            {
                shopifyId: '1111111111',
                customerId: null,
                orderNumber: '1002',
                totalPrice: 49.99,
                orderDate: new Date('2024-01-16'),
            },
        ];

        const count = await upsertOrders(mockTenantId, orders);

        expect(count).toBe(1);
        expect(prisma.customer.findMany).not.toHaveBeenCalled();
        expect(prisma.order.createMany).toHaveBeenCalledWith({
            data: expect.arrayContaining([
                expect.objectContaining({
                    tenantId: mockTenantId,
                    shopifyId: '1111111111',
                    customerId: null,
                    orderNumber: '1002',
                    totalPrice: 49.99,
                }),
            ]),
            skipDuplicates: true,
        });
        expect(prisma.order.updateMany).toHaveBeenCalled();
    });

    test('should handle multiple orders in sequence', async () => {
        // Mock batch operations for multiple orders
        prisma.order.createMany.mockResolvedValue({ count: 2 });
        prisma.order.updateMany
            .mockResolvedValueOnce({ count: 1 })
            .mockResolvedValueOnce({ count: 1 });

        // Mock line item operations
        prisma.order.findMany.mockResolvedValue([
            { id: 'order-3', shopifyId: '111' },
            { id: 'order-4', shopifyId: '222' }
        ]);
        prisma.orderLineItem.deleteMany.mockResolvedValue({ count: 0 });
        prisma.orderLineItem.createMany.mockResolvedValue({ count: 0 });

        const orders = [
            {
                shopifyId: '111',
                customerId: null,
                orderNumber: '1001',
                totalPrice: 10,
                orderDate: new Date(),
            },
            {
                shopifyId: '222',
                customerId: null,
                orderNumber: '1002',
                totalPrice: 20,
                orderDate: new Date(),
            },
        ];

        const count = await upsertOrders(mockTenantId, orders);

        expect(count).toBe(2);
        expect(prisma.order.createMany).toHaveBeenCalledTimes(1); // Batch operation
        expect(prisma.order.updateMany).toHaveBeenCalledTimes(2); // One update per order
    });
});

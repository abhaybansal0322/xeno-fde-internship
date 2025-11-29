// Unit tests for syncService upsert logic
const { upsertOrders } = require('../src/lib/syncService');

// Mock Prisma
jest.mock('../src/prisma', () => ({
    customer: {
        findUnique: jest.fn(),
    },
    order: {
        upsert: jest.fn(),
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
        // Mock customer lookup
        prisma.customer.findUnique.mockResolvedValue({
            id: mockCustomerId,
            shopifyId: '9876543210',
        });

        // Mock upsert
        prisma.order.upsert.mockResolvedValue({
            id: 'order-uuid',
            shopifyId: '1234567890',
        });

        const orders = [
            {
                shopifyId: '1234567890',
                customerId: '9876543210',
                orderNumber: '1001',
                totalPrice: 99.99,
                orderDate: new Date('2024-01-15'),
            },
        ];

        const count = await upsertOrders(mockTenantId, orders);

        expect(count).toBe(1);
        expect(prisma.customer.findUnique).toHaveBeenCalledWith({
            where: {
                tenantId_shopifyId: {
                    tenantId: mockTenantId,
                    shopifyId: '9876543210',
                },
            },
        });
        expect(prisma.order.upsert).toHaveBeenCalledWith({
            where: {
                tenantId_shopifyId: {
                    tenantId: mockTenantId,
                    shopifyId: '1234567890',
                },
            },
            update: expect.objectContaining({
                customerId: mockCustomerId,
                orderNumber: '1001',
                totalPrice: 99.99,
            }),
            create: expect.objectContaining({
                tenantId: mockTenantId,
                shopifyId: '1234567890',
                customerId: mockCustomerId,
                orderNumber: '1001',
                totalPrice: 99.99,
            }),
        });
    });

    test('should handle orders without customer (guest checkout)', async () => {
        prisma.order.upsert.mockResolvedValue({
            id: 'order-uuid-2',
            shopifyId: '1111111111',
        });

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
        expect(prisma.customer.findUnique).not.toHaveBeenCalled();
        expect(prisma.order.upsert).toHaveBeenCalledWith({
            where: {
                tenantId_shopifyId: {
                    tenantId: mockTenantId,
                    shopifyId: '1111111111',
                },
            },
            update: expect.objectContaining({
                customerId: null,
                orderNumber: '1002',
            }),
            create: expect.objectContaining({
                customerId: null,
                orderNumber: '1002',
            }),
        });
    });

    test('should handle multiple orders in sequence', async () => {
        prisma.order.upsert
            .mockResolvedValueOnce({ id: 'order-1' })
            .mockResolvedValueOnce({ id: 'order-2' });

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
        expect(prisma.order.upsert).toHaveBeenCalledTimes(2);
    });
});

// Basic Prisma client connection test
const { PrismaClient } = require('@prisma/client');

describe('Prisma Client', () => {
    let prisma;

    beforeAll(() => {
        prisma = new PrismaClient();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    test('should connect to database successfully', async () => {
        // Test connection by querying database
        await expect(prisma.$connect()).resolves.not.toThrow();

        // Verify we can query (even if table doesn't exist yet, this tests connection)
        const result = await prisma.$queryRaw`SELECT 1 as value`;
        expect(result).toBeDefined();
    });

    test('should be able to disconnect', async () => {
        await expect(prisma.$disconnect()).resolves.not.toThrow();
    });
});

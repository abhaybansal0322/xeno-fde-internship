const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function main() {
    try {
        console.log('Connecting to database...');
        await prisma.$connect();
        console.log('Connected successfully.');

        console.log('Querying tenants...');
        const tenants = await prisma.tenant.findMany({ take: 1 });
        console.log('Tenants found:', tenants);

    } catch (error) {
        console.error('Database connection error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

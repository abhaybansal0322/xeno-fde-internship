const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 2) {
        console.error('Usage: node scripts/seed-tenant.js <SHOP_DOMAIN> <ACCESS_TOKEN>');
        process.exit(1);
    }

    const shopifyDomain = args[0];
    const accessToken = args[1];

    console.log(`Seeding tenant for domain: ${shopifyDomain}`);

    try {
        const tenant = await prisma.tenant.upsert({
            where: { shopifyDomain },
            update: { accessToken },
            create: {
                shopifyDomain,
                accessToken,
                shopName: shopifyDomain.split('.')[0], // Default shop name from domain
            },
        });

        console.log('✅ Tenant seeded successfully:');
        console.log(tenant);
    } catch (error) {
        console.error('❌ Error seeding tenant:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

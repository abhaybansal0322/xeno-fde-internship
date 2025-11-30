const prisma = require('../prisma');

async function main() {
    // Accept arguments from command line or environment variables
    const args = process.argv.slice(2);
    const shopifyDomain = args[0] || process.env.SHOP_DOMAIN;
    const accessToken = args[1] || process.env.ACCESS_TOKEN;
    const name = args[2] || process.env.SHOP_NAME;

    if (!shopifyDomain || !accessToken || !name) {
        console.error('❌ Missing required arguments.');
        console.error('Usage: node src/scripts/seed-tenant.js <SHOP_DOMAIN> <ACCESS_TOKEN> <SHOP_NAME>');
        console.error('Example: node src/scripts/seed-tenant.js my-store.myshopify.com shpat_12345 "My Store"');
        process.exit(1);
    }

    try {
        console.log(`🌱 Seeding tenant: ${name} (${shopifyDomain})...`);

        const tenant = await prisma.tenant.create({
            data: {
                name,
                shopifyDomain,
                accessToken,
            },
        });

        console.log(`✅ Tenant created successfully!`);
        console.log(`🆔 Tenant ID: ${tenant.id}`);
    } catch (error) {
        if (error.code === 'P2002') {
            console.error(`❌ Error: A tenant with domain "${shopifyDomain}" already exists.`);
        } else {
            console.error('❌ Error creating tenant:', error);
        }
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();

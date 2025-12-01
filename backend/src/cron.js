/**
 * Automated Tenant Synchronization Cron Job
 * 
 * This module provides automated scheduled synchronization of all active tenants
 * with their Shopify stores. Runs every 10 minutes using node-cron.
 * 
 * Enable by setting ENABLE_CRON=true in environment variables.
 */

const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();

/**
 * Sync a single tenant with Shopify
 * @param {Object} tenant - Tenant object from database
 * @returns {Promise<Object>} - Sync result
 */
async function syncTenant(tenant) {
    try {
        console.log(`[CRON] Starting sync for tenant: ${tenant.shopifyDomain}`);

        // Call the sync API endpoint internally
        const apiUrl = process.env.API_BASE_URL || 'http://localhost:3000';
        const response = await axios.post(
            `${apiUrl}/api/tenants/${tenant.id}/sync`,
            {},
            {
                timeout: 120000, // 2 minute timeout for sync
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log(`[CRON] ✓ Sync completed for ${tenant.shopifyDomain}:`, {
            customers: response.data.customersImported || 0,
            orders: response.data.ordersImported || 0,
            products: response.data.productsImported || 0,
        });

        return {
            success: true,
            tenantId: tenant.id,
            domain: tenant.shopifyDomain,
            ...response.data,
        };
    } catch (error) {
        console.error(`[CRON] ✗ Sync failed for ${tenant.shopifyDomain}:`, {
            error: error.message,
            status: error.response?.status,
            data: error.response?.data,
        });

        return {
            success: false,
            tenantId: tenant.id,
            domain: tenant.shopifyDomain,
            error: error.message,
        };
    }
}

/**
 * Sync all active tenants sequentially
 */
async function syncAllTenants() {
    const startTime = Date.now();
    console.log(`[CRON] ======== Starting tenant sync job at ${new Date().toISOString()} ========`);

    try {
        // Fetch all active tenants from database
        const tenants = await prisma.tenant.findMany({
            where: {
                // Add any filtering criteria here (e.g., active status)
                // isActive: true,
            },
            select: {
                id: true,
                shopifyDomain: true,
                shopName: true,
            },
        });

        console.log(`[CRON] Found ${tenants.length} tenant(s) to sync`);

        if (tenants.length === 0) {
            console.log('[CRON] No tenants to sync, skipping job');
            return;
        }

        // Sync each tenant sequentially to avoid overwhelming the system
        const results = [];
        for (const tenant of tenants) {
            const result = await syncTenant(tenant);
            results.push(result);

            // Small delay between syncs to prevent rate limiting
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // Summary
        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`[CRON] ======== Sync job completed in ${duration}s ========`);
        console.log(`[CRON] Summary: ${successful} successful, ${failed} failed`);

        if (failed > 0) {
            console.warn('[CRON] Failed tenants:', results.filter((r) => !r.success).map((r) => r.domain));
        }
    } catch (error) {
        console.error('[CRON] Fatal error during sync job:', error);
    }
}

/**
 * Initialize cron job
 * Schedule: Every 10 minutes (* /10 * * * *)
 */
function initializeCronJobs() {
    const isEnabled = process.env.ENABLE_CRON === 'true';

    if (!isEnabled) {
        console.log('[CRON] Cron jobs are DISABLED. Set ENABLE_CRON=true to enable.');
        return;
    }

    console.log('[CRON] Initializing cron jobs...');

    // Schedule: Every 10 minutes
    const job = cron.schedule('*/10 * * * *', async () => {
        await syncAllTenants();
    }, {
        scheduled: true,
        timezone: 'UTC', // Use UTC for consistency across deployments
    });

    console.log('[CRON] ✓ Cron job scheduled: Tenant sync every 10 minutes');

    // Run initial sync on startup (optional - uncomment if desired)
    // console.log('[CRON] Running initial sync on startup...');
    // syncAllTenants();

    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('[CRON] SIGTERM received, stopping cron jobs...');
        job.stop();
        prisma.$disconnect();
        process.exit(0);
    });

    process.on('SIGINT', () => {
        console.log('[CRON] SIGINT received, stopping cron jobs...');
        job.stop();
        prisma.$disconnect();
        process.exit(0);
    });

    return job;
}

// Export for use in main application
module.exports = {
    initializeCronJobs,
    syncAllTenants, // For manual triggering
    syncTenant, // For testing individual tenants
};

// If running this file directly (for testing)
if (require.main === module) {
    console.log('[CRON] Running in standalone mode for testing...');
    initializeCronJobs();
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
    console.log('🔄 Starting migration from public to management...');

    const tablesToMove = [
        'financial_configs',
        'plans',
        'customers',
        'invoices',
        'invoice_items',
        'financial_adjustments',
        'service_orders',
        // 'radcheck', 'radreply', 'radacct', 'nas' // check behavior for these later
    ];

    const enumsToMove = [
        'CustomerStatus',
        'InvoiceStatus',
        'AdjustmentType',
        'SystemOrderType',
        'SystemOrderStatus',
        'SystemOrderPriority',
        'SubscriptionStatus'
    ];

    try {
        // 1. Move Enums/Types
        for (const enumName of enumsToMove) {
            try {
                // Check if exists in public
                const existsPublic: any[] = await prisma.$queryRawUnsafe(`
                    SELECT 1 FROM pg_type t 
                    JOIN pg_namespace n ON t.typnamespace = n.oid 
                    WHERE n.nspname = 'public' AND t.typname = '${enumName}'
                `);

                if (existsPublic.length > 0) {
                    console.log(`📦 Moving TYPE ${enumName} to management...`);
                    await prisma.$executeRawUnsafe(`ALTER TYPE "public"."${enumName}" SET SCHEMA "management"`);
                } else {
                    console.log(`ℹ️ TYPE ${enumName} not found in public (or already moved).`);
                }
            } catch (e) {
                console.warn(`⚠️ Error moving TYPE ${enumName}:`, e);
            }
        }

        // 2. Move Tables
        for (const table of tablesToMove) {
            try {
                // Check public
                const existsPublic: any[] = await prisma.$queryRawUnsafe(`
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'public' AND table_name = '${table}'
                `);

                // Check management to avoid collision
                const existsManagement: any[] = await prisma.$queryRawUnsafe(`
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = 'management' AND table_name = '${table}'
                `);

                if (existsPublic.length > 0) {
                    if (existsManagement.length > 0) {
                        console.warn(`⚠️ Table ${table} exists in BOTH public and management. Keeping management, renaming public to ${table}_backup.`);
                        await prisma.$executeRawUnsafe(`ALTER TABLE "public"."${table}" RENAME TO "${table}_backup"`);
                    } else {
                        console.log(`📦 Moving TABLE ${table} to management...`);
                        await prisma.$executeRawUnsafe(`ALTER TABLE "public"."${table}" SET SCHEMA "management"`);
                    }
                } else {
                    console.log(`ℹ️ TABLE ${table} not found in public.`);
                }
            } catch (e) {
                console.warn(`⚠️ Error moving TABLE ${table}:`, e);
            }
        }

        console.log('✅ Migration complete.');

    } catch (e) {
        console.error('❌ Migration failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();

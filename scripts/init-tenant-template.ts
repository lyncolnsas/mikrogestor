import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initTenantTemplate() {
    console.log('[Init] Initializing tenant_template schema...');

    try {
        // 1. Create schema
        await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "tenant_template"`);
        console.log('✅ Schema "tenant_template" ensured.');

        // 2. Clone Enums
        // We need to look for enums in 'management' (default schema) and copy them to 'tenant_template'
        const enumsToClone = [
            'CustomerStatus',
            'InvoiceStatus',
            'AdjustmentType',
            'SystemOrderType',
            'SystemOrderStatus',
            'SystemOrderPriority'
        ];

        for (const enumName of enumsToClone) {
            // Check if enum exists in target
            const exists: any[] = await prisma.$queryRawUnsafe(`
                SELECT 1 FROM pg_type t 
                JOIN pg_namespace n ON t.typnamespace = n.oid 
                WHERE n.nspname = 'tenant_template' AND t.typname = '${enumName}'
            `);

            if (exists.length === 0) {
                // Get values from public
                const values: any[] = await prisma.$queryRawUnsafe(`
                    SELECT e.enumlabel 
                    FROM pg_enum e 
                    JOIN pg_type t ON e.enumtypid = t.oid 
                    JOIN pg_namespace n ON t.typnamespace = n.oid 
                    WHERE n.nspname = 'public' AND t.typname = '${enumName}'
                    ORDER BY e.enumsortorder
                `);

                if (values.length > 0) {
                    const enumValues = values.map(v => `'${v.enumlabel}'`).join(', ');
                    await prisma.$executeRawUnsafe(`CREATE TYPE "tenant_template"."${enumName}" AS ENUM (${enumValues})`);
                    console.log(`✅ Enum "${enumName}" created in tenant_template.`);
                } else {
                    console.warn(`⚠️ Enum "${enumName}" not found in public schema.`);
                }
            } else {
                console.log(`ℹ️ Enum "${enumName}" already exists in tenant_template.`);
            }
        }

        // DEBUG: List all tables in public schema
        const tables: any[] = await prisma.$queryRawUnsafe(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('📊 Tables found in public schema:', tables.map(t => t.table_name));

        // 3. Clone Tables
        // Tables to be used as template
        // Names must match exactly what is in PostgreSQL 'public' schema
        const tablesToClone = ['customers', 'invoices', 'invoice_items', 'financial_configs'];

        for (const table of tablesToClone) {
            // Default source is same as target
            let sourceTable = table;

            // Check if source exists
            const exists = tables.find(t => t.table_name === sourceTable);

            if (!exists) {
                console.error(`❌ Source table "public"."${sourceTable}" NOT found in list: ${JSON.stringify(tables.map(t => t.table_name))}`);

                // Fallback check for casing issues
                const fuzzyMatch = tables.find(t => t.table_name.toLowerCase() === sourceTable.toLowerCase());
                if (fuzzyMatch) {
                    console.log(`⚠️ Found case-insensitive match: "${fuzzyMatch.table_name}". Using it.`);
                    sourceTable = fuzzyMatch.table_name;
                } else {
                    continue;
                }
            }

            // Create in template
            await prisma.$executeRawUnsafe(`
                CREATE TABLE IF NOT EXISTS "tenant_template"."${table}" 
                (LIKE "public"."${sourceTable}" INCLUDING ALL)
            `);
            console.log(`✅ Table "${table}" ensured in tenant_template (cloned from ${sourceTable}).`);
        }

        console.log('[Init] tenant_template initialization complete.');

    } catch (e) {
        console.error('❌ Error initializing tenant_template:', e);
    } finally {
        await prisma.$disconnect();
    }
}

initTenantTemplate();

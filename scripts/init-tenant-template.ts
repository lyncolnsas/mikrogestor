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
                // Get values from 'management' (Prisma default source) or 'public' (Postgres default source)
                const values: any[] = await prisma.$queryRawUnsafe(`
                    SELECT e.enumlabel 
                    FROM pg_enum e 
                    JOIN pg_type t ON e.enumtypid = t.oid 
                    JOIN pg_namespace n ON t.typnamespace = n.oid 
                    WHERE (n.nspname = 'management' OR n.nspname = 'public') AND t.typname = '${enumName}'
                    ORDER BY e.enumsortorder
                `);

                if (values.length > 0) {
                    const enumValues = values.map(v => `'${v.enumlabel}'`).join(', ');
                    await prisma.$executeRawUnsafe(`CREATE TYPE "tenant_template"."${enumName}" AS ENUM (${enumValues})`);
                    console.log(`✅ Enum "${enumName}" created in tenant_template.`);
                } else {
                    console.warn(`⚠️ Enum "${enumName}" not found in management/public schema.`);
                }
            } else {
                console.log(`ℹ️ Enum "${enumName}" already exists in tenant_template.`);
            }
        }

        // DEBUG: List all tables in all non-system schemas
        const allTables: any[] = await prisma.$queryRawUnsafe(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        `);
        console.log('📊 TABLES ARCHITECTURE:', allTables.map(t => `${t.table_schema}.${t.table_name}`));
        
        // Find management tables
        const tables = allTables.filter(t => t.table_schema === 'management');
        console.log('📊 Tables found in management schema:', tables.map(t => t.table_name));

        // Use any schema that has the tables we need as fallback
        const findTable = (name: string) => {
            return allTables.find(t => t.table_name.toLowerCase() === name.toLowerCase());
        };

        // 3. Clone Tables
        // Tables to be used as template
        // Names must match exactly what is in PostgreSQL 'management' schema
        const tablesToClone = ['customers', 'invoices', 'invoice_items', 'financial_configs'];

        for (const tableName of tablesToClone) {
            try {
                // Find table in any schema (management or public)
                const sourceTable = findTable(tableName);

                if (!sourceTable) {
                    console.error(`❌ SOURCE TABLE "${tableName}" NOT found in ANY schema. Skipping.`);
                    continue;
                }

                console.log(`🏗️ Cloning table "${sourceTable.table_schema}"."${sourceTable.table_name}" to "tenant_template"."${tableName}"...`);
                
                // Create in template
                await prisma.$executeRawUnsafe(`
                    CREATE TABLE IF NOT EXISTS "tenant_template"."${tableName}" 
                    (LIKE "${sourceTable.table_schema}"."${sourceTable.table_name}" INCLUDING ALL)
                `);
                console.log(`✅ Table "${tableName}" ensured in tenant_template.`);
            } catch (tableError) {
                console.error(`⚠️ Error cloning table ${tableName}:`, tableError);
            }
        }

        console.log('[Init] tenant_template initialization complete.');
        process.exit(0);

    } catch (e) {
        console.error('❌ FATAL ERROR initializing tenant_template:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

initTenantTemplate().catch(err => {
    console.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

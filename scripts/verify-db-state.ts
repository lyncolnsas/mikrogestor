import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyState() {
    try {
        console.log('--- Verifying Database State ---');

        // 1. Check Schemas
        const schemas: any[] = await prisma.$queryRawUnsafe(`
            SELECT schema_name FROM information_schema.schemata 
            WHERE schema_name IN ('management', 'tenant_template')
        `);
        console.log('Schemas found:', schemas.map(s => s.schema_name));

        // 2. Check Tables in tenant_template
        const templateTables: any[] = await prisma.$queryRawUnsafe(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'tenant_template'
        `);
        console.log('Tables in tenant_template:', templateTables.map(t => t.table_name));

        // 3. List ALL tables in ALL schemas to find where they are hiding
        const allTables: any[] = await prisma.$queryRawUnsafe(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
            ORDER BY table_schema, table_name
        `);
        console.log('ALL TABLES FOUND:');
        allTables.forEach(t => console.log(`${t.table_schema}.${t.table_name}`));

    } catch (e) {
        console.error('Error verifying state:', e);
    } finally {
        await prisma.$disconnect();
    }
}

verifyState();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugTables() {
    try {
        const tables: any[] = await prisma.$queryRawUnsafe(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'management'
        `);
        console.log('Tables in management schema:', JSON.stringify(tables, null, 2));
    } catch (e) {
        console.error('Error listing tables:', e);
    } finally {
        await prisma.$disconnect();
    }
}

debugTables();

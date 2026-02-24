
const { PrismaClient } = require('@prisma/client');

const passwords = ['mikrogestor_secure_2026', 'password', 'postgres', '123456'];
const baseUrl = 'postgresql://postgres:';
const endUrl = '@localhost:5432/mikrogestor_prod';

async function test() {
    for (const pw of passwords) {
        const url = `${baseUrl}${pw}${endUrl}`;
        const prisma = new PrismaClient({
            datasources: {
                db: { url }
            }
        });
        try {
            await prisma.$connect();
            console.log(`SUCCESS: Password is "${pw}"`);
            await prisma.$disconnect();
            process.exit(0);
        } catch (e) {
            console.log(`FAILED: "${pw}" -> ${e.message}`);
            await prisma.$disconnect();
        }
    }
}

test();

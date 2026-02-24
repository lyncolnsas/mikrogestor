
const { PrismaClient } = require('@prisma/client');

const configs = [
    "postgresql://postgres:mikrogestor_secure_2026@localhost:5432/mikrogestor_prod",
    "postgresql://postgres:password@localhost:5432/mikrogestor_prod",
    "postgresql://postgres@localhost:5432/mikrogestor_prod",
    "postgresql://postgres:postgres@localhost:5432/mikrogestor_prod",
    "postgresql://postgres:mikrogestor_secure_2026@127.0.0.1:5432/mikrogestor_prod",
    "postgresql://postgres:password@127.0.0.1:5432/mikrogestor_prod",
    "postgresql://postgres:mikrogestor_secure_2026@localhost:5432/mikrogestor",
    "postgresql://postgres:password@localhost:5432/mikrogestor"
];

async function test() {
    for (const url of configs) {
        const prisma = new PrismaClient({ datasources: { db: { url } } });
        try {
            await prisma.$connect();
            console.log(`SUCCESS: ${url}`);
            await prisma.$disconnect();
            process.exit(0);
        } catch (e) {
            console.log(`FAILED: ${url} -> ${e.message}`);
            await prisma.$disconnect();
        }
    }
}

test();

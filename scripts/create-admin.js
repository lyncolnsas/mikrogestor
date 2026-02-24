const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Super Admin User...');

    // Check if user exists
    const existing = await prisma.user.findUnique({
        where: { email: 'admin@mikrogestor.com' }
    });

    if (existing) {
        console.log('User admin@mikrogestor.com already exists.');
        return;
    }

    // Default Password: admin
    const hashedPassword = await bcrypt.hash('admin', 10);

    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@mikrogestor.com',
            name: 'Super Admin',
            password: hashedPassword,
            role: 'SUPER_ADMIN'
        }
    });
    console.log(`Super Admin created: ${adminUser.email} / admin`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

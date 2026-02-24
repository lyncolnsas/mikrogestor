import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@mikrogestor.com';
    const password = 'admin-password-2026';
    const name = 'SaaS Super Admin';

    console.log(`--- Ensuring Super Admin exists ---`);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
        where: { email },
        update: {
            password: hashedPassword,
            name: name,
            role: 'SUPER_ADMIN',
        },
        create: {
            email,
            name,
            password: hashedPassword,
            role: 'SUPER_ADMIN',
        },
    });

    console.log(`✅ Super Admin configured:`);
    console.log(`- User: ${user.email}`);
    console.log(`- Password: ${password}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

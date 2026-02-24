import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
    const email = "admin@mikrogestor.com";
    const password = "admin_password_123";
    const name = "System Administrator";

    console.log('--- Super Admin Seeding ---');

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await prisma.user.upsert({
        where: { email },
        update: { password: hashedPassword },
        create: {
            email,
            name,
            password: hashedPassword,
        },
    });

    console.log(`✅ Super Admin created/updated: ${admin.email}`);
    console.log(`🔑 Login with: ${email} / ${password}`);
    console.log('⚠️ Note: You may need to manually update the Role in the database if there is no UI for it yet.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

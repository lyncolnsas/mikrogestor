import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- SaaS User Audit ---');
    const users = await prisma.user.findMany({
        include: { tenant: true }
    });

    if (users.length === 0) {
        console.log('🔴 No users found in the database. Registration is likely failing silently or hasn\'t been attempted successfully.');
    } else {
        console.log(`✅ Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- User: ${u.email} | Name: ${u.name} | Role: ${u.role} | Tenant: ${u.tenant?.name}`);
        });
    }

    const tenants = await prisma.tenant.findMany();
    console.log(`--- Tenants: ${tenants.length} ---`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

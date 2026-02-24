import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding SaaS Plans...');

    const plans = [
        {
            name: 'Plano Start',
            uniqueName: 'start',
            maxCustomers: 500,
            monthlyPrice: '499.00',
            features: {
                whatsapp: false,
                api_access: false,
                max_vpn_nodes: 1
            }
        },
        {
            name: 'Plano Pro',
            uniqueName: 'pro',
            maxCustomers: 2000,
            monthlyPrice: '899.00',
            features: {
                whatsapp: true,
                api_access: true,
                max_vpn_nodes: 3
            }
        },
        {
            name: 'Plano Enterprise',
            uniqueName: 'enterprise',
            maxCustomers: 10000,
            monthlyPrice: '1499.00',
            features: {
                whatsapp: true,
                api_access: true,
                max_vpn_nodes: 10,
                priority_support: true
            }
        }
    ];

    for (const plan of plans) {
        await prisma.saasPlan.upsert({
            where: { id: plan.uniqueName }, // Using uniqueName as ID for consistency
            update: {
                name: plan.name,
                maxCustomers: plan.maxCustomers,
                monthlyPrice: plan.monthlyPrice,
                features: plan.features
            },
            create: {
                id: plan.uniqueName,
                name: plan.name,
                maxCustomers: plan.maxCustomers,
                monthlyPrice: plan.monthlyPrice,
                features: plan.features
            }
        });
        console.log(`Upserted plan: ${plan.name}`);
    }

    console.log('Seeding VPN Server...');
    const vpnServer = await prisma.vpnServer.upsert({
        where: { id: "default-ca-sync-01" },
        update: {},
        create: {
            id: "default-ca-sync-01",
            name: "Nuvem Core (Auto-Sync)",
            publicEndpoint: "aguardando-conexao", // Placeholder for UI
            listenPort: 51820,
            publicKey: "aguardando-registro-do-servidor-vpn", // Placeholder for UI
            capacityLimit: 250,
            secret: "ca-dev-secret-2025",
            isActive: true
        }
    });
    console.log(`Initial VPN Server ready: ${vpnServer.name}`);

    console.log('Seeding Super Admin User...');
    // Default Password: admin
    const hashedPassword = await bcrypt.hash('admin', 10);

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@mikrogestor.com' },
        update: {
            password: hashedPassword,
            role: 'SUPER_ADMIN'
        },
        create: {
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

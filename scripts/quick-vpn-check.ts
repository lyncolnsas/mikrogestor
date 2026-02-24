import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function quickCheck() {
    console.log('🔍 Quick VPN Check\n');

    try {
        const server = await prisma.vpnServer.findFirst();

        if (server) {
            console.log('✅ VPN Server Found!');
            console.log(`   Name: ${server.name}`);
            console.log(`   ID: ${server.id}`);
            console.log(`   Endpoint: ${server.publicEndpoint}`);
            console.log(`   Public Key: ${server.publicKey?.substring(0, 20)}...`);
            console.log(`   Active: ${server.isActive}`);
        } else {
            console.log('❌ No VPN server found in database');
            console.log('   Auto-registration may not have run yet.');
            console.log('   Try accessing http://localhost:3000 to trigger it.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

quickCheck();

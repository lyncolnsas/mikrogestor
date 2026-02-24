import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
    console.log("🧹 Starting VPN Server Cleanup...");

    const servers = await prisma.vpnServer.findMany({
        include: {
            _count: { select: { tunnels: true } }
        }
    });

    console.log(`Found ${servers.length} VPN servers.\n`);

    for (const server of servers) {
        console.log(`- [${server.id}] "${server.name}"`);
        console.log(`  Endpoint: ${server.publicEndpoint || 'empty'}`);
        console.log(`  Tunnels: ${server._count.tunnels}`);
        console.log(`  Active: ${server.isActive}`);

        // Logical cleanup:
        // If it's a "ghost" server (not the default sync one and has 0 or few tunnels)
        // we might want to deactivate it to prevent it from being picked by getBestServer()
        if (server.id !== 'default-ca-sync-01' && server.isActive) {
            if (server._count.tunnels === 0) {
                console.log(`  ⚠️  Ghost server detected. Deactivating to prevent auto-selection...`);
                await prisma.vpnServer.update({
                    where: { id: server.id },
                    data: { isActive: false }
                });
                console.log(`  ✅ Deactivated.`);
            } else {
                console.log(`  ℹ️  Server has active tunnels. Manual review suggested before deactivating.`);
            }
        }
        console.log("");
    }

    console.log("✅ Cleanup process finished.");
}

cleanup()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());

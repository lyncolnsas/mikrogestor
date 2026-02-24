const { PrismaClient } = require('@prisma/client');

// Use localhost:5434 for host-to-container DB access
const connectionString = 'postgresql://postgres:mikrogestor_secure_2026@localhost:5434/mikrogestor_prod?schema=management&search_path=management,tenant_template,radius';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: connectionString,
        },
    },
});

async function sync() {
    const targetSecret = 'ca-dev-secret-2025';
    const serverId = 'default-ca-sync-01';

    try {
        console.log("🔄 Syncing VPN Server secret in DB...");

        const server = await prisma.vpnServer.findUnique({
            where: { id: serverId }
        });

        if (server) {
            console.log(`Found server: ${server.name} (ID: ${server.id})`);
            console.log(`Current secret: ${server.secret}`);
            console.log(`Updated At (DB): ${server.updatedAt}`);

            const [now] = await prisma.$queryRaw`SELECT NOW()`;
            console.log(`Now (DB): ${now.now}`);
            console.log(`Now (Node): ${new Date()}`);

            if (server.secret !== targetSecret) {
                console.log(`Updating secret to: ${targetSecret}`);
                await prisma.vpnServer.update({
                    where: { id: serverId },
                    data: { secret: targetSecret }
                });
                console.log("✅ Secret updated successfully!");
            } else {
                console.log("✅ Secret already matches.");
            }
        } else {
            console.log(`❌ Server ${serverId} not found in DB.`);
        }
    } catch (e) {
        console.error("💥 Error during sync:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

sync();


const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");

const prisma = new PrismaClient();

async function main() {
    console.log("🛠️  Consolidating VPN Servers...");

    const servers = await prisma.vpnServer.findMany();
    if (servers.length < 2) {
        console.log("✅ Only 1 server found. No consolidation needed.");
        return;
    }

    // Identify Good vs Bad
    // Good = Has PublicKey
    let goodServer = servers.find(s => s.publicKey && s.publicKey.length > 10);

    // Fallback: If no key, pick the first one (we will fix keys later)
    if (!goodServer) goodServer = servers[0];

    const badServers = servers.filter(s => s.id !== goodServer.id);

    console.log(`✅ Target Server: ${goodServer.name} (${goodServer.id})`);

    for (const bad of badServers) {
        console.log(`🗑️  Processing Ghost Server: ${bad.id}`);

        // 1. Move Tunnels
        const result = await prisma.vpnTunnel.updateMany({
            where: { serverId: bad.id },
            data: { serverId: goodServer.id }
        });
        console.log(`   Moved ${result.count} tunnels to Target Server.`);

        // 2. Delete Bad Server
        // Note: Relation constraints might block delete if stats/logs exist, 
        // usually cascade handles it or we delete manually.
        try {
            await prisma.vpnServer.delete({ where: { id: bad.id } });
            console.log("   Deleted Ghost Server.");
        } catch (e) {
            console.log("   Could not delete server (constraint?): " + e.message);
        }
    }

    // 3. Trigger Sync/Restart to apply changes
    console.log("🔄 Triggering Re-Sync...");
    // We can call our nuclear sync script which we know is at /app/deploy-full-sync-internal.js
    try {
        execSync("node /app/deploy-full-sync-internal.js");
    } catch (e) {
        console.log("   Sync script failed or not found.");
    }
}

main().finally(() => prisma.$disconnect());

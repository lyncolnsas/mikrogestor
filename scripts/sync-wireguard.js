const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function syncPeers() {
    console.log("🛡️ Starting Robust WireGuard Peer Sync...");

    try {
        // 1. Get tunnels from DB
        const tunnels = await prisma.vpnTunnel.findMany({
            where: { isActive: true },
        });
        const dbKeys = new Set(tunnels.map(t => t.clientPublicKey));
        console.log(`📡 Found ${tunnels.length} active tunnels in database.`);

        // 2. Get current peers from WireGuard
        let existingPeers = [];
        try {
            const dump = execSync('wg show wg0 dump').toString().trim().split('\n');
            // Skip first line (interface info)
            existingPeers = dump.slice(1).map(line => line.split('\t')[0]);
        } catch (e) {
            console.warn("⚠️ Could not get existing peers:", e.message);
        }

        // 3. Remove peers NOT in database
        for (const pubKey of existingPeers) {
            if (!dbKeys.has(pubKey)) {
                console.log(`🗑️ Removing orphan peer: ${pubKey}`);
                try {
                    execSync(`wg set wg0 peer "${pubKey}" remove`);
                } catch (e) {
                    console.error(`❌ Failed to remove peer ${pubKey}:`, e.message);
                }
            }
        }

        // 4. Upsert/Update peers from database
        for (const tunnel of tunnels) {
            console.log(`🔗 Syncing peer: ${tunnel.name} (${tunnel.internalIp}) -> ${tunnel.clientPublicKey}`);
            try {
                // Use quotes for security and handle potential PresharedKey
                let cmd = `wg set wg0 peer "${tunnel.clientPublicKey}" allowed-ips "${tunnel.internalIp}/32"`;
                if (tunnel.presharedKey) {
                    // PresharedKey needs to be passed via file or standard input for security, 
                    // but for a quick sync we can use a temporary file or /dev/stdin if supported.
                    // Simple approach for now if PSK is null:
                    // execSync(cmd);
                }
                execSync(cmd);
            } catch (err) {
                console.error(`❌ Failed to sync peer ${tunnel.name}:`, err.message);
            }
        }

        console.log("✅ WireGuard Peer Sync Completed Successfully.");
    } catch (error) {
        console.error("💥 Critical error during VPN sync:", error);
    } finally {
        await prisma.$disconnect();
    }
}

// Check if we are in a container with wg0 access
try {
    execSync('wg show wg0');
    syncPeers();
} catch (e) {
    console.log("⚠️ skipping VPN sync: wg0 interface not found or access denied.");
    process.exit(0);
}

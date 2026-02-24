
const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");
const fs = require("fs");

const prisma = new PrismaClient();

async function main() {
    console.log("🛠️  Fixing Tunnel Activation & Sync (Self-Contained)...");

    // 1. Activate ALL tunnels
    const update = await prisma.vpnTunnel.updateMany({
        data: { isActive: true }
    });
    console.log(`✅ Activated ${update.count} tunnels.`);

    // 2. Get Server and Tunnels
    const server = await prisma.vpnServer.findFirst();
    // Assuming consolidate worked, there's only 1 or we pick the one with keys
    // In fact, consolidate might have left 1 valid server.

    if (!server) { console.error("No Server!"); return; }

    const tunnels = await prisma.vpnTunnel.findMany({
        where: { isActive: true }
    });

    console.log(`ℹ️  Syncing ${tunnels.length} tunnels for server ${server.name}...`);

    // 3. Read/Ensure Private Key
    let privKey = "";
    try {
        privKey = execSync("cat /etc/wireguard/private.key").toString().trim();
    } catch {
        console.log("Generating missing keys...");
        execSync("wg genkey | tee /etc/wireguard/private.key | wg pubkey > /etc/wireguard/public.key");
        privKey = execSync("cat /etc/wireguard/private.key").toString().trim();
    }

    // 4. Build Config
    let config = `[Interface]
PrivateKey = ${privKey}
ListenPort = 51820
`;

    tunnels.forEach(t => {
        config += `
[Peer]
# Tunnel: ${t.name}
PublicKey = ${t.clientPublicKey}
AllowedIPs = ${t.internalIp}/32
`;
    });

    // 5. Write Config
    fs.writeFileSync("/etc/wireguard/wg0.conf", config);
    console.log("📝 Wrote /etc/wireguard/wg0.conf");

    // 6. Restart Interface
    console.log("🔄 Restarting Interface...");
    try {
        execSync("wg-quick down wg0");
    } catch { }

    // Sleep to ensure socket release
    execSync("sleep 1");

    try {
        execSync("wg-quick up wg0");
        console.log("✅ Interface UP!");
    } catch (e) {
        console.error("❌ Link Up Failed: " + e.message);
    }

    // 7. Verify
    try {
        console.log("\n[CURRENT PEERS]");
        console.log(execSync("wg show wg0 peers").toString());
    } catch { }
}

main().finally(() => prisma.$disconnect());

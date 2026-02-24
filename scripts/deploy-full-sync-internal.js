
const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const prisma = new PrismaClient();

async function main() {
    console.log("nuclear-sync: Starting...");

    // 1. Get Server Details
    const server = await prisma.vpnServer.findFirst();
    if (!server) throw new Error("No server found");

    console.log(`nuclear-sync: Server ${server.name} (${server.id})`);

    // 2. Fetch Peers from API (simulated via curl for consistency with environment)
    // Actually we can just query Prisma directly since we are in the same environment logic
    // But to ensure we match the API logic, let's query the DB for tunnels

    // Get Tunnels
    const tunnels = await prisma.vpnTunnel.findMany({
        where: {
            serverId: server.id,
            isActive: true
        }
    });

    console.log(`nuclear-sync: Found ${tunnels.length} active tunnels.`);

    // 3. Read Private Key from File
    let privKey = "";
    try {
        privKey = execSync("cat /etc/wireguard/private.key").toString().trim();
    } catch {
        console.log("nuclear-sync: PRIVATE KEY MISSING! Generating...");
        execSync("wg genkey | tee /etc/wireguard/private.key | wg pubkey > /etc/wireguard/public.key");
        privKey = execSync("cat /etc/wireguard/private.key").toString().trim();

        // Update DB with new public key if we regenerated
        const newPub = execSync("cat /etc/wireguard/public.key").toString().trim();
        await prisma.vpnServer.update({ where: { id: server.id }, data: { publicKey: newPub } });
    }

    // 4. Build Config Content
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
    console.log("nuclear-sync: Wrote /etc/wireguard/wg0.conf");

    // 6. Force Interface Restart
    console.log("nuclear-sync: Restarting Interface...");
    try {
        execSync("wg-quick down wg0");
    } catch { }

    // Small sleep to ensure socket release
    execSync("sleep 1");

    try {
        execSync("wg-quick up wg0");
        console.log("nuclear-sync: Interface UP!");
    } catch (e) {
        console.error("nuclear-sync: FAILED to bring up interface:");
        console.error(e.message);
    }

    // 7. Verify
    const showOut = execSync("wg show").toString();
    console.log("nuclear-sync: Current Status:");
    console.log(showOut);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());

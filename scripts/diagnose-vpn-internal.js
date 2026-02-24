
const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 DEEP DIAGNOSIS...");

    // 1. Check Peers in Interface
    try {
        console.log("\n[INTERFACE wg0 PEERS]");
        console.log(execSync("wg show wg0 peers").toString());
    } catch { console.log("wg show failed"); }

    // 2. Check Peers in DB
    console.log("\n[DB TUNNELS]");
    const tunnels = await prisma.vpnTunnel.findMany({
        where: { isActive: true },
        include: { server: true }
    });

    tunnels.forEach(t => {
        console.log(`- Tunnel: ${t.name} | ClientPubKey: ${t.clientPublicKey?.substring(0, 15)}... | Server: ${t.server?.name}`);
    });

    if (tunnels.length === 0) console.log("NO ACTIVE TUNNELS IN DB!");

    // 3. Check Server Keys
    const server = await prisma.vpnServer.findFirst();
    console.log(`\n[DB SERVER KEY]: ${server?.publicKey?.substring(0, 15)}...`);

    try {
        const diskKey = execSync("cat /etc/wireguard/public.key").toString().trim();
        console.log(`[DISK SERVER KEY]: ${diskKey.substring(0, 15)}...`);
    } catch { }

    // 4. Force one last Sync if mismatch found
    // If DB has tunnels causing mismatch, we might need to sync again/
}

main().finally(() => prisma.$disconnect());

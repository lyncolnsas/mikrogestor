
const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");
const fs = require("fs");

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 FINAL VERIFICATION...");

    // 1. DB State
    const server = await prisma.vpnServer.findFirst();
    const tunnels = await prisma.vpnTunnel.findMany({ include: { server: true } });

    console.log("\n--- DATABASE ---");
    console.log(`Server: ${server?.name} (${server?.id})`);
    console.log(`PublicKey (DB): ${server?.publicKey}`);
    console.log(`Endpoint (DB): ${server?.publicEndpoint}`);

    // Validate if endpoint is a virtual IP
    const virtualIpRanges = ['192.168.56.', '172.16.', '10.0.75.'];
    const isVirtualIp = virtualIpRanges.some(range => server?.publicEndpoint?.startsWith(range));

    if (isVirtualIp) {
        console.log(`\n⚠️  WARNING: O endpoint ${server?.publicEndpoint} parece ser um IP VIRTUAL!`);
        console.log(`💡 Execute: node scripts/auto-update-ip.js para corrigir\n`);
    }

    console.log(`Tunnels: ${tunnels.length}`);
    tunnels.forEach(t => console.log(` - ${t.name} | ClientKey: ${t.clientPublicKey?.substring(0, 10)}... | Active: ${t.isActive}`));

    // 2. Disk State
    console.log("\n--- DISK ---");
    try {
        const pub = fs.readFileSync("/etc/wireguard/public.key", "utf8").trim();
        console.log(`PublicKey (Disk): ${pub}`);
    } catch (e) { console.log("Disk PubKey Missing"); }

    // 3. Interface State
    console.log("\n--- INTERFACE (wg show) ---");
    try {
        console.log(execSync("wg show").toString());
    } catch (e) { console.log("Interface DOWN or wg command failed"); }

    // 4. Check Config File for Peer sync
    try {
        console.log("\n--- wg0.conf ---");
        console.log(execSync("cat /etc/wireguard/wg0.conf").toString());
    } catch { }
}

main().finally(() => prisma.$disconnect());

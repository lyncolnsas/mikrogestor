
const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient(); // Default env inside container works

async function main() {
    console.log("🛠️  Internal Key Fix...");

    // 1. Ensure Keys
    try {
        execSync("if [ ! -f /etc/wireguard/private.key ]; then wg genkey | tee /etc/wireguard/private.key | wg pubkey > /etc/wireguard/public.key; fi");
    } catch { }

    // 2. Read Key
    const pubKey = execSync("cat /etc/wireguard/public.key").toString().trim();
    console.log(`🔑 Real Key: ${pubKey}`);

    // 3. Ensure Config
    try {
        execSync("if [ ! -f /etc/wireguard/wg0.conf ]; then echo '[Interface]' > /etc/wireguard/wg0.conf && echo 'ListenPort = 51820' >> /etc/wireguard/wg0.conf && echo 'PrivateKey = ' $(cat /etc/wireguard/private.key) >> /etc/wireguard/wg0.conf; fi");
    } catch { }

    // 4. Up
    try {
        execSync("wg-quick up wg0 || true");
    } catch { }

    // 5. Update DB
    const server = await prisma.vpnServer.findFirst();
    if (server) {
        await prisma.vpnServer.update({
            where: { id: server.id },
            data: { publicKey: pubKey }
        });
        console.log("✅ DB Updated!");
    }
}

main().finally(() => prisma.$disconnect());

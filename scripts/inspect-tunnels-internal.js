
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Inspecting VPN Tunnels...");

    const tunnels = await prisma.vpnTunnel.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
            server: true
        }
    });

    if (tunnels.length === 0) {
        console.log("❌ No Tunnels Found.");
    }

    tunnels.forEach(t => {
        console.log("---------------------------------------------------");
        console.log(`Name: ${t.name}`);
        console.log(`ID: ${t.id}`);
        console.log(`ClientPrivKey: ${t.clientPrivateKey ? "PRESENT (" + t.clientPrivateKey.length + ")" : "MISSING"}`);
        console.log(`ClientPubKey:  ${t.clientPublicKey ? "PRESENT (" + t.clientPublicKey.length + ")" : "MISSING"}`);
        console.log(`Server: ${t.server ? "CONNECTED" : "DISCONNECTED"}`);
        if (t.server) {
            console.log(`   ServerPubKey: ${t.server.publicKey ? "PRESENT" : "MISSING"}`);
            console.log(`   ServerEndpoint: ${t.server.publicEndpoint ? "PRESENT (" + t.server.publicEndpoint + ")" : "MISSING"}`);
        }
        console.log("---------------------------------------------------");
    });
}

main().finally(() => prisma.$disconnect());

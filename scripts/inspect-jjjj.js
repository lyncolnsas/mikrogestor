
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Inspecting 'JJJJ'...");

    // Find tunnel with name containing "JJJJ" (case insensitive usually, but exact here)
    const tunnels = await prisma.vpnTunnel.findMany({
        where: { name: { contains: "JJJJ" } },
        include: { server: true }
    });

    if (tunnels.length === 0) {
        console.log("❌ Tunnel 'JJJJ' NOT FOUND in DB.");

        // List recent 3 to see what IS there
        console.log("Listing last 3 tunnels:");
        const recent = await prisma.vpnTunnel.findMany({ take: 3, orderBy: { createdAt: 'desc' } });
        recent.forEach(r => console.log(`- ${r.name} (ID: ${r.id})`));
    } else {
        tunnels.forEach(t => {
            console.log(`FOUND: ${t.name}`);
            console.log(`ServerID: ${t.serverId}`);
            console.log(`Server Linked: ${!!t.server}`);
            if (t.server) {
                console.log(`Server PubKey: ${t.server.publicKey}`);
                console.log(`Server Endpoint: ${t.server.publicEndpoint}`);
            }
            console.log(`Client PrivKey: ${t.clientPrivateKey ? "OK (" + t.clientPrivateKey.length + ")" : "MISSING"}`);
            // keys should be ~44 chars
        });
    }
}

main().finally(() => prisma.$disconnect());

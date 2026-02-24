
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    console.log("🛠️  Updating VPN Endpoint...");

    // AUTO-DETECTED IP
    const NEW_ENDPOINT = "192.168.18.9";

    const server = await prisma.vpnServer.findFirst();

    if (!server) {
        console.error("❌ No VPN Server found.");
        return;
    }

    console.log(`Old Endpoint: ${server.publicEndpoint}`);

    await prisma.vpnServer.update({
        where: { id: server.id },
        data: { publicEndpoint: NEW_ENDPOINT }
    });

    console.log(`✅ New Endpoint: ${NEW_ENDPOINT}`);
    console.log("ℹ️  NOTE: Existing clients must re-download/scan config to get this new IP.");
}

main().finally(() => prisma.$disconnect());

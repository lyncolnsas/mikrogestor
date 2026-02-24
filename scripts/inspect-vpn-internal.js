
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient(); // Default env inside container

async function main() {
    console.log("🔍 Inspecting VPN Server Data (Internal)...");
    const server = await prisma.vpnServer.findFirst();

    if (!server) {
        console.error("❌ No Server Found!");
    } else {
        console.log("---------------------------------------------------");
        console.log(`ID: ${server.id}`);
        console.log(`Name: ${server.name}`);
        console.log(`Endpoint: "${server.publicEndpoint}"`);
        console.log(`PublicKey: "${server.publicKey}"`);
        console.log(`ListenPort: ${server.listenPort}`);
        console.log("---------------------------------------------------");
    }
}

main().finally(() => prisma.$disconnect());

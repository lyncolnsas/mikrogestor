
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace("db:5432", "localhost:5432") : undefined
        }
    }
});

async function main() {
    console.log("🔍 Inspecting VPN Server Data...");
    const server = await prisma.vpnServer.findFirst();

    if (!server) {
        console.error("❌ No Server Found!");
    } else {
        console.log("---------------------------------------------------");
        console.log(`ID: ${server.id}`);
        console.log(`Name: ${server.name}`);
        console.log(`Endpoint: "${server.publicEndpoint}" (Length: ${server.publicEndpoint ? server.publicEndpoint.length : 0})`);
        console.log(`PublicKey: "${server.publicKey}" (Length: ${server.publicKey ? server.publicKey.length : 0})`);
        console.log(`ListenPort: ${server.listenPort}`);
        console.log("---------------------------------------------------");
    }
}

main().finally(() => prisma.$disconnect());

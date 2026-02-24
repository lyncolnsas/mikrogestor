
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    console.log("🔍 Listing ALL VPN Servers...");

    const servers = await prisma.vpnServer.findMany();

    console.log(`Found ${servers.length} servers.`);

    servers.forEach(s => {
        console.log("------------------------------------------");
        console.log(`ID: ${s.id}`);
        console.log(`Name: ${s.name}`);
        console.log(`Endpoint: "${s.publicEndpoint}"`);
        console.log(`PubKey: "${s.publicKey}"`);
        console.log("------------------------------------------");
    });
}

main().finally(() => prisma.$disconnect());


const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
    console.log("🛠️ Starting Manual VPN Server Fix (JS Mode)...");

    // 1. Find the Server
    const server = await prisma.vpnServer.findFirst();

    if (!server) {
        console.error("❌ No VPN Server found in database. Please run the seed first.");
        return;
    }

    console.log(`✅ Found Server: ${server.name} (${server.id})`);

    // 2. Update with manual details
    const PUBLIC_KEY = process.argv[2] || "OEgE663SoBiBDdVzrKvy968ZHLzCyjeOxbjxqNdJFHo=";
    const ENDPOINT = "10.133.255.230";

    const updated = await prisma.vpnServer.update({
        where: { id: server.id },
        data: {
            publicEndpoint: ENDPOINT,
            publicKey: PUBLIC_KEY,
            listenPort: 51820
        }
    });

    console.log("========================================");
    console.log("✅ SERVER UPDATED SUCCESSFULLY!");
    console.log(`Endpoint: ${updated.publicEndpoint}`);
    console.log(`Public Key: ${updated.publicKey}`);
    console.log("========================================");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

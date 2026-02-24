
const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");

// Use localhost since DNS is broken
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:mikrogestor_secure_2026@localhost:5432/mikrogestor_prod?schema=management&search_path=management,tenant_template,radius"
        }
    }
});

async function main() {
    console.log("🔍 VPN QUICK CHECK (via localhost)...\n");

    try {
        const server = await prisma.vpnServer.findFirst();
        console.log(`✅ DB Connected!`);
        console.log(`Server: ${server?.name}`);
        console.log(`Endpoint: ${server?.publicEndpoint}`);
        console.log(`DB PubKey: ${server?.publicKey?.substring(0, 20)}...`);

        const tunnels = await prisma.vpnTunnel.count({ where: { isActive: true } });
        console.log(`Active Tunnels: ${tunnels}`);

        // Check WireGuard
        try {
            const wgShow = execSync("wg show wg0").toString();
            console.log("\n--- WireGuard Interface ---");
            console.log(wgShow.substring(0, 300));
        } catch (e) {
            console.log("⚠️  WireGuard interface not active");
        }
    } catch (e) {
        console.error("❌ Error:", e.message);
    }
}

main().finally(() => prisma.$disconnect());

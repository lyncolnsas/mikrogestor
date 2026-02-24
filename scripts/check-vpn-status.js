
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL.replace("db:5432", "localhost:5432")
        }
    }
});

async function main() {
    console.log("🔍 Checking VPN Servers...");
    const servers = await prisma.vpnServer.findMany();

    if (servers.length === 0) {
        console.log("❌ No VPN Servers found in database.");
    } else {
        servers.forEach(s => {
            console.log(`\nServer: ${s.name} (ID: ${s.id})`);
            console.log(`- Active: ${s.isActive}`);
            console.log(`- Public Key: ${s.publicKey ? "✅ EXISTS" : "❌ MISSING"}`);
            console.log(`- Public Endpt: ${s.publicEndpoint || "❌ MISSING"}`);
            console.log(`- Listen Port: ${s.listenPort}`);
        });
    }

    console.log("\n🔍 Checking VPN Tunnels...");
    const tunnels = await prisma.vpnTunnel.findMany({
        include: { server: true }
    });
    console.log(`Found ${tunnels.length} tunnels.`);
    tunnels.forEach(t => {
        console.log(`- Tunnel ${t.name} -> Server: ${t.server?.name || "NULL"} (ServerKey: ${t.server?.publicKey ? "OK" : "MISSING"})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

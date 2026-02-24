
const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

// Use localhost for DB connection from host
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL ? process.env.DATABASE_URL.replace("db:5432", "localhost:5432") : undefined
        }
    }
});

async function main() {
    console.log("🛠️  Fixing VPN Handshake (Server Side)...");

    // 1. Ensure WireGuard Tools
    try {
        console.log("📦 Checking/Installing WireGuard tools...");
        execSync("docker exec mikrogestor_app apk add --no-cache wireguard-tools iproute2");
    } catch (e) {
        console.log("⚠️  Could not install tools (might already be there or no internet)");
    }

    // 2. Generate Keys if missing
    console.log("🔑 Checking Keys...");
    try {
        // This command creates keys only if private.key doesn't exist
        const cmd = `docker exec mikrogestor_app sh -c "mkdir -p /etc/wireguard && if [ ! -f /etc/wireguard/private.key ]; then wg genkey | tee /etc/wireguard/private.key | wg pubkey > /etc/wireguard/public.key; fi"`;
        execSync(cmd);
    } catch (e) {
        console.error("❌ Key generation failed:", e.message);
        process.exit(1);
    }

    // 3. Read the REAL Public Key
    let realPublicKey = "";
    try {
        const out = execSync("docker exec mikrogestor_app cat /etc/wireguard/public.key");
        // Trim whitespace/newlines very aggressively to avoid DB format errors
        realPublicKey = out.toString().trim().replace(/(\r\n|\n|\r)/gm, "");
        console.log(`✅ Real Server Public Key: ${realPublicKey}`);

        if (realPublicKey.length < 10) {
            throw new Error("Key too short, probably failed.");
        }
    } catch (e) {
        console.error("❌ Could not read public key");
        process.exit(1);
    }

    // 4. Create Minimal Config (wg0.conf) to allow interface to come UP
    console.log("📝 Creating minimal wg0.conf...");
    const setupConfCmd = `docker exec mikrogestor_app sh -c "if [ ! -f /etc/wireguard/wg0.conf ]; then echo '[Interface]' > /etc/wireguard/wg0.conf && echo 'ListenPort = 51820' >> /etc/wireguard/wg0.conf && echo 'PrivateKey = \$(cat /etc/wireguard/private.key)' >> /etc/wireguard/wg0.conf; fi"`;
    try {
        execSync(setupConfCmd);
    } catch (e) {
        console.warn("⚠️  Could not create wg0.conf (might exist)");
    }

    // 5. Start Interface
    console.log("🚀 Starting WireGuard Interface...");
    try {
        // Try to bring up. If it fails (already up), restart.
        execSync("docker exec mikrogestor_app sh -c \"wg-quick up wg0 || (wg-quick down wg0 && wg-quick up wg0)\"");
        console.log("✅ Interface is UP.");
    } catch (e) {
        console.error("⚠️  Failed to start wg0 interface. Is the container privileged? (NET_ADMIN)");
        console.error(e.message);
    }

    // 6. Update Database
    console.log("💾 Updating Database with REAL Key...");
    const server = await prisma.vpnServer.findFirst();
    if (server) {
        await prisma.vpnServer.update({
            where: { id: server.id },
            data: {
                publicKey: realPublicKey,
                // Ensure listen port matches
                listenPort: 51820
            }
        });
        console.log("✅ Database Updated!");
    } else {
        console.error("❌ No VPN Server found in DB to update.");
    }

    console.log("\n IMPORTANT: The Server Key has changed. The User MUST re-scan the QR Code.");
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());

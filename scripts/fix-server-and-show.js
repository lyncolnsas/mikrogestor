
const { PrismaClient } = require('@prisma/client');
const crypto = require('node:crypto');

const prisma = new PrismaClient();

const ALGORITHM = 'aes-256-gcm';
const APP_SECRET = process.env.APP_SECRET || 'mikrogestor_secure_secret_2026_vpn_key';
const SECRET_KEY = Buffer.from(APP_SECRET, 'utf-8').subarray(0, 32);

function decrypt(encryptedText) {
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) return encryptedText;
        const [ivHex, authTagHex, contentHex] = parts;
        const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
        let decrypted = decipher.update(contentHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error("Decryption error:", e.message);
        return encryptedText;
    }
}

async function main() {
    const serverId = "default-ca-sync-01";
    const actualServerPubKey = "Z8xAa5mngEFG+PKx3Smu+k8ULvRZJSzNwKH9sIoAVSo=";

    console.log("🛠️ Updating Server Public Key in DB...");
    await prisma.vpnServer.update({
        where: { id: serverId },
        data: { publicKey: actualServerPubKey }
    });
    console.log("✅ DB Updated.");

    const ip = "10.255.0.3";
    const tunnel = await prisma.vpnTunnel.findFirst({
        where: { internalIp: ip },
        include: { server: true }
    });

    if (tunnel) {
        const priv = decrypt(tunnel.clientPrivateKey);
        console.log("\n=== CORRECT CLIENT CONFIG (10.255.0.3) ===");
        console.log(`[Interface]
PrivateKey = ${priv}
Address = ${tunnel.internalIp}/32
DNS = 1.1.1.1

[Peer]
PublicKey = ${actualServerPubKey}
Endpoint = ${tunnel.server.publicEndpoint}:${tunnel.server.listenPort}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`);
        console.log("==========================================\n");
    }
}

main().finally(() => prisma.$disconnect());

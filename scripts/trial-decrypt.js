
const { PrismaClient } = require('@prisma/client');
const crypto = require('node:crypto');

const prisma = new PrismaClient();

const ALGORITHM = 'aes-256-gcm';
const POTENTIAL_SECRETS = [
    'mikrogestor_secure_secret_2026_vpn_key',
    'a_very_insecure_default_key_32_chars__'
];

function decrypt(encryptedText, secret) {
    try {
        const secretKey = Buffer.from(secret, 'utf-8').subarray(0, 32);
        const parts = encryptedText.split(':');
        if (parts.length !== 3) return null;
        const [ivHex, authTagHex, contentHex] = parts;
        const decipher = crypto.createDecipheriv(ALGORITHM, secretKey, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
        let decrypted = decipher.update(contentHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return null;
    }
}

async function main() {
    const ip = "10.255.0.3";
    const tunnel = await prisma.vpnTunnel.findFirst({
        where: { internalIp: ip },
        include: { server: true }
    });

    if (!tunnel) {
        console.log("Tunnel not found.");
        return;
    }

    console.log(`Testing decryption for tunnel ${tunnel.id}...`);
    for (const secret of POTENTIAL_SECRETS) {
        const result = decrypt(tunnel.clientPrivateKey, secret);
        if (result) {
            console.log(`✅ SUCCESS with secret: ${secret}`);
            console.log(`Private Key: ${result}`);

            console.log("\n=== FINAL CONFIG (USE THIS) ===");
            console.log(`[Interface]
PrivateKey = ${result}
Address = ${tunnel.internalIp}/32
DNS = 1.1.1.1

[Peer]
PublicKey = Z8xAa5mngEFG+PKx3Smu+k8ULvRZJSzNwKH9sIoAVSo=
Endpoint = ${tunnel.server.publicEndpoint}:${tunnel.server.listenPort}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`);
            return;
        } else {
            console.log(`❌ Failed with secret: ${secret}`);
        }
    }
    console.log("💥 Could not decrypt with any known secret.");
}

main().finally(() => prisma.$disconnect());

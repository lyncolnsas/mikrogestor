
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
        return encryptedText;
    }
}

async function main() {
    const ip = "10.255.0.3";
    const tunnel = await prisma.vpnTunnel.findFirst({
        where: { internalIp: ip },
        include: { server: true }
    });

    if (!tunnel) {
        console.log("PC Tunnel (10.255.0.3) not found.");
        return;
    }

    const privateKey = decrypt(tunnel.clientPrivateKey);

    const config = `[Interface]
PrivateKey = ${privateKey}
Address = ${tunnel.internalIp}/32
DNS = 1.1.1.1

[Peer]
PublicKey = ${tunnel.server.publicKey}
Endpoint = ${tunnel.server.publicEndpoint}:${tunnel.server.listenPort}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
`;

    console.log("=== WIREGUARD PC CONFIGURATION ===");
    console.log(config);
    console.log("===================================");
}

main().finally(() => prisma.$disconnect());

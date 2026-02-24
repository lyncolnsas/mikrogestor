
const { PrismaClient } = require('@prisma/client');
const { generateKeyPairSync } = require('node:crypto');
const crypto = require('node:crypto');

const prisma = new PrismaClient();

// Encryption settings from VpnKeyService (must match)
const ALGORITHM = 'aes-256-gcm';
const APP_SECRET = process.env.APP_SECRET || 'mikrogestor_secure_secret_2026_vpn_key';
const SECRET_KEY = Buffer.from(APP_SECRET, 'utf-8').subarray(0, 32);

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function isCorrupted(key) {
    // FORCE REPAIR: We suspect keys might be invalid even if they meet format requirements 
    // due to encryption mismatches with APP_SECRET.
    return true;
}

function generateNewKeypair() {
    const { publicKey, privateKey } = generateKeyPairSync('x25519', {
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' }
    });
    const pubBase64 = publicKey.slice(-32).toString('base64');
    const privBase64 = privateKey.slice(-32).toString('base64');
    const encryptedPriv = encrypt(privBase64);
    return { publicKey: pubBase64, privateKey: encryptedPriv };
}

async function repair() {
    console.log("🔍 Scanning for corrupted VPN tunnels...");
    try {
        const tunnels = await prisma.vpnTunnel.findMany({
            where: { isActive: true }
        });

        console.log(`📊 Found ${tunnels.length} active tunnels.`);
        let repairedCount = 0;

        for (const tunnel of tunnels) {
            if (isCorrupted(tunnel.clientPublicKey)) {
                console.log(`🛠️ Repairing: ${tunnel.name} (IP: ${tunnel.internalIp})`);
                const newKeys = generateNewKeypair();

                await prisma.vpnTunnel.update({
                    where: { id: tunnel.id },
                    data: {
                        clientPublicKey: newKeys.publicKey,
                        clientPrivateKey: newKeys.privateKey,
                        needsSync: true
                    }
                });
                console.log(`   ✅ New Public Key: ${newKeys.publicKey}`);
                repairedCount++;
            }
        }
        console.log(`\n🎉 Total repaired: ${repairedCount} tunnels.`);
    } catch (err) {
        console.error("💥 Error during repair:", err);
    } finally {
        await prisma.$disconnect();
    }
}

repair();

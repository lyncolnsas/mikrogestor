
import { PrismaClient } from "@prisma/client";
import { generateKeyPairSync } from "node:crypto";
import { VpnKeyService } from "../src/modules/saas/vpn-key.service";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Script used to detect and fix VPN tunnels with corrupted or non-standard keys.
 * Corrupted tunnels are those where the public key is not a 44-character Base64 string.
 */

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

function isCorrupted(key: string): boolean {
    if (!key) return true;
    // Standard WireGuard public key is 44 characters (Base64)
    if (key.length !== 44) return true;
    if (!key.endsWith('=')) return true;
    return false;
}

function generateNewKeypair() {
    const { publicKey, privateKey } = generateKeyPairSync('x25519', {
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' }
    });

    const pubBase64 = publicKey.slice(-32).toString('base64');
    const privBase64 = privateKey.slice(-32).toString('base64');

    // Encrypt the private key as expected by the service
    const encryptedPriv = VpnKeyService.encrypt(privBase64);

    return { publicKey: pubBase64, privateKey: encryptedPriv };
}

async function repair() {
    console.log("🔍 Scanning for corrupted VPN tunnels in schema 'management'...");

    // We use raw query or findMany depends on tenancy, but VpnTunnel is shared
    const tunnels = await prisma.vpnTunnel.findMany({
        where: { isActive: true }
    });

    console.log(`📊 Found ${tunnels.length} active tunnels.`);
    let repairedCount = 0;

    for (const tunnel of tunnels) {
        if (isCorrupted(tunnel.clientPublicKey)) {
            console.log(`🛠️ Repairing corrupted tunnel: ${tunnel.name} (IP: ${tunnel.internalIp}, ID: ${tunnel.id})`);
            console.log(`   Old Public Key: ${tunnel.clientPublicKey}`);

            const newKeys = generateNewKeypair();

            await prisma.vpnTunnel.update({
                where: { id: tunnel.id },
                data: {
                    clientPublicKey: newKeys.publicKey,
                    clientPrivateKey: newKeys.privateKey,
                    needsSync: true
                }
            });

            console.log(`   ✅ Repaired with new Public Key: ${newKeys.publicKey}`);
            repairedCount++;
        }
    }

    if (repairedCount > 0) {
        console.log(`\n🎉 Total repaired: ${repairedCount} tunnels.`);
        console.log("👉 IMPORTANT: Run 'node scripts/sync-wireguard.js' inside the container next.");
        console.log("👉 IMPORTANT: Affected users MUST download/scan a new QR code.");
    } else {
        console.log("✅ No corrupted tunnels found.");
    }
}

repair()
    .catch(console.error)
    .finally(() => prisma.$disconnect());


import { PrismaClient } from '@prisma/client';
import { VpnKeyService } from '../modules/saas/vpn-key.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Force use of port 5434 as found in .env.local
const DATABASE_URL = "postgresql://postgres:mikrogestor_secure_2026@127.0.0.1:5434/mikrogestor_prod?search_path=management,tenant_template,radius";

const prisma = new PrismaClient({
    datasources: {
        db: { url: DATABASE_URL }
    }
});

async function main() {
    console.log("--- VPN CONFIGURATION AUDIT ---");
    console.log("VPN_HOST from env:", process.env.VPN_HOST);

    const servers = await prisma.vpnServer.findMany();
    console.log(`\nFound ${servers.length} servers:`);
    for (const server of servers) {
        console.log(`- ${server.name} (ID: ${server.id})`);
        console.log(`  Endpoint: ${server.publicEndpoint}:${server.listenPort}`);
        console.log(`  PublicKey: ${server.publicKey}`);
    }

    const tunnels = await prisma.vpnTunnel.findMany({
        where: { isActive: true },
        include: { server: true }
    }) as any[];

    console.log(`\nAudit of all active tunnels (${tunnels.length}):`);
    for (const tunnel of tunnels) {
        let status = "OK";
        if (tunnel.protocol === "WIREGUARD") {
            try {
                if (tunnel.clientPrivateKey) {
                    VpnKeyService.decrypt(tunnel.clientPrivateKey);
                } else {
                    status = "MISSING_KEY";
                }
            } catch (e: any) {
                status = `DECRYPT_FAILED (${e.message})`;
            }
        } else {
            status = `PROTOCOL_${tunnel.protocol}`;
            if (!tunnel.vpnUsername) status += " (NO_USER)";
        }

        console.log(`- [${status}] Tunnel ${tunnel.id} - ${tunnel.name} (IP: ${tunnel.internalIp})`);
        console.log(`  Server: ${tunnel.server.name} (${tunnel.server.publicEndpoint})`);
    }
}

main()
    .catch(e => {
        console.error("Audit failed:", e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

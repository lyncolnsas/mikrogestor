
import { PrismaClient } from '@prisma/client';

// Manually override DATABASE_URL for local execution if it points to docker service
const originalUrl = process.env.DATABASE_URL || '';
let dbUrl = originalUrl;

if (dbUrl.includes('@db:5432')) {
    console.log("Detected Docker internal host 'db'. Replacing with 'localhost' for local script execution...");
    dbUrl = dbUrl.replace('@db:5432', '@localhost:5432');
    process.env.DATABASE_URL = dbUrl;
}

const prisma = new PrismaClient();

import fs from 'fs';

function logToFile(message: string) {
    console.log(message);
    fs.appendFileSync('vpn_diag_output.txt', message + '\n');
}

async function main() {
    fs.writeFileSync('vpn_diag_output.txt', ''); // Clear file
    logToFile("Starting diagnostic...");

    // 1. Check ALL Servers
    try {
        const servers = await prisma.vpnServer.findMany();
        logToFile(`Found ${servers.length} servers.`);
        servers.forEach(s => {
            logToFile(`SERVER [${s.id}] Name="${s.name}" Endpoint="${s.publicEndpoint}" KeyLength=${s.publicKey?.length} Key="${s.publicKey}"`);
        });
    } catch (e: any) {
        logToFile(`Error fetching servers: ${e.message}`);
    }

    // 2. Check ALL Tunnels with relation
    try {
        const tunnels = await prisma.vpnTunnel.findMany({
            include: { server: true }
        });
        logToFile(`Found ${tunnels.length} tunnels.`);

        tunnels.forEach(t => {
            logToFile(`TUNNEL [${t.id}] Tenant="${t.tenantId}" Name="${t.name}"`);
            logToFile(`  -> Linked Server ID: ${t.serverId}`);
            if (t.server) {
                logToFile(`  -> Server Loaded: YES. Name="${t.server.name}" Key="${t.server.publicKey}"`);
            } else {
                logToFile(`  -> Server Loaded: NO (Relation missing or null)`);
            }
        });
    } catch (e: any) {
        logToFile(`Error fetching tunnels: ${e.message}`);
    }
}

main()
    .catch(e => console.error("FATAL ERROR:", e))
    .finally(async () => {
        await prisma.$disconnect();
    });

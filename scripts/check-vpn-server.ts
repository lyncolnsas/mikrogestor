import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Manual .env loading
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
            if (key && !key.startsWith('#')) {
                process.env[key] = value;
            }
        }
    });
}

function log(msg: string) {
    console.log(msg);
    fs.appendFileSync('debug_output.txt', msg + '\n');
}

const prisma = new PrismaClient({
    log: ['error', 'warn']
});

async function main() {
    fs.writeFileSync('debug_output.txt', 'Starting debug...\n');
    let dbUrl = process.env.DATABASE_URL;
    log(`DATABASE_URL defined: ${!!dbUrl}`);

    if (dbUrl) {
        // Fix for running script outside docker: replace 'db' host with 'localhost'
        if (dbUrl.includes('@db:5432')) {
            log("Detected Docker internal host 'db'. Replacing with 'localhost' for local script execution...");
            dbUrl = dbUrl.replace('@db:5432', '@localhost:5432');
            process.env.DATABASE_URL = dbUrl;
        }
        log(`DATABASE_URL starts with: ${dbUrl.substring(0, 20)}...`);
    }

    // FORCE connection string for Prisma Client instance
    // Note: PrismaClient reads from process.env by default, but we can try to force it if needed.
    // Actually, modifying process.env before instantiation (or re-instantiation) is safer.

    try {
        log("Connecting...");
        await prisma.$connect();
        log("Connected.");

        log("Testing raw query...");
        await prisma.$queryRaw`SELECT 1`;
        log("Raw query success.");

        log("Fetching VPN Servers...");
        const servers = await prisma.vpnServer.findMany();
        // List Servers
        try {
            const servers = await prisma.vpnServer.findMany();
            log("--- VPN SERVERS ---");
            servers.forEach(s => {
                log(`ID: ${s.id}`);
                log(`Name: ${s.name}`);
                log(`Endpoint: ${s.publicEndpoint}:${s.listenPort}`);
                log(`PublicKey: ${s.publicKey}`);
                log("-------------------");
            });
        } catch (e: any) {
            log(`Error fetching servers: ${e.message}`);
        }

        // List Tunnels
        try {
            const tunnels = await prisma.vpnTunnel.findMany({
                select: {
                    id: true,
                    tenantId: true,
                    serverId: true,
                    server: {
                        select: {
                            name: true,
                            publicKey: true
                        }
                    }
                }
            });

            log("--- VPN TUNNELS ---");
            tunnels.forEach(t => {
                log(`Tunnel ID: ${t.id}`);
                log(`Tenant ID: ${t.tenantId}`);
                log(`Server ID: ${t.serverId}`);
                log(`Server Name: ${t.server?.name ?? 'N/A'}`);
                log(`Server Public Key: ${t.server?.publicKey ?? 'MISSING/NULL'}`);
                log("-------------------");
            });
        } catch (e: any) {
            log(`Error fetching tunnels: ${e.message}`);
        }
    } catch (e: any) {
        log("ERROR OCCURRED:");
        log(e.message);
        log(e.stack);
    }
}

main()
    .catch(e => log(e.message))
    .finally(async () => {
        await prisma.$disconnect();
    });

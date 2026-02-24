
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("--- VPN SERVERS ---");
    const servers = await prisma.vpnServer.findMany({
        include: {
            _count: { select: { tunnels: true } }
        }
    });
    console.table(servers.map(s => ({
        id: s.id,
        name: s.name,
        endpoint: s.publicEndpoint,
        port: s.listenPort,
        active: s.isActive,
        tunnels: s._count.tunnels
    })));

    console.log("\n--- MOBILE TUNNELS ---");
    const tunnels = await prisma.vpnTunnel.findMany({
        where: { type: 'MOBILE' },
        take: 5,
        orderBy: { createdAt: 'desc' }
    });
    console.table(tunnels.map(t => ({
        id: t.id,
        name: t.name,
        ip: t.internalIp,
        server: t.serverId,
        active: t.isActive,
        handshake: t.lastHandshake
    })));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

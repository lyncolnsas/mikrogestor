import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkVpnInfrastructure() {
    console.log('🔍 VPN Infrastructure Diagnostic\n');
    console.log('='.repeat(60));

    try {
        // 1. Check VPN Servers
        console.log('\n📡 VPN SERVERS:');
        const servers = await prisma.vpnServer.findMany({
            include: {
                _count: { select: { tunnels: true } }
            }
        });

        if (servers.length === 0) {
            console.log('❌ NO VPN SERVERS REGISTERED!');
            console.log('   This is the root cause - the system needs at least one VPN server.');
        } else {
            servers.forEach(server => {
                console.log(`\n  Server: ${server.name} (${server.id})`);
                console.log(`  Active: ${server.isActive ? '✅' : '❌'}`);
                console.log(`  Public Key: ${server.publicKey || '❌ MISSING'}`);
                console.log(`  Endpoint: ${server.publicEndpoint || '❌ MISSING'}`);
                console.log(`  Port: ${server.listenPort}`);
                console.log(`  Tunnels: ${server._count.tunnels}/${server.capacityLimit}`);
            });
        }

        // 2. Check VPN Tunnels
        console.log('\n\n🔌 VPN TUNNELS:');
        const tunnels = await prisma.vpnTunnel.findMany({
            include: {
                tenant: { select: { name: true } },
                server: { select: { name: true, publicEndpoint: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        if (tunnels.length === 0) {
            console.log('  No tunnels created yet.');
        } else {
            tunnels.forEach(tunnel => {
                console.log(`\n  Tunnel: ${tunnel.name} (${tunnel.type})`);
                console.log(`  Tenant: ${tunnel.tenant?.name || 'VUL / ADMINISTRATIVO'}`);
                console.log(`  Server: ${tunnel.server.name}`);
                console.log(`  Internal IP: ${tunnel.internalIp}`);
                console.log(`  Active: ${tunnel.isActive ? '✅' : '❌'}`);
                console.log(`  Server Endpoint: ${tunnel.server.publicEndpoint || '❌ MISSING'}`);
            });
        }

        // 3. Check Environment Variables
        console.log('\n\n⚙️  ENVIRONMENT VARIABLES:');
        console.log(`  VPN_AUTO_REGISTER: ${process.env.VPN_AUTO_REGISTER || '❌ NOT SET'}`);
        console.log(`  VPN_SERVER_ID: ${process.env.VPN_SERVER_ID || '❌ NOT SET'}`);
        console.log(`  VPN_PUBLIC_ENDPOINT: ${process.env.VPN_PUBLIC_ENDPOINT || '❌ NOT SET'}`);
        console.log(`  VPN_SERVER_SECRET: ${process.env.VPN_SERVER_SECRET ? '✅ SET' : '❌ NOT SET'}`);

        // 4. Recommendations
        console.log('\n\n💡 RECOMMENDATIONS:');
        if (servers.length === 0) {
            console.log('  1. ❌ CRITICAL: No VPN server registered!');
            console.log('     → The app should auto-register on startup if VPN_AUTO_REGISTER=true');
            console.log('     → Check if the auto-registration code is running');
        }

        const missingEndpoint = servers.some(s => !s.publicEndpoint);
        if (missingEndpoint) {
            console.log('  2. ❌ CRITICAL: Server missing public endpoint!');
            console.log('     → Set VPN_PUBLIC_ENDPOINT in .env or docker-compose.yml');
            console.log('     → For local testing: use your LAN IP (e.g., 192.168.1.100)');
            console.log('     → For production: use your VPS public IP');
        }

        const missingKeys = servers.some(s => !s.publicKey);
        if (missingKeys) {
            console.log('  3. ❌ CRITICAL: Server missing public key!');
            console.log('     → Keys should be auto-generated on first registration');
        }

        console.log('\n' + '='.repeat(60));

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkVpnInfrastructure();

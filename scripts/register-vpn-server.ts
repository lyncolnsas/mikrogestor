import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

/**
 * Script para registrar manualmente o servidor VPN no banco de dados
 * Útil para desenvolvimento local e troubleshooting
 */
async function registerVpnServer() {
    console.log('🚀 VPN Server Manual Registration\n');
    console.log('='.repeat(60));

    try {
        // Configuração do servidor
        const serverId = process.env.VPN_SERVER_ID || 'default-ca-sync-01';
        const serverSecret = process.env.VPN_SERVER_SECRET || 'ca-dev-secret-2025';
        const vpnHost = process.env.VPN_HOST || process.env.VPN_PUBLIC_ENDPOINT || 'auto';
        const vpnPort = process.env.VPN_PORT || '51820';

        console.log(`\n📋 Configuration:`);
        console.log(`   Server ID: ${serverId}`);
        console.log(`   VPN Host: ${vpnHost}`);
        console.log(`   VPN Port: ${vpnPort}`);

        // Ler chave pública do servidor
        let publicKey: string;
        try {
            const keyPath = join(process.cwd(), 'docker', 'wireguard', 'public.key');
            publicKey = readFileSync(keyPath, 'utf-8').trim();
            console.log(`\n🔑 Public Key: ${publicKey.substring(0, 20)}...`);
        } catch (error) {
            // Fallback: tentar ler do config/wireguard
            try {
                const keyPath = join(process.cwd(), 'config', 'wireguard', 'server', 'publickey-server');
                publicKey = readFileSync(keyPath, 'utf-8').trim();
                console.log(`\n🔑 Public Key (from config): ${publicKey.substring(0, 20)}...`);
            } catch (e) {
                console.error('❌ ERROR: Could not read public key from either location');
                console.error('   Tried: docker/wireguard/public.key');
                console.error('   Tried: config/wireguard/server/publickey-server');
                throw e;
            }
        }

        // Determinar endpoint público
        let publicEndpoint: string;
        if (vpnHost === 'auto') {
            console.log('\n🌐 Auto-detecting public endpoint...');
            // Para desenvolvimento local, usar IP da rede local
            const { networkInterfaces } = await import('os');
            const nets = networkInterfaces();
            let localIp = '127.0.0.1';

            for (const name of Object.keys(nets)) {
                for (const net of nets[name]!) {
                    // Pular endereços internos e não IPv4
                    if (net.family === 'IPv4' && !net.internal) {
                        localIp = net.address;
                        break;
                    }
                }
            }

            publicEndpoint = `${localIp}:${vpnPort}`;
            console.log(`   Detected: ${publicEndpoint}`);
        } else {
            publicEndpoint = vpnHost.includes(':') ? vpnHost : `${vpnHost}:${vpnPort}`;
            console.log(`\n🌐 Using configured endpoint: ${publicEndpoint}`);
        }

        // Verificar se servidor já existe
        const existing = await prisma.vpnServer.findUnique({
            where: { id: serverId }
        });

        if (existing) {
            console.log(`\n📡 Server already exists. Updating...`);
            const updated = await prisma.vpnServer.update({
                where: { id: serverId },
                data: {
                    publicKey,
                    publicEndpoint,
                    isActive: true
                }
            });

            console.log(`\n✅ Server updated successfully!`);
            console.log(`   Name: ${updated.name}`);
            console.log(`   Endpoint: ${updated.publicEndpoint}`);
            console.log(`   Active: ${updated.isActive}`);
        } else {
            console.log(`\n📡 Creating new server...`);
            const created = await prisma.vpnServer.create({
                data: {
                    id: serverId,
                    secret: serverSecret,
                    name: 'Servidor VPN Principal',
                    publicKey,
                    publicEndpoint,
                    listenPort: 51820,
                    capacityLimit: 1000,
                    isActive: true
                }
            });

            console.log(`\n✅ Server created successfully!`);
            console.log(`   ID: ${created.id}`);
            console.log(`   Name: ${created.name}`);
            console.log(`   Endpoint: ${created.publicEndpoint}`);
            console.log(`   Capacity: ${created.capacityLimit}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('🎉 VPN Server registration complete!\n');

    } catch (error) {
        console.error('\n❌ Registration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

registerVpnServer();

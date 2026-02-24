import { prisma } from "@/lib/prisma";
import Redis from "ioredis";
import { WhatsAppInstanceManager } from "@/modules/whatsapp/whatsapp.manager";

export type HealthStatus = 'ONLINE' | 'ERROR' | 'OFFLINE';

export interface ServiceHealth {
    status: HealthStatus;
    message: string;
    details?: any;
}

export interface SystemHealth {
    database: ServiceHealth;
    redis: ServiceHealth;
    whatsapp: ServiceHealth;
    vpnServers: ServiceHealth;
    timestamp: string;
}

export class HealthService {
    /**
     * Performs a full health check of all critical services
     */
    static async getHealth(): Promise<SystemHealth> {
        const [database, redis, whatsapp, vpnServers] = await Promise.all([
            this.checkDatabase(),
            this.checkRedis(),
            this.checkWhatsApp(),
            this.checkVpnServers()
        ]);

        return {
            database,
            redis,
            whatsapp,
            vpnServers,
            timestamp: new Date().toISOString()
        };
    }

    private static async checkDatabase(): Promise<ServiceHealth> {
        try {
            const start = Date.now();
            await prisma.$queryRaw`SELECT 1`;
            const latency = Date.now() - start;
            return {
                status: 'ONLINE',
                message: `Conectado (${latency}ms)`
            };
        } catch (e: any) {
            return {
                status: 'ERROR',
                message: 'Erro de conexão com PostgreSQL'
            };
        }
    }

    private static async checkRedis(): Promise<ServiceHealth> {
        let redis: Redis | null = null;
        try {
            redis = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                connectTimeout: 2000,
                maxRetriesPerRequest: 0,
            });
            const ping = await redis.ping();
            if (ping === 'PONG') {
                return { status: 'ONLINE', message: 'Conectado' };
            }
            return { status: 'ERROR', message: 'Sem resposta do Redis' };
        } catch (e: any) {
            return { status: 'ERROR', message: 'Erro de conexão com Redis' };
        } finally {
            if (redis) {
                redis.disconnect();
            }
        }
    }

    private static async checkWhatsApp(): Promise<ServiceHealth> {
        try {
            const manager = WhatsAppInstanceManager.getInstance();
            const activeCount = manager.getActiveCount();
            return {
                status: 'ONLINE',
                message: `${activeCount} sessões ativas`,
                details: { activeCount }
            };
        } catch (e: any) {
            return { status: 'ERROR', message: 'Erro no Gerenciador WhatsApp' };
        }
    }

    private static async checkVpnServers(): Promise<ServiceHealth> {
        try {
            // 1. Check Database for configured servers
            const servers = await prisma.vpnServer.findMany({
                where: { isActive: true },
                select: { id: true, name: true, publicEndpoint: true }
            });

            // 2. REAL CHECK: Verify if WireGuard kernel module is accessible
            // Since we are in the same network namespace and have NET_ADMIN, this should work.
            const { exec } = await import("child_process");
            const util = await import("util");
            const execAsync = util.promisify(exec);

            try {
                // 'wg show' lists interfaces. If it runs without error, VPN is UP.
                await execAsync("wg show");
            } catch (wgError) {
                console.error("WireGuard check failed:", wgError);
                return {
                    status: 'ERROR',
                    message: 'Erro no Kernel WireGuard (Permissão ou Módulo ausente)'
                };
            }

            if (servers.length === 0) {
                return { status: 'OFFLINE', message: 'Nenhum servidor VPN configurado' };
            }

            return {
                status: 'ONLINE',
                message: `${servers.length} servidores ativos`,
                details: servers.map(s => ({ id: s.id, name: s.name }))
            };
        } catch (e: any) {
            return { status: 'ERROR', message: 'Erro ao consultar servidores VPN' };
        }
    }
}

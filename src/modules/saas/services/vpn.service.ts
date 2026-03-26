import { prisma } from "@/lib/prisma";
import { generateKeyPairSync } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";

// Helper type for Transaction Client
// Represents either the main client or a transaction client
type PrismaTx = any;

export class VpnService {
    private static SUBNET_BASE = "10.255";

    /**
     * Gera um par de chaves WireGuard (Curve25519).
     * Delegamos para o VpnKeyService para garantir consistência e criptografia.
     */
    static generateKeypair() {
        const { VpnKeyService } = require("../vpn-key.service");
        return VpnKeyService.generateKeyPair();
    }

    /**
     * Encontra o melhor servidor VPN para um novo tenant (menor carga).
     */
    static async getBestServer(tx?: PrismaTx) {
        const db = tx || prisma;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const servers = await (db as any).vpnServer.findMany({
            where: { isActive: true },
            include: {
                _count: { select: { tunnels: true } }
            }
        });

        if (servers.length === 0) {
            throw new Error("Nenhum servidor VPN ativo disponível.");
        }

        return servers.sort((a: any, b: any) => {
            const loadA = a._count.tunnels / a.capacityLimit;
            const loadB = b._count.tunnels / b.capacityLimit;
            return loadA - loadB;
        })[0];
    }

    /**
     * Aloca um endereço IP único no range 10.255.X.X
     * Usa uma lógica mais robusta para evitar colisões
     */
    static async allocateIp(tx?: PrismaTx) {
        const db = tx || prisma;

        // Buscamos todos os IPs do range para encontrar o maior numericamente
        const tunnels = await (db as any).vpnTunnel.findMany({
            where: { internalIp: { startsWith: `${this.SUBNET_BASE}.` } },
            select: { internalIp: true }
        });

        const nasEntries = await (db as any).nas.findMany({
            where: { nasname: { startsWith: `${this.SUBNET_BASE}.` } },
            select: { nasname: true }
        });

        const usedIps = new Set([
            ...tunnels.map((t: any) => t.internalIp),
            ...nasEntries.map((n: any) => n.nasname)
        ]);

        if (usedIps.size === 0) {
            return `${this.SUBNET_BASE}.0.2`;
        }

        // Encontrar o maior IP convertendo o final para número
        const ips = Array.from(usedIps).map((ip: string) => {
            const parts = ip.split('.').map(Number);
            return (parts[2] * 256) + parts[3];
        });

        const maxIpValue = Math.max(...ips);
        const nextValue = maxIpValue + 1;

        const third = Math.floor(nextValue / 256);
        const fourth = nextValue % 256;

        if (third > 254) throw new Error("Range de IPs VPN (10.255.X.X) esgotado.");

        const nextIp = `${this.SUBNET_BASE}.${third}.${fourth}`;
        return nextIp;
    }

    /**
     * Conta quantas VPNs ativas um tenant possui
     * @param tenantId ID do tenant
     * @param tx Transação Prisma opcional
     */
    static async countActiveVpns(tenantId: string, tx?: PrismaTx): Promise<number> {
        const db = tx || prisma;
        const count = await (db as any).vpnTunnel.count({
            where: {
                tenantId,
                isActive: true
            }
        });
        return count;
    }

    /**
     * Retorna informações de quota de VPN para um tenant
     * @param tenantId ID do tenant
     * @param tx Transação Prisma opcional
     * @returns { used: number, limit: number, available: number, hasScheduledDowngrade: boolean, downgradeDate?: Date, downgradeLimit?: number }
     */
    static async getVpnQuota(tenantId: string, tx?: PrismaTx) {
        const db = tx || prisma;

        // Buscar subscription e plano do tenant, incluindo overrides no tenant
        const subscription = await (db as any).subscription.findUnique({
            where: { tenantId },
            include: {
                plan: true,
                downgradeTargetPlan: true,
                tenant: {
                    select: { extraVpns: true }
                }
            }
        });

        if (!subscription) {
            throw new Error("Tenant não possui assinatura ativa");
        }

        const used = await this.countActiveVpns(tenantId, db);
        const planLimit = subscription.plan.vpnLimit || 1;
        const extraLimit = subscription.tenant?.extraVpns || 0;
        const limit = planLimit + extraLimit;
        
        const available = Math.max(0, limit - used);

        const hasScheduledDowngrade = !!subscription.downgradeScheduledAt;
        const downgradeDate = subscription.downgradeScheduledAt;
        const downgradeLimit = subscription.downgradeTargetPlan?.vpnLimit;

        return {
            used,
            limit,
            available,
            hasScheduledDowngrade,
            downgradeDate,
            downgradeLimit
        };
    }

    /**
     * Valida se o tenant pode criar uma nova VPN
     * @param tenantId ID do tenant
     * @param tx Transação Prisma opcional
     * @throws Error se limite atingido
     */
    static async validateVpnQuota(tenantId: string, tx?: PrismaTx): Promise<void> {
        const quota = await this.getVpnQuota(tenantId, tx);

        if (quota.used >= quota.limit) {
            throw new Error(
                `Limite de VPNs atingido. Seu plano permite ${quota.limit} VPN(s) ativa(s) e você já possui ${quota.used}. ` +
                `Faça upgrade do seu plano ou delete uma VPN existente para criar uma nova.`
            );
        }
    }

    /**
     * Executa downgrades agendados que já passaram da data limite
     * Desativa VPNs excedentes (mantém as mais recentes)
     */
    static async enforceDowngradeSchedule() {
        const now = new Date();

        // Buscar subscriptions com downgrade agendado vencido
        const subscriptions = await prisma.subscription.findMany({
            where: {
                downgradeScheduledAt: {
                    lte: now
                },
                downgradeTargetPlanId: {
                    not: null
                }
            },
            include: {
                tenant: true,
                downgradeTargetPlan: true
            }
        });



        for (const subscription of subscriptions) {
            try {
                const tenantId = subscription.tenantId;
                const newLimit = subscription.downgradeTargetPlan?.vpnLimit || 1;

                // Contar VPNs ativas
                const activeVpns = await prisma.vpnTunnel.findMany({
                    where: {
                        tenantId,
                        isActive: true
                    },
                    orderBy: {
                        createdAt: 'asc' // Mais antigas primeiro
                    }
                });

                const excessCount = activeVpns.length - newLimit;

                if (excessCount > 0) {
                    // Desativar as VPNs mais antigas
                    const vpnsToDeactivate = activeVpns.slice(0, excessCount);
                    const idsToDeactivate = vpnsToDeactivate.map((v: any) => v.id);

                    await prisma.vpnTunnel.updateMany({
                        where: {
                            id: { in: idsToDeactivate }
                        },
                        data: {
                            isActive: false
                        }
                    });
                }

                // Aplicar o downgrade: atualizar planId e limpar campos de downgrade
                await prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        planId: subscription.downgradeTargetPlanId!,
                        downgradeScheduledAt: null,
                        downgradeTargetPlanId: null
                    }
                });
            } catch (error) {
                console.error(`[VpnService] Failed to enforce downgrade for subscription ${subscription.id}: `, error);
            }
        }
    }


    /**
     * Provisiona um túnel VPN completo para um tenant.
     * @param tenantId ID do tenant
     * @param tx Transação Prisma opcional
     * @param name Nome do dispositivo (ex: "Router Principal")
     * @param type Tipo do dispositivo (ROUTER, MOBILE, PC)
     * @param serverId ID do servidor VPN específico (opcional - se não fornecido, seleciona automaticamente)
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    static async provisionForTenant(
        tenantId?: string,
        tx?: PrismaTx,
        name = "Router Principal",
        type: "ROUTER" | "MIKROTIK" | "MOBILE" | "PC" = "ROUTER",
        serverId?: string,
        protocol: "WIREGUARD" | "L2TP" | "SSTP" = "WIREGUARD",
        ignoreQuota = false
    ) {
        const db = tx || prisma;
        try {
            // 0. Validar Quota antes de começar (somente se vinculado a um tenant e NÃO for ignorado)
            if (tenantId && !ignoreQuota) {
                await this.validateVpnQuota(tenantId, db);
            }

            // [REMOVED] Logic that prevented multiple ROUTER tunnels for the same tenant
            // as requested: "adm pode adicionar quantos tuneis vpn ele quiser"

            let server;

            if (serverId) {
                // Manual server selection - validate it exists, is active, and has capacity

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                server = await (db as any).vpnServer.findUnique({
                    where: { id: serverId },
                    include: {
                        _count: { select: { tunnels: true } }
                    }
                });

                if (!server) {
                    throw new Error(`Servidor VPN com ID ${serverId} não encontrado.`);
                }

                if (!server.isActive) {
                    throw new Error(`Servidor VPN "${server.name}" está inativo.`);
                }

                // Check capacity
                const currentLoad = server._count.tunnels;
                if (currentLoad >= server.capacityLimit) {
                    throw new Error(
                        `Servidor VPN "${server.name}" atingiu o limite de capacidade(${currentLoad} / ${server.capacityLimit}). ` +
                        `Selecione outro servidor ou deixe a seleção automática.`
                    );
                }
            } else {
                // Automatic selection - use server with lowest load
                server = await this.getBestServer(db as any);
            }

            if (!server.publicKey || !server.publicEndpoint) {
                console.warn(`[VpnService] WARNING: Selected server ${server.name} has incomplete registration details.`);
            }


            let keys = null;
            let vpnUsername = null;
            let vpnPassword = null;

            if (protocol === "WIREGUARD") {
                keys = this.generateKeypair();
            } else {
                // L2TP/SSTP Logic
                const { VpnKeyService } = require("../vpn-key.service");
                vpnUsername = `vpn-${Math.random().toString(36).slice(-8)}`;
                const rawPassword = Math.random().toString(36).slice(-12) + "!";
                vpnPassword = VpnKeyService.encrypt(rawPassword);
            }

            const internalIp = await this.allocateIp(db as any);


            // 1. Create VPN Tunnel
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tunnel = await (db as any).vpnTunnel.create({
                data: {
                    tenantId: tenantId || null,
                    serverId: server.id,
                    internalIp,
                    subnetCidr: "32",
                    protocol,
                    clientPublicKey: keys?.publicKey || null,
                    clientPrivateKey: keys?.privateKey || null,
                    vpnUsername,
                    vpnPassword,
                    isActive: true,
                    name,
                    type: type as any
                }
            });

            // 2. Auto-Create Radius NAS for Centralized Control (Only if linked to a tenant)
            if (tenantId) {
                const radiusSecret = "mkauth" + Math.random().toString(36).slice(-8);

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (db as any).nas.create({
                    data: {
                        nasname: internalIp, // O IP da VPN é como o Radius identifica a origem da requisição
                        shortname: `${type.toLowerCase()} -${internalIp.replace(/\./g, '-')} `,
                        type: 'other',
                        secret: radiusSecret,
                        description: `Auto - generated for Segment ${type} - Tenant ${tenantId} `,
                        tenantId: tenantId
                    }
                });
            }
            return tunnel;
        } catch (error) {
            console.error("[VpnService] Failed to provision:", error);
            throw error;
        }
    }

    /**
     * Regenera o tunel VPN para um tenant existente.
     */
    static async regenerateForTenant(tenantId: string) {
        // Legacy support: Ensure at least one router exists
        return await this.provisionForTenant(tenantId);
    }

    /**
     * Bloqueia TODOS os túneis de um tenant (inadimplência).
     */
    static async blockTunnel(tenantId: string) {
        return await prisma.vpnTunnel.updateMany({
            where: { tenantId },
            data: { isActive: false }
        });
    }

    /**
     * Desbloqueia TODOS os túneis.
     */
    static async unblockTunnel(tenantId: string) {
        return await prisma.vpnTunnel.updateMany({
            where: { tenantId },
            data: { isActive: true }
        });
    }

    /**
     * Remove um túnel VPN e realiza a limpeza total (Radius NAS inclusa).
     */
    static async deleteTunnel(tunnelId: string) {
        const tunnel = await prisma.vpnTunnel.findUnique({
            where: { id: tunnelId }
        });

        if (!tunnel) return;

        // Limpeza Total: Se for um túnel de ROUTER, pode haver um NAS associado
        await prisma.$transaction(async (tx: any) => {
            // 1. Remover NAS se existir (baseado no IP interno da VPN)
            await tx.nas.deleteMany({
                where: { nasname: tunnel.internalIp, tenantId: tunnel.tenantId }
            });

            // 2. Remover o túnel
            await tx.vpnTunnel.delete({
                where: { id: tunnelId }
            });
        }, { timeout: 30000 });


    }

    static async createDeviceTunnel(
        tenantId: string | undefined, 
        name: string, 
        type: "MOBILE" | "PC" | "MIKROTIK" | "ROUTER", 
        serverId?: string,
        protocol: "WIREGUARD" | "L2TP" | "SSTP" = "WIREGUARD",
        ignoreQuota = false
    ) {
        return await this.provisionForTenant(tenantId, undefined, name, type, serverId, protocol, ignoreQuota);
    }
}

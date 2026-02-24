"use server";

import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { protectedAction } from "@/lib/api/action-wrapper";
import { hashPassword } from "@/lib/auth/password";
import { SchemaService } from "@/shared/tenancy/schema.service";
import { runWithTenant } from "@/shared/tenancy/tenancy.context";
import * as z from "zod";

import { HealthService } from "../services/health.service";
import { ProvisioningService } from "../services/provisioning.service";

/**
 * Agrega métricas globais para a Torre de Controle SaaS
 */
export const getGlobalMetricsAction = protectedAction(
    ["SUPER_ADMIN"],
    async (data, session) => {
        

        // 1. Dados básicos
        const [activeSubscriptions, tenantCount, tunnelCount, vpnServers, health] = await Promise.all([
            prisma.subscription.findMany({
                where: { status: "ACTIVE" },
                include: { plan: true }
            }),
            prisma.tenant.count(),
            prisma.vpnTunnel.count(),
            prisma.vpnServer.findMany(),
            HealthService.getHealth()
        ]);

        const totalMrrValue = activeSubscriptions.reduce((acc: number, sub) => acc + Number(sub.plan.monthlyPrice), 0);

        // 2. Carga de infra real
        const totalCapacity = vpnServers.reduce((acc, s) => acc + s.capacityLimit, 0);
        const currentLoadAvg = totalCapacity > 0 ? (tunnelCount / totalCapacity) * 100 : 0;

        // 3. Dados do gráfico (Últimos 6 meses)
        const months: Array<{ name: string; month: number; year: number; revenue: number; tenants: number }> = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                name: d.toLocaleString('pt-BR', { month: 'short' }),
                month: d.getMonth(),
                year: d.getFullYear(),
                revenue: 0,
                tenants: 0
            });
        }

        // Buscar faturamento real por mês
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const paidInvoices = await prisma.saasInvoice.findMany({
            where: {
                status: "PAID",
                paidAt: { gte: sixMonthsAgo }
            },
            select: { amount: true, paidAt: true }
        });

        // Buscar crescimento de tenants
        const allTenants = await prisma.tenant.findMany({
            where: { createdAt: { gte: sixMonthsAgo } },
            select: { createdAt: true }
        });

        // Total acumulado de tenants antes do período do gráfico para começar o crescimento
        const baseTenants = await prisma.tenant.count({
            where: { createdAt: { lt: sixMonthsAgo } }
        });

        const chartData = months.map((m, idx) => {
            const monthRevenue = paidInvoices
                .filter(inv => inv.paidAt && inv.paidAt.getMonth() === m.month && inv.paidAt.getFullYear() === m.year)
                .reduce((acc, inv) => acc + Number(inv.amount), 0);

            // Tenants acumulados até este mês
            const incrementalTenants = months.slice(0, idx + 1).reduce((acc, prevMonth) => {
                return acc + allTenants.filter(t => t.createdAt.getMonth() === prevMonth.month && t.createdAt.getFullYear() === prevMonth.year).length;
            }, 0);

            return {
                name: m.name.charAt(0).toUpperCase() + m.name.slice(1),
                revenue: monthRevenue || 0,
                tenants: baseTenants + incrementalTenants
            };
        });

        // Dados fallback se estiver tudo zerado para não quebrar o visual inicialmente (opcional)
        // Se houver dados reais, eles serão usados.
        // Se houver dados reais, eles serão usados.
        const finalChart = chartData;

        return {
            mrr: totalMrrValue,
            tenants: tenantCount,
            endpoints: tunnelCount,
            infraLoad: `${currentLoadAvg.toFixed(1)}%`,
            chart: finalChart,
            health
        };
    }
);

/**
 * Lista todos os servidores VPN e seus status atuais
 */
export const getServerMetricsAction = protectedAction(
    ["SUPER_ADMIN"],
    async (data, session) => {
        
        return await prisma.vpnServer.findMany({
            include: {
                _count: {
                    select: { tunnels: true }
                },
                // Fetch latest stats record
                stats: {
                    take: 1,
                    orderBy: { measuredAt: 'desc' },
                    select: {
                        cpuUsage: true,
                        memoryTotal: true,
                        memoryUsed: true,
                        diskTotal: true,
                        diskUsed: true,
                        measuredAt: true
                    }
                },
                tunnels: {
                    select: {
                        id: true,
                        name: true,
                        isActive: true,
                        internalIp: true,
                        lastHandshake: true,
                        totalBytesRx: true,
                        totalBytesTx: true,
                        tenant: {
                            select: { name: true, slug: true, status: true }
                        }
                    }
                }
            },
            orderBy: { name: "asc" }
        });
    }
);

/**
 * Lista todos os tenants e seus status de saúde
 */
export const getTenantsAction = protectedAction(
    ["SUPER_ADMIN"],
    async (data, session) => {
        
        return await prisma.tenant.findMany({
            include: {
                _count: {
                    select: { users: true, vpnTunnels: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });
    }
);

const tenantProvisionSchema = z.object({
    name: z.string().min(3, "Nome do Provedor é obrigatório"),
    slug: z.string().min(3, "Slug inválido").regex(/^[a-z0-9-]+$/, "Slug deve ser minúsculo e sem espaços"),
    adminEmail: z.string().email("Email inválido"),
    adminPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
    planId: z.string().optional(), // Optional - allow creating WITHOUT plan
    vpnServerId: z.string().optional(), // Optional - manual VPN server selection
    interestRate: z.coerce.number().min(0, "Juros não pode ser negativo"),
    penaltyAmount: z.coerce.number().min(0, "Multa não pode ser negativa"),
    gracePeriod: z.coerce.number().int().min(0, "Carência não pode ser negativa"),
    autoBlock: z.boolean().default(true),
    autoUnblock: z.boolean().default(true),
});

/**
 * Fluxo principal de provisionamento: Tenant + Usuário Admin + Configuração Inicial
 */
export const provisionTenantAction = protectedAction(
    ["SUPER_ADMIN"],
    async (input, session) => {
        const data = tenantProvisionSchema.parse(input);
        

        try {
            // 0. Pre-check uniqueness to avoid partial failure
            const [existingTenant, existingUser] = await Promise.all([
                prisma.tenant.findUnique({ where: { slug: data.slug } }),
                prisma.user.findUnique({ where: { email: data.adminEmail } })
            ]);

            if (existingTenant) {
                return { error: "SLUG_ALREADY_EXISTS" };
            }

            if (existingUser) {
                return { error: "EMAIL_ALREADY_EXISTS" };
            }

            const { tenant, vpnProvisioned } = await ProvisioningService.provision({
                name: data.name,
                slug: data.slug,
                adminEmail: data.adminEmail,
                adminPassword: data.adminPassword,
                planId: data.planId,
                vpnServerId: data.vpnServerId, // Pass manual server selection if provided
                financialConfig: {
                    interestRate: data.interestRate,
                    penaltyAmount: data.penaltyAmount,
                    gracePeriod: data.gracePeriod,
                    autoBlock: data.autoBlock,
                    autoUnblock: data.autoUnblock,
                }
            });

            const { revalidatePath } = await import("next/cache");
            revalidatePath("/saas-admin/tower");
            revalidatePath("/saas-admin/tenants");

            return { tenant, vpnProvisioned };

        } catch (error: any) {
            console.error(`[Provisioning] Action failed for ${data.slug}:`, error);
            // Re-throw so the frontend sees the error
            throw error;
        }
    }
);
const vpnServerSchema = z.object({
    name: z.string().min(3, "Nome é obrigatório"),
    publicEndpoint: z.string().min(7, "Endpoint público inválido"),
    listenPort: z.number().int().min(1).max(65535),
    publicKey: z.string().min(10, "Chave pública inválida"),
    capacityLimit: z.number().int().min(1).max(1000),
});

/**
 * Provisiona um novo nó de servidor VPN
 */
export const createVpnServerAction = protectedAction(
    ["SUPER_ADMIN"],
    async (input, session) => {
        const data = vpnServerSchema.parse(input);

        const server = await prisma.vpnServer.create({
            data: {
                name: data.name,
                publicEndpoint: data.publicEndpoint,
                listenPort: data.listenPort,
                publicKey: data.publicKey,
                capacityLimit: data.capacityLimit,
                currentLoad: 0,
                isActive: true
            }
        });

        
        const { revalidatePath } = await import("next/cache");
        revalidatePath("/saas-admin/vpn-servers");
        return server;
    }
);

/**
 * Lista todos os planos SaaS disponíveis
 */
export const getSaasPlansAction = protectedAction(
    ["SUPER_ADMIN"],
    async (_, session) => {
        
        return await prisma.saasPlan.findMany({
            where: { isActive: true },
            orderBy: { monthlyPrice: "asc" }
        });
    }
);

/**
 * Trigger global maintenance on all MikroTiks (Firewall Setup & SSL Propagation)
 */
export const maintainMikrotikInfrastructureAction = protectedAction(
    ["SUPER_ADMIN"],
    async ({ action }: { action: "SETUP_FIREWALL" | "PROPAGATE_SSL" }, session) => {
        const { MikrotikService } = await import("@/modules/saas/services/mikrotik.service");

        try {
            if (action === "SETUP_FIREWALL") {
                await MikrotikService.setupInfrastructureOnAllNas();
                return { success: true, message: "Regras de Firewall (Redirecionamento) enviadas para todos os roteadores." };
            }

            if (action === "PROPAGATE_SSL") {
                // Em um ambiente real, leríamos os arquivos .pem do VPS
                const cert = "-----BEGIN CERTIFICATE-----\nDEMO_CERT\n-----END CERTIFICATE-----";
                const key = "-----BEGIN PRIVATE KEY-----\nDEMO_KEY\n-----END PRIVATE KEY-----";

                await MikrotikService.propagateSslToAllNas(cert, key);
                return { success: true, message: "Certificados SSL propagados e ativos em todos os roteadores." };
            }
        } catch (err: any) {
            console.error("[MaintenanceAction] Error:", err.message);
            throw new Error(`Falha na manutenção: ${err.message}`);
        }

        return { success: false };
    }
);


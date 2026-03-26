"use server"

import { prisma } from "@/lib/prisma";
import { protectedAction } from "@/lib/api/action-wrapper";

import { serializeDecimal } from "@/lib/utils";
import { revalidatePath } from "next/cache";

/**
 * Obtém métricas financeiras globais para a plataforma SaaS.
 */
export const getSaasFinancialMetrics = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        // 1. Busca todas as assinaturas ativas/atrasadas com seus planos
        const activeSubscriptions = await prisma.subscription.findMany({
            where: {
                status: { in: ['ACTIVE', 'PAST_DUE'] }
            },
            include: {
                plan: {
                    select: { monthlyPrice: true }
                }
            }
        });

        // 2. Calcula MRR (Receita Recorrente Mensal)
        const mrr = activeSubscriptions.reduce((acc: number, sub: any) => {
            return acc + Number(sub.plan.monthlyPrice);
        }, 0);

        // 3. Calcula total de inadimplentes
        const overdueCount = activeSubscriptions.filter((s: any) => s.status === 'PAST_DUE').length;

        // 4. Calcula Churn (últimos 30 dias)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const canceledCount = await prisma.subscription.count({
            where: {
                status: 'CANCELED',
                updatedAt: { gte: thirtyDaysAgo }
            }
        });

        const totalActiveStart = activeSubscriptions.length + canceledCount;
        const churnRate = totalActiveStart > 0 ? (canceledCount / totalActiveStart) * 100 : 0;

        return {
            mrr,
            arr: mrr * 12,
            overdueCount,
            churnRate: parseFloat(churnRate.toFixed(2)),
            activeTenants: activeSubscriptions.length
        };
    }
);

/**
 * Lista todas as assinaturas SaaS para gestão detalhada de faturamento.
 */
export const getSaasSubscriptions = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        const subscriptions = await prisma.subscription.findMany({
            include: {
                tenant: { select: { name: true, slug: true } },
                plan: { select: { name: true, monthlyPrice: true } }
            },
            orderBy: {
                currentPeriodEnd: 'asc'
            }
        });

        return serializeDecimal(subscriptions);
    }
);

/**
 * Gera manualmente uma fatura para um tenant específico (Pelo SaaS Admin)
 */
export const generateInvoiceManuallyAction = protectedAction(
    ["SUPER_ADMIN"],
    async (tenantId: string) => {
        try {
            const { SaasBillingService } = await import("@/modules/saas/services/saas-billing.service");
            const invoice = await SaasBillingService.generateInvoice(tenantId);
            
            if (!invoice) {
                return { success: true, message: "O plano do tenant é gratuito (R$ 0,00). Nenhuma fatura gerada." };
            }

            return { success: true, invoiceId: invoice.id };
        } catch (error: unknown) {
            console.error("[SaasBilling] Erro manual:", error);
            return { error: error instanceof Error ? error.message : "Erro ao gerar fatura manual." };
        }
    }
);

/**
 * Atualiza o gateway de pagamento global da plataforma.
 */
export const updateSaasGatewayAction = protectedAction(
    ["SUPER_ADMIN"],
    async (data: { gateway: string, config: any }) => {
        try {
            await prisma.systemSettings.upsert({
                where: { id: "GLOBAL" },
                update: {
                    paymentGateway: data.gateway,
                    gatewayConfig: data.config
                },
                create: {
                    id: "GLOBAL",
                    paymentGateway: data.gateway,
                    gatewayConfig: data.config
                }
            });

            revalidatePath("/saas-admin/billing");
            return { success: true };
        } catch (error: unknown) {
            return { error: error instanceof Error ? error.message : "Erro ao configurar gateway." };
        }
    }
);

/**
 * Obtém as configurações atuais do gateway.
 */
export const getSaasGatewayConfig = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        const settings = await prisma.systemSettings.findUnique({
            where: { id: "GLOBAL" }
        });
        return { data: settings };
    }
);

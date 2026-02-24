"use server"

import { prisma } from "@/lib/prisma";
import { protectedAction } from "@/lib/api/action-wrapper";

import { serializeDecimal } from "@/lib/utils";

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
        const mrr = activeSubscriptions.reduce((acc, sub) => {
            return acc + Number(sub.plan.monthlyPrice);
        }, 0);

        // 3. Calcula total de inadimplentes
        const overdueCount = activeSubscriptions.filter(s => s.status === 'PAST_DUE').length;

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

"use server";

import { VpnService } from "@/modules/saas/services/vpn.service";
import { getTenantContext } from "@/shared/tenancy/tenancy.context";

export interface VpnQuotaInfo {
    used: number;
    limit: number;
    available: number;
    hasScheduledDowngrade: boolean;
    downgradeDate?: Date;
    downgradeLimit?: number;
}

/**
 * Retorna informações de quota de VPN para o tenant atual
 */
export async function getVpnQuotaAction(): Promise<{ data?: VpnQuotaInfo; error?: string }> {
    try {
        const context = await getTenantContext();
        if (!context?.tenantId) {
            return { error: "Contexto de tenant não encontrado" };
        }

        const quota = await VpnService.getVpnQuota(context.tenantId);
        return { data: quota };
    } catch (error) {
        console.error("[getVpnQuotaAction] Error:", error);
        return { error: error instanceof Error ? error.message : "Erro ao buscar quota de VPN" };
    }
}

/**
 * Cancela um downgrade agendado (apenas SaaS Admin)
 * Nota: Esta função deve ser chamada apenas pelo painel SaaS Admin
 */
export async function cancelScheduledDowngradeAction(tenantId: string): Promise<{ success?: boolean; error?: string }> {
    try {
        // TODO: Adicionar verificação de permissão de SUPER_ADMIN aqui

        const { prisma } = await import("@/lib/prisma");

        await prisma.subscription.updateMany({
            where: { tenantId },
            data: {
                downgradeScheduledAt: null,
                downgradeTargetPlanId: null
            }
        });

        return { success: true };
    } catch (error) {
        console.error("[cancelScheduledDowngradeAction] Error:", error);
        return { error: error instanceof Error ? error.message : "Erro ao cancelar downgrade" };
    }
}

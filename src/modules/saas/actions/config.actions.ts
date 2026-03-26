"use server"

import { protectedAction } from "@/lib/api/action-wrapper"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

/**
 * Atualiza o HTML das páginas de bloqueio e aviso do Tenant.
 */
export const updateNetworkPagesAction = protectedAction(
    ["ISP_ADMIN"],
    async (data: { blockHtml?: string; alertHtml?: string }, session) => {
        if (!session.tenantId) throw new Error("Tenant não identificado.");

        await prisma.landingConfig.upsert({
            where: { tenantId: session.tenantId },
            update: {
                blockHtml: data.blockHtml,
                alertHtml: data.alertHtml
            },
            create: {
                tenantId: session.tenantId,
                blockHtml: data.blockHtml,
                alertHtml: data.alertHtml,
                title: "Configuração de Rede",
                primaryColor: "#2563eb",
                secondaryColor: "#10b981"
            }
        });

        revalidatePath("/(isp-panel)/settings/network-pages")
        return { success: true }
    }
);

/**
 * Busca as configurações de páginas de rede do Tenant.
 */
export const getNetworkPagesAction = protectedAction(
    ["ISP_ADMIN"],
    async (_, session) => {
        if (!session.tenantId) throw new Error("Tenant não identificado.");

        const config = await prisma.landingConfig.findUnique({
            where: { tenantId: session.tenantId },
            select: { blockHtml: true, alertHtml: true }
        });

        return { 
            data: config || { blockHtml: null, alertHtml: null } 
        };
    }
);

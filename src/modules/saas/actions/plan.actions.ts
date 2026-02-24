"use server";

import { prisma } from "@/lib/prisma";
import { protectedAction } from "@/lib/api/action-wrapper";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import { serializeDecimal } from "@/lib/utils";

const planSchema = z.object({
    name: z.string().min(2, "Nome é obrigatório"),
    monthlyPrice: z.coerce.number().min(0, "Preço inválido"),
    maxCustomers: z.coerce.number().int().min(1, "Deve permitir pelo menos 1 cliente"),
    showOnLanding: z.boolean().default(true),
    features: z.object({
        whatsapp: z.boolean().default(false),
        api_access: z.boolean().default(false),
        max_vpn_nodes: z.coerce.number().int().min(1).default(1),
        priority_support: z.boolean().default(false),
    }),
});

export type PlanFormData = z.infer<typeof planSchema>;

/**
 * Cria um novo Plano SaaS
 */
export const createSaasPlanAction = protectedAction(
    ["SUPER_ADMIN"],
    async (input: PlanFormData, session) => {
        const data = planSchema.parse(input);

        const plan = await prisma.saasPlan.create({
            data: {
                name: data.name,
                monthlyPrice: data.monthlyPrice,
                maxCustomers: data.maxCustomers,
                features: data.features,
                isActive: true,
                showOnLanding: data.showOnLanding,
            },
        });

        

        // Auto Backup Trigger
        try {
            const { BackupService } = await import("../services/backup.service");
            await BackupService.createBackup("Auto: Novo Plano");
        } catch (e) {
            console.error("Failed to create auto-backup:", e);
        }

        revalidatePath("/saas-admin/plans");
        return plan;
    }
);

/**
 * Atualiza um Plano SaaS existente
 */
export const updateSaasPlanAction = protectedAction(
    ["SUPER_ADMIN"],
    async (input: { id: string } & Partial<PlanFormData>, session) => {
        const { id, ...data } = input;

        const plan = await prisma.saasPlan.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.monthlyPrice !== undefined && { monthlyPrice: data.monthlyPrice }),
                ...(data.maxCustomers !== undefined && { maxCustomers: data.maxCustomers }),
                ...(data.showOnLanding !== undefined && { showOnLanding: data.showOnLanding }),
                ...(data.features && { features: data.features }),
            },
        });

        
        revalidatePath("/saas-admin/plans");
        return plan;
    }
);

/**
 * Alterna o status (Ativo/Inativo) de um plano
 */
export const toggleSaasPlanStatusAction = protectedAction(
    ["SUPER_ADMIN"],
    async ({ id }: { id: string }, session) => {
        const plan = await prisma.saasPlan.findUnique({ where: { id } });
        if (!plan) throw new Error("Plano não encontrado");

        const updated = await prisma.saasPlan.update({
            where: { id },
            data: { isActive: !plan.isActive },
        });

        
        revalidatePath("/saas-admin/plans");
        return updated;
    }
);

/**
 * Deleta um plano SaaS
 */
export const deleteSaasPlanAction = protectedAction(
    ["SUPER_ADMIN"],
    async ({ id }: { id: string }, session) => {
        // Verificar se existem assinaturas ativas para este plano
        const subscriptionsCount = await prisma.subscription.count({
            where: { planId: id }
        });

        if (subscriptionsCount > 0) {
            throw new Error("Não é possível deletar um plano que possui assinaturas vinculadas.");
        }

        const plan = await prisma.saasPlan.delete({
            where: { id }
        });

        
        revalidatePath("/saas-admin/plans");
        return { success: true };
    }
);

/**
 * Lista todos os Planos SaaS (Admin)
 */
export const getSaasPlansAction = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        return await prisma.saasPlan.findMany({
            orderBy: { monthlyPrice: 'asc' }
        });
    }
);

/**
 * Lista planos públicos (Ativos e Marcados para Landing)
 */
export async function getPublicPlansAction() {
    try {
        const plans = await prisma.saasPlan.findMany({
            where: {
                isActive: true,
                showOnLanding: true
            },
            orderBy: { monthlyPrice: 'asc' }
        });
        return serializeDecimal(plans);
    } catch (error) {
        console.error("Erro ao buscar planos públicos:", error);
        return [];
    }
}

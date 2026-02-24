"use server";

import { withTenantDb } from "@/lib/auth-utils.server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serializeDecimal } from "@/lib/utils";
import crypto from "node:crypto";

const planSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(2, "Nome é obrigatório"),
    price: z.number().min(0),
    upload: z.number().int().min(1),
    download: z.number().int().min(1),
    description: z.string().optional().nullable(),
    remoteIpPool: z.string().optional(),
    localAddress: z.string().optional(),
    dnsPrimary: z.string().optional(),
    dnsSecondary: z.string().optional(),
});

export async function createPlan(formData: z.infer<typeof planSchema>) {
    // Validation first
    const validatedFields = planSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { error: "Dados inválidos" };
    }

    const { name, price, upload, download, description, remoteIpPool, localAddress, dnsPrimary, dnsSecondary } = validatedFields.data;

    try {
        await withTenantDb(async (db) => {
            await db.$queryRaw`
                INSERT INTO plans (
                    id, name, price, upload, download, description, 
                    is_active, remote_ip_pool, local_address, dns_primary, dns_secondary,
                    "createdAt", "updatedAt"
                ) VALUES (
                    ${crypto.randomUUID()}::uuid, ${name}, ${price}, ${upload}, ${download}, ${description || null},
                    true, ${remoteIpPool || null}, ${localAddress || null}, ${dnsPrimary || null}, ${dnsSecondary || null},
                    NOW(), NOW()
                )
            `;
        });

        revalidatePath("/financial/plans");
        return { success: true };
    } catch (error: any) {
        console.error("[Plan Action] Error:", error);
        return { error: "Erro ao criar plano" };
    }
}

export async function getPlans() {
    try {
        const plans = await withTenantDb(async (db) => {
            return await db.$queryRaw`
                SELECT * FROM plans WHERE is_active = true ORDER BY price ASC
            ` as any[];
        });

        return serializeDecimal(plans);
    } catch (error) {
        console.error("[Plan Action] Error fetching plans:", error);
        return [];
    }
}
export async function updatePlan(id: string, formData: z.infer<typeof planSchema>) {
    const validatedFields = planSchema.safeParse(formData);
    if (!validatedFields.success) {
        return { error: "Dados inválidos" };
    }

    const { name, price, upload, download, description, remoteIpPool, localAddress, dnsPrimary, dnsSecondary } = validatedFields.data;

    try {
        await withTenantDb(async (db) => {
            await db.$queryRaw`
                UPDATE plans 
                SET 
                    name = ${name}, 
                    price = ${price}, 
                    upload = ${upload}, 
                    download = ${download}, 
                    description = ${description || null},
                    is_active = true,
                    remote_ip_pool = ${remoteIpPool || null}, 
                    local_address = ${localAddress || null}, 
                    dns_primary = ${dnsPrimary || null}, 
                    dns_secondary = ${dnsSecondary || null},
                    "updatedAt" = NOW()
                WHERE id = ${id}::uuid
            `;
        });

        revalidatePath("/financial/plans");
        return { success: true };
    } catch (error: any) {
        console.error("[Plan Action] Error updating plan:", error);
        return { error: "Erro ao atualizar plano" };
    }
}

export async function deletePlan(id: string) {
    try {
        await withTenantDb(async (db) => {
            await db.$queryRaw`
                UPDATE plans SET is_active = false, "updatedAt" = NOW() WHERE id = ${id}::uuid
            `;
        });

        revalidatePath("/financial/plans");
        return { success: true };
    } catch (error: any) {
        console.error("[Plan Action] Error deleting plan:", error);
        return { error: "Erro ao excluir plano" };
    }
}

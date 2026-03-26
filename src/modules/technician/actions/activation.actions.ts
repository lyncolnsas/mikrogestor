"use server"

import { CustomerStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCurrentTenant } from "@/lib/auth-utils.server"

export async function activateCustomer(data: {
    customerId: string;
    mac: string;
    planId: string;
    location?: { lat: number; lng: number };
}) {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Unauthorized");

    const { RadiusService } = await import("@/modules/saas/services/radius.service");

    try {
        // 1. Fetch Plan details for Radius sync
        const plan = await prisma.plan.findUnique({
            where: { id: data.planId }
        });
        if (!plan) throw new Error("Plano não encontrado");

        // 2. Fetch Customer
        const customer = await prisma.customer.findUnique({
            where: { id: data.customerId }
        });
        if (!customer) throw new Error("Cliente não encontrado");

        // 3. Update Customer in DB (Structured Address Data)
        await prisma.customer.update({
            where: { id: data.customerId },
            data: {
                status: CustomerStatus.ACTIVE,
                planId: data.planId,
                latitude: data.location?.lat || null,
                longitude: data.location?.lng || null,
                macAddress: data.mac || null
            }
        });

        // 4. Radius Sync (Standardized: t{tenantId}_{customerId})
        await RadiusService.syncCustomer(context.tenantId, customer, {
            upload: plan.upload,
            download: plan.download,
            remoteIpPool: plan.remoteIpPool
        });

        const { revalidatePath } = await import("next/cache");
        revalidatePath("/technician/activation/new");
        return { success: true };
    } catch (error: unknown) {
        console.error("[Activation Action] Error:", error);
        return { error: error instanceof Error ? error.message : "Erro ao ativar cliente" };
    }
}

"use server";

import { CustomerStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/auth-utils.server";

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

        // 3. Update Customer in DB
        await prisma.customer.update({
            where: { id: data.customerId },
            data: {
                status: CustomerStatus.ACTIVE,
                planId: data.planId,
                address: {
                    ...(typeof customer.address === 'object' ? customer.address : {}),
                    location: data.location,
                    mac: data.mac
                }
            }
        });

        // 4. Radius Sync (Standardized: t{tenantId}_{customerId})
        await RadiusService.syncCustomer(context.tenantId, customer, {
            upload: plan.upload,
            download: plan.download,
            remoteIpPool: plan.remoteIpPool
        });

        // 5. MikroTik Kick (Optional CoA/PoD)
        // In a real environment, the router IP would be fetched from the 'Nas' record of that area
        // For simplicity, we assume one NAS if not specified, or use the VPN tunnel.

        const { revalidatePath } = await import("next/cache");
        revalidatePath("/technician/activation/new");
        return { success: true };
    } catch (error: unknown) {
        console.error("[Activation Action] Error:", error);
        return { error: error instanceof Error ? error.message : "Erro ao ativar cliente" };
    }
}

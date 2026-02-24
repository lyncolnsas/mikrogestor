"use server";

import { MikrotikService } from "@/modules/saas/services/mikrotik.service";
import { getCurrentTenant, withTenantDb } from "@/lib/auth-utils.server";
import { z } from "zod";
import { RadiusService } from "@/modules/saas/services/radius.service";

const provisionSchema = z.object({
    nasId: z.string().optional(), // Dropped from Select as string
    interfaceName: z.string().default('ether1'),
    radiusSecret: z.string().min(4),
    serverIp: z.string().min(7),
    localAddress: z.string().default('10.0.0.1'),
    dnsPrimary: z.string().default('8.8.8.8'),
    dnsSecondary: z.string().optional(),
});

export async function provisionMikrotikAction(formData: z.infer<typeof provisionSchema>) {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Unauthorized");

    const { interfaceName, radiusSecret, serverIp, localAddress, dnsPrimary, dnsSecondary, nasId } = provisionSchema.parse(formData);

    // Convert nasId to number if present
    const numericNasId = nasId ? Number(nasId) : undefined;

    // Use centralized service (static methods)
    // const service = new MikroTikService();  // [REMOVED]


    try {
        const result = await MikrotikService.provisionRouter(numericNasId || 0, {
            pppoeInterface: interfaceName,
            radiusSecret: radiusSecret,
            radiusServerIp: serverIp,
            localAddress,
            dnsServers: dnsSecondary ? `${dnsPrimary},${dnsSecondary}` : dnsPrimary
        }) as any;

        return { success: true, message: result?.message || "Provisioned successfully" };
    } catch (error: unknown) {
        const err = error as Error;
        console.error("[Provisioning Action] Error:", err);
        return { success: false, error: err.message || "Falha no provisionamento" };
    }
}

/**
 * Synchronizes all customers of the tenant with the Radius server.
 */
export async function syncAllRadiusAccountsAction() {
    return await withTenantDb(async (db) => {
        const context = await getCurrentTenant();
        if (!context) throw new Error("Unauthorized");

        const customers = await db.customer.findMany({
            include: { plan: true }
        });

        let syncedCount = 0;
        for (const customer of customers) {
            if (customer.plan) {
                await RadiusService.syncCustomer(context.tenantId, customer, {
                    upload: customer.plan.upload,
                    download: customer.plan.download,
                    remoteIpPool: customer.plan.remoteIpPool
                });
                syncedCount++;
            }
        }

        return { success: true, message: `${syncedCount} assinantes sincronizados com o Radius.` };
    });
}

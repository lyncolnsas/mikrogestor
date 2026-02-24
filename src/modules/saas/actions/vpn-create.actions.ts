"use server";

import { protectedAction } from "@/lib/api/action-wrapper";
import { VpnService } from "../services/vpn.service";
import * as z from "zod";

const createTunnelSchema = z.object({
    name: z.string().min(2, "Nome muito curto").max(30),
    type: z.enum(["MOBILE", "PC", "MIKROTIK"]),
    targetTenantId: z.string().optional(),
    bypassQuota: z.boolean().optional(),
});

export const createVpnTunnelAction = protectedAction(
    ["SUPER_ADMIN", "ISP_ADMIN"],
    async (input, session) => {
        const { name, type, targetTenantId, bypassQuota } = createTunnelSchema.parse(input);

        // Determine which tenant to create VPN for
        let tenantId: string;

        if (session.role === "ISP_ADMIN") {
            // ISP_ADMIN can only create VPNs for their own tenant
            if (!session.tenantId) {
                throw new Error("Sessão inválida: tenant não identificado.");
            }
            tenantId = session.tenantId;

            // Ignore targetTenantId if provided by ISP_ADMIN (security)
            if (targetTenantId && targetTenantId !== session.tenantId) {
                throw new Error("Você só pode criar VPNs para o seu próprio provedor.");
            }

            // ISP Admin cannot bypass quota by themselves (unless logic changes)
            if (bypassQuota) {
                throw new Error("Apenas administradores do sistema podem criar VPNs bônus.");
            }

        } else {
            // SUPER_ADMIN can provide targetTenantId or leave it null for "Administrative"
            tenantId = targetTenantId as string;
        }

        // Validate VPN quota before creating (only if tenant is present)
        // Bypass if SUPER_ADMIN explicitly requested it
        if (!bypassQuota && tenantId) {
            await VpnService.validateVpnQuota(tenantId);
        }

        await VpnService.createDeviceTunnel(tenantId, name, type);

        const { revalidatePath } = await import("next/cache");
        revalidatePath("/(isp-panel)/mk-integration");
        revalidatePath("/saas-admin/tenants");
        revalidatePath("/saas-admin/mobile-vpn"); // Revalidate new page

        return { success: true };
    }
);

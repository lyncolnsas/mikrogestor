"use server";

import { protectedAction } from "@/lib/api/action-wrapper";
import { VpnService } from "../services/vpn.service";
import * as z from "zod";

const createTunnelSchema = z.object({
    name: z.string().min(2, "Nome muito curto").max(30),
    type: z.enum(["MOBILE", "PC", "MIKROTIK", "ROUTER"]),
    protocol: z.enum(["WIREGUARD", "L2TP", "SSTP"]).default("WIREGUARD"),
    targetTenantId: z.string().optional(),
    bypassQuota: z.boolean().optional(),
});

export const createVpnTunnelAction = protectedAction(
    ["SUPER_ADMIN", "ISP_ADMIN"],
    async (input, session) => {
        const { name, type, protocol, targetTenantId, bypassQuota } = createTunnelSchema.parse(input);

        // Determine which tenant to create VPN for
        let tenantId: string;
        let shouldIgnoreQuota = false;

        if (session.role === "ISP_ADMIN") {
            // ISP_ADMIN can only create VPNs for their own tenant
            if (!session.tenantId) {
                throw new Error("Sessão inválida: tenant não identificado.");
            }
            tenantId = session.tenantId;
            
            // ISP_ADMIN must respect the quota (the plan limit)
            shouldIgnoreQuota = false;
        } else {
            // SUPER_ADMIN can provide targetTenantId or leave it null for "Administrative"
            tenantId = targetTenantId as string;
            
            // SUPER_ADMIN can bypass quota if explicitly requested
            shouldIgnoreQuota = !!bypassQuota;
        }

        // The quota validation is now handled inside createDeviceTunnel with ignoreQuota
        await VpnService.createDeviceTunnel(tenantId, name, type, undefined, protocol, shouldIgnoreQuota);

        const { revalidatePath } = await import("next/cache");
        revalidatePath("/(isp-panel)/mk-integration");
        revalidatePath("/saas-admin/tenants");
        revalidatePath("/saas-admin/mobile-vpn"); // Revalidate new page

        return { success: true };
    }
);

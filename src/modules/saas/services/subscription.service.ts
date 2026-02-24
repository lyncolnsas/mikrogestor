import { prisma } from "@/lib/prisma";
import { TenantStatus } from "@prisma/client";

export class SubscriptionService {
    /**
     * Checks if a tenant's subscription is valid.
     */
    static async checkSubscriptionStatus(tenantId: string) {
        // Casting prisma to any to bypass stale client issues if needed, 
        // but naming it correctly as per schema.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subscription = await (prisma as any).subscription.findUnique({
            where: { tenantId },
            include: { plan: true }
        });

        if (!subscription) return { isValid: false, reason: "NO_SUBSCRIPTION" };

        if (subscription.status === "ACTIVE" || subscription.status === "TRIAL") {
            return { isValid: true };
        }

        return {
            isValid: false,
            reason: subscription.status
        };
    }

    /**
     * Blocks a tenant due to payment issues or admin action.
     */
    static async blockTenant(tenantId: string, reason: string) {
        const tenant = await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                status: TenantStatus.BLOCKED,
                blockReason: reason
            }
        });

        // Trigger VPN Block
        const { VpnService } = await import("./vpn.service");
        try {
            await VpnService.blockTunnel(tenantId);
        } catch {
            console.warn(`[VPN] No tunnel found to block for tenant ${tenantId}`);
        }

        return tenant;
    }

    /**
     * Unblocks a tenant.
     */
    static async unblockTenant(tenantId: string) {
        const tenant = await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                status: TenantStatus.ACTIVE,
                blockReason: null
            }
        });

        // Re-enable VPN
        const { VpnService } = await import("./vpn.service");
        try {
            await VpnService.unblockTunnel(tenantId);
        } catch {
            console.warn(`[VPN] No tunnel found to unblock for tenant ${tenantId}`);
        }

        return tenant;
    }
}

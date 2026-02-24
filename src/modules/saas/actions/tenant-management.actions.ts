"use server";

import { prisma } from "@/lib/prisma";
import { SubscriptionService } from "@/modules/saas/services/subscription.service";
import { revalidatePath } from "next/cache";
import { protectedAction } from "@/lib/api/action-wrapper";
import { runWithTenant } from "@/shared/tenancy/tenancy.context";
import * as z from "zod";

export const getTenantsWithDetailsAction = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        // Casting to handle potential stale client types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tenants = await (prisma as any).tenant.findMany({
            include: {
                subscription: {
                    include: { plan: true }
                },
                _count: {
                    select: {
                        users: true,
                        vpnTunnels: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return { tenants };
    }
);

export const getTenantsAction = protectedAction(
    ["SUPER_ADMIN", "ISP_ADMIN"],
    async () => {
        const tenants = await prisma.tenant.findMany({
            select: { id: true, name: true, slug: true },
            orderBy: { name: 'asc' }
        });
        return { tenants };
    }
);

export async function blockTenantAction(tenantId: string, reason: string) {
    try {
        await SubscriptionService.blockTenant(tenantId, reason);
        revalidatePath("/saas-admin/tenants");
        return { success: true };
    } catch (error: unknown) {
        console.error("Error blocking tenant:", error);
        return { error: error instanceof Error ? error.message : "Failed to block tenant" };
    }
}

export async function unblockTenantAction(tenantId: string) {
    try {
        await SubscriptionService.unblockTenant(tenantId);
        revalidatePath("/saas-admin/tenants");
        return { success: true };
    } catch (error: unknown) {
        console.error("Error unblocking tenant:", error);
        return { error: error instanceof Error ? error.message : "Failed to unblock tenant" };
    }
}

const updateTenantSchema = z.object({
    tenantId: z.string().uuid(),
    name: z.string().min(3, "Nome do Provedor é obrigatório"),
    planId: z.string().min(1, "Selecione um plano válido"),
    interestRate: z.coerce.number().min(0),
    penaltyAmount: z.coerce.number().min(0),
    gracePeriod: z.coerce.number().int().min(0),
    autoBlock: z.boolean(),
    autoUnblock: z.boolean(),
});

export const updateTenantAction = protectedAction(
    ["SUPER_ADMIN"],
    async (input) => {
        const data = updateTenantSchema.parse(input);
        const { tenantId, name, planId, interestRate, penaltyAmount, gracePeriod, autoBlock, autoUnblock } = data;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tenant = await (prisma as any).tenant.findUnique({
            where: { id: tenantId },
            include: { subscription: true }
        });

        if (!tenant) throw new Error("Tenant não encontrado");

        const schemaName = `tenant_${tenant.slug.replace(/-/g, '_')}`;

        await prisma.$transaction(async (tx) => {
            // 1. Update Tenant Basic Info
            await tx.tenant.update({
                where: { id: tenantId },
                data: { name }
            });

            // 2. Update Subscription
            if (tenant.subscription) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (tx as any).subscription.update({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    where: { id: (tenant.subscription as any).id },
                    data: { planId }
                });
            } else {
                // Should not happen if provisioned correctly, but safety first
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (tx as any).subscription.create({
                    data: {
                        tenantId,
                        planId,
                        status: "ACTIVE",
                        currentPeriodStart: new Date(),
                        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    }
                });
            }

            // 3. Update Financial Config in Tenant Schema
            // We use runWithTenant to set the search_path via the tenancy extension
            // We set isInsideTransaction: true because we are already inside a transaction (tx)
            await runWithTenant({ tenantId, schema: schemaName, isInsideTransaction: true }, async () => {
                // Must set search_path manually if skipping automated transaction wrapper
                await tx.$executeRawUnsafe(`SET search_path = "${schemaName}", "management", "radius", "public"`);

                await tx.financialConfig.updateMany({
                    data: {
                        interestRate,
                        penaltyAmount,
                        gracePeriod,
                        autoBlock,
                        autoUnblock
                    }
                });
            });
        }, { timeout: 30000 });

        revalidatePath("/saas-admin/tenants");
        return { success: true };
    }
);

export const getTenantFullDataAction = protectedAction(
    ["SUPER_ADMIN"],
    async (tenantId: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tenant = await (prisma as any).tenant.findUnique({
            where: { id: tenantId },
            include: { subscription: true }
        });

        if (!tenant) throw new Error("Tenant não encontrado");

        const schemaName = `tenant_${tenant.slug.replace(/-/g, '_')}`;

        const financialConfig = await runWithTenant({ tenantId, schema: schemaName }, async () => {
            return await prisma.financialConfig.findFirst();
        });

        return {
            id: tenant.id,
            name: tenant.name,
            subscription: tenant.subscription ? {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                planId: (tenant.subscription as any).planId
            } : undefined,
            financialConfig: financialConfig ? {
                interestRate: Number(financialConfig.interestRate),
                penaltyAmount: Number(financialConfig.penaltyAmount),
                gracePeriod: financialConfig.gracePeriod,
                autoBlock: financialConfig.autoBlock,
                autoUnblock: financialConfig.autoUnblock,
            } : undefined
        };
    }
);

export const deleteTenantAction = protectedAction(
    ["SUPER_ADMIN"],
    async (tenantId: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tenant = await (prisma as any).tenant.findUnique({
            where: { id: tenantId }
        });

        if (!tenant) throw new Error("Tenant não encontrado");

        const schemaName = `tenant_${tenant.slug.replace(/-/g, '_')}`;

        try {
            // 0. Force terminate connections (Postgres often blocks DROP SCHEMA if active sessions exist)
            // Target only connections using the specific schema search_path or related to this tenant
            const terminateQuery = `
                SELECT pg_terminate_backend(pid) 
                FROM pg_stat_activity 
                WHERE datname = current_database() 
                AND pid <> pg_backend_pid()
                AND (query LIKE '%${schemaName}%' OR query LIKE '%${tenantId}%')
            `;
            try {
                await prisma.$executeRawUnsafe(terminateQuery);
                // Give Postgres a moment to release locks
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {
                console.warn("[DeleteTenant] Could not terminate backends (common if not superuser):", e);
            }

            // 1. Drop Schema (This deletes all tenant data: customers, invoices, etc)
            
            const dropQuery = `DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`;
            await prisma.$executeRawUnsafe(dropQuery);

            // 2. Delete Tenant (Cascading deletes handle User, VpnTunnel, Nas, Subscription, LandingConfig, Logs, etc)
            await prisma.$transaction(async (tx) => {
                // FIX P2003: Manually delete traffic logs since cascading might be missing in DB
                // We first find all tunnel IDs for this tenant
                const tunnels = await (tx as any).vpnTunnel.findMany({
                    where: { tenantId },
                    select: { id: true }
                });
                const tunnelIds = tunnels.map((t: any) => t.id);

                if (tunnelIds.length > 0) {
                    await (tx as any).vpnTrafficLog.deleteMany({
                        where: { tunnelId: { in: tunnelIds } }
                    });
                }

                // Ensure record exists before deleting
                const toDelete = await (tx as any).tenant.findUnique({ where: { id: tenantId } });
                if (toDelete) {
                    await (tx as any).tenant.delete({
                        where: { id: tenantId }
                    });
                }
            }, { timeout: 20000 });

            revalidatePath("/saas-admin/tenants");
            return { success: true };
        } catch (error: unknown) {
            console.error("Error deleting tenant:", error);
            console.error("Error deleting tenant:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to delete tenant";
            return { error: `Erro ao deletar: ${errorMessage}` };
        }
    }
);

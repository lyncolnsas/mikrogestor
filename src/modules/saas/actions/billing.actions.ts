
"use server"

import { prisma } from "@/lib/prisma";
import { protectedAction } from "@/lib/api/action-wrapper";
import { SaasBillingService } from "../services/saas-billing.service";
import { revalidatePath } from "next/cache";

/**
 * Fetches all invoices for the current tenant (ISP view)
 */
export const getMySaasInvoicesAction = protectedAction(
    ["ISP_ADMIN"],
    async (_, session) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await (prisma as any).saasInvoice.findMany({
            where: { tenantId: session.tenantId },
            include: { subscription: { include: { plan: true } } },
            orderBy: { createdAt: 'desc' }
        });
    }
);

/**
 * Super Admin: Fetches all invoices from all tenants
 */
export const getAllSaasInvoicesAction = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await (prisma as any).saasInvoice.findMany({
            include: {
                tenant: true,
                subscription: { include: { plan: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
);

/**
 * Request a new invoice generation (e.g. manually or on plan change)
 */
export const requestSaasInvoiceAction = protectedAction(
    ["SUPER_ADMIN"],
    async ({ tenantId }: { tenantId: string }) => {
        const invoice = await SaasBillingService.generateInvoice(tenantId);
        revalidatePath("/saas-admin/tenants");
        return invoice;
    }
);

"use server"

import { protectedAction } from "@/lib/api/action-wrapper";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { VoucherStatus } from "@prisma/client";

/**
 * Generates a batch of unique voucher codes.
 */
function generateRandomCode(length = 6): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous characters (I, O, 0, 1)
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Action to generate a batch of vouchers for the current tenant.
 */
export const generateVouchersAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (input: { count: number, duration: number, dataLimitGb?: number }, session) => {
        const { count, duration, dataLimitGb } = input;
        const tenantId = session.tenantId;

        if (!tenantId) throw new Error("Tenant não identificado.");
        if (count > 500) throw new Error("O limite máximo por lote é de 500 vouchers.");

        const dataLimitBytes = dataLimitGb ? BigInt(dataLimitGb) * BigInt(1024 * 1024 * 1024) : null;

        const voucherData = [];
        for (let i = 0; i < count; i++) {
            voucherData.push({
                code: generateRandomCode(),
                tenantId,
                duration,
                dataLimit: dataLimitBytes,
                status: "ACTIVE" as VoucherStatus,
            });
        }

        try {
            // Bulk create - handling potential code collisions with simple retry logic or unique constraint
            await prisma.hotspotVoucher.createMany({
                data: voucherData,
                skipDuplicates: true, // If a code exists, just skip it (rare with 6 chars)
            });

            revalidatePath("/network/hotspot");
            return { success: true, message: `${count} vouchers gerados com sucesso.` };
        } catch (error: any) {
            console.error("[VoucherAction] Erro ao gerar vouchers:", error);
            return { error: "Falha ao gerar lote de vouchers." };
        }
    }
);

/**
 * Action to list vouchers for the current tenant.
 */
export const getVouchersAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (_, session) => {
        const tenantId = session.tenantId;
        if (!tenantId) throw new Error("Tenant não identificado.");

        return await prisma.hotspotVoucher.findMany({
            where: { tenantId },
            include: { lead: true },
            orderBy: { createdAt: "desc" }
        });
    }
);

/**
 * Action to delete a voucher.
 */
export const deleteVoucherAction = protectedAction(
    ["ISP_ADMIN", "SUPER_ADMIN"],
    async (voucherId: string, session) => {
        const tenantId = session.tenantId;
        if (!tenantId) throw new Error("Tenant não identificado.");

        await prisma.hotspotVoucher.delete({
            where: { id: voucherId, tenantId }
        });

        revalidatePath("/network/hotspot");
        return { success: true };
    }
);

"use server"

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";

export async function saveSmtpConfigAction(config: any) {
    try {
        const session = await getSession();
        if (!session?.tenantId) return { success: false, error: "Não autorizado" };

        await (prisma as any).tenant.update({
            where: { id: session.tenantId },
            data: { smtpConfig: config }
        });

        revalidatePath("/whatsapp");
        return { success: true };
    } catch (error) {
        console.error("Erro ao salvar configuração SMTP:", error);
        return { success: false, error: "Falha ao salvar no banco de dados." };
    }
}

export async function getSmtpConfigAction() {
    try {
        const session = await getSession();
        if (!session?.tenantId) return null;

        const tenant = await (prisma as any).tenant.findUnique({
            where: { id: session.tenantId },
            select: { smtpConfig: true }
        });

        return (tenant as any)?.smtpConfig || null;
    } catch (error) {
        return null;
    }
}

"use server"

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

/**
 * Busca todos os tickets de suporte do tenant
 */
export async function getSupportTicketsAction() {
    const session = await getSession();
    if (!session || !session.tenantId) throw new Error("Não autorizado");

    return await prisma.supportTicket.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            customer: {
                select: {
                    name: true,
                    phone: true,
                    status: true
                }
            },
            messages: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });
}

/**
 * Resolve um ticket de suporte
 */
export async function resolveTicketAction(id: string) {
    const session = await getSession();
    if (!session || !session.tenantId) throw new Error("Não autorizado");

    await prisma.supportTicket.update({
        where: { id },
        data: { status: "RESOLVED" }
    });

    revalidatePath("/support");
}

/**
 * Exclui um ticket de suporte
 */
export async function deleteTicketAction(id: string) {
    const session = await getSession();
    if (!session || !session.tenantId) throw new Error("Não autorizado");

    await prisma.supportTicket.delete({
        where: { id }
    });

    revalidatePath("/support");
}

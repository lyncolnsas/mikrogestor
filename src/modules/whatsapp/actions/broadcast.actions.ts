"use server"

import { WhatsAppBroadcastService } from "../services/whatsapp-broadcast.service";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Cria um grupo de avisos para todos os clientes ativos
 */
export async function startAnnouncementGroupAction(groupName: string) {
    const session = await getSession();
    if (!session || !session.tenantId) throw new Error("Não autorizado");

    // 1. Busca clientes ativos com telefone
    const customers = await prisma.customer.findMany({
        where: { status: "ACTIVE", phone: { not: null } },
        select: { phone: true }
    });

    if (customers.length === 0) throw new Error("Nenhum cliente para adicionar");

    // 2. Chama o Robô de Broadcast
    await WhatsAppBroadcastService.createAnnouncementGroup(session.tenantId, groupName, customers);

    revalidatePath("/whatsapp");
}

/**
 * Ativa o MODO PÂNICO de migração por banimento
 */
export async function triggerPanicMigrationAction() {
    const session = await getSession();
    if (!session || !session.tenantId) throw new Error("Não autorizado");

    const groupName = "RECUPERACAO SUPORTE";

    // Dispara a migração de emergência com envio de vCards
    await WhatsAppBroadcastService.triggerPanicMode(session.tenantId, groupName);

    revalidatePath("/whatsapp");
}

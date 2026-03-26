import { Prisma, PrismaClient } from "@prisma/client";
import { RadiusService } from "../../saas/services/radius.service";
import { WhatsAppInstanceManager } from "../../whatsapp/whatsapp.manager";
import { revalidatePath } from "next/cache";

import { ExtendedPrismaClient } from "@/lib/prisma";

export class PaymentService {
    /**
     * Confirma uma fatura como paga e dispara a lógica de negócio associada:
     * 1. Atualiza o status no banco de dados
     * 2. Desbloqueia o usuário no Radius
     * 3. Notifica via WhatsApp
     */
    static async confirmPayment(tenantId: string, invoiceId: string, db: any) {
        const process = async (tx: any) => {
            // 1. Atualizar status da fatura
            const invoice = await tx.invoice.update({
                where: { id: invoiceId },
                data: {
                    status: "PAID",
                    paidAt: new Date()
                },
                include: { customer: { include: { plan: true } } }
            });

            const customer = invoice.customer;

            // 2. Acionar Desbloqueio no Radius
            const username = `t${tenantId}_${customer.id}`;

            if (customer.plan) {
                try {
                    await RadiusService.syncCustomer(tenantId, customer, {
                        upload: customer.plan.upload,
                        download: customer.plan.download
                    }, tx);

                    // Também atualiza o status do cliente de volta para ACTIVE
                    await tx.customer.update({
                        where: { id: customer.id },
                        data: { status: 'ACTIVE' }
                    });

                } catch (radiusError) {
                    console.error(`[PaymentService] Falha ao desbloquear Radius para ${username}:`, radiusError);
                }
            }

            // 3. Confirmação via WhatsApp
            if (customer.phone) {
                const { WhatsAppNotificationService } = await import("../../whatsapp/services/whatsapp-notification.service");
                
                await WhatsAppNotificationService.sendPaymentConfirmation(tenantId, {
                    customerName: customer.name || customer.fullName || "Cliente",
                    phone: customer.phone,
                    value: Number(invoice.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                });
            }

            revalidatePath("/customers");
            revalidatePath("/financial/invoices");
            revalidatePath("/overview");

            return invoice;
        };

        // Se o db já possuir $transaction, iniciamos uma. Caso contrário (já é um tx),        // Se 'db' suportar transações (PrismaClient), inicia uma nova.
        // Caso contrário, já é uma transação em andamento.
        if (db && '$transaction' in (db as Record<string, unknown>)) {
            return await (db as PrismaClient).$transaction(process, { timeout: 30000 });
        } else {
            return await process(db as Prisma.TransactionClient);
        }
    }
}

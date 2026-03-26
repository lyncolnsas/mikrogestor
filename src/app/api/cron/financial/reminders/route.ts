import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WhatsAppNotificationService } from "@/modules/whatsapp/services/whatsapp-notification.service";
import { format } from "date-fns";
import { runWithTenant } from "@/shared/tenancy/tenancy.context";

/**
 * Cronjob Diário: Envia lembretes de faturas que vencem amanhã para TODOS os tenants.
 */
export async function GET(req: Request) {
    try {
        // 1. Calcular datas
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const endOfTomorrow = new Date(tomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);

        // 2. Buscar todos os Tenants
        const tenants = await prisma.tenant.findMany();
        let totalSent = 0;
        let totalProcessed = 0;

        // 3. Processar cada Tenant isoladamente
        for (const tenant of tenants) {
            await runWithTenant({ tenantId: tenant.id, schema: tenant.slug }, async () => {
                // Buscar faturas OPEN que vencem amanhã NESTE TENANT
                const pendingInvoices = await prisma.invoice.findMany({
                    where: {
                        status: 'OPEN',
                        dueDate: { gte: tomorrow, lte: endOfTomorrow }
                    },
                    include: { customer: true }
                });

                totalProcessed += pendingInvoices.length;

                for (const invoice of pendingInvoices) {
                    const customer = invoice.customer as any;
                    if (customer?.phone) {
                        const success = await WhatsAppNotificationService.sendNewInvoice(tenant.id, {
                            customerName: customer.name || "Cliente",
                            phone: customer.phone,
                            invoiceId: invoice.id,
                            value: Number(invoice.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                            dueDate: format(new Date(invoice.dueDate), "dd/MM/yyyy"),
                            pixCode: "GERADO_PELA_ASSAAS", // Ideal buscar o pix real gerado
                            bolUrl: `https://${tenant.slug}.mikrogestor.com.br/portal/invoice/${invoice.id}/print`
                        });

                        if (success) totalSent++;
                    }
                }
            });
        }

        return NextResponse.json({
            success: true,
            tenantsProcessed: tenants.length,
            invoicesProcessed: totalProcessed,
            sent: totalSent
        });

    } catch (error) {
        console.error("[Cron Reminder] Erro crítico:", error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}

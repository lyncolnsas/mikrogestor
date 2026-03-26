import { prisma } from "@/lib/prisma";
import { getTenantContext } from "@/shared/tenancy/tenancy.context";

/**
 * Serviço responsável pela integração com o Motor de Radius (FreeRADIUS)
 * Gerencia bloqueios, desbloqueios e sincronização de regras de rede.
 */
export class RadiusEngineService {
    /**
     * Bloqueia um assinante no Radius atualizando seus registros radreply.
     * Geralmente define o 'Framed-Pool' para um pool de bloqueio ou altera o status do grupo.
     */
    async blockSubscriber(username: string) {
        

        // 1. Atualiza ou Cria RadReply para 'Mikrotik-Group'
        // Convenção: Grupo 'BLOQUEADO' configurado no concentrador MikroTik
        const attribute = "Mikrotik-Group";
        const blockedValue = "BLOQUEADO";

        const existing = await prisma.radCheck.findFirst({
            where: { username, attribute }
        });

        if (existing) {
            await prisma.radCheck.update({
                where: { id: existing.id },
                data: { value: blockedValue }
            });
        } else {
            await prisma.radCheck.create({
                data: {
                    username,
                    attribute,
                    op: ":=",
                    value: blockedValue
                }
            });
        }

        // 2. Opcionalmente derrubar a sessão ativa (Exige PoD/CoA ou API)
        // Por enquanto, apenas atualizamos a base de dados.
    }

    /**
     * Desbloqueia um assinante no servidor Radius.
     */
    async unblockSubscriber(username: string, planGroup: string = "FULL_ACCESS") {
        

        const attribute = "Mikrotik-Group";

        const existing = await prisma.radCheck.findFirst({
            where: { username, attribute }
        });

        if (existing) {
            await prisma.radCheck.update({
                where: { id: existing.id },
                data: { value: planGroup }
            });
        }
    }

    /**
     * Sincroniza todos os clientes inadimplentes com o Radius (Bloqueio em massa).
     * @returns Número de assinantes bloqueados e lista de usernames processados.
     */
    async syncBlockingRules() {
        // Busca configuração financeira global para verificar dias de carência
        const config = await prisma.financialConfig.findFirst();
        const gracePeriod = config?.gracePeriod || 5;

        

        // Calcula a data limite para bloqueio
        const cutOffDate = new Date();
        cutOffDate.setDate(cutOffDate.getDate() - gracePeriod);

        const overdueInvoices = await prisma.invoice.findMany({
            where: {
                status: 'OVERDUE',
                dueDate: {
                    lt: cutOffDate
                },
                customer: {
                    status: 'ACTIVE' // Apenas bloqueia quem ainda consta como Ativo
                }
            },
            include: { customer: true }
        });

        

        let blockedCount = 0;
        const processedUsers = new Set<string>();
        
        const context = getTenantContext();
        const tenantId = context?.tenantId || "system";
        const tenantSlug = context?.schema?.replace("tenant_", "") || "portal";

        for (const invoice of overdueInvoices) {
            // Convenção de Username: t{tenantId}_{cpfCnpj}
            const username = invoice.customer.cpfCnpj || invoice.customer.id;

            if (processedUsers.has(username)) continue;

            const { RadiusService } = await import("../saas/services/radius.service");
            
            // 1. Bloqueia no Radius via Address-List
            await RadiusService.syncStatus(username, 'BLOCKED');

            // 2. Atualiza o status do cliente localmente
            const customer = await prisma.customer.update({
                where: { id: invoice.customer.id },
                data: { status: 'BLOCKED' }
            });

            // 3. Notificação via WhatsApp (Suspense Alert)
            if (customer.phone) {
                try {
                    const { WhatsAppNotificationService } = await import("../whatsapp/services/whatsapp-notification.service");
                    await WhatsAppNotificationService.sendSuspensionAlert(tenantId, {
                        customerName: customer.name || "Cliente",
                        phone: customer.phone,
                        bolUrl: `https://${tenantSlug}.mikrogestor.com.br/portal/invoice/${invoice.id}/print`,
                        pixCode: "00020126580014BR.GOV.BCB.PIX0136976fd932-..." // Mock ou buscar da fatura
                    });
                } catch (waError) {
                    console.error(`[RadiusEngine] Erro ao notificar suspensão WA para ${customer.id}:`, waError);
                }
            }

            processedUsers.add(username);
            blockedCount++;
        }

        return { blockedCount, processedUsers: Array.from(processedUsers) };
    }
}

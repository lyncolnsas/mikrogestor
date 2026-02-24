import { prisma } from "@/lib/prisma";

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

        for (const invoice of overdueInvoices) {
            // Assume que o username é o CPF/CNPJ (Padrão inicial do sistema)
            const username = invoice.customer.cpfCnpj;

            // Evita duplicidade de bloqueio para o mesmo usuário com múltiplas faturas
            if (processedUsers.has(username)) continue;

            await this.blockSubscriber(username);

            // Atualiza o status do cliente localmente para BLOQUEADO
            await prisma.customer.update({
                where: { id: invoice.customer.id },
                data: { status: 'BLOCKED' }
            });

            processedUsers.add(username);
            blockedCount++;
        }

        return { blockedCount, processedUsers: Array.from(processedUsers) };
    }
}

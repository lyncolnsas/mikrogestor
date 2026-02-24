import { PrismaClient, CustomerStatus } from '@prisma/client';
import { RadiusService } from '../../saas/services/radius.service';
import { WhatsAppInstanceManager } from '../../whatsapp/whatsapp.manager';

export class BlockOverdueJob {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly radiusService: typeof RadiusService
  ) { }

  async execute(tenantId: string) {


    // 1. Busca Configuração Financeira e o primeiro NAS para este tenant
    const [config, nas] = await Promise.all([
      this.prisma.financialConfig.findFirst(),
      this.prisma.nas.findFirst({ where: { tenantId } })
    ]);

    if (!config || !config.autoBlock) {

      return;
    }

    if (!nas) {
      console.warn(`[BlockOverdueJob] Nenhum NAS encontrado para o tenant ${tenantId}. Não é possível sincronizar Radius.`);
    }

    // 2. Calcula data de corte baseada no período de carência
    const gracePeriod = Number(config.gracePeriod);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - gracePeriod);

    // 3. Encontra clientes com faturas atrasadas além do período de carência
    const overdueCustomers = await this.prisma.customer.findMany({
      where: {
        status: 'ACTIVE',
        invoices: {
          some: {
            status: 'OPEN',
            dueDate: { lt: cutoffDate }
          }
        }
      },
      include: { invoices: { where: { status: 'OPEN', dueDate: { lt: cutoffDate } } } }
    });

    if (overdueCustomers.length === 0) {

      return;
    }

    const manager = WhatsAppInstanceManager.getInstance();
    const sock = manager.getInstance(tenantId);

    for (const customer of overdueCustomers) {
      // 4. Atualiza Status para BLOQUEADO
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { status: 'BLOCKED' as CustomerStatus }
      });

      // 5. Desconexão Radius (Disparo de COA/Disconnect)
      if (nas) {
        await this.radiusService.disconnectUser(customer.cpfCnpj!, nas.nasname, nas.secret)
          .catch((e: Error) => console.error(`Radius error for ${customer.id}:`, e));
      }

      // 6. Alerta WhatsApp
      if (customer.phone && sock) {
        const message = `⚠️ *AVISO DE SUSPENSÃO*\n\nOlá, *${customer.name.split(' ')[0]}*.\n\nIdentificamos faturas pendentes há mais de ${gracePeriod} dias. Por este motivo, sua conexão foi suspensa temporariamente.\n\nPara reativar agora, realize o pagamento via *PIX* na sua Central do Assinante. O desbloqueio é automático após o pagamento. ⚡`;

        const jid = `${customer.phone.replace(/\D/g, "")}@s.whatsapp.net`;
        await sock.sendMessage(jid, { text: message }).catch(e => console.error("WA Block Alert Error:", e));
      }
    }

    return { blockedCount: overdueCustomers.length };
  }
}

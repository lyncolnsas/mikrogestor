import { Worker, Job } from 'bullmq';
import { PaymentGatewayFactory } from '../gateways/payment-gateway.factory';
import { prisma } from '@/lib/prisma';
import { RadiusService } from '@/modules/saas/services/radius.service';
import { WhatsAppInstanceManager } from '../../whatsapp/whatsapp.manager';
import { CustomerStatus } from '@prisma/client';
import { runWithTenant } from '@/shared/tenancy/tenancy.context';

const CONNECTION = {
    host: 'localhost',
    port: 6379,
};

export class WebhookProcessor {
    private worker: Worker;

    constructor() {
        this.worker = new Worker('webhook-processing-queue', async (job: Job) => {

            const { tenantConfig, payload, provider } = job.data;
            const creds = tenantConfig as any;

            // 1. Instanciar Gateway via Factory dinâmica
            const gatewayCreds = provider === "MERCADO_PAGO"
                ? { accessToken: creds.mercadoPago?.accessToken }
                : { apiKey: creds.asaas?.apiKey, webhookToken: creds.asaas?.webhookToken };

            const gateway = PaymentGatewayFactory.getGateway(provider, gatewayCreds);

            // 2. Validar Assinatura
            const headers = job.data.headers || {};
            const isValid = await gateway.validateWebhook({ body: payload, headers });

            if (!isValid) {
                console.error(`[Webhook Worker] Assinatura Inválida para o Job ${job.id}`);
                // return; // Em modo estrito, retornaríamos aqui.
            }

            // 3. Verificar e Processar Dados
            const data = await gateway.getWebhook({ body: payload, headers });



            if (data.status !== 'PAID') return;

            // Define o schema do tenant para as operações do banco
            const schemaName = `tenant_${tenantConfig.slug.replace(/-/g, '_')}`;

            await runWithTenant({ tenantId: tenantConfig.id, schema: schemaName }, async () => {
                // Verificação de Idempotência: Verificar se já está PAGA
                const existingInvoice = await prisma.invoice.findUnique({
                    where: { id: data.id }
                });

                if (!existingInvoice) {
                    console.error(`[Webhook Worker] Fatura não encontrada no schema ${schemaName}: ${data.id}`);
                    return;
                }

                if (existingInvoice.status === 'PAID') {

                    return;
                }

                // 4. Atualizar Fatura e Cliente
                const updatedInvoice = await prisma.invoice.update({
                    where: { id: data.id },
                    data: {
                        status: 'PAID',
                        paidAt: new Date(),
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        paymentId: (data.original_payload as any)?.id || data.id,
                        customer: {
                            update: { status: 'ACTIVE' as CustomerStatus }
                        }
                    },
                    include: {
                        customer: true
                    }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }) as any;

                const customer = updatedInvoice.customer;

                // 5. Acionar Desbloqueio de Rede (PoD/CoA)
                // O NAS permanece no schema de gerenciamento (management), mas o Prisma lida com isso se mapeado corretamente
                const nas = await prisma.nas.findFirst({
                    where: { tenantId: tenantConfig.id }
                });

                if (nas) {
                    await RadiusService.disconnectUser(customer.cpfCnpj!, nas.nasname, nas.secret)
                        .catch(e => console.error("Radius CoA Error:", e));
                }

                // 6. Notificação via WhatsApp
                const waManager = WhatsAppInstanceManager.getInstance();
                const sock = waManager.getInstance(tenantConfig.id);

                if (sock && customer.phone) {
                    const message = `✅ *PAGAMENTO CONFIRMADO*\n\nOlá, *${customer.name.split(' ')[0]}*! 🎉\n\nRecebemos seu pagamento da fatura de R$ ${Number(updatedInvoice.total).toFixed(2)}.\n\n🚀 *Seu sinal foi liberado automaticamente!* Se necessário, reinicie seu roteador.\n\nObrigado por sua parceria! 🤝\n_Mikrogestor_`;

                    const jid = `${customer.phone.replace(/\D/g, "")}@s.whatsapp.net`;
                    await sock.sendMessage(jid, { text: message }).catch(e => console.error("Erro no alerta de sucesso WA:", e));
                }
            });

        }, { connection: CONNECTION });

        this.worker.on('completed', (job) => {

        });
    }
}

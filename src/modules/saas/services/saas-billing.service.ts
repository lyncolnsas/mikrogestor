
import { prisma } from "@/lib/prisma";
import { AsaasAdapter } from "@/modules/financial/gateways/asaas.adapter";

/**
 * Service to handle platform-level billing (Platform -> ISP/Tenant)
 */
export class SaasBillingService {
    private static adapter: AsaasAdapter | null = null;

    private static getAdapter() {
        if (!this.adapter) {
            const apiKey = process.env.ASAAS_MASTER_API_KEY;
            const webhookToken = process.env.ASAAS_MASTER_WEBHOOK_TOKEN;

            if (!apiKey) {
                console.error("ASAAS_MASTER_API_KEY não configurada no ambiente.");
            }

            this.adapter = new AsaasAdapter(apiKey || "", webhookToken);
        }
        return this.adapter;
    }

    /**
     * Gera uma nova fatura para o tenant (Plano SaaS do Mikrogestor)
     */
    static async generateInvoice(tenantId: string) {
        

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                subscription: { include: { plan: true } },
                users: { where: { role: 'ISP_ADMIN' }, take: 1 }
            }
        });

        if (!tenant || !tenant.subscription) {
            throw new Error(`Tenant ou assinatura não encontrados para cobrança: ${tenantId}`);
        }

        const subscription = tenant.subscription;
        const plan = subscription.plan;
        const amount = Number(plan.monthlyPrice);
        const adminUser = tenant.users[0];

        if (amount <= 0) {
            
            return null;
        }

        // 1. Criar cobrança no Asaas
        const adapter = this.getAdapter();
        const charge = await adapter.createPix(
            amount,
            `Assinatura Mensal Mikrogestor - Plano ${plan.name}`,
            {
                id: tenant.asaasCustomerId || undefined,
                name: tenant.name,
                email: adminUser?.email || "billing@mikrogestor.com",
                document: tenant.slug // O Tenant normalmente usa o slug como identificador, mas para o Asaas deveríamos ter um campo CNPJ real.
                // Por enquanto, usamos o que temos, mas idealmente o modelo Tenant precisa de um campo cnpj também.
            }
        );

        // 2. Atualizar Tenant com o ID do Cliente Asaas se foi recém-criado/resolvido
        // Extrair o ID do cliente da cobrança se o adaptador retornar?
        // Na verdade, createPix atualmente não retorna o customerId resolvido.
        // Vou modificar createPix para retornar { id, customerId, ... } ou apenas deixar o serviço lidar com isso.
        // Melhor: adapter.getCustomerIdByDocument funciona.

        let asaasCustomerId = tenant.asaasCustomerId;
        if (!asaasCustomerId) {
            asaasCustomerId = await adapter.getCustomerIdByDocument(tenant.slug);
            if (asaasCustomerId) {
                await prisma.tenant.update({
                    where: { id: tenantId },
                    data: { asaasCustomerId }
                });
            }
        }

        // 3. Salvar registro no DB
        const invoice = await prisma.saasInvoice.create({
            data: {
                tenantId,
                subscriptionId: subscription.id,
                amount,
                dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Vencimento em 3 dias
                status: 'PENDING',
                gatewayId: charge.id,
                paymentUrl: charge.paymentUrl,
                pixQrCode: charge.qr_code,
            }
        });

        
        return invoice;
    }

    /**
     * Processa a confirmação de pagamento vinda do Webhook
     */
    static async confirmPayment(gatewayId: string) {
        const invoice = await prisma.saasInvoice.findFirst({
            where: { gatewayId }
        });

        if (!invoice) {
            console.warn(`[SaasBilling] Fatura não encontrada para gatewayId: ${gatewayId}`);
            return;
        }

        await prisma.$transaction([
            // Atualizar Fatura
            prisma.saasInvoice.update({
                where: { id: invoice.id },
                data: {
                    status: 'PAID' as any,
                    paidAt: new Date()
                }
            }),
            // Renovar Período da Assinatura
            prisma.subscription.update({
                where: { id: invoice.subscriptionId },
                data: {
                    status: 'ACTIVE',
                    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            }),
            // Reativar Tenant se estiver bloqueado
            prisma.tenant.update({
                where: { id: invoice.tenantId },
                data: { status: 'ACTIVE' }
            })
        ]);

        
    }
}

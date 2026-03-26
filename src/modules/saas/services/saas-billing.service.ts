import { PaymentGatewayFactory } from "@/modules/financial/gateways/payment-gateway.factory";
import { PaymentGatewayInterface } from "@/modules/financial/gateways/payment-gateway.interface";
import { prisma } from "@/lib/prisma";

/**
 * Service to handle platform-level billing (Platform -> ISP/Tenant)
 */
export class SaasBillingService {
    private static gateway: PaymentGatewayInterface | null = null;

    private static async getGateway() {
        if (!this.gateway) {
            this.gateway = await PaymentGatewayFactory.getSystemGateway();
        }
        return this.gateway;
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

        // 1. Criar cobrança no Gateway
        const gateway = await this.getGateway();
        const charge = await gateway.createPix(
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
            asaasCustomerId = await gateway.getCustomerIdByDocument(tenant.slug);
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

        // 4. Notificar via WhatsApp (Gateway do Sistema)
        if (adminUser?.phone) {
            const { WhatsAppNotificationService } = await import("@/modules/whatsapp/services/whatsapp-notification.service");
            await WhatsAppNotificationService.sendSaasInvoice({
                ispName: tenant.name,
                phone: adminUser.phone,
                value: `R$ ${amount.toFixed(2)}`,
                dueDate: invoice.dueDate.toLocaleDateString("pt-BR"),
                pixCode: invoice.pixQrCode || undefined,
                paymentUrl: invoice.paymentUrl || undefined
            });
        }
        
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

        // 4. Notificar Sucesso via WhatsApp
        const tenant = await prisma.tenant.findUnique({
            where: { id: invoice.tenantId },
            include: { users: { where: { role: 'ISP_ADMIN' }, take: 1 } }
        });

        if (tenant?.users[0]?.phone) {
            const { WhatsAppNotificationService } = await import("@/modules/whatsapp/services/whatsapp-notification.service");
            await WhatsAppNotificationService.sendPaymentConfirmation("SYSTEM", {
                customerName: tenant.name,
                phone: tenant.users[0].phone,
                value: `R$ ${invoice.amount.toFixed(2)}`
            });
        }
    }
}

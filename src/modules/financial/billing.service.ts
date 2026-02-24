import { prisma } from "@/lib/prisma";
import { format, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WhatsAppInstanceManager } from "../whatsapp/whatsapp.manager";

/**
 * Serviço de Faturamento (Billing) do Provedor.
 * Gerencia geração de mensalidades, aplicação de multas e notificações.
 */
export class BillingService {
    /**
     * Gera faturas mensais para todos os clientes ativos de um tenant.
     * Deve ser executado via Job ou manualmente.
     */
    async generateMonthlyInvoices(tenantId: string) {
        

        const customers = await prisma.customer.findMany({
            where: {
                status: 'ACTIVE',
                planId: { not: null }
            },
            include: { plan: true }
        });

        const billingMonth = format(new Date(), 'yyyy-MM');
        let count = 0;

        for (const customer of customers) {
            if (!customer.plan) continue;

            // Verifica se já existe uma fatura para este cliente no mês corrente
            const existingInvoice = await prisma.invoice.findFirst({
                where: {
                    customerId: customer.id,
                    createdAt: {
                        gte: startOfMonth(new Date()),
                        lte: endOfMonth(new Date())
                    }
                }
            });

            if (existingInvoice) continue;

            // 1. Obter Configuração Financeira e Gateway
            const config = await prisma.financialConfig.findFirst();
            const credentials = (config?.gatewayCredentials as any) || {};
            const asaasConfig = credentials.asaas;

            let gatewayId = null;
            let paymentUrl = null;
            let pixQrCode = null;

            // Integrar com Asaas se habilitado
            if (asaasConfig?.enabled && asaasConfig?.apiKey) {
                try {
                    const { AsaasAdapter } = await import("./gateways/asaas.adapter");
                    const adapter = new AsaasAdapter(asaasConfig.apiKey, asaasConfig.webhookToken);

                    const charge = await adapter.createPix(
                        Number(customer.plan.price),
                        `Mensalidade ${customer.plan.name} - Ref: ${billingMonth}`,
                        {
                            id: customer.asaasCustomerId || undefined,
                            name: customer.name,
                            email: `${customer.cpfCnpj}@mikrogestor.com`, // Placeholder de email
                            document: customer.cpfCnpj,
                            phone: customer.phone || undefined
                        }
                    );

                    gatewayId = charge.id;
                    paymentUrl = charge.paymentUrl;
                    pixQrCode = charge.qr_code;

                    // Update customer with Asaas ID if new
                    if (!customer.asaasCustomerId) {
                        const resolvedId = await adapter.getCustomerIdByDocument(customer.cpfCnpj);
                        if (resolvedId) {
                            await prisma.customer.update({
                                where: { id: customer.id },
                                data: { asaasCustomerId: resolvedId }
                            });
                        }
                    }
                } catch (asaasError) {
                    console.error(`[BillingService] Falha ao gerar cobrança Asaas para ${customer.name}:`, asaasError);
                }
            }

            // 2. Cria nova fatura (Invoice)
            const invoice = await prisma.invoice.create({
                data: {
                    customerId: customer.id,
                    status: 'OPEN',
                    total: customer.plan.price,
                    dueDate: addMonths(new Date(), 0),
                    paymentId: gatewayId,
                    paymentUrl: paymentUrl,
                    pixQrCode: pixQrCode,
                    billingType: gatewayId ? 'PIX' : null,
                    items: {
                        create: {
                            description: `Mensalidade ${customer.plan.name} - Ref: ${billingMonth}`,
                            amount: customer.plan.price,
                            quantity: 1
                        }
                    }
                }
            });

            // --- Aplica Ajustes Financeiros Pendentes (Créditos ou Débitos) ---
            const pendingAdjustments = await prisma.financialAdjustment.findMany({
                where: {
                    customerId: customer.id,
                    isApplied: false
                }
            });

            if (pendingAdjustments.length > 0) {
                let adjustmentTotal = 0;
                for (const adj of pendingAdjustments) {
                    await prisma.invoiceItem.create({
                        data: {
                            invoiceId: invoice.id,
                            description: adj.description || `Ajuste Financeiro: ${adj.type}`,
                            amount: adj.amount,
                            quantity: 1
                        }
                    });

                    adjustmentTotal += Number(adj.amount);

                    await prisma.financialAdjustment.update({
                        where: { id: adj.id },
                        data: {
                            isApplied: true,
                            appliedAt: new Date()
                        }
                    });
                }

                // Atualiza o total da fatura com os ajustes aplicados
                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        total: Number(invoice.total) + adjustmentTotal
                    }
                });
            }

            // --- Gatilho de Notificação via WhatsApp ---
            if (customer.phone) {
                const manager = WhatsAppInstanceManager.getInstance();
                const sock = manager.getInstance(tenantId);

                if (sock) {
                    const firstName = customer.name.split(' ')[0];
                    const message = `Olá, *${firstName}*! 👋\n\nSua fatura de *${format(new Date(), 'MMMM', { locale: ptBR })}* já está disponível.\n\n💰 *Valor:* R$ ${Number(invoice.total).toFixed(2)}\n📅 *Vencimento:* ${format(invoice.dueDate, 'dd/MM/yyyy')}\n\nPara pagar agora via *PIX*, acesse sua Central do Assinante.\n\n_Mikrogestor - Simplificando sua Fibra_`;

                    const jid = `${customer.phone.replace(/\D/g, "")}@s.whatsapp.net`;
                    await sock.sendMessage(jid, { text: message }).catch(e => console.error("Erro WA:", e));
                }
            }

            count++;
        }

        return { generated: count };
    }

    /**
     * Calcula juros e multa para faturas pagas em atraso.
     * Regra: Identifica faturas pagas após o vencimento e gera ajustes para a PRÓXIMA fatura.
     */
    async calculateLateFees(invoiceId: string) {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { customer: true }
        });

        if (!invoice || invoice.status !== 'PAID' || !invoice.paidAt) return 0;

        if (invoice.paidAt > invoice.dueDate) {
            // Busca configuração financeira do tenant
            const config = await prisma.financialConfig.findFirst();
            if (!config) return 0;

            const daysLate = Math.ceil((invoice.paidAt.getTime() - invoice.dueDate.getTime()) / (1000 * 3600 * 24));

            // Multa Fixa + Juros Diários
            const { Monetary } = await import("@/lib/monetary");

            const penalty = Monetary.from(config.penaltyAmount);
            const interestRate = Monetary.from(config.interestRate).div(100); // Converte % para decimal
            const invoiceTotal = Monetary.from(invoice.total);

            // Juros = Total * Taxa * Dias de Atraso
            const interest = invoiceTotal.mul(interestRate).mul(daysLate);

            // Taxa Total = Multa + Juros
            const totalFee = penalty.add(interest);

            // Registra o valor total em Ajustes Financeiros para cobrança futura
            await prisma.financialAdjustment.create({
                data: {
                    customerId: invoice.customerId,
                    type: 'INTEREST',
                    amount: totalFee.toNumber(),
                    description: `Juros/Multa por atraso - Fatura Ref: ${format(invoice.dueDate, 'MM/yyyy')}`
                }
            });

            return totalFee.toNumber();
        }

        return 0;
    }
}

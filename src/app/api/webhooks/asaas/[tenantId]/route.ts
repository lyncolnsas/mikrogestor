import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AsaasAdapter } from "@/modules/financial/gateways/asaas.adapter";
import { PaymentService } from "@/modules/financial/services/payment.service";
import { GatewayConfig } from "@/modules/financial/actions/billing.actions";
import { runWithTenant } from "@/shared/tenancy/tenancy.context";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ tenantId: string }> }
) {
    const { tenantId } = await params;

    try {
        // 1. Obter detalhes do Tenant para encontrar o schema correto
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
        });

        if (!tenant) {
            console.error(`[Webhook Asaas] Tenant não encontrado: ${tenantId}`);
            return NextResponse.json({ error: "Tenant não encontrado" }, { status: 404 });
        }

        const schema = `tenant_${tenant.slug.replace(/-/g, '_')}`;

        // 2. Obter corpo da requisição e headers
        const body = await req.json();
        const headers = Object.fromEntries(req.headers.entries());

        // 3. Executar dentro do contexto do tenant usando runWithTenant
        const result = await runWithTenant({ tenantId, schema }, async () => {
            const config = await prisma.financialConfig.findFirst();
            if (!config) {
                throw new Error("Configuração financeira não encontrada");
            }

            const credentials = (config.gatewayCredentials as unknown as GatewayConfig) || {};
            const asaasConfig = credentials.asaas;

            if (!asaasConfig || !asaasConfig.enabled) {
                throw new Error("Gateway Asaas não habilitado para este tenant");
            }

            const adapter = new AsaasAdapter(asaasConfig.apiKey || "", asaasConfig.webhookToken);

            // 4. Validar Webhook
            const isValid = await adapter.validateWebhook({ headers });
            if (!isValid) {
                throw new Error("Assinatura de webhook inválida");
            }

            // 5. Processar Evento
            const webhookData = await adapter.getWebhook({ body });

            if (webhookData.status === "PAID") {
                // Encontrar fatura pelo ID externo (ID de pagamento do Asaas)
                const invoice = await prisma.invoice.findFirst({
                    where: { paymentId: webhookData.id },
                });

                if (!invoice) {
                    console.warn(`[Webhook Asaas] Fatura não encontrada para paymentId: ${webhookData.id}`);
                    return { success: false, message: "Fatura não encontrada" };
                }

                if (invoice.status === "PAID") {
                    return { success: true, message: "Já processado" };
                }

                // 6. Confirmar Pagamento via Serviço
                await PaymentService.confirmPayment(tenantId, invoice.id, prisma);
                return { success: true, message: "Pagamento confirmado" };
            }

            return { success: true, message: "Evento ignorado" };
        });

        return NextResponse.json(result);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Erro Webhook Asaas] [Tenant: ${tenantId}]:`, errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
}

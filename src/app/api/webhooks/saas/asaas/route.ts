
import { NextRequest, NextResponse } from "next/server";
import { SaasBillingService } from "@/modules/saas/services/saas-billing.service";
import { AsaasAdapter } from "@/modules/financial/gateways/asaas.adapter";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const headers = Object.fromEntries(req.headers.entries());

        const apiKey = process.env.ASAAS_MASTER_API_KEY;
        const webhookToken = process.env.ASAAS_MASTER_WEBHOOK_TOKEN;

        if (!apiKey) {
            console.error("[SaaS Webhook] Master API Key not configured.");
            return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
        }

        const adapter = new AsaasAdapter(apiKey, webhookToken);

        // 1. Validate Webhook
        const isValid = await adapter.validateWebhook({ headers });
        if (!isValid) {
            console.warn("[SaaS Webhook] Invalid signature");
            return NextResponse.json({ error: "Invalid Signature" }, { status: 401 });
        }

        // 2. Process Event
        const webhookData = await adapter.getWebhook({ body });

        if (webhookData.status === "PAID") {
            const gatewayId = webhookData.id;
            if (gatewayId) {
                await SaasBillingService.confirmPayment(gatewayId);
                return NextResponse.json({ success: true, message: "Payment confirmed" });
            }
        }

        return NextResponse.json({ success: true, message: "Event received" });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SaaS Webhook Error]:`, errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
}

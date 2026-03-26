import { prisma } from "@/lib/prisma";
import { AsaasAdapter } from "./asaas.adapter";
import { MercadoPagoAdapter } from "./mercado-pago.adapter";
import { PaymentGatewayInterface } from "./payment-gateway.interface";

export type GatewayType = "ASAAS" | "MERCADO_PAGO" | "STRIPE" | "GERENCIANET";

export interface GatewayCredentials {
    apiKey?: string;
    accessToken?: string;
    webhookToken?: string;
    env?: "sandbox" | "production";
}

export class PaymentGatewayFactory {
    /**
     * Retorna o adaptador correto baseado na configuração.
     */
    static getGateway(type: GatewayType, credentials: GatewayCredentials): PaymentGatewayInterface {
        switch (type) {
            case "MERCADO_PAGO":
                if (!credentials.accessToken) throw new Error("Acesso negado: Mercado Pago requer accessToken.");
                return new MercadoPagoAdapter(credentials.accessToken);
            
            case "ASAAS":
            default:
                if (!credentials.apiKey) throw new Error("Acesso negado: Asaas requer apiKey.");
                return new AsaasAdapter(credentials.apiKey, credentials.webhookToken);
        }
    }

    /**
     * Retorna o gateway padrão do sistema (Pelo Mikrogestor Platform)
     */
    static async getSystemGateway(): Promise<PaymentGatewayInterface> {
        // 1. Tentar buscar da base (Configuração via Dashboard)
        try {
            const settings = await prisma.systemSettings.findUnique({
                where: { id: "GLOBAL" }
            });

            if (settings) {
                const config = (settings.gatewayConfig || {}) as GatewayCredentials;
                return this.getGateway(settings.paymentGateway as GatewayType, config);
            }
        } catch (e) {
            console.warn("[PaymentGatewayFactory] Fallback para ENV devido a erro no DB.");
        }

        // 2. Fallback para variáveis de ambiente
        const type = (process.env.ASAAS_MASTER_API_KEY ? "ASAAS" : "MERCADO_PAGO") as GatewayType;
        
        const credentials: GatewayCredentials = {
            apiKey: process.env.ASAAS_MASTER_API_KEY,
            webhookToken: process.env.ASAAS_MASTER_WEBHOOK_TOKEN,
            accessToken: process.env.MERCADO_PAGO_MASTER_ACCESS_TOKEN
        };

        return this.getGateway(type, credentials);
    }
}

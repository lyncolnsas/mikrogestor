import { PaymentGatewayInterface } from './payment-gateway.interface';
import { MercadoPagoAdapter } from './mercadopago.adapter';
import { AsaasAdapter } from './asaas.adapter';

export class PaymentGatewayFactory {
    static create(config: { provider: string; apiKey?: string; accessToken?: string; webhookToken?: string }): PaymentGatewayInterface {
        switch (config.provider) {
            case 'MERCADOPAGO':
                return new MercadoPagoAdapter(config.accessToken || "");
            case 'ASAAS':
                return new AsaasAdapter(config.apiKey || "", config.webhookToken);
            default:
                throw new Error(`Unsupported payment provider: ${config.provider}`);
        }
    }
}

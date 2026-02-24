import { PaymentGatewayInterface, PayerInfo, ChargeResult, WebhookResult } from './payment-gateway.interface';

export class PagSeguroAdapter implements PaymentGatewayInterface {
    private readonly baseUrl = 'https://api.pagseguro.com';

    constructor(
        private readonly token: string,
        private readonly email: string // PagSeguro might use token only or token+email depending on auth type. Keeping simple for now.
    ) { }

    async createPix(amount: number, description: string, payer: PayerInfo): Promise<ChargeResult> {
        
        // TODO: Implement Real PagSeguro API Call
        return {
            id: `ps_mock_${Date.now()}`,
            qr_code: "00020126580014BR.GOV.BCB.PIX...",
            qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAA...",
        };
    }

    async getWebhook(request: { body: unknown }): Promise<WebhookResult> {
        const body = request.body as any;
        // Mock webhook parsing
        return { status: 'UNKNOWN', original_payload: body };
    }

    async validateWebhook(request: { headers: Record<string, string | string[] | undefined> }): Promise<boolean> {
        return true;
    }

    async refund(paymentId: string): Promise<void> {
        
    }

    async getCustomerIdByDocument(document: string): Promise<string | null> {
        
        return null; // Mock: Not found
    }

    async createCustomer(payer: PayerInfo): Promise<string> {
        
        return `ps_cust_${Date.now()}`;
    }
}

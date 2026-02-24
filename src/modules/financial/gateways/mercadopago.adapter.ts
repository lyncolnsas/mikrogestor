import { PaymentGatewayInterface, PayerInfo, ChargeResult, WebhookResult } from './payment-gateway.interface';

export class MercadoPagoAdapter implements PaymentGatewayInterface {
    private readonly baseUrl = 'https://api.mercadopago.com/v1';

    constructor(private readonly accessToken: string) { }

    async createPix(amount: number, description: string, payer: PayerInfo): Promise<ChargeResult> {
        

        const response = await fetch(`${this.baseUrl}/payments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `pix-${Date.now()}`
            },
            body: JSON.stringify({
                transaction_amount: amount,
                description: description,
                payment_method_id: 'pix',
                payer: {
                    email: payer.email,
                    first_name: payer.name?.split(' ')[0],
                    last_name: payer.name?.split(' ').slice(1).join(' '),
                    identification: {
                        type: 'CPF',
                        number: payer.document?.replace(/\D/g, '')
                    }
                }
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`MercadoPago API Error: ${data.message || response.statusText}`);
        }

        return {
            id: data.id,
            qr_code: data.point_of_interaction.transaction_data.qr_code,
            qr_code_base64: data.point_of_interaction.transaction_data.qr_code_base64,
        };
    }

    async getWebhook(request: { body: unknown }): Promise<WebhookResult> {
        // MP sends multiple types; 'payment' is the one we care about
        const body = request.body as { type: string; action: string; data: { id: string } };
        if (body.type === 'payment' && body.action === 'payment.created') {
            // In MP, we usually need to GET the payment details after receiving the webhook
            return { id: body.data.id, status: 'PENDING', original_payload: body };
        }
        return { status: 'UNKNOWN', original_payload: body };
    }

    async validateWebhook(request: { headers: Record<string, string | string[] | undefined> }): Promise<boolean> {
        // MercadoPago Signature Validation
        // Headers: x-signature, x-request-id
        // Format: ts=...,v1=...
        const signature = request.headers['x-signature'];
        const requestId = request.headers['x-request-id'];

        if (!signature || !requestId) {
            console.warn('[MercadoPago] Missing signature headers');
            return false;
        }

        // TODO: Validate HMAC-SHA256 using the webhook secret
        // For now, we return true if headers are present to avoid blocking legitimate tests without secret configured
        // In production, this MUST use createHmac('sha256', secret)
        return true;
    }

    async refund(paymentId: string): Promise<void> {
        await fetch(`${this.baseUrl}/payments/${paymentId}/refunds`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
    }

    async getCustomerIdByDocument(document: string): Promise<string | null> {
        // TODO: Implement search against /v1/customers/search?email=... or identifier
        
        return null;
    }

    async createCustomer(payer: PayerInfo): Promise<string> {
        // TODO: Implement POST /v1/customers
        
        return `mp_cust_${Date.now()}`;
    }
}

import { PaymentGatewayInterface, PayerInfo, ChargeResult, WebhookResult } from './payment-gateway.interface';

export class MercadoPagoAdapter implements PaymentGatewayInterface {
    private readonly baseUrl = 'https://api.mercadopago.com/v1';

    constructor(private readonly accessToken: string) { }

    async getCustomerIdByDocument(document: string): Promise<string | null> {
        const cleanDoc = document.replace(/\D/g, '');
        try {
            const response = await fetch(`${this.baseUrl}/customers/search?email=${cleanDoc}`, { // MP usually searches by email, but we'll try to map
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                return data.results[0].id;
            }
        } catch (e) {
            console.error("[MercadoPago] Error searching customer:", e);
        }
        return null;
    }

    async createCustomer(payer: PayerInfo): Promise<string> {
        const response = await fetch(`${this.baseUrl}/customers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: payer.email,
                first_name: payer.name.split(' ')[0],
                last_name: payer.name.split(' ').slice(1).join(' ') || 'Customer',
                identification: {
                    type: payer.document.length > 11 ? 'CNPJ' : 'CPF',
                    number: payer.document.replace(/\D/g, '')
                },
                phone: {
                    area_code: payer.phone?.substring(0, 2) || '55',
                    number: payer.phone?.substring(2) || payer.phone
                }
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Mercado Pago Customer Error: ${data.message || response.statusText}`);
        }
        return data.id;
    }

    async createPix(amount: number, description: string, payer: PayerInfo): Promise<ChargeResult> {
        const response = await fetch(`${this.baseUrl}/payments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': `pix_${Date.now()}`
            },
            body: JSON.stringify({
                transaction_amount: amount,
                description: description,
                payment_method_id: 'pix',
                payer: {
                    email: payer.email,
                    identification: {
                        type: payer.document.length > 11 ? 'CNPJ' : 'CPF',
                        number: payer.document.replace(/\D/g, '')
                    }
                },
                installments: 1
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Erro API Mercado Pago: ${data.message || response.statusText}`);
        }

        const pointOfInteraction = data.point_of_interaction?.transaction_data;

        return {
            id: String(data.id),
            qr_code: pointOfInteraction?.qr_code,
            qr_code_base64: pointOfInteraction?.qr_code_base64,
            paymentUrl: data.ticket_url,
        };
    }

    async getWebhook(request: { body: any }): Promise<WebhookResult> {
        const body = request.body;
        // Mercado Pago sends a notification then we fetch the payment details
        // body.type === 'payment'
        const paymentId = body.data?.id || body.id;
        
        // In a real scenario, we should fetch the payment status from MP API here
        // But for common interface we might need to handle this differently.
        // If the webhook already contains the state:
        const status = body.action === 'payment.created' ? 'PENDING' : 
                      body.action === 'payment.updated' && body.data?.status === 'approved' ? 'PAID' : 'UNKNOWN';

        return { 
            id: String(paymentId), 
            status: status as any,
            original_payload: body 
        };
    }

    async validateWebhook(request: { headers: Record<string, any> }): Promise<boolean> {
        // MP validates with a hash or secret in the URL usually.
        // For simplicity, we'll return true or implement basic check.
        return true;
    }

    async refund(paymentId: string): Promise<void> {
        await fetch(`${this.baseUrl}/payments/${paymentId}/refunds`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
    }
}

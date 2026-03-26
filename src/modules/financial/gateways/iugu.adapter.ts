import { PaymentGatewayInterface, PayerInfo, ChargeResult, WebhookResult } from './payment-gateway.interface';

export interface IuguInvoice {
    id: string;
    due_date: string;
    items: {
        description: string;
        quantity: number;
        price_cents: number;
    }[];
    email: string;
    payer: {
        cpf_cnpj: string;
        name: string;
        email: string;
    };
    payment_method: 'all' | 'pix' | 'bank_slip' | 'credit_card';
}

export class IuguAdapter implements PaymentGatewayInterface {
    private readonly baseUrl = 'https://api.iugu.com/v1';

    constructor(
        private readonly apiKey: string,
        private readonly accountId?: string
    ) {}

    async createPix(amount: number, description: string, payer: PayerInfo): Promise<ChargeResult> {
        const response = await fetch(`${this.baseUrl}/invoices`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ensure_workday_due_date: false,
                items: [{
                    description: description,
                    quantity: 1,
                    price_cents: Math.round(amount * 100)
                }],
                email: payer.email,
                payer: {
                    cpf_cnpj: payer.document.replace(/\D/g, ''),
                    name: payer.name
                },
                payment_method: 'pix'
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`IUGU Error: ${JSON.stringify(data.errors) || response.statusText}`);
        }

        return {
            id: data.id,
            qr_code: data.pix.qrcode_text,
            qr_code_base64: data.pix.qrcode,
            paymentUrl: data.secure_url
        };
    }

    async getWebhook(request: { body: unknown }): Promise<WebhookResult> {
        const body = request.body as { event: string; data: { id: string; status: string } };
        
        if (body.event === 'invoice.paid' || body.event === 'invoice.status_changed') {
            const statusMap: Record<string, 'PAID' | 'PENDING' | 'CANCELLED' | 'REFUNDED'> = {
                'paid': 'PAID',
                'pending': 'PENDING',
                'canceled': 'CANCELLED',
                'refunded': 'REFUNDED'
            };

            return {
                id: body.data.id,
                status: statusMap[body.data.status] || 'UNKNOWN',
                original_payload: body
            };
        }

        return { status: 'UNKNOWN', original_payload: body };
    }

    async validateWebhook(request: { body: unknown }): Promise<boolean> {
        // Iugu uses a simple accountId check for extra security if not using full sig verification
        const body = request.body as { account_id?: string };
        if (this.accountId && body.account_id !== this.accountId) {
            console.warn('[Iugu] Webhook Account ID Mismatch');
            return false;
        }
        return true;
    }

    async refund(paymentId: string): Promise<void> {
        await fetch(`${this.baseUrl}/invoices/${paymentId}/refund`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}` }
        });
    }

    async getCustomerIdByDocument(document: string): Promise<string | null> {
        // Iugu Customers API: GET /v1/customers?query=...
        return null;
    }

    async createCustomer(payer: PayerInfo): Promise<string> {
        const response = await fetch(`${this.baseUrl}/customers`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: payer.email,
                name: payer.name,
                cpf_cnpj: payer.document.replace(/\D/g, '')
            })
        });

        const data = await response.json();
        return data.id;
    }
}

import { PaymentGatewayInterface, PayerInfo, ChargeResult, WebhookResult } from './payment-gateway.interface';

export class AsaasAdapter implements PaymentGatewayInterface {
    private readonly baseUrl = 'https://api.asaas.com/v3';

    constructor(private readonly apiKey: string, private readonly webhookToken?: string) { }

    async getCustomerIdByDocument(document: string): Promise<string | null> {
        const cleanDoc = document.replace(/\D/g, '');
        const response = await fetch(`${this.baseUrl}/customers?cpfCnpj=${cleanDoc}`, {
            headers: { 'access_token': this.apiKey }
        });
        const data = await response.json();
        if (data.data && data.data.length > 0) {
            return data.data[0].id;
        }
        return null;
    }

    async createCustomer(payer: PayerInfo): Promise<string> {
        const response = await fetch(`${this.baseUrl}/customers`, {
            method: 'POST',
            headers: {
                'access_token': this.apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: payer.name,
                email: payer.email,
                cpfCnpj: payer.document.replace(/\D/g, ''),
                mobilePhone: payer.phone?.replace(/\D/g, ''),
                externalReference: payer.id
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Asaas Customer Error: ${data.errors?.[0]?.description || response.statusText}`);
        }
        return data.id;
    }

    async createPix(amount: number, description: string, payer: PayerInfo): Promise<ChargeResult> {
        

        // 1. Resolver ID do Cliente
        let asaasCustomerId: string | undefined = payer.id; // Assume que já existe se fornecido e for um ID do Asaas

        // Se payer.id não parece um ID do Asaas (não começa com cus_), tenta buscar pelo documento
        if (!asaasCustomerId || !asaasCustomerId.startsWith('cus_')) {
            const resolvedId = await this.getCustomerIdByDocument(payer.document);

            if (resolvedId) {
                asaasCustomerId = resolvedId;
            } else {
                asaasCustomerId = await this.createCustomer(payer);
            }
        }

        const response = await fetch(`${this.baseUrl}/payments`, {
            method: 'POST',
            headers: {
                'access_token': this.apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                billingType: 'PIX',
                value: amount,
                customer: asaasCustomerId,
                description: description,
                dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // 1 dia de vencimento
                postalService: false
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Erro API Asaas: ${data.errors?.[0]?.description || response.statusText}`);
        }

        // Buscar QR Code
        const qrResponse = await fetch(`${this.baseUrl}/payments/${data.id}/pixQrCode`, {
            headers: { 'access_token': this.apiKey }
        });
        const qrData = await qrResponse.json();

        return {
            id: data.id,
            qr_code: qrData.payload,
            encoded_image: qrData.encodedImage,
            paymentUrl: data.bankInvoiceUrl || data.invoiceUrl,
        };
    }

    async getWebhook(request: { body: unknown }): Promise<WebhookResult> {
        const body = request.body as Record<string, unknown>;
        const event = body.event as string;
        const payment = body.payment as { id: string };

        switch (event) {
            case 'PAYMENT_CONFIRMED':
            case 'PAYMENT_RECEIVED':
                return { id: payment.id, status: 'PAID', original_payload: body };
            case 'PAYMENT_OVERDUE':
                return { id: payment.id, status: 'OVERDUE', original_payload: body };
            case 'PAYMENT_DELETED':
            case 'PAYMENT_CANCELLED':
                return { id: payment.id, status: 'CANCELLED', original_payload: body };
            case 'PAYMENT_REFUNDED':
                return { id: payment.id, status: 'REFUNDED', original_payload: body };
            default:
                return { id: payment?.id, status: 'PENDING', original_payload: body };
        }
    }

    async validateWebhook(request: { headers: Record<string, string | string[] | undefined> }): Promise<boolean> {
        const incomingToken = request.headers['asaas-access-token'];
        if (!this.webhookToken) return true;
        return incomingToken === this.webhookToken;
    }

    async refund(paymentId: string): Promise<void> {
        
        await fetch(`${this.baseUrl}/payments/${paymentId}/refund`, {
            method: 'POST',
            headers: { 'access_token': this.apiKey }
        });
    }
}

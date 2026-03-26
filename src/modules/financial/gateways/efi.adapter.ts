import { PaymentGatewayInterface, PayerInfo, ChargeResult, WebhookResult } from './payment-gateway.interface';

export class EfiAdapter implements PaymentGatewayInterface {
    private readonly baseUrl: string;

    constructor(
        private readonly clientId: string,
        private readonly clientSecret: string,
        private readonly sandbox: boolean = false,
        private readonly certificate?: string // base64 cert for Pix
    ) {
        this.baseUrl = sandbox 
            ? 'https://sandbox.gerencianet.com.br/v1' 
            : 'https://api.gerencianet.com.br/v1';
    }

    private async getAccessToken(): Promise<string> {
        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
        const response = await fetch(`${this.baseUrl}/authorize`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ grant_type: 'client_credentials' })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`EFI Auth Error: ${data.error_description || data.message || response.statusText}`);
        }
        return data.access_token;
    }

    async createPix(amount: number, description: string, payer: PayerInfo): Promise<ChargeResult> {
        const token = await this.getAccessToken();
        
        // EFI uses a specific route for Pix (/v2/cob)
        const pixUrl = this.sandbox 
            ? 'https://pix-h.gerencianet.com.br/v2/cob' 
            : 'https://pix.gerencianet.com.br/v2/cob';

        const response = await fetch(pixUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                calendario: { expiracao: 3600 },
                devedor: {
                    cpf: payer.document.replace(/\D/g, ''),
                    nome: payer.name
                },
                valor: { original: amount.toFixed(2) },
                chave: description, // Normally the ISP's Pix Key
                solicitacaoPagador: description
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`EFI Pix Error: ${data.mensagem || response.statusText}`);
        }

        return {
            id: data.txid,
            qr_code: data.pixCopiaECola,
            // QR Code image is usually generated locally from pixCopiaECola or via their /v2/loc/{id}/qrcode
        };
    }

    async getWebhook(request: { body: unknown }): Promise<WebhookResult> {
        const body = request.body as any;
        
        // EFI Webhook for Pix usually sends an array of 'pix' objects
        if (body.pix && body.pix.length > 0) {
            const p = body.pix[0];
            return {
                id: p.txid,
                status: 'PAID',
                original_payload: body
            };
        }

        return { status: 'UNKNOWN', original_payload: body };
    }

    async validateWebhook(request: { headers: Record<string, string | string[] | undefined> }): Promise<boolean> {
        // EFI standard webhooks use a token validation or IP whitelist
        // For security in production, users should verify headers['user-agent'] or similar if not using mTLS
        return true;
    }

    async refund(paymentId: string): Promise<void> {
        const token = await this.getAccessToken();
        const pixUrl = this.sandbox 
            ? `https://pix-h.gerencianet.com.br/v2/pix/${paymentId}/devolucao` 
            : `https://pix.gerencianet.com.br/v2/pix/${paymentId}/devolucao`;

        await fetch(pixUrl, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    }

    async getCustomerIdByDocument(document: string): Promise<string | null> {
        return null;
    }

    async createCustomer(payer: PayerInfo): Promise<string> {
        return `efi_${Date.now()}`;
    }
}

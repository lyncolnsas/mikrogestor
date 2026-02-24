export interface PayerInfo {
    id?: string;
    name: string;
    email: string;
    document: string; // CPF or CNPJ
    phone?: string;
}

export interface ChargeResult {
    id: string;
    qr_code: string;
    qr_code_base64?: string;
    encoded_image?: string;
    paymentUrl?: string; // Optional URL for bank invoice or checkout
}

export interface WebhookResult {
    id?: string;
    status: 'PAID' | 'PENDING' | 'CANCELLED' | 'UNKNOWN' | 'OVERDUE' | 'REFUNDED';
    original_payload: unknown;
}

export interface PaymentGatewayInterface {
    createPix(amount: number, description: string, payer: PayerInfo): Promise<ChargeResult>;
    getWebhook(request: { body: unknown; headers: Record<string, string | string[] | undefined> }): Promise<WebhookResult>;
    validateWebhook(request: { body: unknown; headers: Record<string, string | string[] | undefined> }): Promise<boolean>;
    refund(paymentId: string): Promise<void>;

    // Gestão de Clientes
    /**
     * Busca o ID do cliente no gateway através do documento (CPF/CNPJ)
     */
    getCustomerIdByDocument(document: string): Promise<string | null>;

    /**
     * Cria um novo registro de cliente no gateway
     */
    createCustomer(payer: PayerInfo): Promise<string>;
}

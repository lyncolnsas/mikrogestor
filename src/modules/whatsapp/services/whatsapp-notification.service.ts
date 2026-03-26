import { WhatsAppInstanceManager } from "../whatsapp.manager";

export class WhatsAppNotificationService {
    private static manager = WhatsAppInstanceManager.getInstance();

    /**
     * Envia uma mensagem de texto simples
     */
    public static async sendMessage(tenantId: string, phone: string, text: string) {
        try {
            const sock = this.manager.getInstance(tenantId);
            if (!sock) {
                console.error(`[WhatsApp] Sessão não encontrada para o tenant ${tenantId}`);
                return false;
            }

            // Formata o número (garantindo o código do país e removendo caracteres especiais)
            const cleanPhone = phone.replace(/\D/g, "");
            const jid = cleanPhone.startsWith("55") ? `${cleanPhone}@s.whatsapp.net` : `55${cleanPhone}@s.whatsapp.net`;

            await sock.sendMessage(jid, { text });
            return true;
        } catch (error) {
            console.error(`[WhatsApp] Erro ao enviar mensagem para ${phone}:`, error);
            return false;
        }
    }

    /**
     * Envia notificação de nova fatura gerada
     */
    public static async sendNewInvoice(tenantId: string, data: {
        customerName: string,
        phone: string,
        invoiceId: string,
        value: string,
        dueDate: string,
        pixCode?: string,
        bolUrl?: string
    }) {
        const message = `Olá, *${data.customerName.split(" ")[0]}*! 📡\n\n` +
            `Sua fatura do mês já está disponível:\n` +
            `💰 *Valor:* ${data.value}\n` +
            `📅 *Vencimento:* ${data.dueDate}\n\n` +
            (data.pixCode ? `🚀 *Pagamento via PIX (Liberação Imediata):*\n\`${data.pixCode}\`\n\n` : "") +
            (data.bolUrl ? `📄 *Link do Boleto:* ${data.bolUrl}\n\n` : "") +
            `Agradecemos a preferência! 🚀`;

        return this.sendMessage(tenantId, data.phone, message);
    }

    /**
     * Envia aviso de suspensão por inadimplência
     */
    public static async sendSuspensionAlert(tenantId: string, data: {
        customerName: string,
        phone: string,
        pixCode?: string,
        bolUrl?: string
    }) {
        const message = `⚠️ *AVISO DE INTERRUPÇÃO* ⚠️\n\n` +
            `Olá, *${data.customerName.split(" ")[0]}*!\n\n` +
            `Identificamos uma pendência em sua assinatura e o sinal de internet foi suspenso temporariamente. 🛑\n\n` +
            `Para reativar agora mesmo, pague via PIX abaixo:\n\n` +
            (data.pixCode ? `🔑 *Copia e Cola:* \n\`${data.pixCode}\`\n\n` : "") +
            (data.bolUrl ? `📄 *Boleto:* ${data.bolUrl}\n\n` : "") +
            `*DICA:* Assim que o PIX for pago, o sinal volta em até 2 minutos! ⚡`;

        return this.sendMessage(tenantId, data.phone, message);
    }

    /**
     * Envia lembrete no dia do vencimento para evitar suspensão
     */
    public static async sendDueDateReminder(tenantId: string, data: {
        customerName: string,
        phone: string,
        value: string,
        pixCode?: string,
        paymentUrl?: string
    }) {
        // 1. Envia a mensagem de impacto inicial
        const initialMessage = `⚠️ *AVISO IMPORTANTE* ⚠️\n\n` +
            `Olá, *${data.customerName.split(" ")[0]}*! 📡\n\n` +
            `*EVITE FICAR SEM INTERNET!* 🛑\n` +
            `Sua fatura vence *HOJE* e queremos garantir que sua conexão continue voando. 🚀\n\n` +
            `💰 *Valor:* ${data.value}\n\n` +
            `*ESSE É NOSSO PIX:* 👇🏼`;

        await this.sendMessage(tenantId, data.phone, initialMessage);

        // 2. Envia a chave Pix em uma mensagem separada (Mais fácil para copiar no Celular)
        if (data.pixCode) {
            await this.sendMessage(tenantId, data.phone, data.pixCode);
        }

        // 3. Envia link de pagamento alternativo se existir
        if (data.paymentUrl) {
            await this.sendMessage(tenantId, data.phone, `🔗 *Link para Cartão ou Boleto:* \n${data.paymentUrl}`);
        }

        return true;
    }

    /**
     * Envia comprovante de pagamento recebido e agradecimento
     */
    public static async sendPaymentConfirmation(tenantId: string, data: {
        customerName: string,
        phone: string,
        value: string
    }) {
        const message = `✅ *PAGAMENTO IDENTIFICADO* ✅\n\n` +
            `Olá, *${data.customerName.split(" ")[0]}*!\n\n` +
            `Recebemos o seu pagamento de *${data.value}*. Muito obrigado por manter sua conexão em dia! 👋🏼✨\n\n` +
            `Sua internet continua voando sem interrupções. Bom uso! 🚀🌐`;

        return this.sendMessage(tenantId, data.phone, message);
    }

    /**
     * Envia uma mensagem usando a instância do SISTEMA (SaaS Admin)
     */
    public static async sendSystemMessage(phone: string, text: string) {
        return this.sendMessage("SYSTEM", phone, text);
    }

    /**
     * Envia cobrança do SaaS para o ISP
     */
    public static async sendSaasInvoice(data: {
        ispName: string,
        phone: string,
        value: string,
        dueDate: string,
        pixCode?: string,
        paymentUrl?: string
    }) {
        const message = `🚀 *MIKROGESTOR SAAS* 📡\n\n` +
            `Olá, *${data.ispName}*!\n\n` +
            `Sua mensalidade do Mikrogestor está disponível para pagamento:\n` +
            `💰 *Valor:* ${data.value}\n` +
            `📅 *Vencimento:* ${data.dueDate}\n\n` +
            (data.pixCode ? `⚡ *Pague via PIX (Copia e Cola):*\n\`${data.pixCode}\`\n\n` : "") +
            (data.paymentUrl ? `🔗 *Link de Pagamento:* ${data.paymentUrl}\n\n` : "") +
            `Mantenha sua plataforma ativa e automatizada enviando o comprovante ou aguardando a compensação automática! 🚀`;

        return this.sendSystemMessage(data.phone, message);
    }
}

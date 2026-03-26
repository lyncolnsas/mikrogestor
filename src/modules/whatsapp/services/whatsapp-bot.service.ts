import { proto } from "@whiskeysockets/baileys";
import { WhatsAppNotificationService } from "./whatsapp-notification.service";
import { prisma } from "@/lib/prisma";

export class WhatsAppBotService {
    /**
     * Handles incoming messages from interactive bot
     */
    public static async handleIncoming(tenantId: string, msg: proto.IWebMessageInfo) {
        const phone = msg.key?.remoteJid?.split("@")[0] || "";
        if (!phone || phone.includes("-")) return; // Skip groups or no phone

        const text = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || 
                     "";
        
        if (!text) return;

        // 1. Identify customer
        const customer = await prisma.customer.findFirst({
            where: {
                phone: { contains: phone.slice(-8) }, // Fuzzy match
            },
            include: {
                invoices: {
                    where: { status: "OPEN" },
                    orderBy: { dueDate: "asc" },
                }
            }
        });

        if (!customer) {
            // Unregistered or non-customer? Skip for now to avoid spam.
            return;
        }

        const cleanText = text.trim().toLowerCase();

        // 2. Logic Router
        if (cleanText === "1") {
            return this.handleSecondCopy(tenantId, customer);
        }

        if (cleanText === "desbloquear" || cleanText === "3") {
            return this.handleAutoUnblock(tenantId, customer);
        }

        if (cleanText === "2" || cleanText.includes("suporte") || cleanText.includes("problema")) {
            return this.handleSupportRequest(tenantId, customer, text);
        }

        // 3. Main Menu (Fallback)
        const menuMessage = `Olá, *${customer.name.split(" ")[0]}*! 👋🏼🤖\n\n` +
            `Sou o assistente digital do seu Provedor. Como posso te ajudar hoje?\n\n` +
            `Digite *1* para: 📄 2ª Via de Fatura\n` +
            `Digite *2* para: 🛠️ Suporte Técnico\n` +
            `Digite *3* para: ⚡ Desbloqueio Temporário (24h)`;

        await WhatsAppNotificationService.sendMessage(tenantId, phone, menuMessage);
    }

    /**
     * Handles 2nd copy request (Menu 1)
     */
    private static async handleSecondCopy(tenantId: string, customer: any) {
        const latestInvoice = customer.invoices[0];
        if (!latestInvoice) {
            return WhatsAppNotificationService.sendMessage(tenantId, customer.phone!, "Você não possui faturas pendentes hoje! 👋🏼✨ Seu sinal está em dia!");
        }

        await WhatsAppNotificationService.sendDueDateReminder(tenantId, {
            customerName: customer.name,
            phone: customer.phone!,
            value: `R$ ${latestInvoice.total ? Number(latestInvoice.total).toFixed(2) : '0,00'}`,
            pixCode: latestInvoice.pixQrCode,
            paymentUrl: latestInvoice.paymentUrl
        });
    }

    /**
     * Handles Trust Unblock request (Menu 3)
     */
    private static async handleAutoUnblock(tenantId: string, customer: any) {
        // Business Rule: One unblock every 30 days
        const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        if (customer.lastUnblockAt && new Date(customer.lastUnblockAt) > THIRTY_DAYS_AGO) {
            return WhatsAppNotificationService.sendMessage(tenantId, customer.phone!, "⚠️ *LIMITE ATINGIDO*\n\nVocê já utilizou o desbloqueio de confiança nos últimos 30 dias. Por favor, quite sua fatura para liberar o sinal permanentemente! 🚀");
        }

        // Update DB
        await prisma.customer.update({
            where: { id: customer.id },
            data: { 
                lastUnblockAt: new Date(), 
                status: "ACTIVE" 
            }
        });

        const msg = `⚡ *DESBLOQUEIO ATIVADO* ⚡\n\n` +
            `Liberamos sua internet por 24 horas como um bônus de confiança! 🚀\n\n` +
            `Aguarde 2 minutos e reinicie seu roteador se necessário. Lembre-se de anexar o comprovante para evitar nova suspensão! 👋🏼🤖`;

        await WhatsAppNotificationService.sendMessage(tenantId, customer.phone!, msg);
    }

    /**
     * Handles Support Tickets (Menu 2)
     */
    private static async handleSupportRequest(tenantId: string, customer: any, text: string) {
        // Generate Unique Protocol: YYYYMMDD + Random
        const protocol = `${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

        // Create Ticket in DB
        await prisma.supportTicket.create({
            data: {
                protocol,
                customerId: customer.id,
                description: text,
                messages: {
                    create: {
                        sender: "CUSTOMER",
                        text: text
                    }
                }
            }
        });

        const reply = `🛠️ *SUPORTE REGISTRADO* 🛠️\n\n` +
            `Olá, *${customer.name.split(" ")[0]}*! Seu chamado foi aberto agora mesmo.\n\n` +
            `🎫 *Protocolo:* #${protocol}\n\n` +
            `Nosso suporte técnico foi notificado e logo entraremos em contato para agendar seu horário. Agradecemos a paciência! 👋🏼🤖`;

        await WhatsAppNotificationService.sendMessage(tenantId, customer.phone!, reply);
    }
}

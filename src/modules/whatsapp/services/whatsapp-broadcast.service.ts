import { WhatsAppInstanceManager } from "../whatsapp.manager";
import { prisma } from "@/lib/prisma";

export class WhatsAppBroadcastService {
    private static manager = WhatsAppInstanceManager.getInstance();

    /**
     * Cria um grupo oficial de avisos para o ISP
     */
    public static async createAnnouncementGroup(tenantId: string, groupName: string, customers: any[]) {
        try {
            const sock = this.manager.getInstance(tenantId);
            if (!sock) throw new Error("Instância WhatsApp não carregada");

            // 1. Criar o grupo
            const group = await sock.groupCreate(groupName, []); // Começa vazio para evitar erros
            const groupId = group.id;

            // 2. Travar o grupo (Somente admins podem enviar mensagens)
            await sock.groupSettingUpdate(groupId, 'announcement');

            // 3. Adicionar membros em lotes (Evitar detecção do WhatsApp)
            const phoneList = customers
                .map(c => c.phone?.replace(/\D/g, ""))
                .filter(Boolean)
                .map(p => p!.startsWith("55") ? `${p}@s.whatsapp.net` : `55${p}@s.whatsapp.net`);

            // Dividir em blocos de 15 membros p/ ser mais discreto
            for (let i = 0; i < phoneList.length; i += 15) {
                const batch = phoneList.slice(i, i + 15);
                await sock.groupParticipantsUpdate(groupId, batch, "add");
                await new Promise(r => setTimeout(r, 2000)); // Delay entre lotes
            }

            return groupId;
        } catch (error) {
            console.error("[WhatsAppBroadcast] Erro ao criar grupo:", error);
            throw error;
        }
    }

    /**
     * MODO PÂNICO: Dispara aviso de novo número em grupo e envia vCard
     */
    public static async triggerPanicMode(tenantId: string, groupName: string) {
        const sock = this.manager.getInstance(tenantId);
        if (!sock) throw new Error("Nova instância não conectada");

        // 1. Pegar todos os clientes ativos
        const customers = await prisma.customer.findMany({
            where: { status: "ACTIVE", phone: { not: null } }
        });

        // 2. Criar o grupo de crise
        const groupId = await this.createAnnouncementGroup(tenantId, groupName, customers);

        // 3. Gerar vCard do NOVO número
        const myNumber = sock.user?.id.split(":")[0];
        const vcard = 'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            `FN:Suporte Oficial - ${groupName}\n` +
            `ORG:Mikrogestor ISP;\n` +
            `TEL;type=CELL;type=VOICE;waid=${myNumber}:+${myNumber}\n` +
            'END:VCARD';

        // 4. Enviar Aviso de Impacto
        const panicMessage = `🚨 *AVISO URGENTE AOS CLIENTES* 🚨\n\n` +
            `Prezados clientes, nosso canal de atendimento anterior foi desativado temporariamente pela Meta.\n\n` +
            `*ESTE É O NOSSO NOVO NÚMERO OFICIAL!* ✅⚔️\n\n` +
            `Por favor, salve o contato que enviaremos abaixo para continuar recebendo suas faturas e ter suporte técnico ultra-rápido. 👋🏼🤖`;

        await sock.sendMessage(groupId, { text: panicMessage });

        // 5. Enviar o Cartão de Contato
        await sock.sendMessage(groupId, {
            contacts: {
                displayName: `Suporte ${groupName}`,
                contacts: [{ vcard }]
            }
        });

        return groupId;
    }
}

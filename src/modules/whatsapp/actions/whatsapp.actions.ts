"use server"

import { WhatsAppInstanceManager } from "../whatsapp.manager";
import { getCurrentTenant } from "@/lib/auth-utils.server";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";

/**
 * Initializes a WhatsApp session for the current ISP tenant 
 * and returns the QR code as a Data URL.
 */
export async function getWhatsAppQrCode() {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Unauthorized");

    const manager = WhatsAppInstanceManager.getInstance();

    return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("Demora na conexão com WhatsApp. Tente novamente."));
        }, 30000); // 30s timeout

        try {
            manager.initInstance(
                context.tenantId,
                async (qr) => {
                    clearTimeout(timeout);
                    const qrDataUrl = await QRCode.toDataURL(qr, {
                        scale: 8,
                        margin: 2,
                        color: {
                            dark: "#4f46e5", // Indigo-600
                            light: "#ffffff"
                        }
                    });
                    resolve(qrDataUrl);
                },
                () => {
                    clearTimeout(timeout);
                    reject(new Error("WhatsApp já está conectado!"));
                }
            );
        } catch (error) {
            clearTimeout(timeout);
            reject(error instanceof Error ? error.message : "Erro desconhecido");
        }
    });
}

/**
 * Checks the current connection status of the WhatsApp instance.
 */
export async function getWhatsAppStatus() {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Unauthorized");

    const manager = WhatsAppInstanceManager.getInstance();
    const instance = manager.getInstance(context.tenantId);

    return {
        connected: !!instance,
        activeInstances: manager.getActiveCount()
    };
}

/**
 * Disconnects and destroys the WhatsApp session for the current tenant.
 */
export async function disconnectWhatsApp() {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Unauthorized");

    const manager = WhatsAppInstanceManager.getInstance();
    await manager.closeInstance(context.tenantId);

    revalidatePath("/settings/financial");
    return { success: true };
}

/**
 * Generic helper to send a WhatsApp message from an action.
 */
export async function sendWhatsAppMessage(to: string, text: string) {
    const context = await getCurrentTenant();
    if (!context) throw new Error("Unauthorized");

    const manager = WhatsAppInstanceManager.getInstance();
    const sock = manager.getInstance(context.tenantId);

    if (!sock) {
        return { error: "WhatsApp não está conectado." };
    }

    try {
        // Format number: ensure it has @s.whatsapp.net
        const jid = to.includes("@s.whatsapp.net") ? to : `${to.replace(/\D/g, "")}@s.whatsapp.net`;

        await sock.sendMessage(jid, { text });
        return { success: true };
    } catch (error) {
        console.error("[WhatsApp Action] Error sending message:", error);
        return { error: "Falha ao enviar mensagem." };
    }
}

"use server"

import { WhatsAppInstanceManager } from "../../whatsapp/whatsapp.manager";
import { protectedAction } from "@/lib/api/action-wrapper";
import QRCode from "qrcode";
import { revalidatePath } from "next/cache";

const SYSTEM_WHATSAPP_ID = "SYSTEM";

/**
 * Initializes the SaaS system WhatsApp session and returns QR code.
 */
export const getSaasWhatsAppQrCode = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        const manager = WhatsAppInstanceManager.getInstance();

        return new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error("Timeout ao gerar QR Code SaaS."));
            }, 30000);

            try {
                manager.initInstance(
                    SYSTEM_WHATSAPP_ID,
                    async (qr) => {
                        clearTimeout(timeout);
                        const qrDataUrl = await QRCode.toDataURL(qr, {
                            scale: 8,
                            margin: 2,
                            color: {
                                dark: "#10b981", // Emerald-500
                                light: "#ffffff"
                            }
                        });
                        resolve(qrDataUrl);
                    },
                    () => {
                        clearTimeout(timeout);
                        reject(new Error("WhatsApp SaaS já está conectado!"));
                    }
                );
            } catch (error) {
                clearTimeout(timeout);
                reject(error instanceof Error ? error.message : "Erro desconhecido");
            }
        });
    }
);

/**
 * Checks the status of the SaaS system WhatsApp instance.
 */
export const getSaasWhatsAppStatus = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        const manager = WhatsAppInstanceManager.getInstance();
        const instance = manager.getInstance(SYSTEM_WHATSAPP_ID);

        return {
            connected: !!instance,
            activeCount: manager.getActiveCount()
        };
    }
);

/**
 * Disconnects the SaaS system WhatsApp instance.
 */
export const disconnectSaasWhatsApp = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        const manager = WhatsAppInstanceManager.getInstance();
        await manager.closeInstance(SYSTEM_WHATSAPP_ID);
        revalidatePath("/saas-admin/whatsapp");
        return { success: true };
    }
);

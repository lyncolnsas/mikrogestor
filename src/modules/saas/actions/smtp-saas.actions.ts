
"use server";

import { prisma } from "@/lib/prisma";
import { protectedAction } from "@/lib/api/action-wrapper";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const smtpSchema = z.object({
    host: z.string().min(1, "O host é obrigatório"),
    port: z.coerce.number().int().min(1),
    secure: z.boolean(),
    user: z.string().min(1, "O usuário é obrigatório"),
    pass: z.string().min(1, "A senha é obrigatória"),
    fromName: z.string().min(1, "O nome do remetente é obrigatório"),
    fromEmail: z.string().email("E-mail do remetente inválido"),
});

export const getSaasSmtpConfig = protectedAction(
    ["SUPER_ADMIN"],
    async () => {
        const settings = await (prisma as any).systemSettings.findUnique({
            where: { id: "GLOBAL" }
        });
        
        return {
            smtpConfig: settings?.smtpConfig || {
                host: process.env.SMTP_HOST || "",
                port: Number(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === "true",
                user: process.env.SMTP_USER || "",
                pass: "", // Não retornamos a senha por segurança
                fromName: process.env.SMTP_FROM_NAME || "Mikrogestor",
                fromEmail: process.env.SMTP_FROM_EMAIL || "no-reply@mikrogestor.com",
            }
        };
    }
);

export const updateSaasSmtpAction = protectedAction(
    ["SUPER_ADMIN"],
    async (config) => {
        const validated = smtpSchema.parse(config);
        
        await (prisma as any).systemSettings.upsert({
            where: { id: "GLOBAL" },
            update: {
                smtpConfig: validated
            },
            create: {
                id: "GLOBAL",
                smtpConfig: validated
            }
        });
        
        revalidatePath("/saas-admin/settings");
        return { success: true };
    }
);

"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

export async function updatePasswordAction(formData: FormData) {
    const session = await getSession();
    if (!session || !session.userId) {
        return { error: "Não autorizado." };
    }

    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (!password || password.length < 6) {
        return { error: "A senha deve ter pelo menos 6 caracteres." };
    }

    if (password !== confirm) {
        return { error: "As senhas não coincidem." };
    }

    try {
        const hashedPassword = await hashPassword(password);
        
        await prisma.user.update({
            where: { id: session.userId },
            data: { password: hashedPassword }
        });

        // Register Security Log for Password Change
        const headersList = await headers();
        const ip = headersList.get("x-forwarded-for")?.split(',')[0] || "127.0.0.1";
        const ua = headersList.get("user-agent") || "Unknown";
        
        // Simple Device Parsing
        let device = "Desktop";
        if (/iPhone|iPad|iPod/i.test(ua)) device = "iPhone/iPad";
        else if (/Android/i.test(ua)) device = "Android";
        else if (/Windows/i.test(ua)) device = "Windows PC";
        else if (/Macintosh/i.test(ua)) device = "MacBook";

        await prisma.userSecurityLog.create({
            data: {
                userId: session.userId,
                event: "PASSWORD_CHANGE",
                ipAddress: ip,
                userAgent: ua,
                device: device,
                location: "Brasil"
            }
        });

        revalidatePath("/settings/security");
        return { success: true };
    } catch (error) {
        console.error("[SECURITY_ACTION] Error updating password:", error);
        return { error: "Erro interno ao atualizar senha." };
    }
}

export async function getSecurityLogsAction() {
    const session = await getSession();
    if (!session || !session.userId) {
        return [];
    }

    try {
        const logs = await prisma.userSecurityLog.findMany({
            where: { userId: session.userId },
            orderBy: { createdAt: "desc" },
            take: 10
        });

        return logs;
    } catch (error) {
        console.error("[SECURITY_ACTION] Error fetching logs:", error);
        return [];
    }
}


"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";

const resetSchema = z.object({
    password: z.string().min(6, "Senha muito curta"),
    token: z.string()
});

export async function resetPasswordAction(formData: FormData) {
    const password = formData.get("password") as string;
    const token = formData.get("token") as string;

    const validation = resetSchema.safeParse({ password, token });
    if (!validation.success) {
        return { error: validation.error.format().password?._errors[0] || "Dados inválidos" };
    }

    try {
        // 1. Validar Token
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token }
        });

        if (!resetToken || resetToken.expiresAt < new Date()) {
            return { error: "Token inválido ou expirado. Tente novamente." };
        }

        // 2. Buscar Usuário
        const user = await prisma.user.findFirst({
            where: { email: resetToken.email }
        });

        if (!user) {
            return { error: "Usuário não encontrado." };
        }

        // 3. Hash nova senha e atualizar
        const hashedPassword = await hashPassword(password);
        
        await prisma.$transaction([
            prisma.user.update({
                where: { email: user.email },
                data: { password: hashedPassword }
            }),
            prisma.passwordResetToken.delete({
                where: { token }
            })
        ]);

        return { success: true };

    } catch (error) {
        console.error("Reset Password Error:", error);
        return { error: "Erro interno ao redefinir senha." };
    }
}

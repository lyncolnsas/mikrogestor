
"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { randomBytes } from "crypto";
import { sendPasswordResetEmail } from "@/lib/mail";

const recoverySchema = z.object({
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().min(8, "Telefone inválido")
});

export async function requestPasswordResetAction(formData: FormData) {
    console.log("[RECOVERY v2] >>> INICIANDO RECUPERACAO...");
    const email = (formData.get("email") as string || "").toLowerCase();
    const phone = (formData.get("phone") as string) || "";
    console.log(`[RECOVERY v2] Dados recebidos: Email=${email}, Phone=${phone}`);

    try {
        console.log("[RECOVERY v2] Passo 1: Criando registro PENDING...");
        // 1. Log the attempt immediately for debugging/audit
        await (prisma as any).passwordRecoveryRequest.create({
            data: {
                name: "Anônimo",
                email: email,
                phone: phone,
                status: "PENDING",
                message: `Solicitação iniciada via formulário v2. Buscando dados...`
            }
        });
        console.log("[RECOVERY v2] Passo 1 OK: Registro criado no banco.");

        console.log("[RECOVERY v2] Passo 2: Buscando usuário ISP_ADMIN...");
        // 2. Buscar usuário ISP_ADMIN que tenha pelo menos um dos dados
        const user = await (prisma as any).user.findFirst({
            where: {
                OR: [
                    { phone: phone },
                    { email: email }
                ],
                role: "ISP_ADMIN"
            }
        });

        if (!user) {
            console.warn(`[RECOVERY v2] ❌ Usuário não encontrado para email: ${email} ou phone: ${phone}`);
            return { success: true };
        }
        console.log(`[RECOVERY v2] Usuário encontrado: ${user.name} (${user.email})`);

        const emailMatches = email && user.email.toLowerCase() === email;
        const phoneInDb = (user as any).phone || "";
        const phoneMatches = phone && phoneInDb === phone;
        console.log(`[RECOVERY v2] Validação: emailMatches=${emailMatches}, phoneMatches=${phoneMatches}`);

        // Caso de sucesso: O e-mail informado bate (ou o telefone informado bate e o e-mail também)
        if (emailMatches || phoneMatches) {
            console.log("[RECOVERY v2] Passo 3: Gerando Token...");
            const token = randomBytes(32).toString("hex");
            const expiresAt = new Date(Date.now() + 3600000); // 1 hora

            await (prisma as any).passwordResetToken.create({
                data: {
                    email: user.email,
                    token: token,
                    expiresAt: expiresAt
                }
            });
            console.log("[RECOVERY v2] Token gerado e guardado.");

            console.log("[RECOVERY v2] Passo 4: Atualizando status para SENT_EMAIL...");
            await (prisma as any).passwordRecoveryRequest.create({
                data: {
                    name: user.name,
                    email: user.email,
                    phone: (user as any).phone || "N/A",
                    status: "SENT_EMAIL",
                    message: `Token gerado com sucesso v2. Tentando enviar e-mail real...`
                }
            });
            
            try {
                console.log(`[RECOVERY v2] Passo 5: Enviando e-mail para ${user.email}...`);
                // Enviar E-mail real via Nodemailer
                await sendPasswordResetEmail(user.email, token);
                console.log("[RECOVERY v2] ✅ E-MAIL ENVIADO COM SUCESSO!");
            } catch (mailErr) {
                console.error("[RECOVERY v2] 💥 Erro no envio de e-mail:", mailErr);
                // Atualiza o log relatando erro no envio
                await (prisma as any).passwordRecoveryRequest.create({
                    data: {
                        name: user.name,
                        email: user.email,
                        status: "FAILED",
                        message: `Erro ao enviar e-mail: ${mailErr instanceof Error ? mailErr.message : 'Erro desconhecido'}`
                    }
                });
            }
        } else {
             console.warn("[RECOVERY v2] ⚠️ Dados informados não batem com o cadastro.");
             await (prisma as any).passwordRecoveryRequest.create({
                data: {
                    name: user.name,
                    email: user.email,
                    status: "ATTENTION_REQUIRED",
                    message: "Dados não conferem totalmente com o cadastro v2."
                }
            });
        }

        console.log("[RECOVERY v2] <<< FIM DO PROCESSO (Sucesso Lógico)");
        return { success: true };

    } catch (error) {
        console.error("[RECOVERY v2] ❌ CRITICAL ERROR:", error);
        return { success: true };
    }
}

export async function getRecoveryRequestsAction() {
    return await (prisma as any).passwordRecoveryRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50
    });
}

export async function resolveRecoveryRequestAction(id: string) {
    return await (prisma as any).passwordRecoveryRequest.update({
        where: { id },
        data: { status: 'RESOLVED' }
    });
}
